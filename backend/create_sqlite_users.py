#!/usr/bin/env python3
"""
SQLite用の初期ユーザー作成スクリプト
"""

import sqlite3
import uuid
from datetime import datetime
from auth import auth_manager

def create_initial_users():
    """初期ユーザーを作成"""
    db_path = 'niwayakanri.db'

    # bcryptでパスワードをハッシュ化
    def hash_password(password):
        return auth_manager.hash_password(password)

    users = [
        {
            'email': 'admin@company.com',
            'name': '管理者',
            'role': 'admin',
            'password': 'admin123!',
            'department': '総務部',
            'position': '管理者',
            'employee_id': 'A001'
        },
        {
            'email': 'approver@company.com',
            'name': '承認者',
            'role': 'approver',
            'password': 'approver123!',
            'department': '人事部',
            'position': '課長',
            'employee_id': 'M001'
        },
        {
            'email': 'yamada@company.com',
            'name': '山田太郎',
            'role': 'user',
            'password': 'password123!',
            'department': '営業部',
            'position': '営業担当',
            'employee_id': 'E001'
        }
    ]

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 既存ユーザーをクリア
        cursor.execute("DELETE FROM user_credentials")
        cursor.execute("DELETE FROM users")

        print("🔄 初期ユーザーを作成中...")

        for user_data in users:
            # ユーザーID生成
            user_id = str(uuid.uuid4())

            # ユーザー作成
            cursor.execute("""
                INSERT INTO users (id, email, name, role, department, position, employee_id, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            """, (
                user_id, user_data['email'], user_data['name'],
                user_data['role'], user_data['department'],
                user_data['position'], user_data['employee_id']
            ))

            # 認証情報作成
            password_hash = hash_password(user_data['password'])
            cursor.execute("""
                INSERT INTO user_credentials (id, user_id, password_hash)
                VALUES (?, ?, ?)
            """, (str(uuid.uuid4()), user_id, password_hash))

            # 休暇残高作成（従業員のみ）
            if user_data['role'] == 'user':
                cursor.execute("""
                    INSERT INTO leave_balances (id, user_id, year, annual_total, annual_used, sick_total, sick_used)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), user_id, 2024, 20.0, 0.0, 10.0, 0.0))

            print(f"✅ ユーザー作成: {user_data['name']} ({user_data['email']})")

        conn.commit()

        print("\n🎉 初期ユーザー作成完了！")
        print("\n📋 作成されたアカウント:")
        print("- 管理者: admin@company.com / admin123!")
        print("- 承認者: approver@company.com / approver123!")
        print("- 従業員: yamada@company.com / password123!")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ ユーザー作成エラー: {e}")
        return False

if __name__ == "__main__":
    create_initial_users()