/**
 * Core business logic for the refresh-token strategy lesson.
 * Implements: signup, signin (issue AT+RT pair), refresh (rotation),
 * and logout (revocation by nulling the stored hash).
 *
 * Key invariants:
 *  - Two separate JWT secrets: AT_SECRET (15 m) and RT_SECRET (7 d).
 *  - Refresh token is NEVER stored raw — only its bcrypt hash persists in the DB.
 *  - On rotation the old hash is immediately overwritten, invalidating the old RT.
 *  - On logout the hash is set to null, making any pending RT permanently invalid.
 */
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
    UserEntity,
} from "../../entities"
import {
    SignInDto,
    SignUpDto,
} from "./dto"

/**
 * Provides signup, signin, token refresh, and logout operations.
 * All token issuance and hash persistence is centralised here to keep
 * controllers thin and the security logic easy to audit.
 */
@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService, // NestJS wrapper around jsonwebtoken
    private readonly config: ConfigService,   // reads JWT secrets from ConfigModule namespace
    ) {}

    /**
     * Returns the HMAC secret used for signing access tokens.
     * Reads from ConfigModule namespace "jwt.secret" (env: JWT_ACCESS_SECRET).
     */
    private accessSecret(): string {
        return this.config.getOrThrow<string>("jwt.secret")
    }

    /**
     * Returns the HMAC secret used for signing refresh tokens.
     * Separate from accessSecret() so an AT cannot be used as an RT and vice-versa.
     */
    private refreshSecret(): string {
        return this.config.getOrThrow<string>("jwt.refreshSecret")
    }

    /**
     * Registers a new user with a bcrypt-hashed password.
     * Returns only id + email — never the password hash.
     *
     * @param dto - signup payload containing email and plaintext password
     * @returns partial user object `{ id, email }`
     * @throws ConflictException when the email is already registered
     */
    async signUp(dto: SignUpDto) {
        // Guard: email must be unique across the users table.
        const existing = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
        })
        if (existing) {
            throw new ConflictException("Email already registered")
        }
        // Hash the password with cost factor 10 before persisting.
        const hash = await bcrypt.hash(dto.password,
            10)
        const saved = await this.usersRepo.save(this.usersRepo.create({
            email: dto.email,
            password: hash,
        }))
        // Return only safe public fields — never expose the password hash.
        return {
            id: saved.id,
            email: saved.email,
        }
    }

    /**
     * Authenticates a user and issues an access + refresh token pair.
     * Stores a bcrypt hash of the refresh token in the DB for later comparison.
     *
     * @param dto - signin payload with email and plaintext password
     * @returns `{ access_token, refresh_token }` token pair
     * @throws UnauthorizedException when credentials are invalid
     */
    async signIn(dto: SignInDto) {
        // Look up user by email; a missing record is treated identically to a wrong
        // password to prevent email enumeration.
        const user = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
        })
        if (!user || !(await bcrypt.compare(dto.password,
            user.password))) {
            // Unified error message regardless of whether the user was found.
            throw new UnauthorizedException("Invalid credentials")
        }
        // Issue AT + RT using two different signing secrets.
        const tokens = await this.issueTokenPair(user)
        // Persist bcrypt hash of the new RT so it can be verified on the next refresh call.
        await this.updateRtHash(user.id,
            tokens.refresh_token)
        return tokens
    }

    /**
     * Issues a new AT+RT pair given a valid (and non-revoked) refresh token.
     * Implements "refresh token rotation": the old RT is invalidated the moment
     * a new pair is issued, making replayed tokens detectable.
     *
     * @param userId - user id extracted from the verified refresh JWT by RtStrategy
     * @param rt - raw refresh token string (from Authorization: Bearer header)
     * @returns new `{ access_token, refresh_token }` token pair
     * @throws UnauthorizedException when the RT has been revoked (hash is null)
     * @throws ForbiddenException when the RT hash comparison fails (token reuse / mismatch)
     */
    async refreshTokens(userId: number, rt: string) {
        // Load the user row; null hash means logout was called — token is revoked.
        const user = await this.usersRepo.findOne({
            where: {
                id: userId,
            },
        })
        if (!user?.refreshTokenHash) {
            // Hash is null → logout was already called; reject any outstanding RTs.
            throw new UnauthorizedException("Refresh token revoked or rotated")
        }
        // bcrypt.compare: timing-safe comparison of plaintext RT against stored hash.
        const rtMatches = await bcrypt.compare(rt, user.refreshTokenHash)
        if (!rtMatches) {
            // Hash mismatch — either a rotated (old) token or a forged one.
            throw new ForbiddenException("Access Denied")
        }
        // Both JWT signature (verified by RtStrategy) and hash match — safe to rotate.
        const tokens = await this.issueTokenPair(user)
        // Overwrite old hash with new RT hash → old RT is now permanently invalid.
        await this.updateRtHash(user.id,
            tokens.refresh_token)
        return tokens
    }

    /**
     * Revokes the refresh token for the authenticated user by nulling the hash.
     * Any outstanding RT for this user will be rejected on the next /auth/refresh call
     * because `user.refreshTokenHash` will be null.
     *
     * @param userId - user id from the verified access token (set by AtStrategy / AtGuard)
     * @returns `{ message: "Logged out" }`
     */
    async logout(userId: number) {
        // Set refreshTokenHash = null; this is the revocation mechanism.
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

    /**
     * Signs a new AT (15 m) and RT (7 d) using their respective secrets.
     * Both tokens carry only `sub` (user id) — no roles or sensitive data in the payload.
     *
     * @param user - hydrated user entity (only id is used for the `sub` claim)
     * @returns `{ access_token, refresh_token }` tuple
     */
    private async issueTokenPair(user: UserEntity) {
        // AT: short-lived (15 m), signed with AT secret.
        const access_token = await this.jwtService.signAsync(
            {
                sub: user.id, // user id as JWT subject
            },
            {
                secret: this.accessSecret(),
                expiresIn: "15m", // must match the lesson contract
            },
        )
        // RT: long-lived (7 d), signed with a DIFFERENT secret to prevent AT↔RT confusion.
        const refresh_token = await this.jwtService.signAsync(
            {
                sub: user.id,
            },
            {
                secret: this.refreshSecret(),
                expiresIn: "7d", // gives the user a week of silent re-auth
            },
        )
        return {
            access_token,
            refresh_token,
        }
    }

    /**
     * Hashes the new refresh token and persists it in the DB.
     * Called after every successful signin or refresh to keep the stored hash current.
     * Storing the hash (not the plaintext) means a DB breach cannot replay the RT.
     *
     * @param userId - target user id
     * @param refreshToken - plaintext RT to hash and store
     */
    private async updateRtHash(userId: number, refreshToken: string) {
        // bcrypt with cost 10 — same cost as password hashing for consistency.
        const refreshTokenHash = await bcrypt.hash(refreshToken,
            10)
        await this.usersRepo.update({
            id: userId,
        },
        {
            refreshTokenHash, // column is nullable: null = revoked, string = active
        })
    }
}
