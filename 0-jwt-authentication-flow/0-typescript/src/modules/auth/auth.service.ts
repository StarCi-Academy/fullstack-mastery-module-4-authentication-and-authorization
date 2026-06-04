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
    UserEntity,
} from "../../entities"
import {
    SignInDto,
    SignUpDto,
} from "./dto"

/**
 * Sign-up / sign-in and issue JWT access tokens for stateless auth.
 */
@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    ) {}

    /**
     * Persist user with bcrypt password hash; rejects duplicate emails.
     *
     * @param dto - credentials from client body
     * @returns `{ message }` minimal ack payload
     * @throws ConflictException — when email collides
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
            credential: {
                password: hash,
            },
        }))
        return {
            id: saved.id,
            email: saved.email,
        }
    }

    /**
     * Validate credentials then sign JWT carrying subject user id.
     *
     * @param dto - sign-in payload
     * @returns `{ access_token }` bearer token string
     * @throws UnauthorizedException — invalid credential tuple
     */
    async signIn(dto: SignInDto) {
        const user = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
            relations: {
                credential: true,
            },
        })
        if (!user?.credential || !(await bcrypt.compare(dto.password,
            user.credential.password))) {
            throw new UnauthorizedException("Invalid credentials")
        }
        return {
            access_token: await this.jwtService.signAsync({
                sub: user.id,
            }),
        }
    }
}
