import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/** Refresh JWT guard. */
@Injectable()
export class RtGuard extends AuthGuard("jwt-refresh") {}
