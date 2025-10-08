from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
import calendar
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.database import (
    User, Request, LeaveRequest, OvertimeRequest, HolidayWorkRequest,
    ConstructionDailyReport, LeaveBalance
)
from app.services.pdf_generator import generate_shift_table_pdf, generate_timesheet_pdf

router = APIRouter()


def get_month_dates(year: int, month: int) -> List[date]:
    """指定月の全日付リストを取得"""
    _, last_day = calendar.monthrange(year, month)
    return [date(year, month, day) for day in range(1, last_day + 1)]


def get_weekday_name(d: date) -> str:
    """曜日名を取得（日本語）"""
    weekdays = ["月", "火", "水", "木", "金", "土", "日"]
    return weekdays[d.weekday()]


@router.get("/shift/{year}/{month}")
async def get_monthly_shift(
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    月次シフト表データを取得
    - 全従業員の休暇・出勤状況を一覧表示
    - 管理者のみアクセス可能
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="管理者のみアクセスできます")

    # 全ユーザー取得
    users = db.query(User).filter(User.is_active == True).all()

    # 対象月の日付リスト
    month_dates = get_month_dates(year, month)
    start_date = month_dates[0]
    end_date = month_dates[-1]

    result = {
        "year": year,
        "month": month,
        "dates": [
            {
                "date": d.strftime("%Y-%m-%d"),
                "day": d.day,
                "weekday": get_weekday_name(d)
            }
            for d in month_dates
        ],
        "employees": []
    }

    # 各従業員のシフトデータを作成
    for user in users:
        # 休暇申請を取得
        leave_requests = db.query(LeaveRequest).join(Request).filter(
            and_(
                Request.applicant_id == user.id,
                Request.status == "approved",
                or_(
                    and_(LeaveRequest.start_date >= start_date, LeaveRequest.start_date <= end_date),
                    and_(LeaveRequest.end_date >= start_date, LeaveRequest.end_date <= end_date),
                    and_(LeaveRequest.start_date <= start_date, LeaveRequest.end_date >= end_date)
                )
            )
        ).all()

        # 休日出勤申請を取得
        holiday_work_requests = db.query(HolidayWorkRequest).join(Request).filter(
            and_(
                Request.applicant_id == user.id,
                Request.status == "approved",
                HolidayWorkRequest.work_date >= start_date,
                HolidayWorkRequest.work_date <= end_date
            )
        ).all()

        # 休暇残高を取得
        leave_balance = db.query(LeaveBalance).filter(
            and_(
                LeaveBalance.user_id == user.id,
                LeaveBalance.fiscal_year == year
            )
        ).first()

        # 各日付のステータスを判定
        daily_status = {}
        for d in month_dates:
            status = None

            # 休暇チェック
            for leave in leave_requests:
                if leave.start_date <= d <= leave.end_date:
                    if leave.leave_type == "paid":
                        status = "有"  # 有給休暇
                    elif leave.leave_type == "compensatory":
                        status = "代"  # 代休
                    elif leave.leave_type == "special":
                        status = "特"  # 特別休暇
                    break

            # 休日出勤チェック
            if not status:
                for hw in holiday_work_requests:
                    if hw.work_date == d:
                        status = "◎"  # 振替出勤
                        break

            daily_status[d.strftime("%Y-%m-%d")] = status

        # 休暇集計
        paid_leave_count = sum(
            1 for leave in leave_requests
            if leave.leave_type == "paid"
        )
        compensatory_leave_count = sum(
            1 for leave in leave_requests
            if leave.leave_type == "compensatory"
        )
        special_leave_count = sum(
            1 for leave in leave_requests
            if leave.leave_type == "special"
        )
        holiday_work_count = len(holiday_work_requests)

        employee_data = {
            "user_id": user.id,
            "name": user.name,
            "department": user.department,
            "daily_status": daily_status,
            "summary": {
                "paid_leave": paid_leave_count,
                "compensatory_leave": compensatory_leave_count,
                "special_leave": special_leave_count,
                "holiday_work": holiday_work_count
            },
            "balance": {
                "paid_leave": leave_balance.paid_leave_balance if leave_balance else 0.0,
                "compensatory_leave": leave_balance.compensatory_leave_balance if leave_balance else 0.0
            }
        }

        result["employees"].append(employee_data)

    return result


