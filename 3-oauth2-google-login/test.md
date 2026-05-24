# Test Result

**Status:** PASSED

## Expected & Actual Matches

**Luồng 1 -- Khởi động chuyển hướng OAuth Google (`GET /auth/google`)**
Yêu cầu redirect trả về status 302:
- Location Header: `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback&scope=email%20profile&client_id=%3Cnh%E1%BA%ADp_key%3E`
Pass criteria: status 302 Redirect và Location trỏ về accounts.google.com.

**Luồng 2 & 3 -- Đăng nhập lần đầu qua Mock Google Callback (`GET /auth/google/callback?code=mockcode`)**
Trả về status 200:
```json
{
  "message": "Đăng nhập Google thành công!",
  "access_token": "<ACCESS_TOKEN_EXISTS>",
  "isNewUser": true,
  "user": {
    "id": 2,
    "email": "mock@demo.com",
    "name": "Mock User",
    "googleSub": "mock-google-sub-123"
  }
}
```
Pass criteria: status 200, `isNewUser` là true và trả về token cùng thông tin user.

**Luồng 4 -- Đăng nhập các lần sau qua Mock Google Callback (`GET /auth/google/callback?code=mockcode`)**
Trả về status 200:
```json
{
  "message": "Đăng nhập Google thành công!",
  "access_token": "<ACCESS_TOKEN_EXISTS>",
  "isNewUser": false,
  "user": {
    "id": 2,
    "email": "mock@demo.com",
    "name": "Mock User",
    "googleSub": "mock-google-sub-123"
  }
}
```
Pass criteria: status 200, `isNewUser` là false với cùng userId.

