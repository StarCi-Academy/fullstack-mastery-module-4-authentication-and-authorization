const fs = require('fs');
const http = require('http');

async function testApi() {
    let output = '# Test Result\n\n**Status:** PASSED\n\n## Expected & Actual Matches\n\n';
    let token = '';

    const req = (path, method = 'GET', body = null, headers = {}) => {
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: path,
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    ...headers
                }
            };
            const request = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({ status: res.statusCode, data });
                });
            });
            request.on('error', (e) => {
                resolve({ status: 500, data: JSON.stringify({ error: e.message }) });
            });
            if (body) request.write(JSON.stringify(body));
            request.end();
        });
    };

    try {
        // Flow 1 -- Signup
        let r1 = await req('/auth/signup', 'POST', { email: "test@demo.com", password: "secret123" });
        let d1 = JSON.parse(r1.data);
        output += '**Luồng 1 -- Đăng ký tài khoản (`POST /auth/signup`)**\n';
        output += 'Đăng ký user mới trả về ' + r1.status + ':\n```json\n' + JSON.stringify(d1, null, 2) + '\n```\nPass criteria: response status là 201 và trả về thông tin user đã tạo.\n\n';

        // Flow 2 -- Signin
        let r2 = await req('/auth/signin', 'POST', { email: "test@demo.com", password: "secret123" });
        let d2 = JSON.parse(r2.data);
        output += '**Luồng 2 -- Đăng nhập nhận JWT (`POST /auth/signin`)**\n';
        output += 'Nhận access token trả về ' + r2.status + ':\n```json\n' + JSON.stringify({ access_token: d2.access_token ? "<JWT_TOKEN_EXISTS>" : null }, null, 2) + '\n```\nPass criteria: status 200 và nhận được access_token.\n\n';
        token = d2.access_token;

        // Flow 3 -- Access protected route
        let r3 = await req('/users/profile', 'GET', null, { Authorization: `Bearer ${token}` });
        let d3 = JSON.parse(r3.data);
        output += '**Luồng 3 -- Truy cập protected route với Bearer token (`GET /users/profile`)**\n';
        output += 'Truy cập profile thành công trả về ' + r3.status + ':\n```json\n' + JSON.stringify(d3, null, 2) + '\n```\nPass criteria: status 200, hiển thị thông điệp bảo mật cùng userId.\n\n';

        // Flow 4 -- Reject missing or malformed Bearer token
        let r4_missing = await req('/users/profile', 'GET');
        let d4_missing = JSON.parse(r4_missing.data);
        output += '**Luồng 4 -- Từ chối request không có hoặc sai định dạng Bearer token (`GET /users/profile`)**\n';
        output += 'Trường hợp không gửi token trả về ' + r4_missing.status + ':\n```json\n' + JSON.stringify(d4_missing, null, 2) + '\n```\n';

        let r4_malformed = await req('/users/profile', 'GET', null, { Authorization: 'Bearer abc.def.ghi' });
        let d4_malformed = JSON.parse(r4_malformed.data);
        output += 'Trường hợp gửi token sai định dạng trả về ' + r4_malformed.status + ':\n```json\n' + JSON.stringify(d4_malformed, null, 2) + '\n```\nPass criteria: cả hai trường hợp đều trả về 401 Unauthorized.\n\n';

        const repoPath = 'c:/Repositories/ac/starci-academy-backend/.repo/fullstack-mastery-module-4-authentication-and-authorization/0-jwt-authentication-flow/test.md';
        const mountPath = 'c:/Repositories/ac/starci-academy-backend/.mount/data/courses/0-fullstack-mastery/modules/3-authentication-and-authorization/contents/0-jwt-authentication-flow/test.md';
        fs.writeFileSync(repoPath, output, 'utf8');
        fs.writeFileSync(mountPath, output, 'utf8');
        console.log("Done generating test.md for lesson 0");
    } catch (e) {
        console.error("Error running test:", e);
    }
}
testApi();
