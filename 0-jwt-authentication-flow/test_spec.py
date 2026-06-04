import requests
import time

def test(port):
    base_url = f"http://127.0.0.1:{port}"
    print(f"  [TEST] Testing jwt-authentication-flow on port {port}")
    
    email = f"user-{time.time()}@example.com"
    # Flow 1: Signup
    res = requests.post(f"{base_url}/auth/signup", json={"email": email, "password": "password123"}, timeout=10)
    if res.status_code not in (200, 201):
        return False, f"Signup failed: status={res.status_code}, content={res.text}"
        
    # Flow 2: Sign-in
    res = requests.post(f"{base_url}/auth/signin", json={"email": email, "password": "password123"}, timeout=10)
    if res.status_code not in (200, 201):
        return False, f"Login failed: status={res.status_code}, content={res.text}"
    token = res.json().get("access_token") or res.json().get("accessToken") or res.json().get("token")
    if not token:
        return False, f"Token not returned in login response: body={res.text}"
        
    # Flow 3: Access Profile
    res = requests.get(f"{base_url}/users/profile", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    if res.status_code != 200:
        return False, f"Accessing profile failed: status={res.status_code}, content={res.text}"
        
    return True, "All JWT Auth flows passed."
