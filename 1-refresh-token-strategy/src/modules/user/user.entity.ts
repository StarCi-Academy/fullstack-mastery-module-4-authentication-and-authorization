/**
 * Entity TypeORM — thuc the User.
 * (EN: TypeORM entity — User entity.)
 */
import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from "typeorm"

/**
 * User có thêm `hashedRefreshToken` để bind phiên refresh hiện tại (rotation).
 * (EN: User stores bcrypt hash of active refresh JWT string.)
 */
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

    /**
     * Hash bcrypt của refresh JWT đang hiệu lực — đổi sau mỗi lần rotate.
     * (EN: bcrypt hash of current refresh JWT; overwritten on rotation.)
     */
    @Column({
        type: "varchar",
        nullable: true,
    })
        refreshTokenHash: string | null
}
