from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.auth import get_current_admin_user
from app.core.database import get_db
from app.models.database import Request as RequestModel, User

router = APIRouter()

@router.get("/")
async def get_approval_requests(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    """
    承認待ちの申請一覧を取得（管理者のみ）
    """
    # 全ステータスの申請を取得（承認済み、却下、差戻しも含む）
    requests = db.query(RequestModel).order_by(RequestModel.created_at.desc()).all()

    # レスポンスデータを構築
    approval_requests = []
    for req in requests:
        applicant = db.query(User).filter(User.id == req.applicant_id).first()

        # 優先度を計算（簡易版：申請日が古いほど優先度高）
        priority = "medium"
        if req.applied_at:
            days_old = (datetime.now() - req.applied_at).days
            if days_old > 3:
                priority = "high"
            elif days_old < 1:
                priority = "low"

        approval_requests.append({
            "id": str(req.id),
            "type": req.type,
            "applicant_id": str(req.applicant_id),
            "applicant_name": applicant.name if applicant else "不明",
            "status": req.status,
            "title": req.title,
            "description": req.description,
            "applied_at": req.applied_at.isoformat() if req.applied_at else req.created_at.isoformat(),
            "created_at": req.created_at.isoformat(),
            "priority": priority
        })

    return approval_requests
