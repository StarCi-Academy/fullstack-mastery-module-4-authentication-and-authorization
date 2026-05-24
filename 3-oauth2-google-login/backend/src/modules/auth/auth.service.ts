/**
 * Service xử lý logic nghiệp vụ của Auth.
 * (EN: Business logic service for Auth.)
 */
import {
    Injectable,
} from "@nestjs/common"
import {
    JwtService,
} from "@nestjs/jwt"
import {
    InjectRepository,
} from "@nestjs/typeorm"
import {
    Repository,
} from "typeorm"
import {
    UserEntity,
} from "../../entities"
import type {
    GoogleProfilePayload,
} from "./google-profile"

/**
 * Kết quả tra cứu / tạo user — `isNewUser=true` khi vừa INSERT, `false` khi đã tồn tại.
 * (EN: Result tuple — isNewUser=true on INSERT, false on lookup.)
 */
export interface FindOrCreateResult {
    user: UserEntity
    isNewUser: boolean
}

/**
 * Ánh xạ Google identity → row DB và phát JWT nội bộ sau OAuth callback.
 * (EN: Links Google profiles to DB rows and signs internal JWTs.)
 */
@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    ) {}

    /**
     * Silent registration / linking: nếu googleId/email mới → INSERT (isNewUser=true);
     * ngược lại enrich googleId/profile fields và trả isNewUser=false.
     * (EN: Upserts local user linked to Google identity and reports whether a new row was created.)
     *
     * @param payload — Fields extracted from Google OAuth profile (EN: normalized Google payload).
     * @returns Cặp `{ user, isNewUser }` (EN: persisted user + new-row flag).
     */
    async findOrCreateGoogleUser(payload: GoogleProfilePayload): Promise<FindOrCreateResult> {
        let user =
      (await this.usersRepo.findOne({
          where: {
              googleId: payload.googleId,
          },
      })) ??
      (await this.usersRepo.findOne({
          where: {
              email: payload.email,
          },
      }))

        if (!user) {
            user = this.usersRepo.create({
                email: payload.email,
                googleId: payload.googleId,
                firstName: payload.firstName ?? null,
                lastName: payload.lastName ?? null,
                picture: payload.picture ?? null,
                password: null,
            })
            await this.usersRepo.save(user)
            return {
                user,
                isNewUser: true,
            }
        }

        user.googleId = payload.googleId
        user.firstName = payload.firstName ?? user.firstName
        user.lastName = payload.lastName ?? user.lastName
        user.picture = payload.picture ?? user.picture
        await this.usersRepo.save(user)
        return {
            user,
            isNewUser: false,
        }
    }

    /**
     * Wrapper tương thích cũ — gọi `findOrCreateGoogleUser` và bỏ qua flag isNewUser.
     * (EN: Backwards-compatible wrapper returning only the user entity.)
     */
    async findOrCreateFromGoogle(payload: GoogleProfilePayload): Promise<UserEntity> {
        const { user } = await this.findOrCreateGoogleUser(payload)
        return user
    }

    /**
     * Phát JWT access token chứa `sub` và trả kèm `isNewUser` để FE phân nhánh onboarding.
     * (EN: Issues JWT with sub claim and returns isNewUser for client onboarding split.)
     *
     * @param user — Row đã có primary key sau OAuth handshake (EN: persisted user entity).
     * @param isNewUser — Cờ user vừa được tạo lần đầu (EN: first-time login flag).
     */
    async completeGoogleLogin(user: UserEntity, isNewUser: boolean): Promise<{
        message: string
        access_token: string
        isNewUser: boolean
        user: { id: number; email: string; name: string; googleSub: string | null }
    }> {
        const access_token = await this.jwtService.signAsync({
            sub: user.id,
        })
        return {
            message: "Đăng nhập Google thành công!",
            access_token,
            isNewUser,
            user: {
                id: user.id,
                email: user.email,
                name: [user.firstName,
                    user.lastName,
                ].filter(Boolean).join(" "),
                googleSub: user.googleId,
            },
        }
    }
}
