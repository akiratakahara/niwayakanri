#!/bin/bash

# 勤怠・社内申請システム セットアップスクリプト

set -e

echo "🚀 勤怠・社内申請システム セットアップを開始します..."

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# エラー処理
error_exit() {
    echo -e "${RED}エラー: $1${NC}" >&2
    exit 1
}

# 成功メッセージ
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 警告メッセージ
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 前提条件チェック
check_prerequisites() {
    echo "📋 前提条件をチェックしています..."
    
    # Node.js チェック
    if ! command -v node &> /dev/null; then
        error_exit "Node.js がインストールされていません。Node.js 18.x以上をインストールしてください。"
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error_exit "Node.js のバージョンが古すぎます。18.x以上が必要です。"
    fi
    success "Node.js $(node -v) が確認されました"
    
    # Python チェック
    if ! command -v python3 &> /dev/null; then
        error_exit "Python 3 がインストールされていません。Python 3.11以上をインストールしてください。"
    fi
    
    PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    success "Python $PYTHON_VERSION が確認されました"
    
    # Docker チェック（オプション）
    if command -v docker &> /dev/null; then
        success "Docker が確認されました"
    else
        warning "Docker がインストールされていません。ローカル開発には Docker を推奨します。"
    fi
}

# 環境変数ファイルの作成
setup_env() {
    echo "🔧 環境変数ファイルを設定しています..."
    
    if [ ! -f .env.local ]; then
        cp env.example .env.local
        success ".env.local ファイルを作成しました"
        warning "環境変数を適切に設定してください"
    else
        success ".env.local ファイルは既に存在します"
    fi
}

# フロントエンドセットアップ
setup_frontend() {
    echo "🎨 フロントエンドをセットアップしています..."
    
    cd frontend
    
    # 依存関係のインストール
    if [ ! -d "node_modules" ]; then
        npm install
        success "フロントエンドの依存関係をインストールしました"
    else
        success "フロントエンドの依存関係は既にインストール済みです"
    fi
    
    cd ..
}

# バックエンドセットアップ
setup_backend() {
    echo "⚙️ バックエンドをセットアップしています..."
    
    cd backend
    
    # 仮想環境の作成
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        success "Python仮想環境を作成しました"
    fi
    
    # 仮想環境のアクティベート
    source venv/bin/activate
    
    # 依存関係のインストール
    pip install --upgrade pip
    pip install -r requirements.txt
    success "バックエンドの依存関係をインストールしました"
    
    cd ..
}

# データベースセットアップ
setup_database() {
    echo "🗄️ データベースをセットアップしています..."
    
    # Docker Composeでデータベースを起動
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d postgres redis
        success "データベースサービスを起動しました"
        
        # データベースの初期化を待つ
        echo "データベースの初期化を待っています..."
        sleep 10
        
        # 初期データの投入（オプション）
        if [ -f "database/init/02_seed_data.sql" ]; then
            docker-compose exec postgres psql -U postgres -d niwayakanri -f /docker-entrypoint-initdb.d/02_seed_data.sql
            success "初期データを投入しました"
        fi
    else
        warning "Docker Compose が利用できません。手動でデータベースをセットアップしてください。"
    fi
}

# 開発サーバーの起動
start_dev_servers() {
    echo "🚀 開発サーバーを起動しています..."
    
    # バックグラウンドでバックエンドを起動
    cd backend
    source venv/bin/activate
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ..
    
    # フロントエンドを起動
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    success "開発サーバーを起動しました"
    echo ""
    echo "🌐 アプリケーションにアクセス:"
    echo "   フロントエンド: http://localhost:3000"
    echo "   バックエンドAPI: http://localhost:8000"
    echo "   API ドキュメント: http://localhost:8000/docs"
    echo ""
    echo "🛑 サーバーを停止するには Ctrl+C を押してください"
    
    # プロセスの終了を待つ
    wait $BACKEND_PID $FRONTEND_PID
}

# メイン処理
main() {
    echo "勤怠・社内申請システム セットアップスクリプト"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    setup_env
    setup_frontend
    setup_backend
    setup_database
    
    echo ""
    echo "🎉 セットアップが完了しました！"
    echo ""
    
    # 開発サーバーの起動を確認
    read -p "開発サーバーを起動しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_dev_servers
    else
        echo "セットアップ完了。手動で開発サーバーを起動してください。"
        echo "  フロントエンド: cd frontend && npm run dev"
        echo "  バックエンド: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
    fi
}

# スクリプト実行
main "$@"



