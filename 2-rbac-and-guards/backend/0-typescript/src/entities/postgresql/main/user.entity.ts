/**
 * TypeORM entity — User entity.
 */
import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from "typeorm"
import {
    Role,
} from "../../../common"

/**
 * Database row representing an application user.
 * Stores the bcrypt password hash (never plain text) and the RBAC role that
 * gets embedded into the JWT so guards can authorise without a DB round-trip.
 */
@Entity({
    name: "users",
})
export class UserEntity {
    /** Auto-incremented surrogate primary key — used as JWT `sub` claim. */
    @PrimaryGeneratedColumn()
        id!: number

    /** Unique login identifier; enforced by the UNIQUE constraint on the column. */
    @Column({
        unique: true,
    })
        email!: string

    /** bcrypt hash of the user's password — NEVER the plain-text password. */
    @Column()
        password!: string

    /**
     * RBAC role persisted to the DB and mirrored inside the JWT payload.
     * Stored as VARCHAR so the enum string values are human-readable in the DB.
     * Defaults to USER so admin accounts must be explicitly created.
     */
    @Column({
        type: "varchar",
        default: Role.USER,
    })
        role!: Role
}
