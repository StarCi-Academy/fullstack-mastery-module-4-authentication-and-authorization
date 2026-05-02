import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from "typeorm"

/**
 * User có `refreshTokenHash` (bcrypt) để bind phiên refresh hiện tại — rotate/revoke theo bài học.
 * (EN: User stores bcrypt hash of active refresh JWT for rotation/revocation.)
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
     * Hash bcrypt của refresh JWT đang hiệu lực — ghi đè mỗi lần rotate; null sau logout/revoke.
     * (EN: bcrypt hash of current refresh JWT; cleared on logout.)
     */
    @Column({
        type: "varchar",
        nullable: true,
    })
        refreshTokenHash: string | null
}
