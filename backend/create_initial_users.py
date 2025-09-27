#!/usr/bin/env python3
"""
初期ユーザー作成スクリプト
管理者と従業員アカウントを作成します
"""

import asyncio
import os
import sys
from database import db_manager
from auth import auth_manager

async def create_initial_users():
    """初期ユーザー（管理者と従業員）を作成"""

    # データベース接続プールを初期化
    await db_manager.init_pool()

    try:
        # 管理者アカウント作成
        admin_data = {
            "email": "admin@company.com",
            "name": "システム管理者",
            "role": "admin",
            "department": "情報システム部",
            "position": "部長",
            "employee_id": "ADM001",
            "is_active": True
        }

        # 既存チェック
        existing_admin = await db_manager.get_user_by_email(admin_data["email"])
        if not existing_admin:
            admin_id = await db_manager.create_user(admin_data, "admin123!")
            print(f"✅ 管理者アカウント作成: {admin_data['email']} (ID: {admin_id})")
        else:
            print(f"⚠️  管理者アカウント既存: {admin_data['email']}")

        # 承認者アカウント作成
        approver_data = {
            "email": "approver@company.com",
            "name": "承認者 太郎",
            "role": "approver",
            "department": "人事部",
            "position": "課長",
            "employee_id": "APP001",
            "is_active": True
        }

        existing_approver = await db_manager.get_user_by_email(approver_data["email"])
        if not existing_approver:
            approver_id = await db_manager.create_user(approver_data, "approver123!")
            print(f"✅ 承認者アカウント作成: {approver_data['email']} (ID: {approver_id})")
        else:
            print(f"⚠️  承認者アカウント既存: {approver_data['email']}")

        # 一般従業員アカウント作成
        employees = [
            {
                "email": "yamada@company.com",
                "name": "山田 太郎",
                "role": "user",
                "department": "営業部",
                "position": "主任",
                "employee_id": "EMP001",
                "is_active": True
            },
            {
                "email": "sato@company.com",
                "name": "佐藤 花子",
                "role": "user",
                "department": "経理部",
                "position": "係長",
                "employee_id": "EMP002",
                "is_active": True
            },
            {
                "email": "tanaka@company.com",
                "name": "田中 次郎",
                "role": "user",
                "department": "開発部",
                "position": "エンジニア",
                "employee_id": "EMP003",
                "is_active": True
            }
        ]

        for emp_data in employees:
            existing_emp = await db_manager.get_user_by_email(emp_data["email"])
            if not existing_emp:
                emp_id = await db_manager.create_user(emp_data, "password123!")
                print(f"✅ 従業員アカウント作成: {emp_data['email']} (ID: {emp_id})")
            else:
                print(f"⚠️  従業員アカウント既存: {emp_data['email']}")

        print("\n🎉 初期ユーザー作成完了！")
        print("\n📋 作成されたアカウント:")
        print("=" * 50)
        print("【管理者】")
        print("  Email: admin@company.com")
        print("  Password: admin123!")
        print("\n【承認者】")
        print("  Email: approver@company.com")
        print("  Password: approver123!")
        print("\n【従業員】")
        for emp in employees:
            print(f"  Email: {emp['email']}")
            print(f"  Password: password123!")
        print("=" * 50)
        print("\n⚠️  本番環境では必ずパスワードを変更してください！")

    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        sys.exit(1)

    finally:
        # データベース接続プールを閉じる
        await db_manager.close_pool()

async def reset_all_users():
    """全ユーザーを削除（開発用）"""
    print("⚠️  全ユーザーを削除しますか？ (yes/no): ", end="")
    response = input()

    if response.lower() != 'yes':
        print("キャンセルしました。")
        return

    await db_manager.init_pool()

    try:
        async with db_manager.get_connection() as conn:
            async with conn.transaction():
                await conn.execute("DELETE FROM user_sessions")
                await conn.execute("DELETE FROM user_credentials")
                await conn.execute("DELETE FROM users")
                print("✅ 全ユーザーを削除しました。")
    except Exception as e:
        print(f"❌ 削除エラー: {e}")
    finally:
        await db_manager.close_pool()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        asyncio.run(reset_all_users())
    else:
        asyncio.run(create_initial_users())