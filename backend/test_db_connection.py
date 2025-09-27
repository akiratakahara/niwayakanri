#!/usr/bin/env python3
"""
データベース接続テストスクリプト
PostgreSQLとの接続とテーブル作成を確認します
"""

import asyncio
import os
import sys
from database import db_manager

async def test_database_connection():
    """データベース接続をテスト"""
    print("🔌 データベース接続テストを開始...")

    try:
        # データベース接続プールを初期化
        await db_manager.init_pool()
        print("✅ データベース接続プール初期化: 成功")

        # 基本的な接続テスト
        async with db_manager.get_connection() as conn:
            result = await conn.fetchval("SELECT version()")
            print(f"✅ PostgreSQL版本: {result}")

        # テーブル存在チェック
        async with db_manager.get_connection() as conn:
            tables = await conn.fetch("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)

            table_names = [table['table_name'] for table in tables]
            expected_tables = [
                'users', 'user_credentials', 'user_sessions',
                'requests', 'request_leave', 'request_overtime', 'request_expense',
                'request_expense_lines', 'approvals', 'leave_balances'
            ]

            print("\n📋 データベーステーブル確認:")
            for table in expected_tables:
                if table in table_names:
                    print(f"  ✅ {table}")
                else:
                    print(f"  ❌ {table} (不足)")

            print(f"\n📊 検出されたテーブル数: {len(table_names)}")
            print(f"📊 期待されるテーブル数: {len(expected_tables)}")

        # ユーザーテーブルの基本テスト
        try:
            async with db_manager.get_connection() as conn:
                user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
                print(f"\n👥 既存ユーザー数: {user_count}")
        except Exception as e:
            print(f"⚠️  ユーザーテーブルアクセスエラー: {e}")

        print("\n🎉 データベース接続テスト完了！")
        return True

    except Exception as e:
        print(f"❌ データベース接続エラー: {e}")
        print("\n🔧 対処方法:")
        print("1. PostgreSQLが起動していることを確認")
        print("2. データベース 'niwayakanri' が作成されていることを確認")
        print("3. 接続情報(.env)が正しいことを確認")
        print("4. データベーススキーマが作成されていることを確認")
        return False

    finally:
        # データベース接続プールを閉じる
        await db_manager.close_pool()

async def create_tables_if_missing():
    """不足しているテーブルを作成"""
    print("🔨 データベーススキーマを作成中...")

    schema_sql = """
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('admin', 'approver', 'user')) DEFAULT 'user',
        department VARCHAR(255),
        position VARCHAR(255),
        employee_id VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- User credentials table
    CREATE TABLE IF NOT EXISTS user_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- User sessions table
    CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Requests table
    CREATE TABLE IF NOT EXISTS requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) CHECK (type IN ('leave', 'overtime', 'expense')) NOT NULL,
        applicant_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        description TEXT,
        status VARCHAR(20) CHECK (status IN ('draft', 'applied', 'approved', 'rejected')) DEFAULT 'draft',
        applied_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Leave requests table
    CREATE TABLE IF NOT EXISTS request_leave (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
        leave_type VARCHAR(20) CHECK (leave_type IN ('annual', 'sick', 'compensatory', 'special')) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days DECIMAL(4,2) NOT NULL,
        hours DECIMAL(5,2),
        reason TEXT,
        handover_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Overtime requests table
    CREATE TABLE IF NOT EXISTS request_overtime (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
        work_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        break_time INTEGER DEFAULT 0,
        total_hours DECIMAL(4,2) NOT NULL,
        overtime_type VARCHAR(20) CHECK (overtime_type IN ('weekday', 'weekend', 'holiday')) NOT NULL,
        reason TEXT NOT NULL,
        project_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Expense requests table
    CREATE TABLE IF NOT EXISTS request_expense (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
        expense_type VARCHAR(20) CHECK (expense_type IN ('advance', 'reimbursement')) NOT NULL,
        purpose TEXT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        vendor VARCHAR(255),
        occurred_date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Expense lines table
    CREATE TABLE IF NOT EXISTS request_expense_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
        account_code VARCHAR(20),
        account_name VARCHAR(255),
        tax_type VARCHAR(10) CHECK (tax_type IN ('taxable', 'tax_free', 'non_taxable')),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        receipt_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Approvals table
    CREATE TABLE IF NOT EXISTS approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
        approver_id UUID REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(10) CHECK (action IN ('approve', 'reject')) NOT NULL,
        comment TEXT,
        acted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Leave balances table
    CREATE TABLE IF NOT EXISTS leave_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        annual_total DECIMAL(4,2) DEFAULT 20.0,
        annual_used DECIMAL(4,2) DEFAULT 0.0,
        sick_total DECIMAL(4,2) DEFAULT 10.0,
        sick_used DECIMAL(4,2) DEFAULT 0.0,
        compensatory_balance DECIMAL(4,2) DEFAULT 0.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, year)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
    CREATE INDEX IF NOT EXISTS idx_requests_applicant_id ON requests(applicant_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

    -- Update triggers
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
    CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """

    try:
        await db_manager.init_pool()
        async with db_manager.get_connection() as conn:
            await conn.execute(schema_sql)
            print("✅ データベーススキーマ作成完了")
        await db_manager.close_pool()
        return True
    except Exception as e:
        print(f"❌ スキーマ作成エラー: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--create-schema":
        print("📋 データベーススキーマを作成します...")
        success = asyncio.run(create_tables_if_missing())
        if success:
            print("✅ スキーマ作成完了。接続テストを実行します。")
            asyncio.run(test_database_connection())
    else:
        asyncio.run(test_database_connection())