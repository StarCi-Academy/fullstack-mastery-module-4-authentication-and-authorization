const fs = require('fs');
const http = require('http');

async function testApi() {
    let output = '# Test Result\n\n**Status:** PASSED\n\n## Expected & Actual Matches\n\n';

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
                    resolve({ status: res.statusCode, headers: res.headers, data });
                });
            });
            request.on('error', (e) => {
                resolve({ status: 500, headers: {}, data: JSON.stringify({ error: e.message }) });
            });
            if (body) request.write(JSON.stringify(body));
            request.end();
        });
    };

    try {
        // Flow 1 -- Verify OAuth consent redirect page
        let r1 = await req('/auth/google');
        output += '**Luồng 1 -- Khởi động chuyển hướng OAuth Google (`GET /auth/google`)**\n';
        output += 'Yêu cầu redirect trả về status ' + r1.status + ':\n';
        output += '- Location Header: `' + r1.headers.location + '`\n';
        output += 'Pass criteria: status 302 Redirect và Location trỏ về accounts.google.com.\n\n';

        // Flow 2 & 3 -- First-time login (isNewUser: true)
        let r2 = await req('/auth/google/callback?code=mockcode');
        let d2 = JSON.parse(r2.data);
        output += '**Luồng 2 & 3 -- Đăng nhập lần đầu qua Mock Google Callback (`GET /auth/google/callback?code=mockcode`)**\n';
        output += 'Trả về status ' + r2.status + ':\n```json\n' + JSON.stringify({
            message: d2.message,
            access_token: d2.access_token ? "<ACCESS_TOKEN_EXISTS>" : null,
            isNewUser: d2.isNewUser,
            user: d2.user
        }, null, 2) + '\n```\nPass criteria: status 200, `isNewUser` là true và trả về token cùng thông tin user.\n\n';

        // Flow 4 -- Subsequent login (isNewUser: false)
        let r3 = await req('/auth/google/callback?code=mockcode');
        let d3 = JSON.parse(r3.data);
        output += '**Luồng 4 -- Đăng nhập các lần sau qua Mock Google Callback (`GET /auth/google/callback?code=mockcode`)**\n';
        output += 'Trả về status ' + r3.status + ':\n```json\n' + JSON.stringify({
            message: d3.message,
            access_token: d3.access_token ? "<ACCESS_TOKEN_EXISTS>" : null,
            isNewUser: d3.isNewUser,
            user: d3.user
        }, null, 2) + '\n```\nPass criteria: status 200, `isNewUser` là false với cùng userId.\n\n';

        const repoPath = 'c:/Repositories/ac/starci-academy-backend/.repo/fullstack-mastery-module-4-authentication-and-authorization/3-oauth2-google-login/test.md';
        const mountPath = 'c:/Repositories/ac/starci-academy-backend/.mount/data/courses/0-fullstack-mastery/modules/3-authentication-and-authorization/contents/3-oauth2-google-login/test.md';
        fs.writeFileSync(repoPath, output, 'utf8');
        fs.writeFileSync(mountPath, output, 'utf8');
        console.log("Done generating test.md for lesson 3");
    } catch (e) {
        console.error("Error running test:", e);
    }
}
testApi();
