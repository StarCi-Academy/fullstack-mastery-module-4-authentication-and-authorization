/**
 * TypeORM entity — User identity without credentials.
 */
import {
    Column,
    Entity,
    OneToOne,
    PrimaryGeneratedColumn,
} from "typeorm"
import {
    UserCredentialEntity,
} from "./user-credential.entity"

/**
 * User table; bcrypt hash lives in user_credentials.
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

    @OneToOne(() => UserCredentialEntity,
        (credential) => credential.user,
        { cascade: true })
        credential?: UserCredentialEntity
}
