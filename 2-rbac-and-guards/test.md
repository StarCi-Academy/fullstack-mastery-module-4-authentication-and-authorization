# Test flows for 2-rbac-and-guards

## Flow 1 — User role accesses /admin/dashboard → 403
**Purpose:** Verify a non-admin JWT is rejected by `RolesGuard`.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/auth/signup -Method Post -ContentType "application/json" -Body '{"email":"user@demo.com","password":"secret123"}'
$userRes = Invoke-RestMethod -Uri http://localhost:3000/auth/signin -Method Post -ContentType "application/json" -Body '{"email":"user@demo.com","password":"secret123"}'
Invoke-RestMethod -Uri http://localhost:3000/admin/dashboard -Headers @{ Authorization = "Bearer $($userRes.access_token)" }
```
**Command (curl):**
```bash
curl -s -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"user@demo.com","password":"secret123"}'
TOKEN=$(curl -s -X POST http://localhost:3000/auth/signin -H "Content-Type: application/json" -d '{"email":"user@demo.com","password":"secret123"}' | jq -r '.access_token')
curl -s http://localhost:3000/admin/dashboard -H "Authorization: Bearer $TOKEN"
```
**Postman hint:** GET `/admin/dashboard` with Bearer header.
**Expected response (HTTP 403):** `{ "message": "Forbidden resource" }`.
**Pass criteria:** Status 403; controller never executed.

## Flow 2 — Admin role accesses /admin/dashboard → 200
**Purpose:** Verify an admin JWT passes both guards.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/auth/signup -Method Post -ContentType "application/json" -Body '{"email":"admin@demo.com","password":"secret123","role":"admin"}'
$adminRes = Invoke-RestMethod -Uri http://localhost:3000/auth/signin -Method Post -ContentType "application/json" -Body '{"email":"admin@demo.com","password":"secret123"}'
Invoke-RestMethod -Uri http://localhost:3000/admin/dashboard -Headers @{ Authorization = "Bearer $($adminRes.access_token)" }
```
**Command (curl):**
```bash
curl -s -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"admin@demo.com","password":"secret123","role":"admin"}'
TOKEN=$(curl -s -X POST http://localhost:3000/auth/signin -H "Content-Type: application/json" -d '{"email":"admin@demo.com","password":"secret123"}' | jq -r '.access_token')
curl -s http://localhost:3000/admin/dashboard -H "Authorization: Bearer $TOKEN"
```
**Postman hint:** GET `/admin/dashboard` with admin Bearer.
**Expected response (HTTP 200):** `{ "message": "Chào mừng Admin vào khu vực mật!", "stats": { "users": 100, "orders": 15 } }`.
**Pass criteria:** Status 200; payload matches.

## Flow 3 — `@Public()` decorator bypasses JwtAuthGuard on /public/health
**Purpose:** Verify `IS_PUBLIC_KEY` metadata short-circuits authentication.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/public/health -Method Get
```
**Command (curl):**
```bash
curl -s http://localhost:3000/public/health
```
**Postman hint:** GET `/public/health` with no headers.
**Expected response (HTTP 200):** `{ "status": "ok" }`.
**Pass criteria:** Status 200 without any Bearer token sent.

## Flow 4 — Multi-role OR check on /editor/articles
**Purpose:** Verify `@Roles("admin", "editor")` allows both ADMIN and EDITOR, rejects VIEWER.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/auth/signup -Method Post -ContentType "application/json" -Body '{"email":"editor@demo.com","password":"secret123","role":"editor"}'
$editorRes = Invoke-RestMethod -Uri http://localhost:3000/auth/signin -Method Post -ContentType "application/json" -Body '{"email":"editor@demo.com","password":"secret123"}'
Invoke-RestMethod -Uri http://localhost:3000/editor/articles -Headers @{ Authorization = "Bearer $($editorRes.access_token)" }
Invoke-RestMethod -Uri http://localhost:3000/editor/articles -Headers @{ Authorization = "Bearer $($adminRes.access_token)" }

Invoke-RestMethod -Uri http://localhost:3000/auth/signup -Method Post -ContentType "application/json" -Body '{"email":"viewer@demo.com","password":"secret123","role":"viewer"}'
$viewerRes = Invoke-RestMethod -Uri http://localhost:3000/auth/signin -Method Post -ContentType "application/json" -Body '{"email":"viewer@demo.com","password":"secret123"}'
Invoke-RestMethod -Uri http://localhost:3000/editor/articles -Headers @{ Authorization = "Bearer $($viewerRes.access_token)" } -ErrorVariable err; $err.ErrorRecord
```
**Command (curl):**
```bash
curl -s -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"editor@demo.com","password":"secret123","role":"editor"}'
EDITOR=$(curl -s -X POST http://localhost:3000/auth/signin -H "Content-Type: application/json" -d '{"email":"editor@demo.com","password":"secret123"}' | jq -r '.access_token')
curl -s http://localhost:3000/editor/articles -H "Authorization: Bearer $EDITOR"
curl -s http://localhost:3000/editor/articles -H "Authorization: Bearer $TOKEN"   # admin from Flow 2

curl -s -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"viewer@demo.com","password":"secret123","role":"viewer"}'
VIEWER=$(curl -s -X POST http://localhost:3000/auth/signin -H "Content-Type: application/json" -d '{"email":"viewer@demo.com","password":"secret123"}' | jq -r '.access_token')
curl -i -s http://localhost:3000/editor/articles -H "Authorization: Bearer $VIEWER"
```
**Postman hint:** GET `/editor/articles` with admin Bearer (200), editor Bearer (200), viewer Bearer (403).
**Expected response:** Admin + editor: HTTP 200 `{ "message": "Editor area — admin và editor đều xem được.", "articles": [{ "id": 1, ...}, { "id": 2, ...}] }`. Viewer: HTTP 403 `{ "statusCode": 403, "message": "Forbidden resource" }`.
**Pass criteria:** Both privileged roles pass; viewer 403; the OR-semantics confirmed by single endpoint.
