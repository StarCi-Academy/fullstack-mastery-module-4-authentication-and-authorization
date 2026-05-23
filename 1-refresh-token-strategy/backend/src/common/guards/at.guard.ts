import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/** AtGuard — chặn request thiếu access JWT hợp lệ. (EN: Bearer access JWT guard.) */
@Injectable()
export class AtGuard extends AuthGuard("jwt") {}
