/**
 * Bootstrap service — seeds the default admin user once on startup.
 * Implements OnModuleInit so NestJS calls onModuleInit() automatically
 * after the module dependency graph is fully resolved.
 */
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
} from "../../common"
import {
    UserEntity,
} from "../../entities"

/** Boot-time admin seed for lesson DB. */
@Injectable()
export class AdminSeedService implements OnModuleInit {
    /** Logger scoped to this service class name for easy filtering. */
    private readonly logger = new Logger(AdminSeedService.name)

    constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly config: ConfigService,
    ) {}

    /**
     * Runs once when the module finishes initializing.
     * Seeds a default admin user if none exists — idempotent (safe to re-run).
     *
     * @returns void — side-effect only (DB write + log)
     */
    async onModuleInit() {
        // Read admin credentials from config (fall back to demo defaults for lesson run).
        const email = this.config.get<string>("SEED_ADMIN_EMAIL") ?? "admin@starci.net"
        const password = this.config.get<string>("SEED_ADMIN_PASSWORD") ?? "admin123"

        // Skip seed if the admin already exists to keep the operation idempotent.
        const existing = await this.usersRepo.findOne({
            where: {
                email,
            },
        })
        if (existing) {
            return
        }

        // Hash password with bcrypt (cost factor 10 — adequate for demo, raise in prod).
        const hash = await bcrypt.hash(password,
            10)

        // Persist the admin user with ADMIN role embedded in the entity.
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