@router.get("/timesheet/{user_id}/{year}/{month}")
async def get_monthly_timesheet(
    user_id: int,
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    個人別月次出勤簿データを取得
    - 自分または管理者のみアクセス可能
    """
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    # 対象ユーザー取得
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # 対象月の日付リスト
    month_dates = get_month_dates(year, month)
    start_date = month_dates[0]
    end_date = month_dates[-1]

    # 工事日報を取得
    daily_reports = db.query(ConstructionDailyReport).filter(
        and_(
            ConstructionDailyReport.user_id == user_id,
            ConstructionDailyReport.report_date >= start_date,
            ConstructionDailyReport.report_date <= end_date
        )
    ).all()
    daily_reports_dict = {report.report_date: report for report in daily_reports}

    # 休暇申請を取得
    leave_requests = db.query(LeaveRequest).join(Request).filter(
        and_(
            Request.applicant_id == user_id,
            Request.status == "approved",
            or_(
                and_(LeaveRequest.start_date >= start_date, LeaveRequest.start_date <= end_date),
                and_(LeaveRequest.end_date >= start_date, LeaveRequest.end_date <= end_date),
                and_(LeaveRequest.start_date <= start_date, LeaveRequest.end_date >= end_date)
            )
        )
    ).all()

    # 残業申請を取得
    overtime_requests = db.query(OvertimeRequest).join(Request).filter(
        and_(
            Request.applicant_id == user_id,
            Request.status == "approved",
            OvertimeRequest.work_date >= start_date,
            OvertimeRequest.work_date <= end_date
        )
    ).all()
    overtime_dict = {ot.work_date: ot for ot in overtime_requests}

    # 休日出勤申請を取得
    holiday_work_requests = db.query(HolidayWorkRequest).join(Request).filter(
        and_(
            Request.applicant_id == user_id,
            Request.status == "approved",
            HolidayWorkRequest.work_date >= start_date,
            HolidayWorkRequest.work_date <= end_date
        )
    ).all()
    holiday_work_dict = {hw.work_date: hw for hw in holiday_work_requests}

    # 各日の出勤簿データを作成
    daily_records = []
    total_work_days = 0
    total_overtime_hours = 0.0
    total_early_hours = 0.0
    paid_leave_days = 0
    compensatory_leave_days = 0
    special_leave_days = 0
    holiday_work_days = 0
    substitute_work_days = 0

    for d in month_dates:
        leave_status = None
        attendance_am = None
        attendance_pm = None
        early_hours = 0.0
        overtime_hours = 0.0
        work_content = ""
        supervisor = ""

        # 休暇チェック
        for leave in leave_requests:
            if leave.start_date <= d <= leave.end_date:
                if leave.leave_type == "paid":
                    leave_status = "有給"
                    paid_leave_days += 1
                elif leave.leave_type == "compensatory":
                    leave_status = "代休"
                    compensatory_leave_days += 1
                elif leave.leave_type == "special":
                    leave_status = "特別休"
                    special_leave_days += 1
                break

        # 休日出勤チェック
        if d in holiday_work_dict:
            hw = holiday_work_dict[d]
            attendance_am = "○"
            attendance_pm = "○"
            work_content = hw.work_content or ""
            if hw.compensatory_leave_date:
                leave_status = "振替出"
                substitute_work_days += 1
            else:
                holiday_work_days += 1
            total_work_days += 1

        # 通常出勤チェック（日報ベース）
        elif not leave_status and d in daily_reports_dict:
            report = daily_reports_dict[d]
            attendance_am = "○"
            attendance_pm = "○"
            work_content = report.work_content or ""
            supervisor = user.name  # 簡易的に本人を設定
            total_work_days += 1

            # 早出チェック
            if report.early_start:
                early_hours = 1.0  # 簡易計算
                total_early_hours += early_hours

        # 残業チェック
        if d in overtime_dict:
            ot = overtime_dict[d]
            overtime_hours = ot.total_hours
            total_overtime_hours += overtime_hours
            if not work_content:
                work_content = ot.work_content or ""

        record = {
            "date": d.strftime("%Y-%m-%d"),
            "day": d.day,
            "weekday": get_weekday_name(d),
            "attendance_am": leave_status or attendance_am,
            "attendance_pm": leave_status or attendance_pm,
            "early_hours": early_hours,
            "overtime_hours": overtime_hours,
            "supervisor": supervisor,
            "work_content": work_content,
            "leave_status": leave_status
        }

        daily_records.append(record)

    # 労働時間計算（8時間/日）
    total_work_hours = total_work_days * 8.0

    result = {
        "year": year,
        "month": month,
        "user": {
            "id": user.id,
            "name": user.name,
            "department": user.department
        },
        "daily_records": daily_records,
        "summary": {
            "total_work_days": total_work_days,
            "substitute_work_days": substitute_work_days,
            "holiday_work_days": holiday_work_days,
            "paid_leave_days": paid_leave_days,
            "compensatory_leave_days": compensatory_leave_days,
            "special_leave_days": special_leave_days,
            "total_early_hours": total_early_hours,
            "total_overtime_hours": total_overtime_hours,
            "total_work_hours": total_work_hours,
            "absence_days": 0  # 欠勤（未実装）
        }
    }

    return result


@router.get("/balance/{user_id}")
async def get_leave_balance(
    user_id: int,
    fiscal_year: int = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    休暇残高を取得
    - 自分または管理者のみアクセス可能
    """
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    if fiscal_year is None:
        fiscal_year = datetime.now().year

    balance = db.query(LeaveBalance).filter(
        and_(
            LeaveBalance.user_id == user_id,
            LeaveBalance.fiscal_year == fiscal_year
        )
    ).first()

    if not balance:
        # デフォルト値を返す
        return {
            "user_id": user_id,
            "fiscal_year": fiscal_year,
            "paid_leave_balance": 0.0,
            "compensatory_leave_balance": 0.0,
            "special_leave_balance": 0.0
        }

    return {
        "user_id": balance.user_id,
        "fiscal_year": balance.fiscal_year,
        "paid_leave_total": balance.paid_leave_total,
        "paid_leave_used": balance.paid_leave_used,
        "paid_leave_balance": balance.paid_leave_balance,
        "compensatory_leave_total": balance.compensatory_leave_total,
        "compensatory_leave_used": balance.compensatory_leave_used,
        "compensatory_leave_balance": balance.compensatory_leave_balance,
        "special_leave_total": balance.special_leave_total,
        "special_leave_used": balance.special_leave_used,
        "special_leave_balance": balance.special_leave_balance
    }


@router.post("/balance/{user_id}")
async def update_leave_balance(
    user_id: int,
    fiscal_year: int,
    paid_leave_total: float = 0.0,
    compensatory_leave_total: float = 0.0,
    special_leave_total: float = 0.0,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    休暇残高を更新（管理者のみ）
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="管理者のみアクセスできます")

    balance = db.query(LeaveBalance).filter(
        and_(
            LeaveBalance.user_id == user_id,
            LeaveBalance.fiscal_year == fiscal_year
        )
    ).first()

    if not balance:
        # 新規作成
        balance = LeaveBalance(
            user_id=user_id,
            fiscal_year=fiscal_year,
            paid_leave_total=paid_leave_total,
            paid_leave_balance=paid_leave_total,
            compensatory_leave_total=compensatory_leave_total,
            compensatory_leave_balance=compensatory_leave_total,
            special_leave_total=special_leave_total,
            special_leave_balance=special_leave_total
        )
        db.add(balance)
    else:
        # 更新
        balance.paid_leave_total = paid_leave_total
        balance.paid_leave_balance = paid_leave_total - balance.paid_leave_used
        balance.compensatory_leave_total = compensatory_leave_total
        balance.compensatory_leave_balance = compensatory_leave_total - balance.compensatory_leave_used
        balance.special_leave_total = special_leave_total
        balance.special_leave_balance = special_leave_total - balance.special_leave_used

    db.commit()
    db.refresh(balance)

    return {"message": "休暇残高を更新しました", "balance": balance}


@router.get("/shift/{year}/{month}/pdf")
async def get_shift_table_pdf(
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    月次シフト表をPDFで出力
    - 管理者のみアクセス可能
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="管理者のみアクセスできます")

    # シフトデータを取得
    shift_data = await get_monthly_shift(year, month, current_user, db)

    # PDF生成
    pdf_bytes = generate_shift_table_pdf(shift_data)

    # レスポンス
    filename = f"shift_table_{year}_{month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/timesheet/{user_id}/{year}/{month}/pdf")
async def get_timesheet_pdf(
    user_id: int,
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    個人別月次出勤簿をPDFで出力
    - 自分または管理者のみアクセス可能
    """
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    # 出勤簿データを取得
    timesheet_data = await get_monthly_timesheet(user_id, year, month, current_user, db)

    # PDF生成
    pdf_bytes = generate_timesheet_pdf(timesheet_data)

    # レスポンス
    user = db.query(User).filter(User.id == user_id).first()
    filename = f"timesheet_{user.name}_{year}_{month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
