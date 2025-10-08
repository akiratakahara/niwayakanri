from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.core.database import init_db

app = FastAPI(
    title="勤怠・社内申請システム API",
    description="勤怠・社内申請業務をWeb化したシステムのAPI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# データベース初期化
@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時にデータベースを初期化"""
    init_db()
    # CORS設定をログ出力
    print(f"[CORS] ALLOWED_ORIGINS type: {type(settings.ALLOWED_ORIGINS)}")
    print(f"[CORS] ALLOWED_ORIGINS value: {settings.ALLOWED_ORIGINS}")

# CORS middleware - ルーター追加前に設定
# ALLOWED_ORIGINS が設定されているか確認
if not settings.ALLOWED_ORIGINS or settings.ALLOWED_ORIGINS == ['']:
    print("[CORS WARNING] ALLOWED_ORIGINS is empty, using wildcard for development")
    allow_origins = ["*"]
else:
    allow_origins = settings.ALLOWED_ORIGINS

print(f"[CORS] Final allow_origins: {allow_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "勤怠・社内申請システム API",
        "version": "1.0.0",
        "status": "healthy",
        "cors_origins": settings.ALLOWED_ORIGINS
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.options("/api/v1/{path:path}")
async def options_handler(path: str):
    """OPTIONS リクエストを明示的に処理"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
