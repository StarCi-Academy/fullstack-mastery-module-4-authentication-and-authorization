import {
    ConflictException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    JwtService,
} from "@nestjs/jwt"
import {
    InjectRepository,
} from "@nestjs/typeorm"
import * as bcrypt from "bcrypt"
import {
    Repository,
} from "typeorm"
import {
    User,
} from "../user/user.entity"
import {
    SignInDto,
} from "./dto/signin.dto"
import {
    SignUpDto,
} from "./dto/signup.dto"

/**
 * Access token ngắn + refresh token dài; hash RT trong DB — rotate mỗi lần refresh, revoke khi logout.
 * (EN: Short-lived AT + long-lived RT with bcrypt hash, rotation and revocation.)
 */
@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    ) {}

    /**
     * Đăng ký user credential — đồng bộ response `{ id, email }` với `0-jwt-authentication-flow`.
     * (EN: Signup returning created user id and email.)
     */
    async signUp(dto: SignUpDto) {
        const existing = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
        })
        if (existing) {
            throw new ConflictException("Email already registered")
        }
        const hash = await bcrypt.hash(dto.password,
            10)
        const saved = await this.usersRepo.save(this.usersRepo.create({
            email: dto.email,
            password: hash,
        }))
        return {
            id: saved.id,
            email: saved.email,
        }
    }

    /**
     * Đăng nhập và phát cặp token + persist refresh hash.
     * (EN: Sign-in issuing token pair and storing refresh hash.)
     */
    async signIn(dto: SignInDto) {
        const user = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
        })
        if (!user || !(await bcrypt.compare(dto.password,
            user.password))) {
            throw new UnauthorizedException("Invalid credentials")
        }
        const tokens = await this.getTokens(user.id)
        await this.updateRtHash(user.id,
            tokens.refresh_token)
        return tokens
    }

    /**
     * Rotation: khớp RT với hash trong DB → cặp token mới + ghi đè hash (RT cũ vô hiệu).
     * (EN: Refresh rotation — rejects reused/revoked refresh with 403 Access Denied.)
     */
    async refreshTokens(userId: number, rt: string) {
        const user = await this.usersRepo.findOne({
            where: {
                id: userId,
            },
        })
        if (!user?.refreshTokenHash) {
            throw new ForbiddenException("Access Denied")
        }
        const rtMatches = await bcrypt.compare(rt,
            user.refreshTokenHash)
        if (!rtMatches) {
            throw new ForbiddenException("Access Denied")
        }
        const tokens = await this.getTokens(user.id)
        await this.updateRtHash(user.id,
            tokens.refresh_token)
        return tokens
    }

    /**
     * Revoke — xóa hash refresh; access JWT vẫn sống đến khi hết hạn (trade-off demo).
     * (EN: Clears refresh hash for authenticated user.)
     */
    async logout(userId: number) {
        await this.usersRepo.update({
            id: userId,
        },
        {
            refreshTokenHash: null,
        })
        return {
            message: "Logged out",
        }
    }

    /** Sinh access (15m) + refresh (7d). (EN: Signs JWT pair without persisting hash.) */
    private async getTokens(userId: number) {
        const access_token = await this.jwtService.signAsync({
            sub: userId,
        })
        const refresh_token = await this.jwtService.signAsync(
            {
                sub: userId,
            },
            {
                secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
                expiresIn: "7d",
            },
        )
        return {
            access_token,
            refresh_token,
        }
    }

    /** bcrypt hash refresh JWT plaintext và UPDATE user row. (EN: Persist rotated refresh hash.) */
    private async updateRtHash(userId: number, refreshToken: string) {
        const refreshTokenHash = await bcrypt.hash(refreshToken,
            10)
        await this.usersRepo.update({
            id: userId,
        },
        {
            refreshTokenHash,
        })
    }
}
