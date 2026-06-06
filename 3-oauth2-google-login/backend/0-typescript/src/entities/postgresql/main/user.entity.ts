/**
 * TypeORM entity — User entity.
 */
import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from "typeorm"

/**
 * Hybrid user row that supports both local password accounts and OAuth-only (Google) accounts.
 * A user signed up via Google has `password = null` because their credential lives at Google,
 * not in our database.  `googleId` is the stable `sub` claim returned by Google — it never
 * changes for the same Google account, making it the reliable upsert key.
 */
@Entity({
    name: "users",
})
export class UserEntity {
    /** Auto-incremented surrogate primary key — stable internal identifier. */
    @PrimaryGeneratedColumn()
        id!: number

    /** Unique email address used both as a login hint and as the account-linking fallback key. */
    @Column({
        unique: true,
    })
        email!: string

    /**
     * bcrypt hash of the user's local password.
     * `null` for accounts created via Google OAuth — they have no local password.
     */
    @Column({
        type: "varchar",
        nullable: true,
    })
        password!: string | null

    /**
     * Google subject (`sub`) identifier — unique across all Google accounts.
     * `null` until the user logs in with Google for the first time (or for password-only accounts).
     * Unique constraint prevents two rows from being linked to the same Google account.
     */
    @Column({
        type: "varchar",
        nullable: true,
        unique: true,
    })
        googleId!: string | null

    /** User's given name from the Google profile, or set manually. */
    @Column({
        type: "varchar",
        nullable: true,
    })
        firstName!: string | null

    /** User's family name from the Google profile, or set manually. */
    @Column({
        type: "varchar",
        nullable: true,
    })
        lastName!: string | null

    /** URL to the user's profile photo returned by Google; used purely as a display hint. */
    @Column({
        type: "varchar",
        nullable: true,
    })
        picture!: string | null
}
