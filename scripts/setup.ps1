# 勤怠・社内申請システム セットアップスクリプト (PowerShell版)

param(
    [switch]$SkipDatabase,
    [switch]$SkipServers
)

Write-Host "🚀 勤怠・社内申請システム セットアップを開始します..." -ForegroundColor Green

# エラー処理
function Write-ErrorAndExit {
    param([string]$Message)
    Write-Host "エラー: $Message" -ForegroundColor Red
    exit 1
}

# 成功メッセージ
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# 警告メッセージ
function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# 前提条件チェック
function Test-Prerequisites {
    Write-Host "📋 前提条件をチェックしています..." -ForegroundColor Cyan
    
    # Node.js チェック
    try {
        $nodeVersion = node -v
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorAndExit "Node.js がインストールされていません。Node.js 18.x以上をインストールしてください。"
        }
        
        $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNumber -lt 18) {
            Write-ErrorAndExit "Node.js のバージョンが古すぎます。18.x以上が必要です。"
        }
        Write-Success "Node.js $nodeVersion が確認されました"
    }
    catch {
        Write-ErrorAndExit "Node.js の確認中にエラーが発生しました: $_"
    }
    
    # Python チェック
    try {
        $pythonVersion = python --version
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorAndExit "Python 3 がインストールされていません。Python 3.11以上をインストールしてください。"
        }
        Write-Success "Python $pythonVersion が確認されました"
    }
    catch {
        Write-ErrorAndExit "Python の確認中にエラーが発生しました: $_"
    }
    
    # Docker チェック（オプション）
    try {
        docker --version | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker が確認されました"
        }
    }
    catch {
        Write-Warning "Docker がインストールされていません。ローカル開発には Docker を推奨します。"
    }
}

# 環境変数ファイルの作成
function Initialize-Environment {
    Write-Host "🔧 環境変数ファイルを設定しています..." -ForegroundColor Cyan
    
    if (-not (Test-Path ".env.local")) {
        Copy-Item "env.example" ".env.local"
        Write-Success ".env.local ファイルを作成しました"
        Write-Warning "環境変数を適切に設定してください"
    }
    else {
        Write-Success ".env.local ファイルは既に存在します"
    }
}

# フロントエンドセットアップ
function Initialize-Frontend {
    Write-Host "🎨 フロントエンドをセットアップしています..." -ForegroundColor Cyan
    
    Set-Location "frontend"
    
    # 依存関係のインストール
    if (-not (Test-Path "node_modules")) {
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorAndExit "フロントエンドの依存関係インストールに失敗しました"
        }
        Write-Success "フロントエンドの依存関係をインストールしました"
    }
    else {
        Write-Success "フロントエンドの依存関係は既にインストール済みです"
    }
    
    Set-Location ".."
}

# バックエンドセットアップ
function Initialize-Backend {
    Write-Host "⚙️ バックエンドをセットアップしています..." -ForegroundColor Cyan
    
    Set-Location "backend"
    
    # 仮想環境の作成
    if (-not (Test-Path "venv")) {
        python -m venv venv
        Write-Success "Python仮想環境を作成しました"
    }
    
    # 仮想環境のアクティベート
    & ".\venv\Scripts\Activate.ps1"
    
    # 依存関係のインストール
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorAndExit "バックエンドの依存関係インストールに失敗しました"
    }
    Write-Success "バックエンドの依存関係をインストールしました"
    
    Set-Location ".."
}

# データベースセットアップ
function Initialize-Database {
    if ($SkipDatabase) {
        Write-Warning "データベースセットアップをスキップしました"
        return
    }
    
    Write-Host "🗄️ データベースをセットアップしています..." -ForegroundColor Cyan
    
    # Docker Composeでデータベースを起動
    try {
        docker-compose up -d postgres redis
        if ($LASTEXITCODE -eq 0) {
            Write-Success "データベースサービスを起動しました"
            
            # データベースの初期化を待つ
            Write-Host "データベースの初期化を待っています..."
            Start-Sleep -Seconds 10
        }
        else {
            Write-Warning "Docker Compose でデータベースを起動できませんでした。手動でセットアップしてください。"
        }
    }
    catch {
        Write-Warning "Docker が利用できません。手動でデータベースをセットアップしてください。"
    }
}

# 開発サーバーの起動
function Start-DevServers {
    if ($SkipServers) {
        Write-Host "開発サーバーの起動をスキップしました" -ForegroundColor Yellow
        return
    }
    
    Write-Host "🚀 開発サーバーを起動しています..." -ForegroundColor Cyan
    
    # バックエンドを起動
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location "backend"
        & ".\venv\Scripts\Activate.ps1"
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    }
    
    # フロントエンドを起動
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        Set-Location "frontend"
        npm run dev
    }
    
    Write-Success "開発サーバーを起動しました"
    Write-Host ""
    Write-Host "🌐 アプリケーションにアクセス:" -ForegroundColor Green
    Write-Host "   フロントエンド: http://localhost:3000" -ForegroundColor White
    Write-Host "   バックエンドAPI: http://localhost:8000" -ForegroundColor White
    Write-Host "   API ドキュメント: http://localhost:8000/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "🛑 サーバーを停止するには Ctrl+C を押してください" -ForegroundColor Yellow
    
    # プロセスの終了を待つ
    try {
        Wait-Job $backendJob, $frontendJob
    }
    finally {
        Stop-Job $backendJob, $frontendJob
        Remove-Job $backendJob, $frontendJob
    }
}

# メイン処理
function Main {
    Write-Host "勤怠・社内申請システム セットアップスクリプト" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host ""
    
    Test-Prerequisites
    Initialize-Environment
    Initialize-Frontend
    Initialize-Backend
    Initialize-Database
    
    Write-Host ""
    Write-Host "🎉 セットアップが完了しました！" -ForegroundColor Green
    Write-Host ""
    
    # 開発サーバーの起動を確認
    if (-not $SkipServers) {
        $response = Read-Host "開発サーバーを起動しますか？ (y/N)"
        if ($response -match "^[Yy]$") {
            Start-DevServers
        }
        else {
            Write-Host "セットアップ完了。手動で開発サーバーを起動してください。" -ForegroundColor Yellow
            Write-Host "  フロントエンド: cd frontend && npm run dev" -ForegroundColor White
            Write-Host "  バックエンド: cd backend && .\venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload" -ForegroundColor White
        }
    }
}

# スクリプト実行
Main



