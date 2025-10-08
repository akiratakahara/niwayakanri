from fastapi import APIRouter
from app.api.v1.endpoints import auth, requests, users, approvals, admin, setup, construction_daily, attendance, reports

api_router = APIRouter()

# 認証関連のエンドポイント
api_router.include_router(auth.router, prefix="/auth", tags=["認証"])

# ユーザー関連のエンドポイント
api_router.include_router(users.router, prefix="/users", tags=["ユーザー"])

# 申請関連のエンドポイント
api_router.include_router(requests.router, prefix="/requests", tags=["申請"])

# 承認関連のエンドポイント
api_router.include_router(approvals.router, prefix="/approvals", tags=["承認"])

# 管理関連のエンドポイント
api_router.include_router(admin.router, prefix="/admin", tags=["管理"])

# レポート・通知エンドポイント（prefix無し）
api_router.include_router(reports.router, tags=["レポート・通知"])

# セットアップ関連のエンドポイント
api_router.include_router(setup.router, prefix="/setup", tags=["セットアップ"])

# 工事日報関連のエンドポイント
api_router.include_router(construction_daily.router, prefix="/construction-daily", tags=["工事日報"])

# 勤怠管理関連のエンドポイント
api_router.include_router(attendance.router, prefix="/attendance", tags=["勤怠管理"])





