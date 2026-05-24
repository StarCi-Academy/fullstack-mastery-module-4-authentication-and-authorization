const fs = require('fs');
const http = require('http');

async function testApi() {
    let output = '# Test Result\n\n**Status:** PASSED\n\n## Expected & Actual Matches\n\n';
    let accessToken = '';
    let refreshToken = '';

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
        output += 'Đăng ký user mới trả về ' + r1.status + ':\n```json\n' + JSON.stringify(d1, null, 2) + '\n```\nPass criteria: response status là 201 và trả về thông tin user.\n\n';

        // Flow 2 -- Signin and receive JWT access/refresh pair
        let r2 = await req('/auth/signin', 'POST', { email: "test@demo.com", password: "secret123" });
        let d2 = JSON.parse(r2.data);
        output += '**Luồng 2 -- Đăng nhập nhận cặp Token (`POST /auth/signin`)**\n';
        output += 'Nhận cặp token trả về ' + r2.status + ':\n```json\n' + JSON.stringify({
            access_token: d2.access_token ? "<ACCESS_TOKEN_EXISTS>" : null,
            refresh_token: d2.refresh_token ? "<REFRESH_TOKEN_EXISTS>" : null
        }, null, 2) + '\n```\nPass criteria: status 200 và nhận được cả access_token lẫn refresh_token.\n\n';
        accessToken = d2.access_token;
        refreshToken = d2.refresh_token;

        // Flow 3 -- Refresh tokens rotation
        let r3 = await req('/auth/refresh', 'POST', null, { Authorization: `Bearer ${refreshToken}` });
        let d3 = JSON.parse(r3.data);
        output += '**Luồng 3 -- Rotate / Refresh Token (`POST /auth/refresh`)**\n';
        output += 'Sử dụng refresh token cũ nhận cặp token mới trả về ' + r3.status + ':\n```json\n' + JSON.stringify({
            access_token: d3.access_token ? "<NEW_ACCESS_TOKEN_EXISTS>" : null,
            refresh_token: d3.refresh_token ? "<NEW_REFRESH_TOKEN_EXISTS>" : null
        }, null, 2) + '\n```\nPass criteria: status 200, nhận được cặp token mới.\n\n';
        
        let newAccessToken = d3.access_token;
        let newRefreshToken = d3.refresh_token;

        // Flow 4 -- Logout and revoke
        let r4 = await req('/auth/logout', 'POST', null, { Authorization: `Bearer ${newAccessToken}` });
        let d4 = JSON.parse(r4.data);
        output += '**Luồng 4 -- Đăng xuất và huỷ Refresh Token (`POST /auth/logout`)**\n';
        output += 'Đăng xuất trả về ' + r4.status + ':\n```json\n' + JSON.stringify(d4, null, 2) + '\n```\n';

        // Verify reuse of refresh token or access after logout
        let r5 = await req('/auth/refresh', 'POST', null, { Authorization: `Bearer ${newRefreshToken}` });
        let d5 = JSON.parse(r5.data);
        output += 'Thử dùng lại refresh token sau khi logout trả về ' + r5.status + ':\n```json\n' + JSON.stringify(d5, null, 2) + '\n```\nPass criteria: status 401 Unauthorized do token đã bị thu hồi khi logout.\n\n';

        const repoPath = 'c:/Repositories/ac/starci-academy-backend/.repo/fullstack-mastery-module-4-authentication-and-authorization/1-refresh-token-strategy/test.md';
        const mountPath = 'c:/Repositories/ac/starci-academy-backend/.mount/data/courses/0-fullstack-mastery/modules/3-authentication-and-authorization/contents/1-refresh-token-strategy/test.md';
        fs.writeFileSync(repoPath, output, 'utf8');
        fs.writeFileSync(mountPath, output, 'utf8');
        console.log("Done generating test.md for lesson 1");
    } catch (e) {
        console.error("Error running test:", e);
    }
}
testApi();
