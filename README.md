# 勤怠・社内申請 WEB化システム

## プロジェクト概要
既存のExcel/PDFベースの勤怠・社内申請業務を完全にWeb化し、申請→承認→台帳管理→PDF出力→通知までを一気通貫で実現するシステムです。

## 技術スタック
- **フロントエンド**: Next.js 14 + TypeScript + Tailwind CSS
- **バックエンド**: FastAPI + Python 3.11
- **データベース**: PostgreSQL (Supabase)
- **認証**: Supabase Auth
- **PDF生成**: Puppeteer + HTML/CSS
- **デプロイ**: Vercel (フロント) + Railway (API)

## 開発環境セットアップ

### 前提条件
- Node.js 18.x以上
- Python 3.11以上
- Docker (ローカル開発用)

### セットアップ手順

1. リポジトリのクローン
```bash
git clone https://github.com/your-org/niwayakanri.git
cd niwayakanri
```

2. フロントエンド環境構築
```bash
cd frontend
npm install
npm run dev
```

3. バックエンド環境構築
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

4. データベース設定
```bash
# Supabaseプロジェクト作成後、環境変数を設定
cp .env.example .env.local
# .env.localにSupabaseの設定を記入
```

## プロジェクト構成
```
niwayakanri/
├── frontend/          # Next.js フロントエンド
├── backend/           # FastAPI バックエンド
├── database/          # データベース関連
├── docs/              # ドキュメント
├── scripts/           # ユーティリティスクリプト
├── tests/             # 統合テスト
└── docker/            # Docker設定
```

## 開発ルール
- ブランチ戦略: Git Flow
- コミットメッセージ: Conventional Commits
- コードレビュー: 必須
- テストカバレッジ: 80%以上

## ライセンス
Private

