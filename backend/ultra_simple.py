#!/usr/bin/env python3
"""
超シンプルなHTTPサーバー
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse

class SimpleHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.requests = [
            {
                "id": "1",
                "type": "leave",
                "applicant_id": "2",
                "status": "applied",
                "title": "有給休暇申請",
                "description": "家族旅行のため",
                "applied_at": "2025-01-23T10:00:00Z",
                "created_at": "2025-01-23T10:00:00Z"
            },
            {
                "id": "2",
                "type": "overtime",
                "applicant_id": "2",
                "status": "approved",
                "title": "残業申請",
                "description": "プロジェクトの締切対応",
                "applied_at": "2025-01-23T10:00:00Z",
                "created_at": "2025-01-23T10:00:00Z"
            }
        ]
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                "message": "勤怠・社内申請システム API",
                "version": "1.0.0",
                "status": "healthy"
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        elif self.path == '/api/v1/auth/me':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                "user_id": "1",
                "name": "管理者",
                "email": "admin@example.com",
                "role": "admin"
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        elif self.path == '/api/v1/requests/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(self.requests, ensure_ascii=False).encode('utf-8'))
        elif self.path.startswith('/api/v1/requests/') and self.path != '/api/v1/requests/':
            # 個別申請取得
            request_id = self.path.split('/')[-1]
            request = next((r for r in self.requests if r['id'] == request_id), None)
            if request:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(request, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {"error": "Request not found"}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        elif self.path == '/api/v1/approvals/':
            # 承認待ち申請取得
            pending_requests = [r for r in self.requests if r['status'] == 'applied']
            for req in pending_requests:
                req['applicant_name'] = '田中太郎'
                req['priority'] = 'medium'
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(pending_requests, ensure_ascii=False).encode('utf-8'))
        elif self.path == '/api/v1/admin/stats':
            # 管理統計取得
            stats = {
                "total_requests": len(self.requests),
                "pending_requests": len([r for r in self.requests if r['status'] == 'applied']),
                "approved_requests": len([r for r in self.requests if r['status'] == 'approved']),
                "rejected_requests": len([r for r in self.requests if r['status'] == 'rejected']),
                "total_users": 10,
                "active_users": 8
            }
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(stats, ensure_ascii=False).encode('utf-8'))
        elif self.path == '/api/v1/users/':
            # ユーザー一覧取得
            users = [
                {
                    "id": "1",
                    "name": "管理者",
                    "email": "admin@example.com",
                    "role": "admin",
                    "department": "システム部",
                    "status": "active",
                    "last_login": "2025-01-23T10:00:00Z"
                },
                {
                    "id": "2",
                    "name": "田中太郎",
                    "email": "tanaka@example.com",
                    "role": "user",
                    "department": "営業部",
                    "status": "active",
                    "last_login": "2025-01-23T09:30:00Z"
                },
                {
                    "id": "3",
                    "name": "山田花子",
                    "email": "yamada@example.com",
                    "role": "approver",
                    "department": "人事部",
                    "status": "active",
                    "last_login": "2025-01-23T08:45:00Z"
                }
            ]
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(users, ensure_ascii=False).encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"error": "Not Found"}
            self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_POST(self):
        if self.path == '/api/v1/auth/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            email = data.get('email', '')
            password = data.get('password', '')
            
            if email == 'admin@example.com' and password == 'password':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {
                    "access_token": "dummy-token",
                    "token_type": "bearer",
                    "user_id": "1",
                    "name": "管理者",
                    "role": "admin"
                }
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(401)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {"error": "メールアドレスまたはパスワードが正しくありません"}
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
        elif self.path == '/api/v1/requests/leave':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # 休暇申請の作成
            request_id = f"leave_{len(self.requests) + 1}"
            new_request = {
                "id": request_id,
                "type": "leave",
                "applicant_id": "2",
                "status": "draft",
                "title": f"{data.get('leave_type', '')}申請",
                "description": data.get('reason', ''),
                "created_at": "2025-01-23T10:00:00Z"
            }
            self.requests.append(new_request)
            
            self.send_response(201)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_request, ensure_ascii=False).encode('utf-8'))
            
        elif self.path == '/api/v1/requests/overtime':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # 時間外労働申請の作成
            request_id = f"overtime_{len(self.requests) + 1}"
            new_request = {
                "id": request_id,
                "type": "overtime",
                "applicant_id": "2",
                "status": "draft",
                "title": f"{data.get('overtime_type', '')}申請",
                "description": data.get('reason', ''),
                "created_at": "2025-01-23T10:00:00Z"
            }
            self.requests.append(new_request)
            
            self.send_response(201)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_request, ensure_ascii=False).encode('utf-8'))
            
        elif self.path == '/api/v1/requests/expense':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # 仮払・立替申請の作成
            request_id = f"expense_{len(self.requests) + 1}"
            new_request = {
                "id": request_id,
                "type": "expense",
                "applicant_id": "2",
                "status": "draft",
                "title": f"{data.get('expense_type', '')}申請",
                "description": data.get('purpose', ''),
                "created_at": "2025-01-23T10:00:00Z"
            }
            self.requests.append(new_request)
            
            self.send_response(201)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_request, ensure_ascii=False).encode('utf-8'))
            
        elif self.path == '/api/v1/requests/holiday-work':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # 休日出勤申請の作成
            request_id = f"holiday_work_{len(self.requests) + 1}"
            new_request = {
                "id": request_id,
                "type": "holiday_work",
                "applicant_id": "2",
                "status": "draft",
                "title": "休日出勤申請",
                "description": data.get('work_reason_detail', ''),
                "created_at": "2025-01-23T10:00:00Z"
            }
            self.requests.append(new_request)
            
            self.send_response(201)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_request, ensure_ascii=False).encode('utf-8'))
            
        elif self.path == '/api/v1/requests/construction-daily':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # 工事日報の作成
            request_id = f"construction_daily_{len(self.requests) + 1}"
            new_request = {
                "id": request_id,
                "type": "construction_daily",
                "applicant_id": "2",
                "status": "draft",
                "title": f"工事日報 - {data.get('site_name', '')}",
                "description": data.get('work_content', ''),
                "created_at": "2025-01-23T10:00:00Z"
            }
            self.requests.append(new_request)
            
            self.send_response(201)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(new_request, ensure_ascii=False).encode('utf-8'))
        elif self.path.startswith('/api/v1/requests/') and self.path.endswith('/approve'):
            # 申請承認
            request_id = self.path.split('/')[-2]
            request = next((r for r in self.requests if r['id'] == request_id), None)
            if request:
                request['status'] = 'approved'
                request['approved_at'] = '2025-01-23T10:00:00Z'
                request['approver_id'] = '1'
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(request, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {"error": "Request not found"}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        elif self.path.startswith('/api/v1/requests/') and self.path.endswith('/reject'):
            # 申請却下
            request_id = self.path.split('/')[-2]
            request = next((r for r in self.requests if r['id'] == request_id), None)
            if request:
                request['status'] = 'rejected'
                request['approved_at'] = '2025-01-23T10:00:00Z'
                request['approver_id'] = '1'
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(request, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {"error": "Request not found"}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        elif self.path.startswith('/api/v1/requests/') and self.path.endswith('/return'):
            # 申請差戻し
            request_id = self.path.split('/')[-2]
            request = next((r for r in self.requests if r['id'] == request_id), None)
            if request:
                request['status'] = 'returned'
                request['approved_at'] = '2025-01-23T10:00:00Z'
                request['approver_id'] = '1'
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(request, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {"error": "Request not found"}
                self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"error": "Not Found"}
            self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8000), SimpleHandler)
    print("🚀 サーバーが起動しました: http://localhost:8000")
    print("📋 利用可能なエンドポイント:")
    print("   GET  / - ヘルスチェック")
    print("   GET  /api/v1/auth/me - ユーザー情報")
    print("   GET  /api/v1/requests/ - 申請一覧")
    print("   POST /api/v1/auth/login - ログイン")
    print("🛑 停止するには Ctrl+C を押してください")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 サーバーを停止しています...")
        server.shutdown()
