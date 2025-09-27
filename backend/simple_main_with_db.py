#!/usr/bin/env python3

import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# データベース接続無しでテスト用の簡易実装
# 実際のデータベースの代わりにメモリ内データストアを使用

# ユーザーデータ（テスト用）
USERS = {
    '550e8400-e29b-41d4-a716-446655440000': {
        'id': '550e8400-e29b-41d4-a716-446655440000',
        'email': 'admin@example.com',
        'name': '管理者',
        'role': 'admin',
        'department': '情報システム部',
        'position': '部長',
        'employee_id': 'EMP001',
        'is_active': True,
        'created_at': '2024-01-01T00:00:00Z',
        'updated_at': '2024-01-01T00:00:00Z',
        'password_hash': '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'  # "password"
    }
}

# セッション管理
SESSIONS = {}

class CORSRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:3001')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.end_headers()

    def log_message(self, format, *args):
        # ログ出力を簡潔にする
        print(f"{self.address_string()} - {format % args}")

    def send_json_response(self, status_code: int, data: dict):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:3001')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode('utf-8'))

    def get_bearer_token(self):
        """Authorizationヘッダーからトークンを取得"""
        auth_header = self.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            return auth_header[7:]
        return None

    def validate_session(self, token: str):
        """セッションを検証"""
        if not token:
            return None

        session = SESSIONS.get(token)
        if not session:
            return None

        # トークンの有効期限チェック
        if datetime.now() > session['expires_at']:
            del SESSIONS[token]
            return None

        # 最終アクセス時刻を更新
        session['last_accessed'] = datetime.now()

        return session.get('user')

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path == '/health':
            self.send_json_response(200, {
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'service': 'niwayakanri-api'
            })

        elif path == '/api/v1/auth/me':
            token = self.get_bearer_token()
            user = self.validate_session(token)

            if not user:
                self.send_json_response(401, {
                    'success': False,
                    'message': 'Invalid or expired session token'
                })
                return

            self.send_json_response(200, user)

        elif path == '/api/v1/dashboard/stats':
            token = self.get_bearer_token()
            user = self.validate_session(token)

            if not user:
                self.send_json_response(401, {
                    'success': False,
                    'message': 'Invalid or expired session token'
                })
                return

            # ダミーの統計データ
            stats = {
                'total_requests': 12,
                'pending_requests': 3,
                'approved_requests': 7,
                'rejected_requests': 2,
                'my_pending_approvals': 1
            }

            self.send_json_response(200, {
                'success': True,
                'data': stats
            })

        elif path == '/api/v1/requests/':
            token = self.get_bearer_token()
            user = self.validate_session(token)

            if not user:
                self.send_json_response(401, {
                    'success': False,
                    'message': 'Invalid or expired session token'
                })
                return

            # ダミーの申請データ
            requests_data = [
                {
                    'id': str(uuid.uuid4()),
                    'type': 'leave',
                    'title': '有給休暇申請',
                    'status': 'approved',
                    'applicant_name': user['name'],
                    'created_at': '2024-01-15T09:00:00Z'
                },
                {
                    'id': str(uuid.uuid4()),
                    'type': 'overtime',
                    'title': '時間外労働申請',
                    'status': 'pending',
                    'applicant_name': user['name'],
                    'created_at': '2024-01-20T17:30:00Z'
                }
            ]

            self.send_json_response(200, {
                'success': True,
                'data': requests_data,
                'total': len(requests_data)
            })

        else:
            self.send_json_response(404, {
                'success': False,
                'message': 'Endpoint not found'
            })

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # リクエストボディを読み取り
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b''

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json_response(400, {
                'success': False,
                'message': 'Invalid JSON in request body'
            })
            return

        if path == '/api/v1/auth/login':
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                self.send_json_response(400, {
                    'success': False,
                    'message': 'Email and password are required'
                })
                return

            # ユーザー検索
            user = None
            for user_data in USERS.values():
                if user_data['email'] == email:
                    user = user_data
                    break

            if not user:
                self.send_json_response(401, {
                    'success': False,
                    'message': 'Invalid email or password'
                })
                return

            # パスワード検証
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            if user['password_hash'] != password_hash:
                self.send_json_response(401, {
                    'success': False,
                    'message': 'Invalid email or password'
                })
                return

            # セッショントークン生成
            session_token = str(uuid.uuid4())
            expires_at = datetime.now() + timedelta(hours=8)

            SESSIONS[session_token] = {
                'user': {k: v for k, v in user.items() if k != 'password_hash'},
                'expires_at': expires_at,
                'created_at': datetime.now(),
                'last_accessed': datetime.now()
            }

            # レスポンス
            response_data = {
                'access_token': session_token,
                'token_type': 'bearer',
                'user': {k: v for k, v in user.items() if k != 'password_hash'}
            }

            self.send_json_response(200, response_data)

        elif path == '/api/v1/auth/logout':
            token = self.get_bearer_token()

            if token and token in SESSIONS:
                del SESSIONS[token]

            self.send_json_response(200, {
                'success': True,
                'message': 'Logged out successfully'
            })

        elif path.startswith('/api/v1/requests') and path != '/api/v1/requests/':
            # 個別申請の取得やその他の申請関連処理
            token = self.get_bearer_token()
            user = self.validate_session(token)

            if not user:
                self.send_json_response(401, {
                    'success': False,
                    'message': 'Invalid or expired session token'
                })
                return

            # ダミーレスポンス
            self.send_json_response(200, {
                'success': True,
                'data': {
                    'id': str(uuid.uuid4()),
                    'type': 'leave',
                    'title': '休暇申請',
                    'status': 'draft',
                    'applicant_name': user['name']
                }
            })

        elif path.startswith('/api/v1/'):
            # その他のAPI エンドポイント
            token = self.get_bearer_token()
            user = self.validate_session(token)

            if not user:
                self.send_json_response(401, {
                    'success': False,
                    'message': 'Invalid or expired session token'
                })
                return

            self.send_json_response(200, {
                'success': True,
                'message': f'API endpoint {path} - placeholder response',
                'data': {}
            })

        else:
            self.send_json_response(404, {
                'success': False,
                'message': f'Endpoint not found: {path}'
            })

def run(server_class=HTTPServer, handler_class=CORSRequestHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'🚀 Starting API server on port {port}...')
    print(f'📡 Health check: http://localhost:{port}/health')
    print(f'📚 API base URL: http://localhost:{port}/api/v1')
    print(f'🔑 Test credentials: admin@example.com / password')
    print('---')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n🛑 Server stopped by user')
        httpd.server_close()

if __name__ == '__main__':
    run()