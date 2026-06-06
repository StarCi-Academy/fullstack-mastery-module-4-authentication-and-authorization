/**
 * TypeORM entity — User identity without credentials.
 * Credentials are stored in a separate `user_credentials` table linked by a 1:1 relation.
 */
import {
    Column,
    Entity,
    OneToOne,
    PrimaryGeneratedColumn,
} from "typeorm"
import {
    UserCredentialEntity,
} from "./user-credential.entity"

/**
 * Maps to the `users` table.
 * Keeps identity (email) separate from secrets (bcrypt hash) for security hygiene —
 * a query that joins users without credentials will not expose password data.
 */
@Entity({
    name: "users",
})
export class UserEntity {
    /** Auto-incremented primary key; used as the JWT `sub` claim. */
    @PrimaryGeneratedColumn()
        id!: number

    /** Unique email address used as the login identifier. */
    @Column({
        unique: true, // Database-level constraint prevents duplicate accounts
    })
        email!: string

    /**
     * Lazy credential relation — loaded only when `relations: { credential: true }` is set.
     * Cascade allows saving user + credential in a single `usersRepo.save()` call.
     */
    @OneToOne(() => UserCredentialEntity, (credential) => credential.user, { cascade: true })
        credential?: UserCredentialEntity
}
