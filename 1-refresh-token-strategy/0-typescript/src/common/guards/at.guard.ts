import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/** Bearer access JWT guard. */
@Injectable()
export class AtGuard extends AuthGuard("jwt") {}
