# Test Result

**Status:** PASSED

## Expected & Actual Matches

**Luồng 1 -- USER bị từ chối truy cập trang Admin (`GET /admin/dashboard`)**
Truy cập trang admin với tài khoản USER trả về 403:
```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```
Pass criteria: status 403 Forbidden.

**Luồng 2 -- ADMIN được phép truy cập trang Admin (`GET /admin/dashboard`)**
Truy cập trang admin với tài khoản ADMIN trả về 200:
```json
{
  "message": "Chào mừng Admin vào khu vực mật!",
  "stats": {
    "users": 100,
    "orders": 15
  }
}
```
Pass criteria: status 200 OK và xem được nội dung dashboard.

**Luồng 3 -- Route công khai không yêu cầu token (`GET /public/health`)**
Truy cập route công khai không gửi token trả về 200:
```json
{
  "status": "ok"
}
```
Pass criteria: status 200 OK.

**Luồng 4 -- Kiểm tra multi-role OR gate (`GET /editor/articles`)**
Tài khoản USER truy cập trả về 403:
```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```
Tài khoản EDITOR truy cập trả về 200:
```json
{
  "message": "Editor area — admin và editor đều xem được.",
  "articles": [
    {
      "id": 1,
      "title": "Hello RBAC"
    },
    {
      "id": 2,
      "title": "Multi-role OR check"
    }
  ]
}
```
Tài khoản ADMIN truy cập trả về 200:
```json
{
  "message": "Editor area — admin và editor đều xem được.",
  "articles": [
    {
      "id": 1,
      "title": "Hello RBAC"
    },
    {
      "id": 2,
      "title": "Multi-role OR check"
    }
  ]
}
```
Pass criteria: USER bị 403, trong khi cả EDITOR và ADMIN đều được phép truy cập (200 OK).

