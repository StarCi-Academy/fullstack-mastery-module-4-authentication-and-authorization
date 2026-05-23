/**
 * AdminModule — đăng ký các thành phần của feature Admin.
 * (EN: AdminModule — registers components for Admin feature.)
 */
import {
    Module,
} from "@nestjs/common"
import {
    AdminController,
} from "./admin.controller"
import {
    RolesGuard,
} from "../../common"

/** Module đăng ký RolesGuard như provider để Nest inject Reflector đúng scope demo. (EN: Admin feature module.) */
@Module({
    controllers: [AdminController],
    providers: [RolesGuard],
})
export class AdminModule {}
