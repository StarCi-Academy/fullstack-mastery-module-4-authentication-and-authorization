/**
 * TypeORM entity — User entity.
 */
import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from "typeorm"

/**
 * Hybrid user row supporting OAuth-first accounts.
 */
@Entity({
    name: "users",
})
export class UserEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        unique: true,
    })
        email!: string

    /** nullable password for OAuth-only. */
    @Column({
        type: "varchar",
        nullable: true,
    })
        password!: string | null

    /** Google subject identifier. */
    @Column({
        type: "varchar",
        nullable: true,
        unique: true,
    })
        googleId!: string | null

    @Column({
        type: "varchar",
        nullable: true,
    })
        firstName!: string | null

    @Column({
        type: "varchar",
        nullable: true,
    })
        lastName!: string | null

    @Column({
        type: "varchar",
        nullable: true,
    })
        picture!: string | null
}
