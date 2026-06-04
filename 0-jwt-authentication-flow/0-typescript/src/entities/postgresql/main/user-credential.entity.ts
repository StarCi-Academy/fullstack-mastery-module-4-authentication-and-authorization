/**
 * TypeORM entity — credential row linked to user.
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
 * One-to-one credential store per user.
 */
@Entity({
    name: "user_credentials",
})
export class UserCredentialEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column()
        userId!: number

    @OneToOne(() => UserEntity,
        (user) => user.credential,
        { onDelete: "CASCADE" })
    @JoinColumn({
        name: "userId",
    })
        user!: UserEntity

    @Column()
        password!: string
}
