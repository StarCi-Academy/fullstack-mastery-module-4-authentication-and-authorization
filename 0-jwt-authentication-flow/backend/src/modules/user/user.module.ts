/**
 * UserModule — đăng ký các thành phần của feature User.
 * (EN: UserModule — registers components for User feature.)
 */
import {
    Module,
} from "@nestjs/common"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    UserCredentialEntity,
    UserEntity,
} from "../../entities"
import {
    AuthModule,
} from "../auth/auth.module"
import {
    UserController,
} from "./user.controller"

/**
 * Feature module user — import AuthModule cho JwtAuthGuard, không import barrel auth.
 * (EN: User feature module; AuthModule import avoids circular barrel re-exports.)
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, UserCredentialEntity]),
        AuthModule,
    ],
    controllers: [UserController],
})
export class UserModule {}
