/**
 * Normalized Google identity subset passed into AuthService.
 * Strips Passport-specific internals so AuthService has no dependency on the
 * passport-google-oauth20 Profile type — making it reusable from mock branches too.
 */
export type GoogleProfilePayload = {
    /** Stable Google `sub` (subject) identifier — never changes for the same Google account. */
    googleId: string
    /** Verified email address returned by Google after consent. */
    email: string
    /** User's given (first) name from the Google profile; optional because not all accounts expose it. */
    firstName?: string
    /** User's family (last) name from the Google profile; optional for the same reason. */
    lastName?: string
    /** URL of the user's Google profile photo; optional — used only as a display hint. */
    picture?: string
}
