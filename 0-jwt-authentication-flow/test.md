# Test flows for 0-jwt-authentication-flow

## Flow 1 — Signup
**Purpose:** Verify user creation hashes the password and persists the row.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/auth/signup -Method Post -ContentType "application/json" -Body '{"email":"test@demo.com","password":"secret123"}'
```
**Command (curl):**
```bash
curl -s -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"test@demo.com","password":"secret123"}'
```
**Postman hint:** POST `http://localhost:3000/auth/signup`, Body → raw JSON `{"email":"test@demo.com","password":"secret123"}`.
**Expected response (HTTP 201):** `{ "message": "Created" }`.
**Pass criteria:** Response status is 201 and body matches. Row exists in `users` table with bcrypt-hashed password.

## Flow 2 — Signin and receive JWT
**Purpose:** Verify credentials bcrypt-match and the server signs a JWT with `sub`.
**Command (PowerShell):**
```powershell
$res = Invoke-RestMethod -Uri http://localhost:3000/auth/signin -Method Post -ContentType "application/json" -Body '{"email":"test@demo.com","password":"secret123"}'
$res.access_token
```
**Command (curl):**
```bash
curl -s -X POST http://localhost:3000/auth/signin -H "Content-Type: application/json" -d '{"email":"test@demo.com","password":"secret123"}'
```
**Postman hint:** POST `http://localhost:3000/auth/signin`, Body → raw JSON `{"email":"test@demo.com","password":"secret123"}`.
**Expected response (HTTP 200):** `{ "access_token": "<JWT>" }`.
**Pass criteria:** JWT decodes (jwt.io) to `{ sub: <userId>, iat, exp }`.

## Flow 3 — Access protected route
**Purpose:** Verify `JwtAuthGuard` accepts a valid Bearer and exposes `req.user`.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/users/profile -Headers @{ Authorization = "Bearer $($res.access_token)" }
```
**Command (curl):**
```bash
curl -s http://localhost:3000/users/profile -H "Authorization: Bearer <JWT>"
```
**Postman hint:** GET `http://localhost:3000/users/profile`, Headers → `Authorization: Bearer <JWT>`.
**Expected response (HTTP 200):** `{ "message": "You have accessed a protected area!", "user": { "userId": 1 } }`.
**Pass criteria:** Status 200, `user.userId` matches the `sub` from Flow 2.

## Flow 4 — Reject missing or malformed Bearer token
**Purpose:** Verify `JwtAuthGuard` 401s on both absent header and unverifiable token.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/users/profile -Method Get -ErrorVariable err; $err.ErrorRecord.ErrorDetails
Invoke-RestMethod -Uri http://localhost:3000/users/profile -Headers @{ Authorization = "Bearer abc.def.ghi" } -ErrorVariable err
```
**Command (curl):**
```bash
curl -i -s http://localhost:3000/users/profile
curl -i -s http://localhost:3000/users/profile -H "Authorization: Bearer abc.def.ghi"
```
**Postman hint:** GET `http://localhost:3000/users/profile` with no header, then with `Authorization: Bearer abc.def.ghi`.
**Expected response (HTTP 401):** `{ "statusCode": 401, "message": "Unauthorized" }` for both sub-cases.
**Pass criteria:** Both calls return 401; controller logic does not run (no DB access logs).
