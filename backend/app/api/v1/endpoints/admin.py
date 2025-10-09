from fastapi import APIRouter, Depends
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.auth import get_current_admin_user
from app.core.database import get_db
from app.models.database import User, Request

router = APIRouter()

@router.get("/stats")
async def get_admin_stats(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    管理画面用の統計情報を取得（実データ）
    """
    # ユーザー統計
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()

    # 申請統計
    total_requests = db.query(func.count(Request.id)).scalar()
    pending_requests = db.query(func.count(Request.id)).filter(Request.status == "applied").scalar()
    approved_requests = db.query(func.count(Request.id)).filter(Request.status == "approved").scalar()
    rejected_requests = db.query(func.count(Request.id)).filter(Request.status == "rejected").scalar()

    # 申請種別ごとの統計
    requests_by_type = {}
    request_types = ["leave", "overtime", "expense", "holiday_work", "reimbursement", "settlement"]
    for req_type in request_types:
        count = db.query(func.count(Request.id)).filter(Request.type == req_type).scalar()
        requests_by_type[req_type] = count or 0

    # 申請種別ごとの承認待ち件数
    pending_by_type = {}
    for req_type in request_types:
        count = db.query(func.count(Request.id)).filter(
            Request.type == req_type,
            Request.status == "applied"
        ).scalar()
        pending_by_type[req_type] = count or 0

    # 最近のアクティビティ（直近10件）
    recent_requests = db.query(Request).order_by(Request.created_at.desc()).limit(10).all()
    recent_activities = []
    for req in recent_requests:
        user = db.query(User).filter(User.id == req.applicant_id).first()
        recent_activities.append({
            "id": str(req.id),
            "user_name": user.name if user else "不明",
            "action": "申請を作成",
            "target": req.title,
            "timestamp": req.created_at.isoformat() if req.created_at else datetime.now().isoformat()
        })

    stats = {
        "total_users": total_users or 0,
        "active_users": active_users or 0,
        "total_requests": total_requests or 0,
        "pending_requests": pending_requests or 0,
        "approved_requests": approved_requests or 0,
        "rejected_requests": rejected_requests or 0,
        "requests_by_type": requests_by_type,
        "pending_by_type": pending_by_type,
        "recent_activities": recent_activities
    }

    return {
        "success": True,
        "data": stats
    }

@router.get("/users")
async def get_all_users(
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    全ユーザー一覧を取得（実データ）
    """
    users = db.query(User).all()

    users_data = []
    for user in users:
        users_data.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "position": user.position,
            "is_active": user.is_active
        })

    return {
        "success": True,
        "data": users_data,
        "total": len(users_data)
    }
