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
    # 承認待ち（applied）ステータスの申請を取得
    requests = db.query(RequestModel).filter(
        RequestModel.status == "applied"
    ).order_by(RequestModel.applied_at.desc()).all()

    # レスポンスデータを構築
    approval_requests = []
    for req in requests:
        applicant = db.query(User).filter(User.id == req.applicant_id).first()

        approval_requests.append({
            "id": str(req.id),
            "type": req.type,
            "applicant_id": str(req.applicant_id),
            "applicant_name": applicant.name if applicant else "不明",
            "status": req.status,
            "title": req.title,
            "description": req.description,
            "applied_at": req.applied_at.isoformat() if req.applied_at else None,
            "created_at": req.created_at.isoformat()
        })

    return {
        "success": True,
        "data": approval_requests,
        "total": len(approval_requests)
    }
