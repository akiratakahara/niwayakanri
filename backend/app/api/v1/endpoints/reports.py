from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.core.auth import get_current_admin_user

router = APIRouter()


@router.get("/reports/summary")
async def get_summary_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin_user)
):
    """
    集計レポートデータを取得
    """
    summary = {
        "period": {
            "start": start_date or "2025-10-01",
            "end": end_date or "2025-10-31"
        },
        "requests_summary": {
            "total": 45,
            "by_type": {
                "leave": 20,
                "overtime": 15,
                "expense": 7,
                "holiday_work": 3
            },
            "by_status": {
                "pending": 5,
                "approved": 35,
                "rejected": 5
            }
        },
        "attendance_summary": {
            "total_work_days": 22,
            "total_overtime_hours": 48.5,
            "total_leave_days": 12
        }
    }

    return {
        "success": True,
        "data": summary
    }


@router.get("/notifications/settings")
async def get_notification_settings(current_user: dict = Depends(get_current_admin_user)):
    """
    通知設定を取得
    """
    settings = {
        "email_notifications": True,
        "slack_notifications": False,
        "daily_report_reminder": {
            "enabled": True,
            "time": "17:00"
        },
        "approval_reminder": {
            "enabled": True,
            "days": 3
        }
    }

    return {
        "success": True,
        "data": settings
    }


@router.put("/notifications/settings")
async def update_notification_settings(
    settings: dict,
    current_user: dict = Depends(get_current_admin_user)
):
    """
    通知設定を更新
    """
    # TODO: データベースに保存
    return {
        "success": True,
        "message": "通知設定を更新しました",
        "data": settings
    }
