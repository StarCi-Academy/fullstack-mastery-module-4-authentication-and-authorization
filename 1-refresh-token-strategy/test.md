# Test Result

**Status:** PASSED

## Expected & Actual Matches

**Luồng 1 -- Đăng ký tài khoản (`POST /auth/signup`)**
Đăng ký user mới trả về 201:
```json
{
  "id": 1,
  "email": "test@demo.com"
}
```
Pass criteria: response status là 201 và trả về thông tin user.

**Luồng 2 -- Đăng nhập nhận cặp Token (`POST /auth/signin`)**
Nhận cặp token trả về 200:
```json
{
  "access_token": "<ACCESS_TOKEN_EXISTS>",
  "refresh_token": "<REFRESH_TOKEN_EXISTS>"
}
```
Pass criteria: status 200 và nhận được cả access_token lẫn refresh_token.

**Luồng 3 -- Rotate / Refresh Token (`POST /auth/refresh`)**
Sử dụng refresh token cũ nhận cặp token mới trả về 200:
```json
{
  "access_token": "<NEW_ACCESS_TOKEN_EXISTS>",
  "refresh_token": "<NEW_REFRESH_TOKEN_EXISTS>"
}
```
Pass criteria: status 200, nhận được cặp token mới.

**Luồng 4 -- Đăng xuất và huỷ Refresh Token (`POST /auth/logout`)**
Đăng xuất trả về 200:
```json
{
  "message": "Logged out"
}
```
Thử dùng lại refresh token sau khi logout trả về 401:
```json
{
  "message": "Refresh token revoked or rotated",
  "error": "Unauthorized",
  "statusCode": 401
}
```
Pass criteria: status 401 Unauthorized do token đã bị thu hồi khi logout.

