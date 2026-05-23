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
    UserEntity,
} from "../user"

/** User credential demo (password) song song OAuth — idempotent theo email. (EN: Boot-time password user seed.) */
@Injectable()
export class AdminSeedService implements OnModuleInit {
    private readonly logger = new Logger(AdminSeedService.name)

    constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
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
                googleId: null,
                firstName: null,
                picture: null,
            }),
        )
        this.logger.log(`Seeded admin user ${email}`)
    }
}
