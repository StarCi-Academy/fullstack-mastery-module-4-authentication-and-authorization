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
    User,
} from "../user/user.entity"
import {
    SignInDto,
} from "./dto/signin.dto"
import {
    SignUpDto,
} from "./dto/signup.dto"

/**
 * Đăng ký / đăng nhập và phát JWT access token (demo stateless auth).
 * (EN: Sign-up / sign-in and issue JWT access tokens for stateless auth.)
 */
@Injectable()
export class AuthService {
    constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    ) {}

    /**
     * Tạo user mới sau khi hash mật khẩu; tránh trùng email.
     * (EN: Persist user with bcrypt password hash; rejects duplicate emails.)
     *
     * @param dto - Email + plain password từ client (EN: credentials from client body).
     * @returns `{ message }` phản hồi tối giản sau khi lưu DB (EN: minimal ack payload).
     * @throws ConflictException — email đã tồn tại (EN: when email collides).
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
        // Salt rounds cố định cho demo; production có thể tune theo policy (EN: fixed cost factor for bcrypt)
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
     * Xác thực email/password và ký JWT chứa `sub` (user id).
     * (EN: Validate credentials then sign JWT carrying subject user id.)
     *
     * @param dto - Email + password plaintext (EN: sign-in payload).
     * @returns `{ access_token }` JWT cho header Bearer (EN: bearer token string).
     * @throws UnauthorizedException — sai user hoặc password (EN: invalid credential tuple).
     */
    async signIn(dto: SignInDto) {
        const user = await this.usersRepo.findOne({
            where: {
                email: dto.email,
            },
        })
        // Không tiết lộ user có tồn tại hay không trong message — chỉ generic error (EN: uniform error surface)
        if (!user || !(await bcrypt.compare(dto.password,
            user.password))) {
            throw new UnauthorizedException("Invalid credentials")
        }
        return {
            access_token: await this.jwtService.signAsync({
                sub: user.id,
            }),
        }
    }
}
