import {
    Module,
} from "@nestjs/common"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    User,
} from "./user.entity"
import {
    UserController,
} from "./user.controller"

/**
 * Feature module user — route ví dụ được AtGuard bảo vệ.
 * (EN: User feature module with sample protected route.)
 */
@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [UserController],
    exports: [TypeOrmModule],
})
export class UserModule {}
