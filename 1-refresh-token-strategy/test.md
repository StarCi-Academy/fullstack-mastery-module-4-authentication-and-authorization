# Test flows for 1-refresh-token-strategy

## Flow 1 — Signin and receive token pair
**Purpose:** Verify signup → signin returns both access and refresh tokens.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/auth/signup -Method Post -ContentType "application/json" -Body '{"email":"test@demo.com","password":"secret123"}'
$res = Invoke-RestMethod -Uri http://localhost:3000/auth/signin -Method Post -ContentType "application/json" -Body '{"email":"test@demo.com","password":"secret123"}'
$res
```
**Command (curl):**
```bash
curl -s -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"test@demo.com","password":"secret123"}'
curl -s -X POST http://localhost:3000/auth/signin -H "Content-Type: application/json" -d '{"email":"test@demo.com","password":"secret123"}'
```
**Postman hint:** POST `/auth/signin`, raw JSON body.
**Expected response (HTTP 200):** `{ "access_token": "<JWT>", "refresh_token": "<JWT>" }`.
**Pass criteria:** Both tokens present and decode independently (different secrets).

## Flow 2 — Use refresh token to renew
**Purpose:** Verify rotation issues a new pair and overwrites the stored hash.
**Command (PowerShell):**
```powershell
$new = Invoke-RestMethod -Uri http://localhost:3000/auth/refresh -Method Post -ContentType "application/json" -Body "{`"refresh_token`":`"$($res.refresh_token)`"}"
$new
```
**Command (curl):**
```bash
curl -s -X POST http://localhost:3000/auth/refresh -H "Content-Type: application/json" -d '{"refresh_token":"<refresh_token>"}'
```
**Postman hint:** POST `/auth/refresh`, raw JSON body with `refresh_token`.
**Expected response (HTTP 200):** `{ "access_token": "<new>", "refresh_token": "<new>" }`.
**Pass criteria:** New tokens differ from Flow 1; the DB hash now matches the new refresh token.

## Flow 3 — Reused old refresh token triggers family revoke
**Purpose:** Verify replay of an old (already-rotated) refresh token revokes the family.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/auth/refresh -Method Post -ContentType "application/json" -Body "{`"refresh_token`":`"$($res.refresh_token)`"}" -ErrorVariable err; $err.ErrorRecord
```
**Command (curl):**
```bash
curl -i -s -X POST http://localhost:3000/auth/refresh -H "Content-Type: application/json" -d '{"refresh_token":"<OLD refresh_token from Flow 1>"}'
```
**Postman hint:** Replay the OLD refresh_token from Flow 1.
**Expected response (HTTP 403):** `{ "statusCode": 403, "message": "Access Denied" }`.
**Pass criteria:** 403 returned; subsequent refresh with `$new.refresh_token` also fails (family-revoke confirmed).

## Flow 4 — Explicit logout invalidates refresh
**Purpose:** Verify logout nulls the stored hash and subsequent refresh 401s.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/auth/logout -Method Post -Headers @{ Authorization = "Bearer $($new.access_token)" }
Invoke-RestMethod -Uri http://localhost:3000/auth/refresh -Method Post -ContentType "application/json" -Body "{`"refresh_token`":`"$($new.refresh_token)`"}" -ErrorVariable err; $err.ErrorRecord
```
**Command (curl):**
```bash
curl -s -X POST http://localhost:3000/auth/logout -H "Authorization: Bearer <NEW access_token>"
curl -i -s -X POST http://localhost:3000/auth/refresh -H "Content-Type: application/json" -d '{"refresh_token":"<NEW refresh_token>"}'
```
**Postman hint:** POST `/auth/logout` with Bearer header; then POST `/auth/refresh` with the same refresh token.
**Expected response:** Logout (HTTP 200) `{ "message": "Logged out" }`. Refresh (HTTP 401) `{ "statusCode": 401, "message": "Refresh token revoked or rotated" }`.
**Pass criteria:** Logout returns 200; subsequent refresh returns 401 (hash is now NULL).
