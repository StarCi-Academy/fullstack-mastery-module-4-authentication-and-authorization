/**
 * AdminModule — registers components for Admin feature.
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

/** Admin feature module. */
@Module({
    controllers: [AdminController],
    providers: [RolesGuard],
})
export class AdminModule {}
