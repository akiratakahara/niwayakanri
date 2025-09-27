# 🚀 勤怠・社内申請システム セットアップガイド

## 必須タスクの実行手順

### 1️⃣ データベース設定

```bash
# PostgreSQLを起動
# Windows (pgAdmin使用)
# 1. pgAdminでサーバーに接続
# 2. データベース 'niwayakanri' を作成

# または Docker使用の場合
docker run --name postgres-niwayakanri \
  -e POSTGRES_DB=niwayakanri \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 -d postgres:15
```

### 2️⃣ データベース接続テスト & スキーマ作成

```bash
cd backend

# データベーススキーマ作成
python test_db_connection.py --create-schema

# 接続テスト
python test_db_connection.py
```

### 3️⃣ 初期ユーザー作成

```bash
cd backend

# 初期ユーザー（管理者・従業員）作成
python create_initial_users.py
```

**作成されるアカウント:**
- 管理者: `admin@company.com` / `admin123!`
- 承認者: `approver@company.com` / `approver123!`
- 従業員: `yamada@company.com` / `password123!`

### 4️⃣ バックエンド起動

```bash
cd backend

# 環境変数設定
cp .env.example .env
# .envファイルを編集（DATABASE_URLなど）

# 依存関係インストール
pip install -r requirements.txt

# バックエンド起動
python main.py
# または
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5️⃣ フロントエンド起動

```bash
cd frontend

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### 6️⃣ 動作確認

1. **ブラウザで http://localhost:3000 にアクセス**
2. **ログインテスト**
   - 管理者: `admin@company.com` / `admin123!`
   - 従業員: `yamada@company.com` / `password123!`
3. **申請作成テスト**
   - 休暇申請: `/requests/leave`
   - 時間外申請: `/requests/overtime`
   - 経費申請: `/requests/expense`
4. **承認テスト**
   - 承認者アカウントで `/approvals` にアクセス
5. **管理者機能テスト**
   - 管理者アカウントで `/admin` にアクセス

## 🛠️ トラブルシューティング

### データベース接続エラー
```bash
# 接続設定確認
python test_db_connection.py

# スキーマ再作成
python test_db_connection.py --create-schema
```

### 初期ユーザー作成エラー
```bash
# 全ユーザー削除（開発環境のみ）
python create_initial_users.py --reset

# 再作成
python create_initial_users.py
```

### フロントエンドエラー
- APIレスポンス形式は修正済み
- ブラウザの開発者ツールでネットワークエラーを確認

## 📋 完了状況

✅ フロントエンド機能（申請・承認・管理者画面）
✅ バックエンドAPI（JWT認証・申請管理・ユーザー管理）
✅ データベース設計（PostgreSQL）
✅ 初期データ作成スクリプト
✅ セキュリティ強化（bcrypt・JWT・権限管理）
✅ エラーハンドリング統一
✅ 構造化ログ

## 🎯 次のステップ

システムが正常に動作することを確認したら、必要に応じて以下を実施：

1. **本番環境設定**
2. **SSL証明書設定**
3. **パフォーマンス最適化**
4. **追加機能開発**

システムは**本番利用可能な状態**です！