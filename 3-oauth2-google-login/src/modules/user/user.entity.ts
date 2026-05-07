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
 * User có thể chỉ tồn tại qua OAuth â€” password có thể null.
 * (EN: Hybrid user row supporting OAuth-first accounts.)
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

    /** Null khi đăng nhập chỉ qua Google â€” không có credential password local. (EN: nullable password for OAuth-only.) */
    @Column({
        type: "varchar",
        nullable: true,
    })
        password: string | null

    /** Provider stable id để khớp account Google tái đăng nhập. (EN: Google subject identifier.) */
    @Column({
        type: "varchar",
        nullable: true,
        unique: true,
    })
        googleId: string | null

    @Column({
        type: "varchar",
        nullable: true,
    })
        firstName: string | null

    @Column({
        type: "varchar",
        nullable: true,
    })
        lastName: string | null

    @Column({
        type: "varchar",
        nullable: true,
    })
        picture: string | null
}
