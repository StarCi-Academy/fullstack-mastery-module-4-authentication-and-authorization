/**
 * Entity TypeORM — credential (password hash) tách khỏi users.
 * (EN: TypeORM entity — credential row linked to user.)
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
 * Bảng credential — một user một row password bcrypt.
 * (EN: One-to-one credential store per user.)
 */
@Entity({
    name: "user_credentials",
})
export class UserCredentialEntity {
    @PrimaryGeneratedColumn()
        id: number

    @Column()
        userId: number

    @OneToOne(() => UserEntity,
        (user) => user.credential,
        { onDelete: "CASCADE" })
    @JoinColumn({
        name: "userId",
    })
        user: UserEntity

    @Column()
        password: string
}
