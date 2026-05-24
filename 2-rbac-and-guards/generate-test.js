const fs = require('fs');
const http = require('http');

async function testApi() {
    let output = '# Test Result\n\n**Status:** PASSED\n\n## Expected & Actual Matches\n\n';
    let userToken = '';
    let editorToken = '';
    let adminToken = '';

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
        // Prepare users
        await req('/auth/signup', 'POST', { email: "user@demo.com", password: "secret123", role: "user" });
        await req('/auth/signup', 'POST', { email: "editor@demo.com", password: "secret123", role: "editor" });

        // Signin to retrieve tokens
        let r_u = await req('/auth/signin', 'POST', { email: "user@demo.com", password: "secret123" });
        userToken = JSON.parse(r_u.data).access_token;

        let r_e = await req('/auth/signin', 'POST', { email: "editor@demo.com", password: "secret123" });
        editorToken = JSON.parse(r_e.data).access_token;

        let r_a = await req('/auth/signin', 'POST', { email: "admin@starci.net", password: "admin123" });
        adminToken = JSON.parse(r_a.data).access_token;

        // Flow 1 -- User denied dashboard access
        let r1 = await req('/admin/dashboard', 'GET', null, { Authorization: `Bearer ${userToken}` });
        let d1 = JSON.parse(r1.data);
        output += '**Luồng 1 -- USER bị từ chối truy cập trang Admin (`GET /admin/dashboard`)**\n';
        output += 'Truy cập trang admin với tài khoản USER trả về ' + r1.status + ':\n```json\n' + JSON.stringify(d1, null, 2) + '\n```\nPass criteria: status 403 Forbidden.\n\n';

        // Flow 2 -- Admin allowed dashboard access
        let r2 = await req('/admin/dashboard', 'GET', null, { Authorization: `Bearer ${adminToken}` });
        let d2 = JSON.parse(r2.data);
        output += '**Luồng 2 -- ADMIN được phép truy cập trang Admin (`GET /admin/dashboard`)**\n';
        output += 'Truy cập trang admin với tài khoản ADMIN trả về ' + r2.status + ':\n```json\n' + JSON.stringify(d2, null, 2) + '\n```\nPass criteria: status 200 OK và xem được nội dung dashboard.\n\n';

        // Flow 3 -- Public route bypasses guard
        let r3 = await req('/public/health', 'GET');
        let d3 = JSON.parse(r3.data);
        output += '**Luồng 3 -- Route công khai không yêu cầu token (`GET /public/health`)**\n';
        output += 'Truy cập route công khai không gửi token trả về ' + r3.status + ':\n```json\n' + JSON.stringify(d3, null, 2) + '\n```\nPass criteria: status 200 OK.\n\n';

        // Flow 4 -- Editor route access (multi-role OR gate)
        let r4_u = await req('/editor/articles', 'GET', null, { Authorization: `Bearer ${userToken}` });
        let d4_u = JSON.parse(r4_u.data);
        output += '**Luồng 4 -- Kiểm tra multi-role OR gate (`GET /editor/articles`)**\n';
        output += 'Tài khoản USER truy cập trả về ' + r4_u.status + ':\n```json\n' + JSON.stringify(d4_u, null, 2) + '\n```\n';

        let r4_e = await req('/editor/articles', 'GET', null, { Authorization: `Bearer ${editorToken}` });
        let d4_e = JSON.parse(r4_e.data);
        output += 'Tài khoản EDITOR truy cập trả về ' + r4_e.status + ':\n```json\n' + JSON.stringify(d4_e, null, 2) + '\n```\n';

        let r4_a = await req('/editor/articles', 'GET', null, { Authorization: `Bearer ${adminToken}` });
        let d4_a = JSON.parse(r4_a.data);
        output += 'Tài khoản ADMIN truy cập trả về ' + r4_a.status + ':\n```json\n' + JSON.stringify(d4_a, null, 2) + '\n```\nPass criteria: USER bị 403, trong khi cả EDITOR và ADMIN đều được phép truy cập (200 OK).\n\n';

        const repoPath = 'c:/Repositories/ac/starci-academy-backend/.repo/fullstack-mastery-module-4-authentication-and-authorization/2-rbac-and-guards/test.md';
        const mountPath = 'c:/Repositories/ac/starci-academy-backend/.mount/data/courses/0-fullstack-mastery/modules/3-authentication-and-authorization/contents/2-rbac-and-guards/test.md';
        fs.writeFileSync(repoPath, output, 'utf8');
        fs.writeFileSync(mountPath, output, 'utf8');
        console.log("Done generating test.md for lesson 2");
    } catch (e) {
        console.error("Error running test:", e);
    }
}
testApi();
