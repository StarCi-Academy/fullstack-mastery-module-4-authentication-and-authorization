/**
 * UserModule — registers components for User feature.
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
 * User feature module; AuthModule import avoids circular barrel re-exports.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, UserCredentialEntity]),
        AuthModule,
    ],
    controllers: [UserController],
})
export class UserModule {}
