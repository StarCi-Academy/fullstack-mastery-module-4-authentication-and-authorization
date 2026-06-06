/**
 * Business logic service for Auth.
 * Owns the two responsibilities that sit between the Google OAuth flow and the database:
 * 1. Federated identity upsert — map a Google profile to a local user row.
 * 2. JWT issuance — sign an internal access token after the identity is confirmed.
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
 * Return type for {@link AuthService.findOrCreateGoogleUser}.
 * Carries both the persisted entity and a flag indicating whether a new row was inserted.
 */
export interface FindOrCreateResult {
    /** The persisted (or updated) user entity. */
    user: UserEntity
    /**
     * `true` when a new row was INSERTed (first-time login);
     * `false` when an existing row was found and updated.
     */
    isNewUser: boolean
}

/**
 * Links Google profiles to local DB rows and issues internal JWTs.
 * Stateless service — no session or request-scoped state is held here.
 */
@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    ) {}

    /**
     * Upserts a local user row linked to the provided Google identity.
     *
     * Lookup strategy (two-stage):
     * 1. Search by `googleId` — the stable provider identifier for returning users.
     * 2. If not found, search by `email` — to silently link an existing password account with Google.
     * 3. If neither exists, INSERT a new row with `password = null` (OAuth-only account).
     *
     * @param payload — normalized Google profile from the Passport strategy or mock branch.
     * @returns persisted user entity + `isNewUser` flag for onboarding routing on the client.
     */
    async findOrCreateGoogleUser(payload: GoogleProfilePayload): Promise<FindOrCreateResult> {
        // Stage 1: try stable googleId first — fastest path for returning users.
        // Stage 2 (via ??): fall back to email linking so a password account can gain Google login.
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
            // First time we see this identity — INSERT a new OAuth-only user row.
            // password is null because the credential lives at Google, not here.
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

        // Returning user — enrich any updated profile fields from Google.
        // We always re-link the googleId (handles the email-matched case where googleId was null).
        user.googleId = payload.googleId
        // Only overwrite name/picture if Google provided a value — preserve existing data otherwise.
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
     * Convenience wrapper — returns just the user entity (drops the `isNewUser` flag).
     * Kept for backward compatibility with call sites that don't need the flag.
     *
     * @param payload — normalized Google profile payload.
     * @returns persisted user entity.
     */
    async findOrCreateFromGoogle(payload: GoogleProfilePayload): Promise<UserEntity> {
        const { user } = await this.findOrCreateGoogleUser(payload)
        return user
    }

    /**
     * Signs an internal JWT and formats the final JSON response returned to the client.
     * The JWT carries only `sub` (user.id) — all other claims are fetched fresh from DB
     * on each authenticated request, so there is no stale-claim problem.
     *
     * @param user — persisted user entity (used for JWT subject and response body).
     * @param isNewUser — propagated from {@link findOrCreateGoogleUser}; lets the client branch on first login.
     * @returns object with `message`, `access_token`, `isNewUser`, and a safe `user` summary.
     */
    async completeGoogleLogin(user: UserEntity, isNewUser: boolean): Promise<{
        message: string
        access_token: string
        isNewUser: boolean
        user: { id: number; email: string; name: string; googleSub: string | null }
    }> {
        // Sign JWT with only the user id as sub — minimal payload reduces token size.
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
                // Concatenate first + last, filtering null/undefined to avoid "null null".
                name: [user.firstName,
                    user.lastName,
                ].filter(Boolean).join(" "),
                // Expose googleId under the alias `googleSub` to match Google's terminology.
                googleSub: user.googleId,
            },
        }
    }
}
