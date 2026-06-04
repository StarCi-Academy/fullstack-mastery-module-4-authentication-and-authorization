/**
 * Custom decorator — roles.decorator.
 */
import {
    SetMetadata,
} from "@nestjs/common"
import {
    Role,
} from "../role.enum"

/** metadata key for RBAC guard. */
export const ROLES_KEY = "roles"

/**
 * Attach allowed roles metadata for declarative authorization.
 *
 * @param roles — allowed roles spread args
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY,
    roles)
