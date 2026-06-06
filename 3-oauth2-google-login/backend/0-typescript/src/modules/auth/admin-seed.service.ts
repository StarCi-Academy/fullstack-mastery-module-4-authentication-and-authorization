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
} from "../../entities"

/**
 * Seeds an initial admin user with a local password on application startup.
 * This lets developers test password-based login alongside OAuth without
 * manually inserting a DB row. Runs idempotently — skips if the email exists.
 */
@Injectable()
export class AdminSeedService implements OnModuleInit {
    /** NestJS logger scoped to this service name for easy log filtering. */
    private readonly logger = new Logger(AdminSeedService.name)

    constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly config: ConfigService,
    ) {}

    /**
     * Runs once after all modules are initialised (NestJS lifecycle hook).
     * Reads admin credentials from env, guards against duplicate inserts,
     * then bcrypt-hashes the password before persisting.
     *
     * @side-effect Writes one row to `users` table on first boot.
     */
    async onModuleInit() {
        // Read seed credentials — both env vars must be present or throw.
        const email = this.config.getOrThrow<string>("SEED_ADMIN_EMAIL")
        const password = this.config.getOrThrow<string>("SEED_ADMIN_PASSWORD")

        // Idempotency guard: skip silently if a row with this email already exists.
        const existing = await this.usersRepo.findOne({
            where: {
                email,
            },
        })
        if (existing) {
            return
        }

        // Hash with bcrypt cost factor 10 — industry default balancing security vs. speed.
        const hash = await bcrypt.hash(password,
            10)

        // INSERT the seeded row; googleId is null since this is a local password account.
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
