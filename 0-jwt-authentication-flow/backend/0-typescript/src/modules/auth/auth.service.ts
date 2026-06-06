/**
 * Business logic service for Auth.
 * Handles user registration (signup) and authentication (signin) with JWT issuance.
 */
import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common"
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
 * Sign-up / sign-in and issue JWT access tokens for stateless auth.
 * Passwords are stored as bcrypt hashes — never plain-text.
 * The issued JWT carries only a `sub` (user id) claim; no session is stored.
 */
@Injectable()
export class AuthService {
    constructor(
    /** Repository for the users table (injected by TypeORM). */
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    /** NestJS JWT service for signing and verifying tokens. */
    private readonly jwtService: JwtService,
    ) {}

    /**
     * Persist user with bcrypt password hash; rejects duplicate emails.
     *
     * @param dto - credentials from client body
     * @returns minimal ack payload `{ id, email }`
     * @throws ConflictException — when email already exists in the database
     */
    async signUp(dto: SignUpDto) {
        // Guard: prevent duplicate accounts for the same email address
        const existing = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
        })
        if (existing) {
            // Reject early — returning which field conflicts helps the client UX
            throw new ConflictException("Email already registered")
        }

        // Hash with bcrypt cost factor 10; one-way, so the plain-text never touches the DB
        const hash = await bcrypt.hash(dto.password, 10)

        // Persist user + embedded credential in one atomic save via `cascade: true` on the relation
        const saved = await this.usersRepo.save(this.usersRepo.create({
            email: dto.email,
            credential: {
                password: hash,
            },
        }))

        // Return only safe fields — never echo the hash or plain-text password back
        return {
            id: saved.id,
            email: saved.email,
        }
    }

    /**
     * Validate credentials then sign JWT carrying subject user id.
     * The token is self-contained: any server with the same secret can verify it
     * without a session store lookup.
     *
     * @param dto - sign-in payload with email + password
     * @returns `{ access_token }` bearer token string
     * @throws UnauthorizedException — when email not found or password mismatch
     */
    async signIn(dto: SignInDto) {
        // Eagerly load the credential relation so we can compare the stored hash
        const user = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
            relations: {
                credential: true,
            },
        })

        // Guard: reject both "user not found" and "wrong password" with the same error
        // to avoid leaking which condition failed (prevents user enumeration attacks)
        if (!user?.credential || !(await bcrypt.compare(dto.password, user.credential.password))) {
            throw new UnauthorizedException("Invalid credentials")
        }

        // Sign a JWT with `sub` = user id; the signature makes the payload tamper-proof.
        // Any modification to the payload will invalidate the signature on the next verify.
        return {
            access_token: await this.jwtService.signAsync({
                sub: user.id,
            }),
        }
    }
}
