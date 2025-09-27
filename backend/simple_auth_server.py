from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import hashlib
import time
from urllib.parse import urlparse

# ユーザーデータベース（テスト用）
USERS = {
    "admin@example.com": {
        "password_hash": hashlib.sha256("password".encode()).hexdigest(),
        "name": "管理者",
        "id": "1",
        "role": "admin"
    }
}

# セッショントークン管理
SESSIONS = {}

class CORSRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:3001')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.end_headers()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path == '/api/v1/auth/login':
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)

            email = data.get('email')
            password = data.get('password')

            if email in USERS:
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                if USERS[email]['password_hash'] == password_hash:
                    # ログイン成功
                    token = hashlib.sha256(f"{email}{time.time()}".encode()).hexdigest()
                    SESSIONS[token] = {
                        "user": USERS[email],
                        "email": email
                    }

                    response_data = {
                        "success": True,
                        "token": token,
                        "user": {
                            "id": USERS[email]["id"],
                            "email": email,
                            "name": USERS[email]["name"],
                            "role": USERS[email]["role"]
                        }
                    }

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', 'http://localhost:3001')
                    self.send_header('Access-Control-Allow-Credentials', 'true')
                    self.end_headers()
                    self.wfile.write(json.dumps(response_data).encode())
                    return

            # ログイン失敗
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', 'http://localhost:3001')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": "Invalid email or password"
            }).encode())

        elif path == '/api/v1/auth/logout':
            # ログアウト処理
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', 'http://localhost:3001')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode())

        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', 'http://localhost:3001')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path == '/api/v1/auth/me':
            # 現在のユーザー情報を返す（簡易実装）
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', 'http://localhost:3001')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.end_headers()
            self.wfile.write(json.dumps({
                "id": "1",
                "email": "admin@example.com",
                "name": "管理者",
                "role": "admin"
            }).encode())
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', 'http://localhost:3001')
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

def run(server_class=HTTPServer, handler_class=CORSRequestHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting httpd server on port {port}...')
    print(f'API endpoint: http://localhost:{port}/api/v1/auth/login')
    print(f'Test credentials: admin@example.com / password')
    httpd.serve_forever()

if __name__ == '__main__':
    run()