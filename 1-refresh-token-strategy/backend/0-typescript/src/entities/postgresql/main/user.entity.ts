/**
 * TypeORM entity — User entity.
 */
import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from "typeorm"

/**
 * User stores bcrypt hash of active refresh JWT string.
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

    @Column()
        password!: string

    /**
     * bcrypt hash of current refresh JWT; overwritten on rotation.
     */
    @Column({
        type: "varchar",
        nullable: true,
    })
        refreshTokenHash!: string | null
}
