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

/** User row carrying RBAC role. */
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

    /** persisted RBAC role */
    @Column({
        type: "varchar",
        default: Role.USER,
    })
        role!: Role
}
