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
Pass criteria: response status là 201 và trả về thông tin user đã tạo.

**Luồng 2 -- Đăng nhập nhận JWT (`POST /auth/signin`)**
Nhận access token trả về 200:
```json
{
  "access_token": "<JWT_TOKEN_EXISTS>"
}
```
Pass criteria: status 200 và nhận được access_token.

**Luồng 3 -- Truy cập protected route với Bearer token (`GET /users/profile`)**
Truy cập profile thành công trả về 200:
```json
{
  "message": "Bạn đã truy cập vào khu vực bảo mật!",
  "user": {
    "userId": 1
  }
}
```
Pass criteria: status 200, hiển thị thông điệp bảo mật cùng userId.

**Luồng 4 -- Từ chối request không có hoặc sai định dạng Bearer token (`GET /users/profile`)**
Trường hợp không gửi token trả về 401:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```
Trường hợp gửi token sai định dạng trả về 401:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```
Pass criteria: cả hai trường hợp đều trả về 401 Unauthorized.

