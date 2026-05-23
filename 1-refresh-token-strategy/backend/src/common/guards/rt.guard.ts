import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/** RtGuard — bảo vệ `POST /auth/refresh` với refresh Bearer. (EN: Refresh JWT guard.) */
@Injectable()
export class RtGuard extends AuthGuard("jwt-refresh") {}
