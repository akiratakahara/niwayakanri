-- 初期データ投入スクリプト

-- ユーザーの初期データ（パスワードハッシュ: SHA256("password")）
INSERT INTO users (id, email, name, role, department, position, employee_id, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@example.com', '管理者', 'admin', '情報システム部', '部長', 'EMP001', true),
('550e8400-e29b-41d4-a716-446655440001', 'tanaka@example.com', '田中太郎', 'employee', '営業部', '主任', 'EMP002', true),
('550e8400-e29b-41d4-a716-446655440002', 'sato@example.com', '佐藤花子', 'approver', '営業部', '課長', 'EMP003', true),
('550e8400-e29b-41d4-a716-446655440003', 'yamada@example.com', '山田次郎', 'employee', '開発部', 'エンジニア', 'EMP004', true),
('550e8400-e29b-41d4-a716-446655440004', 'watanabe@example.com', '渡辺美咲', 'approver', '開発部', 'リーダー', 'EMP005', true)
ON CONFLICT (id) DO NOTHING;

-- ユーザー認証情報テーブル（パスワード管理用）
CREATE TABLE IF NOT EXISTS user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255),
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 初期パスワード設定（全て "password" のSHA256ハッシュ）
INSERT INTO user_credentials (user_id, password_hash) VALUES
('550e8400-e29b-41d4-a716-446655440000', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'),
('550e8400-e29b-41d4-a716-446655440001', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'),
('550e8400-e29b-41d4-a716-446655440002', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'),
('550e8400-e29b-41d4-a716-446655440003', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'),
('550e8400-e29b-41d4-a716-446655440004', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8')
ON CONFLICT (user_id) DO NOTHING;

-- 休暇残数の初期データ（年度分）
INSERT INTO leave_balances (user_id, leave_type, year, total_days, used_days) VALUES
-- 管理者
('550e8400-e29b-41d4-a716-446655440000', 'paid', 2024, 20.0, 3.0),
('550e8400-e29b-41d4-a716-446655440000', 'compensatory', 2024, 5.0, 0.0),
-- 田中太郎
('550e8400-e29b-41d4-a716-446655440001', 'paid', 2024, 20.0, 5.0),
('550e8400-e29b-41d4-a716-446655440001', 'compensatory', 2024, 3.0, 1.0),
-- 佐藤花子
('550e8400-e29b-41d4-a716-446655440002', 'paid', 2024, 20.0, 2.0),
('550e8400-e29b-41d4-a716-446655440002', 'compensatory', 2024, 4.0, 0.0),
-- 山田次郎
('550e8400-e29b-41d4-a716-446655440003', 'paid', 2024, 20.0, 7.0),
('550e8400-e29b-41d4-a716-446655440003', 'compensatory', 2024, 2.0, 1.0),
-- 渡辺美咲
('550e8400-e29b-41d4-a716-446655440004', 'paid', 2024, 20.0, 4.0),
('550e8400-e29b-41d4-a716-446655440004', 'compensatory', 2024, 6.0, 2.0)
ON CONFLICT (user_id, leave_type, year) DO NOTHING;

-- セッション管理テーブル
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セッショントークンのインデックス
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 承認ワークフロー設定テーブル
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('leave', 'overtime', 'expense')),
    department VARCHAR(50),
    min_amount INTEGER, -- 金額条件（経費申請用）
    approver_role VARCHAR(20) NOT NULL CHECK (approver_role IN ('approver', 'admin')),
    step_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 承認ワークフローの初期設定
INSERT INTO approval_workflows (request_type, department, approver_role, step_order) VALUES
-- 営業部の承認フロー
('leave', '営業部', 'approver', 1),
('overtime', '営業部', 'approver', 1),
('expense', '営業部', 'approver', 1),
-- 開発部の承認フロー
('leave', '開発部', 'approver', 1),
('overtime', '開発部', 'approver', 1),
('expense', '開発部', 'approver', 1),
-- 高額経費は管理者承認が必要
('expense', NULL, 'admin', 2) -- 全部署、2段階目で管理者承認
ON CONFLICT DO NOTHING;

-- 申請カテゴリーマスタ
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 経費カテゴリーの初期データ
INSERT INTO expense_categories (code, name, description) VALUES
('TRAVEL', '交通費', '電車、バス、タクシー等の交通費'),
('ACCOM', '宿泊費', 'ホテル、旅館等の宿泊費'),
('MEAL', '食事代', '会議、接待等の食事代'),
('SUPPLY', '消耗品', '文房具、その他消耗品'),
('BOOKS', '書籍・研修', '書籍代、セミナー受講料等'),
('COMM', '通信費', '携帯電話、インターネット等'),
('ENTERTAIN', '接待交際費', '取引先との接待費用'),
('OTHER', 'その他', 'その他の経費')
ON CONFLICT (code) DO NOTHING;

-- システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- システム設定の初期値
INSERT INTO system_settings (key, value, description) VALUES
('app_name', '勤怠・社内申請システム', 'アプリケーション名'),
('company_name', '株式会社サンプル', '会社名'),
('fiscal_year_start', '04-01', '年度開始月日（MM-DD形式）'),
('working_hours_per_day', '8.0', '1日の標準労働時間'),
('overtime_threshold', '8.0', '残業開始時間'),
('max_expense_amount', '100000', '承認不要な経費の上限額（円）'),
('session_timeout_minutes', '480', 'セッションタイムアウト時間（分）'),
('password_expiry_days', '90', 'パスワード有効期限（日）')
ON CONFLICT (key) DO NOTHING;

-- 更新日時トリガーの追加
CREATE TRIGGER update_user_credentials_updated_at BEFORE UPDATE ON user_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();