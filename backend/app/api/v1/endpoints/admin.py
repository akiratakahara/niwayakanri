from fastapi import APIRouter, Depends
from datetime import datetime, date
from app.core.auth import get_current_admin_user

router = APIRouter()

@router.get("/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_admin_user)):
    """
    管理画面用の統計情報を取得
    """
    # 簡単な実装（後でデータベースから取得）
    stats = {
        "total_users": 25,
        "active_users": 23,
        "total_requests": 156,
        "pending_requests": 8,
        "approved_requests": 132,
        "rejected_requests": 16,
        "requests_this_month": 34,
        "requests_by_type": {
            "leave": 78,
            "overtime": 45,
            "expense": 23,
            "holiday_work": 10
        },
        "recent_activities": [
            {
                "id": "1",
                "user_name": "山田 太郎",
                "action": "申請を作成",
                "target": "有給休暇申請",
                "timestamp": datetime.now().isoformat()
            },
            {
                "id": "2",
                "user_name": "管理者",
                "action": "申請を承認",
                "target": "残業申請",
                "timestamp": datetime.now().isoformat()
            }
        ]
    }

    return {
        "success": True,
        "data": stats
    }

@router.get("/users")
async def get_all_users(current_user: dict = Depends(get_current_admin_user)):
    """
    全ユーザー一覧を取得
    """
    users = [
        {
            "id": "1",
            "name": "管理者 太郎",
            "email": "admin@example.com",
            "role": "admin",
            "department": "総務部",
            "position": "部長",
            "is_active": True
        },
        {
            "id": "2",
            "name": "山田 太郎",
            "email": "yamada@example.com",
            "role": "employee",
            "department": "営業部",
            "position": "課長",
            "is_active": True
        },
        {
            "id": "3",
            "name": "佐藤 花子",
            "email": "sato@example.com",
            "role": "employee",
            "department": "開発部",
            "position": "主任",
            "is_active": True
        }
    ]

    return {
        "success": True,
        "data": users,
        "total": len(users)
    }
