import {
    Injectable,
    Logger,
    OnModuleInit,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
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

/** Đảm bảo có một admin demo sau khi DB sẵn sàng — idempotent theo email. (EN: Boot-time admin seed for lesson DB.) */
@Injectable()
export class AdminSeedService implements OnModuleInit {
    private readonly logger = new Logger(AdminSeedService.name)

    constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly config: ConfigService,
    ) {}

    async onModuleInit() {
        const email = this.config.getOrThrow<string>("SEED_ADMIN_EMAIL")
        const password = this.config.getOrThrow<string>("SEED_ADMIN_PASSWORD")
        const existing = await this.usersRepo.findOne({
            where: {
                email,
            },
        })
        if (existing) {
            return
        }
        const hash = await bcrypt.hash(password,
            10)
        await this.usersRepo.save(
            this.usersRepo.create({
                email,
                password: hash,
                role: Role.ADMIN,
            }),
        )
        this.logger.log(`Seeded admin user ${email}`)
    }
}
