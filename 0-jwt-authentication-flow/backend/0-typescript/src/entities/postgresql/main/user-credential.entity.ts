/**
 * TypeORM entity — credential row linked to a user.
 * Stores the bcrypt hash of the user's password in a dedicated table
 * to decouple identity data from secret data.
 */
import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from "typeorm"
import {
    UserEntity,
} from "./user.entity"

/**
 * Maps to the `user_credentials` table.
 * One-to-one with `users` — each user has exactly one credential row.
 */
@Entity({
    name: "user_credentials",
})
export class UserCredentialEntity {
    /** Auto-incremented primary key. */
    @PrimaryGeneratedColumn()
        id!: number

    /** Foreign key column referencing `users.id`. */
    @Column()
        userId!: number

    /**
     * Back-reference to the owning `UserEntity`.
     * `onDelete: "CASCADE"` ensures credentials are removed when the user is deleted.
     */
    @OneToOne(() => UserEntity, (user) => user.credential, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "userId", // Maps this side as the FK owner (holds the column)
    })
        user!: UserEntity

    /**
     * Bcrypt hash of the user's password.
     * Never store or log the plain-text password — only this column is persisted.
     */
    @Column()
        password!: string
}
