/**
 * Custom decorator — roles.decorator.
 * (EN: Custom decorator — roles.decorator.)
 */
import {
    SetMetadata,
} from "@nestjs/common"
import {
    Role,
} from "../role.enum"

/** Metadata key để RolesGuard đọc qua Reflector (EN: metadata key for RBAC guard.) */
export const ROLES_KEY = "roles"

/**
 * Gắn danh sách Role được phép vÃ o handler/controller â€” declarative AuthZ.
 * (EN: Attach allowed roles metadata for declarative authorization.)
 *
 * @param roles â€” Một hoặc nhiá»u Role enum (EN: allowed roles spread args).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY,
    roles)
