/**
 * Entity TypeORM — thuc the User.
 * (EN: TypeORM entity — User entity.)
 */
import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from "typeorm"
import {
    Role,
} from "../../common/role.enum"

/** User có `role` để RolesGuard đối chiếu sau JwtAuthGuard. (EN: User row carrying RBAC role.) */
@Entity({
    name: "users",
})
export class User {
    @PrimaryGeneratedColumn()
        id: number

    @Column({
        unique: true,
    })
        email: string

    @Column()
        password: string

    /** Role string lưu DB — khớp enum Role để nhất quán JWT payload (EN: persisted RBAC role). */
    @Column({
        type: "varchar",
        default: Role.USER,
    })
        role: Role
}
