/**
 * Business logic service for Auth.
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
    Role,
} from "../../common"
import {
    UserEntity,
} from "../../entities"
import {
    SignInDto,
    SignUpDto,
} from "./dto"

/**
 * Issues JWT embedding role claims for downstream authorization.
 */
@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    ) {}

    /**
     * Registers a new user — prevents duplicate emails and stores a bcrypt hash (never plain password).
     * Role defaults to USER unless the caller provides a specific role (demo convenience).
     *
     * @param dto — signup payload containing email, password, and optional role
     * @returns Confirmation message object
     * @throws ConflictException (409) when the email is already taken
     */
    async signUp(dto: SignUpDto) {
        // Guard: reject duplicate emails — uniqueness is enforced here before the DB constraint fires.
        const existing = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
        })
        if (existing) {
            throw new ConflictException("Email already registered")
        }

        // Hash with bcrypt cost factor 10 — never store plain-text passwords.
        const hash = await bcrypt.hash(dto.password,
            10)

        // Default to USER role so admin accounts can only be created explicitly.
        const role = dto.role ?? Role.USER

        await this.usersRepo.save(
            this.usersRepo.create({
                email: dto.email,
                password: hash,
                role,
            }),
        )
        return {
            message: "Created",
        }
    }

    /**
     * Validates credentials and issues a signed JWT embedding the user's role.
     * The role inside the token lets the RolesGuard make decisions without
     * a database round-trip on every request.
     *
     * @param dto — sign-in payload containing email and password
     * @returns Object with `access_token` (JWT)
     * @throws UnauthorizedException (401) on wrong email or password
     */
    async signIn(dto: SignInDto) {
        // Look up user by email; bcrypt.compare checks the password hash.
        const user = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
        })

        // Reject early if user not found OR password hash mismatch — same error to prevent email enumeration.
        if (!user || !(await bcrypt.compare(dto.password,
            user.password))) {
            throw new UnauthorizedException("Invalid credentials")
        }

        // Embed `sub` (user id) + `role` in the JWT payload so the guard can read the role without DB.
        const access_token = await this.jwtService.signAsync({
            sub: user.id,
            role: user.role,
        })
        return {
            access_token,
        }
    }
}
