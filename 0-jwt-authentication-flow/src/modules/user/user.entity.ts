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
 * Bảng người dùng credential-based â€” password luôn lÃ  bcrypt hash trong DB.
 * (EN: Credential user entity storing bcrypt hash only.)
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

    /** Hash bcrypt của password â€” không lưu plaintext (EN: bcrypt digest column). */
    @Column()
        password: string
}
