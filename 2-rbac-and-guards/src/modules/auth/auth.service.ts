/**
 * Service xu ly logic nghiep vu cua Auth.
 * (EN: Business logic service for Auth.)
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
} from "../../common/role.enum"
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
 * Credential signup/signin â€” JWT chứa `sub` + `role` để phục vụ RolesGuard.
 * (EN: Issues JWT embedding role claims for downstream authorization.)
 */
@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    ) {}

    /**
     * Cho phép optional `role` trên signup để seed admin trong demo â€” production phải khóa/không expose (EN: demo-only admin bootstrap).
     *
     * @param dto â€” Email/password vÃ  optional role override (EN: signup payload).
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
     * Sau khi AuthN â€” đưa role vÃ o JWT để không phải hit DB mỗi request AuthZ đơn giản (trade-off stale role).
     * (EN: Signs JWT including role claim for guard checks without DB round-trip.)
     *
     * @param dto â€” credential body (EN: sign-in payload).
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
        const access_token = await this.jwtService.signAsync({
            sub: user.id,
            role: user.role,
        })
        return {
            access_token,
        }
    }
}
