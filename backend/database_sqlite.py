import os
import sqlite3
import asyncio
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from auth import auth_manager

class SQLiteDatabaseManager:
    def __init__(self):
        self.db_path = os.getenv('SQLITE_DB_PATH', 'niwayakanri.db')
        self.init_database()

    def init_database(self):
        """SQLiteデータベースとテーブルを初期化"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        # テーブル作成SQL
        schema_sql = """
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            role TEXT CHECK (role IN ('admin', 'approver', 'user')) DEFAULT 'user',
            department TEXT,
            position TEXT,
            employee_id TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- User credentials table
        CREATE TABLE IF NOT EXISTS user_credentials (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- User sessions table (simplified for demo)
        CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            session_token TEXT UNIQUE NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            expires_at DATETIME NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Requests table
        CREATE TABLE IF NOT EXISTS requests (
            id TEXT PRIMARY KEY,
            type TEXT CHECK (type IN ('leave', 'overtime', 'expense')) NOT NULL,
            applicant_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            title TEXT,
            description TEXT,
            status TEXT CHECK (status IN ('draft', 'applied', 'approved', 'rejected')) DEFAULT 'draft',
            applied_at DATETIME,
            completed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Leave requests table
        CREATE TABLE IF NOT EXISTS request_leave (
            id TEXT PRIMARY KEY,
            request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
            leave_type TEXT CHECK (leave_type IN ('annual', 'sick', 'compensatory', 'special')) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days REAL NOT NULL,
            hours REAL,
            reason TEXT,
            handover_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Overtime requests table
        CREATE TABLE IF NOT EXISTS request_overtime (
            id TEXT PRIMARY KEY,
            request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
            work_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            break_time INTEGER DEFAULT 0,
            total_hours REAL NOT NULL,
            overtime_type TEXT CHECK (overtime_type IN ('weekday', 'weekend', 'holiday')) NOT NULL,
            reason TEXT NOT NULL,
            project_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Expense requests table
        CREATE TABLE IF NOT EXISTS request_expense (
            id TEXT PRIMARY KEY,
            request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
            expense_type TEXT CHECK (expense_type IN ('advance', 'reimbursement')) NOT NULL,
            purpose TEXT NOT NULL,
            total_amount REAL NOT NULL,
            vendor TEXT,
            occurred_date DATE NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Expense lines table
        CREATE TABLE IF NOT EXISTS request_expense_lines (
            id TEXT PRIMARY KEY,
            request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
            account_code TEXT,
            account_name TEXT,
            tax_type TEXT CHECK (tax_type IN ('taxable', 'tax_free', 'non_taxable')),
            amount REAL NOT NULL,
            description TEXT,
            receipt_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Approvals table
        CREATE TABLE IF NOT EXISTS approvals (
            id TEXT PRIMARY KEY,
            request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
            approver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            action TEXT CHECK (action IN ('approve', 'reject')) NOT NULL,
            comment TEXT,
            acted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Leave balances table
        CREATE TABLE IF NOT EXISTS leave_balances (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            year INTEGER NOT NULL,
            annual_total REAL DEFAULT 20.0,
            annual_used REAL DEFAULT 0.0,
            sick_total REAL DEFAULT 10.0,
            sick_used REAL DEFAULT 0.0,
            compensatory_balance REAL DEFAULT 0.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, year)
        );

        -- 通知設定テーブル
        CREATE TABLE IF NOT EXISTS notification_settings (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            setting_type TEXT NOT NULL,
            enabled BOOLEAN DEFAULT TRUE,
            send_time TEXT,
            target_roles TEXT,
            skip_weekends BOOLEAN DEFAULT TRUE,
            skip_holidays BOOLEAN DEFAULT TRUE,
            email_template TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 通知ログテーブル
        CREATE TABLE IF NOT EXISTS notification_logs (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            notification_type TEXT NOT NULL,
            recipient_email TEXT NOT NULL,
            recipient_name TEXT,
            subject TEXT,
            status TEXT NOT NULL,
            error_message TEXT,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- リマインド設定テーブル
        CREATE TABLE IF NOT EXISTS reminder_settings (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            reminder_type TEXT NOT NULL,
            enabled BOOLEAN DEFAULT TRUE,
            send_time TEXT NOT NULL,
            target_roles TEXT,
            frequency TEXT DEFAULT 'daily',
            skip_weekends BOOLEAN DEFAULT TRUE,
            skip_holidays BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 日報テーブル
        CREATE TABLE IF NOT EXISTS daily_reports (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            user_id TEXT NOT NULL,
            report_date DATE NOT NULL,
            work_content TEXT,
            progress TEXT,
            issues TEXT,
            next_plans TEXT,
            work_hours REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, report_date)
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
        CREATE INDEX IF NOT EXISTS idx_requests_applicant_id ON requests(applicant_id);
        CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date ON daily_reports(user_id, report_date);
        CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
        """

        conn.executescript(schema_sql)
        conn.commit()
        conn.close()

    async def init_pool(self):
        """互換性のための空実装"""
        pass

    async def close_pool(self):
        """互換性のための空実装"""
        pass

    @asynccontextmanager
    async def get_connection(self):
        """SQLite接続を取得するコンテキストマネージャー"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    # Authentication
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """ユーザー認証"""
        async with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT u.*, uc.password_hash
                FROM users u
                JOIN user_credentials uc ON u.id = uc.user_id
                WHERE u.email = ? AND u.is_active = 1
            """, (email,))
            user_data = cursor.fetchone()

            if not user_data:
                return None

            # パスワード検証（bcrypt使用）
            if not auth_manager.verify_password(password, user_data['password_hash']):
                return None

            return dict(user_data)

    async def create_session(self, user_id: str, ip_address: str = None, user_agent: str = None) -> str:
        """セッショントークンを作成"""
        import uuid
        session_token = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(hours=8)  # 8時間有効

        async with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO user_sessions (id, user_id, session_token, ip_address, user_agent, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), user_id, session_token, ip_address, user_agent, expires_at))
            conn.commit()

        return session_token

    async def validate_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """セッショントークンを検証"""
        async with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT u.*, s.expires_at
                FROM users u
                JOIN user_sessions s ON u.id = s.user_id
                WHERE s.session_token = ? AND s.is_active = 1 AND s.expires_at > datetime('now')
            """, (session_token,))
            user_data = cursor.fetchone()

            if user_data:
                # セッションの最終アクセス時刻を更新
                conn.execute("""
                    UPDATE user_sessions SET last_accessed = datetime('now')
                    WHERE session_token = ?
                """, (session_token,))
                conn.commit()

                return dict(user_data)

            return None

    async def invalidate_session(self, session_token: str):
        """セッションを無効化"""
        async with self.get_connection() as conn:
            conn.execute("""
                UPDATE user_sessions SET is_active = 0
                WHERE session_token = ?
            """, (session_token,))
            conn.commit()

    # User Management
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """ユーザーIDでユーザー情報を取得"""
        async with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user_data = cursor.fetchone()
            return dict(user_data) if user_data else None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """メールアドレスでユーザー情報を取得"""
        async with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM users WHERE email = ?", (email,))
            user_data = cursor.fetchone()
            return dict(user_data) if user_data else None

    async def get_users(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """ユーザー一覧を取得"""
        async with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM users
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))
            users = cursor.fetchall()
            return [dict(user) for user in users]

    async def create_user(self, user_data: Dict[str, Any], password: str) -> str:
        """新規ユーザーを作成"""
        import uuid
        user_id = str(uuid.uuid4())
        password_hash = auth_manager.hash_password(password)

        async with self.get_connection() as conn:
            # ユーザー作成
            conn.execute("""
                INSERT INTO users (id, email, name, role, department, position, employee_id, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, user_data['email'], user_data['name'], user_data['role'],
                  user_data.get('department'), user_data.get('position'),
                  user_data.get('employee_id'), user_data.get('is_active', True)))

            # 認証情報作成
            conn.execute("""
                INSERT INTO user_credentials (id, user_id, password_hash)
                VALUES (?, ?, ?)
            """, (str(uuid.uuid4()), user_id, password_hash))

            conn.commit()

        return user_id

    # Request Management
    async def get_requests(self, user_id: str = None, status: str = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """申請一覧を取得"""
        async with self.get_connection() as conn:
            where_clauses = []
            params = []

            if user_id:
                where_clauses.append("r.applicant_id = ?")
                params.append(user_id)

            if status:
                where_clauses.append("r.status = ?")
                params.append(status)

            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

            query = f"""
                SELECT r.*, u.name as applicant_name, u.department as applicant_department
                FROM requests r
                JOIN users u ON r.applicant_id = u.id
                {where_clause}
                ORDER BY r.created_at DESC
                LIMIT ? OFFSET ?
            """
            params.extend([limit, offset])

            cursor = conn.execute(query, params)
            requests = cursor.fetchall()
            return [dict(req) for req in requests]

    async def get_requests_with_details(
        self,
        user_id: str = None,
        status: str = None,
        request_type: str = None,
        start_date: str = None,
        end_date: str = None,
        limit: int = None
    ) -> List[Dict[str, Any]]:
        """詳細な申請一覧を取得（エクスポート用）"""
        async with self.get_connection() as conn:
            where_clauses = []
            params = []

            if user_id:
                where_clauses.append("r.applicant_id = ?")
                params.append(user_id)

            if status:
                where_clauses.append("r.status = ?")
                params.append(status)

            if request_type:
                where_clauses.append("r.type = ?")
                params.append(request_type)

            if start_date:
                where_clauses.append("DATE(r.applied_at) >= ?")
                params.append(start_date)

            if end_date:
                where_clauses.append("DATE(r.applied_at) <= ?")
                params.append(end_date)

            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            limit_clause = f"LIMIT {limit}" if limit else ""

            query = f"""
                SELECT
                    r.*,
                    u.name as applicant_name,
                    u.email as applicant_email,
                    u.department as applicant_department,
                    approver.name as approver_name,
                    approver.email as approver_email,
                    a.comment as comments,
                    a.acted_at as approved_at
                FROM requests r
                JOIN users u ON r.applicant_id = u.id
                LEFT JOIN approvals a ON r.id = a.request_id AND a.action = 'approve'
                LEFT JOIN users approver ON a.approver_id = approver.id
                {where_clause}
                ORDER BY r.created_at DESC
                {limit_clause}
            """

            cursor = conn.execute(query, params)
            requests = cursor.fetchall()

            result = []
            for req in requests:
                req_dict = dict(req)
                # ネストした構造に変換
                result.append({
                    "id": req_dict["id"],
                    "type": req_dict["type"],
                    "title": req_dict["title"],
                    "description": req_dict["description"],
                    "status": req_dict["status"],
                    "applied_at": req_dict["applied_at"],
                    "approved_at": req_dict["approved_at"],
                    "created_at": req_dict["created_at"],
                    "comments": req_dict["comments"],
                    "applicant": {
                        "name": req_dict["applicant_name"],
                        "email": req_dict["applicant_email"],
                        "department": req_dict["applicant_department"]
                    },
                    "approver": {
                        "name": req_dict["approver_name"],
                        "email": req_dict["approver_email"]
                    } if req_dict["approver_name"] else None
                })

            return result

    async def get_request_by_id(self, request_id: str) -> Optional[Dict[str, Any]]:
        """申請IDで申請詳細を取得"""
        async with self.get_connection() as conn:
            # 基本申請情報
            cursor = conn.execute("""
                SELECT r.*, u.name as applicant_name, u.department as applicant_department, u.email as applicant_email
                FROM requests r
                JOIN users u ON r.applicant_id = u.id
                WHERE r.id = ?
            """, (request_id,))
            request_data = cursor.fetchone()

            if not request_data:
                return None

            result = dict(request_data)

            # 申請タイプ別の詳細情報を取得
            if result['type'] == 'leave':
                cursor = conn.execute("SELECT * FROM request_leave WHERE request_id = ?", (request_id,))
                leave_data = cursor.fetchone()
                result['leave_request'] = dict(leave_data) if leave_data else None

            elif result['type'] == 'overtime':
                cursor = conn.execute("SELECT * FROM request_overtime WHERE request_id = ?", (request_id,))
                overtime_data = cursor.fetchone()
                result['overtime_request'] = dict(overtime_data) if overtime_data else None

            elif result['type'] == 'expense':
                cursor = conn.execute("SELECT * FROM request_expense WHERE request_id = ?", (request_id,))
                expense_data = cursor.fetchone()
                result['expense_request'] = dict(expense_data) if expense_data else None

                # 経費明細も取得
                cursor = conn.execute("SELECT * FROM request_expense_lines WHERE request_id = ?", (request_id,))
                expense_lines = cursor.fetchall()
                result['expense_lines'] = [dict(line) for line in expense_lines]

            # 承認履歴を取得
            cursor = conn.execute("""
                SELECT a.*, u.name as approver_name
                FROM approvals a
                JOIN users u ON a.approver_id = u.id
                WHERE a.request_id = ?
                ORDER BY a.acted_at
            """, (request_id,))
            approvals = cursor.fetchall()
            result['approvals'] = [dict(approval) for approval in approvals]

            return result

    async def create_leave_request(self, user_id: str, request_data: Dict[str, Any], leave_data: Dict[str, Any]) -> str:
        """休暇申請を作成"""
        import uuid
        request_id = str(uuid.uuid4())
        leave_id = str(uuid.uuid4())

        async with self.get_connection() as conn:
            # 基本申請を作成
            conn.execute("""
                INSERT INTO requests (id, type, applicant_id, title, description)
                VALUES (?, 'leave', ?, ?, ?)
            """, (request_id, user_id, request_data.get('title'), request_data.get('description')))

            # 休暇申請詳細を作成
            conn.execute("""
                INSERT INTO request_leave (id, request_id, leave_type, start_date, end_date, days, hours, reason, handover_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (leave_id, request_id, leave_data['leave_type'], leave_data['start_date'],
                  leave_data['end_date'], leave_data['days'], leave_data.get('hours'),
                  leave_data.get('reason'), leave_data.get('handover_notes')))

            conn.commit()

        return request_id

    async def submit_request(self, request_id: str) -> bool:
        """申請を提出する"""
        async with self.get_connection() as conn:
            cursor = conn.execute("""
                UPDATE requests
                SET status = 'applied', applied_at = datetime('now')
                WHERE id = ? AND status = 'draft'
            """, (request_id,))
            conn.commit()
            return cursor.rowcount > 0

    async def approve_request(self, request_id: str, approver_id: str, comment: str = None) -> bool:
        """申請を承認する"""
        import uuid
        approval_id = str(uuid.uuid4())

        async with self.get_connection() as conn:
            # 承認履歴を記録
            conn.execute("""
                INSERT INTO approvals (id, request_id, approver_id, action, comment)
                VALUES (?, ?, ?, 'approve', ?)
            """, (approval_id, request_id, approver_id, comment))

            # 申請ステータスを更新
            cursor = conn.execute("""
                UPDATE requests
                SET status = 'approved', completed_at = datetime('now')
                WHERE id = ? AND status = 'applied'
            """, (request_id,))

            conn.commit()
            return cursor.rowcount > 0

    async def reject_request(self, request_id: str, approver_id: str, comment: str = None) -> bool:
        """申請を却下する"""
        import uuid
        approval_id = str(uuid.uuid4())

        async with self.get_connection() as conn:
            # 承認履歴を記録
            conn.execute("""
                INSERT INTO approvals (id, request_id, approver_id, action, comment)
                VALUES (?, ?, ?, 'reject', ?)
            """, (approval_id, request_id, approver_id, comment))

            # 申請ステータスを更新
            cursor = conn.execute("""
                UPDATE requests
                SET status = 'rejected', completed_at = datetime('now')
                WHERE id = ? AND status = 'applied'
            """, (request_id,))

            conn.commit()
            return cursor.rowcount > 0

    # Dashboard
    async def get_dashboard_stats(self, user_id: str) -> Dict[str, int]:
        """ダッシュボード統計を取得"""
        async with self.get_connection() as conn:
            # ユーザーの申請統計
            cursor = conn.execute("""
                SELECT
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as pending_requests,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests
                FROM requests
                WHERE applicant_id = ?
            """, (user_id,))
            user_stats = cursor.fetchone()

            # 承認待ちの申請数
            cursor = conn.execute("""
                SELECT COUNT(DISTINCT r.id)
                FROM requests r
                JOIN users u ON r.applicant_id = u.id
                WHERE r.status = 'applied'
                AND NOT EXISTS (
                    SELECT 1 FROM approvals a
                    WHERE a.request_id = r.id AND a.approver_id = ?
                )
            """, (user_id,))
            pending_approvals = cursor.fetchone()[0]

            return {
                "total_requests": user_stats['total_requests'],
                "pending_requests": user_stats['pending_requests'],
                "approved_requests": user_stats['approved_requests'],
                "rejected_requests": user_stats['rejected_requests'],
                "my_pending_approvals": pending_approvals or 0
            }

    async def get_admin_stats(self) -> Dict[str, Any]:
        """管理者向け統計データを取得"""
        async with self.get_connection() as conn:
            # ユーザー統計
            cursor = conn.execute("""
                SELECT
                    COUNT(*) as total_users,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
                    SUM(CASE WHEN role = 'approver' THEN 1 ELSE 0 END) as approver_users,
                    SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users
                FROM users
            """)
            user_stats = cursor.fetchone()

            # 申請統計
            cursor = conn.execute("""
                SELECT
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_requests,
                    SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as pending_requests,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests
                FROM requests
            """)
            request_stats = cursor.fetchone()

            return {
                "users": {
                    "total": user_stats['total_users'],
                    "active": user_stats['active_users'],
                    "inactive": user_stats['inactive_users'],
                    "by_role": {
                        "admin": user_stats['admin_users'],
                        "approver": user_stats['approver_users'],
                        "user": user_stats['regular_users']
                    }
                },
                "requests": {
                    "total": request_stats['total_requests'],
                    "by_status": {
                        "draft": request_stats['draft_requests'],
                        "pending": request_stats['pending_requests'],
                        "approved": request_stats['approved_requests'],
                        "rejected": request_stats['rejected_requests']
                    }
                }
            }

    # 通知・リマインド関連
    async def get_all_users(self) -> List[Dict[str, Any]]:
        """全ユーザーを取得"""
        async with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT id, name, email, role, department, is_active, created_at
                FROM users
                WHERE is_active = 1
                ORDER BY name
            """)
            users = cursor.fetchall()
            return [dict(user) for user in users]

    async def check_daily_report_exists(self, user_id: str, report_date: date) -> bool:
        """指定日の日報が存在するかチェック"""
        async with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT COUNT(*) as count
                FROM daily_reports
                WHERE user_id = ? AND report_date = ?
            """, (user_id, report_date.isoformat()))
            result = cursor.fetchone()
            return result['count'] > 0

    async def log_notification_sent(
        self,
        notification_type: str,
        recipient_email: str,
        recipient_name: str,
        subject: str,
        status: str,
        error_message: str = None
    ) -> str:
        """通知送信ログを記録"""
        log_id = str(uuid.uuid4())
        async with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO notification_logs (
                    id, notification_type, recipient_email, recipient_name,
                    subject, status, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (log_id, notification_type, recipient_email, recipient_name,
                  subject, status, error_message))
            conn.commit()
        return log_id

    async def get_notification_settings(self, setting_type: str) -> Optional[Dict[str, Any]]:
        """通知設定を取得"""
        async with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM notification_settings
                WHERE setting_type = ?
            """, (setting_type,))
            result = cursor.fetchone()
            return dict(result) if result else None

    async def save_notification_settings(self, setting_type: str, settings: Dict[str, Any]) -> bool:
        """通知設定を保存"""
        try:
            async with self.get_connection() as conn:
                # 既存設定をチェック
                cursor = conn.execute("""
                    SELECT id FROM notification_settings WHERE setting_type = ?
                """, (setting_type,))
                existing = cursor.fetchone()

                if existing:
                    # 更新
                    conn.execute("""
                        UPDATE notification_settings
                        SET enabled = ?, send_time = ?, target_roles = ?,
                            skip_weekends = ?, skip_holidays = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE setting_type = ?
                    """, (
                        settings.get('enabled', True),
                        settings.get('send_time', '18:00'),
                        ','.join(settings.get('target_roles', [])),
                        settings.get('skip_weekends', True),
                        settings.get('skip_holidays', True),
                        setting_type
                    ))
                else:
                    # 新規作成
                    setting_id = str(uuid.uuid4())
                    conn.execute("""
                        INSERT INTO notification_settings (
                            id, setting_type, enabled, send_time, target_roles,
                            skip_weekends, skip_holidays
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        setting_id, setting_type,
                        settings.get('enabled', True),
                        settings.get('send_time', '18:00'),
                        ','.join(settings.get('target_roles', [])),
                        settings.get('skip_weekends', True),
                        settings.get('skip_holidays', True)
                    ))

                conn.commit()
                return True
        except Exception as e:
            print(f"Error saving notification settings: {e}")
            return False

    async def get_notification_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """通知ログを取得"""
        async with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM notification_logs
                ORDER BY sent_at DESC
                LIMIT ?
            """, (limit,))
            logs = cursor.fetchall()
            return [dict(log) for log in logs]

# グローバルデータベースマネージャーインスタンス（SQLite版）
sqlite_db_manager = SQLiteDatabaseManager()
db_manager = sqlite_db_manager