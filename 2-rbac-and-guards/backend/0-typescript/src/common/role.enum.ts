/**
 * RBAC roles used across guards and JWT payloads.
 * Each member value matches the string stored in the DB and embedded in the JWT `role` claim.
 */
export enum Role {
    /** Full access — admin dashboard + editor area. */
    ADMIN = "admin",
    /** Content creation access — editor area only (not admin dashboard). */
    EDITOR = "editor",
    /** Regular authenticated user — no protected area access. */
    USER = "user",
    /** Read-only observer — no write or admin privileges. */
    VIEWER = "viewer",
}
