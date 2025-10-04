# 勤怠・社内申請システム

勤怠管理や各種社内申請をWeb化した業務効率化システムです。

## 📋 主な機能

### 申請機能
- ✅ 休暇申請
- ✅ 残業申請
- ✅ 休日出勤申請
- ✅ 仮払金申請
- ✅ 立替金申請
- ✅ 仮払金精算申請
- ✅ PDF出力（全申請対応）

### 管理機能
- ✅ ユーザー管理（管理者のみ）
- ✅ 申請承認/却下（管理者のみ）
- ✅ 申請状況確認
- ✅ 権限管理（admin/user）

## 🚀 初回セットアップ

### 1. 必要な環境
- Python 3.8以上
- Node.js 14以上
- npm または yarn

### 2. バックエンドセットアップ

```bash
# バックエンドディレクトリに移動
cd backend

# 依存パッケージインストール
pip install -r requirements.txt

# 環境変数設定（.envファイルを確認・編集）
# SECRET_KEYは必ず変更してください
cp .env.example .env

# 初回セットアップ実行（データベース初期化 + 管理者作成）
python setup.py
```

初回セットアップで以下を行います:
- データベーステーブル作成
- 管理者ユーザー作成（対話式）

### 3. フロントエンドセットアップ

```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存パッケージインストール
npm install
```

### 4. サーバー起動

#### バックエンド起動
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### フロントエンド起動
```bash
cd frontend
npm run dev
```

### 5. アクセス

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- API仕様書: http://localhost:8000/docs

### 6. 初回ログイン

setup.pyで作成した管理者アカウントでログインしてください。

## 📁 プロジェクト構成

```
niwayakanri/
├── backend/              # FastAPI バックエンド
│   ├── app/
│   │   ├── api/         # APIエンドポイント
│   │   ├── core/        # 認証・DB設定
│   │   └── models/      # データモデル
│   ├── .env             # 環境変数
│   ├── setup.py         # 初回セットアップ
│   └── requirements.txt
│
├── frontend/            # Next.js フロントエンド
│   ├── src/
│   │   ├── app/        # ページ
│   │   ├── components/ # コンポーネント
│   │   └── lib/        # ユーティリティ
│   └── package.json
│
└── README.md
```

## 👥 ユーザー管理

### 新規ユーザー登録（管理者のみ）

1. 管理者アカウントでログイン
2. 管理画面 → ユーザー登録
3. メール、パスワード、名前、役割を入力
4. 登録完了

### ユーザー役割

- **admin**: 管理者（全機能利用可能）
  - ユーザー登録
  - 申請承認/却下
  - 全申請閲覧

- **user**: 一般ユーザー
  - 申請作成・提出
  - 自分の申請閲覧のみ

## 📝 申請フロー

### 一般ユーザー
1. ログイン
2. ダッシュボードから申請種類を選択
3. 申請フォーム入力
4. 「下書き保存」または「申請」
5. PDF出力（必要に応じて）

### 管理者（承認者）
1. ログイン
2. 承認管理画面
3. 申請内容確認
4. 「承認」または「却下」

## 🔒 セキュリティ

### パスワードポリシー
- 8文字以上
- 英字 + 数字を含む

### 認証
- JWT トークン認証（24時間有効）
- bcrypt パスワードハッシュ化

### 重要な設定

**本番環境では必ず以下を変更してください:**

1. `backend/.env` の `SECRET_KEY` を変更
2. `DEBUG=False` に設定
3. `ALLOWED_ORIGINS` を本番URLに設定

## 🐛 トラブルシューティング

### データベースエラー
```bash
# データベースを再作成
cd backend
rm niwayakanri.db
python setup.py
```

### ログインできない
- メールアドレス・パスワードを確認
- setup.pyで管理者を再作成

### ポート競合
- バックエンド: `--port 8001` など変更
- フロントエンド: `package.json` の `dev` スクリプト変更

## 📖 運用マニュアル

詳細な運用手順は [docs/MANUAL.md](docs/MANUAL.md) を参照してください。

## 🛠️ 技術スタック

### バックエンド
- FastAPI
- SQLAlchemy (SQLite)
- JWT認証
- bcrypt

### フロントエンド
- Next.js 14
- React
- TypeScript
- Tailwind CSS

## 📄 ライセンス

このプロジェクトは社内利用を想定しています。

## 🤝 サポート

質問や不具合報告は開発チームまでお問い合わせください。

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

