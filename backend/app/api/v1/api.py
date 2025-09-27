from fastapi import APIRouter
from app.api.v1.endpoints import auth, requests, users

api_router = APIRouter()

# 認証関連のエンドポイント
api_router.include_router(auth.router, prefix="/auth", tags=["認証"])

# ユーザー関連のエンドポイント
api_router.include_router(users.router, prefix="/users", tags=["ユーザー"])

# 申請関連のエンドポイント
api_router.include_router(requests.router, prefix="/requests", tags=["申請"])



