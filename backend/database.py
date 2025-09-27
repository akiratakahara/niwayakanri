import os
import asyncpg
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from models import *
from auth import auth_manager

class DatabaseManager:
    def __init__(self):
        self.pool = None
        self.database_url = os.getenv(
            'DATABASE_URL',
            'postgresql://postgres:password@localhost:5432/niwayakanri'
        )

    async def init_pool(self):
        """データベース接続プールを初期化"""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            print("Database pool initialized successfully")
        except Exception as e:
            print(f"Failed to initialize database pool: {e}")
            raise

    async def close_pool(self):
        """データベース接続プールを閉じる"""
        if self.pool:
            await self.pool.close()
            print("Database pool closed")

    @asynccontextmanager
    async def get_connection(self):
        """データベース接続を取得するコンテキストマネージャー"""
        if not self.pool:
            await self.init_pool()

        async with self.pool.acquire() as connection:
            yield connection

    # Authentication
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """ユーザー認証"""
        async with self.get_connection() as conn:
            # ユーザー情報とパスワードハッシュを取得
            query = """
                SELECT u.*, uc.password_hash
                FROM users u
                JOIN user_credentials uc ON u.id = uc.user_id
                WHERE u.email = $1 AND u.is_active = true
            """
            user_data = await conn.fetchrow(query, email)

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
            await conn.execute("""
                INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
                VALUES ($1, $2, $3, $4, $5)
            """, user_id, session_token, ip_address, user_agent, expires_at)

        return session_token

    async def validate_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """セッショントークンを検証"""
        async with self.get_connection() as conn:
            query = """
                SELECT u.*, s.expires_at
                FROM users u
                JOIN user_sessions s ON u.id = s.user_id
                WHERE s.session_token = $1 AND s.is_active = true AND s.expires_at > NOW()
            """
            user_data = await conn.fetchrow(query, session_token)

            if user_data:
                # セッションの最終アクセス時刻を更新
                await conn.execute("""
                    UPDATE user_sessions SET last_accessed = NOW()
                    WHERE session_token = $1
                """, session_token)

                return dict(user_data)

            return None

    async def invalidate_session(self, session_token: str):
        """セッションを無効化"""
        async with self.get_connection() as conn:
            await conn.execute("""
                UPDATE user_sessions SET is_active = false
                WHERE session_token = $1
            """, session_token)

    # User Management
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """ユーザーIDでユーザー情報を取得"""
        async with self.get_connection() as conn:
            user_data = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1", user_id
            )
            return dict(user_data) if user_data else None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """メールアドレスでユーザー情報を取得"""
        async with self.get_connection() as conn:
            user_data = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1", email
            )
            return dict(user_data) if user_data else None

    async def get_users(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """ユーザー一覧を取得"""
        async with self.get_connection() as conn:
            users = await conn.fetch("""
                SELECT * FROM users
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            """, limit, offset)
            return [dict(user) for user in users]

    async def create_user(self, user_data: Dict[str, Any], password: str) -> str:
        """新規ユーザーを作成"""
        import uuid
        user_id = str(uuid.uuid4())
        password_hash = auth_manager.hash_password(password)

        async with self.get_connection() as conn:
            async with conn.transaction():
                # ユーザー作成
                await conn.execute("""
                    INSERT INTO users (id, email, name, role, department, position, employee_id, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, user_id, user_data['email'], user_data['name'], user_data['role'],
                    user_data.get('department'), user_data.get('position'),
                    user_data.get('employee_id'), user_data.get('is_active', True))

                # 認証情報作成
                await conn.execute("""
                    INSERT INTO user_credentials (user_id, password_hash)
                    VALUES ($1, $2)
                """, user_id, password_hash)

        return user_id

    async def register_user(self, user_data: Dict[str, Any], password: str) -> str:
        """新規ユーザーを登録（一般ユーザー用）"""
        import uuid
        user_id = str(uuid.uuid4())
        password_hash = auth_manager.hash_password(password)

        # メール重複チェック
        existing_user = await self.get_user_by_email(user_data['email'])
        if existing_user:
            raise ValueError("Email already exists")

        async with self.get_connection() as conn:
            async with conn.transaction():
                # ユーザー作成（デフォルトで一般ユーザー権限）
                await conn.execute("""
                    INSERT INTO users (id, email, name, role, department, position, employee_id, is_active)
                    VALUES ($1, $2, $3, 'user', $4, $5, $6, true)
                """, user_id, user_data['email'], user_data['name'],
                    user_data.get('department'), user_data.get('position'),
                    user_data.get('employee_id'))

                # 認証情報作成
                await conn.execute("""
                    INSERT INTO user_credentials (user_id, password_hash)
                    VALUES ($1, $2)
                """, user_id, password_hash)

        return user_id

    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """ユーザー情報を更新"""
        async with self.get_connection() as conn:
            # 更新可能なフィールドを制限
            allowed_fields = ['name', 'role', 'department', 'position', 'employee_id', 'is_active']
            update_fields = {k: v for k, v in user_data.items() if k in allowed_fields}

            if not update_fields:
                return False

            set_clauses = []
            values = []
            param_count = 0

            for field, value in update_fields.items():
                param_count += 1
                set_clauses.append(f"{field} = ${param_count}")
                values.append(value)

            param_count += 1
            values.append(user_id)

            query = f"""
                UPDATE users
                SET {', '.join(set_clauses)}, updated_at = NOW()
                WHERE id = ${param_count}
            """

            result = await conn.execute(query, *values)
            return result != "UPDATE 0"

    async def deactivate_user(self, user_id: str) -> bool:
        """ユーザーを無効化"""
        async with self.get_connection() as conn:
            result = await conn.execute("""
                UPDATE users
                SET is_active = false, updated_at = NOW()
                WHERE id = $1
            """, user_id)
            return result != "UPDATE 0"

    async def delete_user(self, user_id: str) -> bool:
        """ユーザーを削除（物理削除）"""
        async with self.get_connection() as conn:
            async with conn.transaction():
                # 関連するセッションを削除
                await conn.execute("DELETE FROM user_sessions WHERE user_id = $1", user_id)

                # 認証情報を削除
                await conn.execute("DELETE FROM user_credentials WHERE user_id = $1", user_id)

                # ユーザーを削除
                result = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
                return result != "DELETE 0"

    async def reset_user_password(self, user_id: str, new_password: str) -> bool:
        """ユーザーのパスワードをリセット"""
        password_hash = auth_manager.hash_password(new_password)

        async with self.get_connection() as conn:
            result = await conn.execute("""
                UPDATE user_credentials
                SET password_hash = $1, updated_at = NOW()
                WHERE user_id = $2
            """, password_hash, user_id)
            return result != "UPDATE 0"

    # Request Management
    async def get_requests(self, user_id: str = None, status: str = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """申請一覧を取得"""
        async with self.get_connection() as conn:
            where_clauses = []
            params = []
            param_count = 0

            if user_id:
                param_count += 1
                where_clauses.append(f"r.applicant_id = ${param_count}")
                params.append(user_id)

            if status:
                param_count += 1
                where_clauses.append(f"r.status = ${param_count}")
                params.append(status)

            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

            query = f"""
                SELECT r.*, u.name as applicant_name, u.department as applicant_department
                FROM requests r
                JOIN users u ON r.applicant_id = u.id
                {where_clause}
                ORDER BY r.created_at DESC
                LIMIT ${param_count + 1} OFFSET ${param_count + 2}
            """
            params.extend([limit, offset])

            requests = await conn.fetch(query, *params)
            return [dict(req) for req in requests]

    async def get_request_by_id(self, request_id: str) -> Optional[Dict[str, Any]]:
        """申請IDで申請詳細を取得"""
        async with self.get_connection() as conn:
            # 基本申請情報
            request_data = await conn.fetchrow("""
                SELECT r.*, u.name as applicant_name, u.department as applicant_department, u.email as applicant_email
                FROM requests r
                JOIN users u ON r.applicant_id = u.id
                WHERE r.id = $1
            """, request_id)

            if not request_data:
                return None

            result = dict(request_data)

            # 申請タイプ別の詳細情報を取得
            if result['type'] == 'leave':
                leave_data = await conn.fetchrow(
                    "SELECT * FROM request_leave WHERE request_id = $1", request_id
                )
                result['leave_request'] = dict(leave_data) if leave_data else None

            elif result['type'] == 'overtime':
                overtime_data = await conn.fetchrow(
                    "SELECT * FROM request_overtime WHERE request_id = $1", request_id
                )
                result['overtime_request'] = dict(overtime_data) if overtime_data else None

            elif result['type'] == 'expense':
                expense_data = await conn.fetchrow(
                    "SELECT * FROM request_expense WHERE request_id = $1", request_id
                )
                result['expense_request'] = dict(expense_data) if expense_data else None

                # 経費明細も取得
                expense_lines = await conn.fetch(
                    "SELECT * FROM request_expense_lines WHERE request_id = $1", request_id
                )
                result['expense_lines'] = [dict(line) for line in expense_lines]

            # 承認履歴を取得
            approvals = await conn.fetch("""
                SELECT a.*, u.name as approver_name
                FROM approvals a
                JOIN users u ON a.approver_id = u.id
                WHERE a.request_id = $1
                ORDER BY a.acted_at
            """, request_id)
            result['approvals'] = [dict(approval) for approval in approvals]

            return result

    async def create_leave_request(self, user_id: str, request_data: Dict[str, Any], leave_data: Dict[str, Any]) -> str:
        """休暇申請を作成"""
        import uuid
        request_id = str(uuid.uuid4())
        leave_id = str(uuid.uuid4())

        async with self.get_connection() as conn:
            async with conn.transaction():
                # 基本申請を作成
                await conn.execute("""
                    INSERT INTO requests (id, type, applicant_id, title, description)
                    VALUES ($1, 'leave', $2, $3, $4)
                """, request_id, user_id, request_data.get('title'), request_data.get('description'))

                # 休暇申請詳細を作成
                await conn.execute("""
                    INSERT INTO request_leave (id, request_id, leave_type, start_date, end_date, days, hours, reason, handover_notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """, leave_id, request_id, leave_data['leave_type'], leave_data['start_date'],
                    leave_data['end_date'], leave_data['days'], leave_data.get('hours'),
                    leave_data.get('reason'), leave_data.get('handover_notes'))

        return request_id

    async def create_overtime_request(self, user_id: str, request_data: Dict[str, Any], overtime_data: Dict[str, Any]) -> str:
        """時間外労働申請を作成"""
        import uuid
        request_id = str(uuid.uuid4())
        overtime_id = str(uuid.uuid4())

        async with self.get_connection() as conn:
            async with conn.transaction():
                # 基本申請を作成
                await conn.execute("""
                    INSERT INTO requests (id, type, applicant_id, title, description)
                    VALUES ($1, 'overtime', $2, $3, $4)
                """, request_id, user_id, request_data.get('title'), request_data.get('description'))

                # 時間外労働申請詳細を作成
                await conn.execute("""
                    INSERT INTO request_overtime (id, request_id, work_date, start_time, end_time, break_time, total_hours, overtime_type, reason, project_name)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """, overtime_id, request_id, overtime_data['work_date'], overtime_data.get('start_time'),
                    overtime_data.get('end_time'), overtime_data.get('break_time', 0),
                    overtime_data['total_hours'], overtime_data['overtime_type'],
                    overtime_data['reason'], overtime_data.get('project_name'))

        return request_id

    async def create_expense_request(self, user_id: str, request_data: Dict[str, Any], expense_data: Dict[str, Any], expense_lines: List[Dict[str, Any]] = None) -> str:
        """経費申請を作成"""
        import uuid
        request_id = str(uuid.uuid4())
        expense_id = str(uuid.uuid4())

        async with self.get_connection() as conn:
            async with conn.transaction():
                # 基本申請を作成
                await conn.execute("""
                    INSERT INTO requests (id, type, applicant_id, title, description)
                    VALUES ($1, 'expense', $2, $3, $4)
                """, request_id, user_id, request_data.get('title'), request_data.get('description'))

                # 経費申請詳細を作成
                await conn.execute("""
                    INSERT INTO request_expense (id, request_id, expense_type, purpose, total_amount, vendor, occurred_date, description)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, expense_id, request_id, expense_data['expense_type'], expense_data['purpose'],
                    expense_data['total_amount'], expense_data.get('vendor'),
                    expense_data['occurred_date'], expense_data.get('description'))

                # 経費明細を作成
                if expense_lines:
                    for line in expense_lines:
                        line_id = str(uuid.uuid4())
                        await conn.execute("""
                            INSERT INTO request_expense_lines (id, request_id, account_code, account_name, tax_type, amount, description, receipt_url)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        """, line_id, request_id, line.get('account_code'), line.get('account_name'),
                            line.get('tax_type'), line['amount'], line.get('description'), line.get('receipt_url'))

        return request_id

    async def submit_request(self, request_id: str) -> bool:
        """申請を提出する"""
        async with self.get_connection() as conn:
            result = await conn.execute("""
                UPDATE requests
                SET status = 'applied', applied_at = NOW()
                WHERE id = $1 AND status = 'draft'
            """, request_id)
            return result != "UPDATE 0"

    async def approve_request(self, request_id: str, approver_id: str, comment: str = None) -> bool:
        """申請を承認する"""
        import uuid
        approval_id = str(uuid.uuid4())

        async with self.get_connection() as conn:
            async with conn.transaction():
                # 承認履歴を記録
                await conn.execute("""
                    INSERT INTO approvals (id, request_id, approver_id, action, comment)
                    VALUES ($1, $2, $3, 'approve', $4)
                """, approval_id, request_id, approver_id, comment)

                # 申請ステータスを更新
                result = await conn.execute("""
                    UPDATE requests
                    SET status = 'approved', completed_at = NOW()
                    WHERE id = $1 AND status = 'applied'
                """, request_id)

                return result != "UPDATE 0"

    async def reject_request(self, request_id: str, approver_id: str, comment: str = None) -> bool:
        """申請を却下する"""
        import uuid
        approval_id = str(uuid.uuid4())

        async with self.get_connection() as conn:
            async with conn.transaction():
                # 承認履歴を記録
                await conn.execute("""
                    INSERT INTO approvals (id, request_id, approver_id, action, comment)
                    VALUES ($1, $2, $3, 'reject', $4)
                """, approval_id, request_id, approver_id, comment)

                # 申請ステータスを更新
                result = await conn.execute("""
                    UPDATE requests
                    SET status = 'rejected', completed_at = NOW()
                    WHERE id = $1 AND status = 'applied'
                """, request_id)

                return result != "UPDATE 0"

    # Dashboard
    async def get_dashboard_stats(self, user_id: str) -> Dict[str, int]:
        """ダッシュボード統計を取得"""
        async with self.get_connection() as conn:
            # ユーザーの申請統計
            user_stats = await conn.fetchrow("""
                SELECT
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN status = 'applied' THEN 1 END) as pending_requests,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests
                FROM requests
                WHERE applicant_id = $1
            """, user_id)

            # 承認待ちの申請数
            pending_approvals = await conn.fetchval("""
                SELECT COUNT(DISTINCT r.id)
                FROM requests r
                JOIN users u ON r.applicant_id = u.id
                WHERE r.status = 'applied'
                AND NOT EXISTS (
                    SELECT 1 FROM approvals a
                    WHERE a.request_id = r.id AND a.approver_id = $1
                )
            """, user_id)

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
            user_stats = await conn.fetchrow("""
                SELECT
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
                    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
                    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
                    COUNT(CASE WHEN role = 'approver' THEN 1 END) as approver_users,
                    COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users
                FROM users
            """)

            # 申請統計
            request_stats = await conn.fetchrow("""
                SELECT
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_requests,
                    COUNT(CASE WHEN status = 'applied' THEN 1 END) as pending_requests,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests
                FROM requests
            """)

            # 申請タイプ別統計
            request_type_stats = await conn.fetch("""
                SELECT
                    type,
                    COUNT(*) as count,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
                FROM requests
                GROUP BY type
            """)

            # 今月の統計
            monthly_stats = await conn.fetchrow("""
                SELECT
                    COUNT(*) as monthly_requests,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as monthly_approved
                FROM requests
                WHERE created_at >= date_trunc('month', CURRENT_DATE)
            """)

            # 部署別統計
            department_stats = await conn.fetch("""
                SELECT
                    u.department,
                    COUNT(DISTINCT u.id) as user_count,
                    COUNT(r.id) as request_count
                FROM users u
                LEFT JOIN requests r ON u.id = r.applicant_id
                WHERE u.department IS NOT NULL
                GROUP BY u.department
                ORDER BY request_count DESC
            """)

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
                    },
                    "by_type": {str(row['type']): {
                        "total": row['count'],
                        "approved": row['approved_count']
                    } for row in request_type_stats},
                    "monthly": {
                        "total": monthly_stats['monthly_requests'],
                        "approved": monthly_stats['monthly_approved']
                    }
                },
                "departments": [
                    {
                        "name": row['department'],
                        "users": row['user_count'],
                        "requests": row['request_count']
                    } for row in department_stats
                ]
            }

# グローバルデータベースマネージャーインスタンス
db_manager = DatabaseManager()