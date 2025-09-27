#!/usr/bin/env python3
"""
SQLiteデータベースのスキーマ作成スクリプト
"""

import sqlite3
import os

def create_sqlite_schema():
    """SQLiteデータベースのスキーマを作成"""
    db_path = 'niwayakanri.db'

    schema_sql = """
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT CHECK (role IN ('admin', 'approver', 'user')) DEFAULT 'user',
        department TEXT,
        position TEXT,
        employee_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- User credentials table
    CREATE TABLE IF NOT EXISTS user_credentials (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- User sessions table
    CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        expires_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_accessed TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
    );

    -- Requests table
    CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        type TEXT CHECK (type IN ('leave', 'overtime', 'expense')) NOT NULL,
        applicant_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        description TEXT,
        status TEXT CHECK (status IN ('draft', 'applied', 'approved', 'rejected')) DEFAULT 'draft',
        applied_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Leave requests table
    CREATE TABLE IF NOT EXISTS request_leave (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
        leave_type TEXT CHECK (leave_type IN ('annual', 'sick', 'compensatory', 'special')) NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        days REAL NOT NULL,
        hours REAL,
        reason TEXT,
        handover_notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Overtime requests table
    CREATE TABLE IF NOT EXISTS request_overtime (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
        work_date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        break_time INTEGER DEFAULT 0,
        total_hours REAL NOT NULL,
        overtime_type TEXT CHECK (overtime_type IN ('weekday', 'weekend', 'holiday')) NOT NULL,
        reason TEXT NOT NULL,
        project_name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Expense requests table
    CREATE TABLE IF NOT EXISTS request_expense (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
        expense_type TEXT CHECK (expense_type IN ('advance', 'reimbursement')) NOT NULL,
        purpose TEXT NOT NULL,
        total_amount REAL NOT NULL,
        vendor TEXT,
        occurred_date TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Expense lines table
    CREATE TABLE IF NOT EXISTS request_expense_lines (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
        account_code TEXT,
        account_name TEXT,
        tax_type TEXT CHECK (tax_type IN ('taxable', 'tax_free', 'non_taxable')),
        amount REAL NOT NULL,
        description TEXT,
        receipt_url TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    -- Approvals table
    CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
        approver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        action TEXT CHECK (action IN ('approve', 'reject')) NOT NULL,
        comment TEXT,
        acted_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
    );

    -- Leave balances table
    CREATE TABLE IF NOT EXISTS leave_balances (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        annual_total REAL DEFAULT 20.0,
        annual_used REAL DEFAULT 0.0,
        sick_total REAL DEFAULT 10.0,
        sick_used REAL DEFAULT 0.0,
        compensatory_balance REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, year)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
    CREATE INDEX IF NOT EXISTS idx_requests_applicant_id ON requests(applicant_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    """

    try:
        conn = sqlite3.connect(db_path)
        conn.executescript(schema_sql)
        conn.commit()
        print("✅ SQLiteデータベーススキーマ作成完了")

        # テーブル確認
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"📋 作成されたテーブル数: {len(tables)}")
        for table in tables:
            print(f"  ✅ {table[0]}")

        conn.close()
        return True
    except Exception as e:
        print(f"❌ スキーマ作成エラー: {e}")
        return False

if __name__ == "__main__":
    create_sqlite_schema()