# Test flows for 3-oauth2-google-login

## Flow 1 — OAuth2 consent redirect (real Google)
**Purpose:** Verify the redirect to Google's consent screen and the post-consent callback issuing local JWT + isNewUser.
**Command (PowerShell):**
```powershell
# Open browser at http://localhost:3000/auth/google
Start-Process "http://localhost:3000/auth/google"
# After consent, the browser is redirected to /auth/google/callback/real?code=... and returns JSON.
```
**Command (curl):**
```bash
# OAuth2 redirect requires a browser session — execute via UI, then capture the JSON response from /auth/google/callback/real.
xdg-open "http://localhost:3000/auth/google"
```
**Postman hint:** Open `http://localhost:3000/auth/google` in a browser; capture the JSON returned by the callback.
**Expected response (HTTP 200):** `{ "message": "Đăng nhập Google thành công!", "access_token": "<JWT>", "isNewUser": <bool>, "user": { "id": …, "email": …, "name": …, "googleSub": … } }`.
**Pass criteria:** JWT decodes to `{ sub: <userId> }`; `googleSub` matches the Google account's `sub` claim.

## Flow 2 — Mocked callback (`MOCK_GOOGLE=true`)
**Purpose:** Verify the mock branch issues a JWT without invoking Google.
**Command (PowerShell):**
```powershell
$env:MOCK_GOOGLE = "true"; nest start --watch    # terminal 1
Invoke-RestMethod -Uri "http://localhost:3000/auth/google/callback?code=mockcode" -Method Get   # terminal 2
```
**Command (curl):**
```bash
MOCK_GOOGLE=true nest start --watch    # terminal 1
curl -s "http://localhost:3000/auth/google/callback?code=mockcode"
```
**Postman hint:** GET `http://localhost:3000/auth/google/callback?code=mockcode`.
**Expected response (HTTP 200):** `{ "message": "Đăng nhập Google thành công!", "access_token": "<JWT>", "isNewUser": <bool>, "user": { "id": …, "email": "mock@demo.com", "name": "Mock User", "googleSub": "mock-google-sub-123" } }`.
**Pass criteria:** Status 200; mock user persisted in DB.

## Flow 3 — First-time login (profile sync, `isNewUser: true`)
**Purpose:** Verify the upsert takes the INSERT path on a never-seen Google sub.
**Command (PowerShell):**
```powershell
docker compose -f .docker/compose.yaml down -v
docker compose -f .docker/compose.yaml up -d
Start-Sleep -Seconds 3
Invoke-RestMethod -Uri "http://localhost:3000/auth/google/callback?code=mockcode" -Method Get
```
**Command (curl):**
```bash
docker compose -f .docker/compose.yaml down -v && docker compose -f .docker/compose.yaml up -d
sleep 3
curl -s "http://localhost:3000/auth/google/callback?code=mockcode"
```
**Postman hint:** After DB reset, GET `http://localhost:3000/auth/google/callback?code=mockcode`.
**Expected response (HTTP 200):** `{ "message": "Đăng nhập Google thành công!", "access_token": "<JWT>", "isNewUser": true, "user": { "id": 1, "email": "mock@demo.com", "name": "Mock User", "googleSub": "mock-google-sub-123" } }`.
**Pass criteria:** `isNewUser: true`; row count in `users` increases by 1.

## Flow 4 — Returning login (`isNewUser: false`)
**Purpose:** Verify the upsert takes the UPDATE path on a known Google sub.
**Command (PowerShell):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/auth/google/callback?code=mockcode" -Method Get
```
**Command (curl):**
```bash
curl -s "http://localhost:3000/auth/google/callback?code=mockcode"
```
**Postman hint:** Re-call GET `http://localhost:3000/auth/google/callback?code=mockcode` after Flow 3.
**Expected response (HTTP 200):** `{ "message": "Đăng nhập Google thành công!", "access_token": "<JWT>", "isNewUser": false, "user": { "id": 1, "email": "mock@demo.com", "name": "Mock User", "googleSub": "mock-google-sub-123" } }`.
**Pass criteria:** Same `id` as Flow 3; `isNewUser: false`; row count in `users` unchanged.
