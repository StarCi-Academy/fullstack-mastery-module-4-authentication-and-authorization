/**
 * Business logic service for Auth.
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
 * Issues short access JWT + refresh JWT tracked via bcrypt hash.
 */
@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    ) {}

    /** access-token signing secret via ConfigService. */
    private accessSecret(): string {
        return this.config.getOrThrow<string>("jwt.secret")
    }

    /** refresh-token signing secret via ConfigService. */
    private refreshSecret(): string {
        return this.config.getOrThrow<string>("jwt.refreshSecret")
    }

    /**
     * Credential signup identical baseline JWT demo.
     *
     * @param dto — signup payload
     * @returns Ack ack object
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
     * Sign-in issuing token pair and storing refresh hash.
     *
     * @param dto — sign-in payload
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
        const tokens = await this.issueTokenPair(user)
        await this.updateRtHash(user.id,
            tokens.refresh_token)
        return tokens
    }

    /**
     * Refresh rotation verifies JWT signature/expiry then bcrypt hash equality.
     *
     * @param dto — refresh token body
     * @throws UnauthorizedException — invalid/reused refresh
     */
    async refreshTokens(userId: number, rt: string) {
        const user = await this.usersRepo.findOne({
            where: {
                id: userId,
            },
        })
        if (!user?.refreshTokenHash) {
            throw new UnauthorizedException("Refresh token revoked or rotated")
        }
        const rtMatches = await bcrypt.compare(rt, user.refreshTokenHash)
        if (!rtMatches) {
            // Logic — RT plaintext does not match stored hash → reject.
            // (EN Logic: Plaintext RT mismatches stored bcrypt hash — reject.)
            throw new ForbiddenException("Access Denied")
        }
        const tokens = await this.issueTokenPair(user)
        await this.updateRtHash(user.id,
            tokens.refresh_token)
        return tokens
    }

    /**
     * Clears refresh hash for authenticated user id.
     *
     * @param userId — user id from bearer access token
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

    /**
     * Internal helper issuing JWT pair and persisting refresh hash.
     *
     * @param user — hydrated user row
     * @returns `{ access_token, refresh_token }` token tuple
     */
    private async issueTokenPair(user: UserEntity) {
        const access_token = await this.jwtService.signAsync(
            {
                sub: user.id,
            },
            {
                secret: this.accessSecret(),
                expiresIn: "15m",
            },
        )
        const refresh_token = await this.jwtService.signAsync(
            {
                sub: user.id,
            },
            {
                secret: this.refreshSecret(),
                expiresIn: "7d",
            },
        )
        return {
            access_token,
            refresh_token,
        }
    }

    /** Persist rotated refresh hash. */
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
