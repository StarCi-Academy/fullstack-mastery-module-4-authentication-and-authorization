import {
    Module,
} from "@nestjs/common"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    UserEntity,
} from "../../entities"
import {
    UserController,
} from "./user.controller"

/**
 * Feature module user — route ví dụ được AtGuard bảo vệ.
 * (EN: User feature module with sample protected route.)
 */
@Module({
    imports: [TypeOrmModule.forFeature([UserEntity])],
    controllers: [UserController],
    exports: [TypeOrmModule],
})
export class UserModule {}
