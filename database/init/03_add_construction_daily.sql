-- 工事日報テーブル
CREATE TABLE IF NOT EXISTS construction_daily_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    site_name VARCHAR(200) NOT NULL,
    work_location VARCHAR(300) NOT NULL,
    work_content TEXT NOT NULL,

    -- 時間
    early_start VARCHAR(10),
    work_start_time VARCHAR(10) NOT NULL,
    work_end_time VARCHAR(10) NOT NULL,
    overtime VARCHAR(10),

    -- JSON形式で保存
    workers JSONB,
    own_vehicles JSONB,
    machinery JSONB,
    other_machinery JSONB,
    lease_machines JSONB,
    ky_activities JSONB,

    -- その他
    other_materials TEXT,
    customer_requests TEXT,
    office_confirmation TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_construction_daily_user_date ON construction_daily_reports(user_id, report_date);
CREATE INDEX IF NOT EXISTS idx_construction_daily_site ON construction_daily_reports(site_name);
