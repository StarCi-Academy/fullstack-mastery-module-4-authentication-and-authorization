/**
 * Normalized Google identity subset passed into AuthService.
 */
export type GoogleProfilePayload = {
    googleId: string
    email: string
    firstName?: string
    lastName?: string
    picture?: string
}
