from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

from app.core.auth import get_current_admin_user, get_current_user
from app.core.database import get_db
from app.models.database import (
    User, Request as RequestModel, LeaveRequest as LeaveRequestModel,
    OvertimeRequest as OvertimeRequestModel, ExpenseRequest as ExpenseRequestModel,
    ReimbursementRequest as ReimbursementRequestModel, SettlementRequest as SettlementRequestModel,
    HolidayWorkRequest as HolidayWorkRequestModel, ExpenseLine as ExpenseLineModel
)

router = APIRouter()

class Request(BaseModel):
    id: str
    type: str
    applicant_id: str
    status: str
    title: str
    description: Optional[str] = None
    applied_at: Optional[datetime] = None
    created_at: datetime

class LeaveRequestData(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    days: float
    hours: Optional[float] = 0
    reason: str
    handover_notes: Optional[str] = None
    start_duration: Optional[str] = "full"
    end_duration: Optional[str] = "full"
    compensatory_work_date: Optional[date] = None

class LeaveRequest(BaseModel):
    request: Optional[dict] = None
    leave_request: LeaveRequestData

class OvertimeRequestData(BaseModel):
    work_date: date
    start_time: str
    end_time: str
    break_time: Optional[int] = 0
    total_hours: float
    overtime_type: Optional[str] = None
    reason: str
    project_name: Optional[str] = None

class OvertimeRequest(BaseModel):
    request: Optional[dict] = None
    overtime_request: OvertimeRequestData

class HolidayWorkRequestData(BaseModel):
    """休日出勤申請データ"""
    work_date: date
    start_time: str
    end_time: str
    break_time: Optional[int] = 0
    work_content: str
    reason: str
    compensatory_leave_date: Optional[date] = None

class HolidayWorkRequest(BaseModel):
    """休日出勤申請"""
    request: Optional[dict] = None
    holiday_work_request: HolidayWorkRequestData

class AdvancePaymentRequestData(BaseModel):
    """仮払金申請データ"""
    applicant_name: str
    site_name: str
    application_date: date
    request_amount: int

class AdvancePaymentRequest(BaseModel):
    """仮払金申請"""
    request: Optional[dict] = None
    advance_payment_request: AdvancePaymentRequestData

class ExpenseLine(BaseModel):
    """精算明細"""
    date: date
    item: str
    site_name: Optional[str] = None
    tax_type: str
    amount: int

class SettlementRequest(BaseModel):
    """精算申請"""
    expense_type: str
    advance_payment_request_id: str
    settlement_date: date
    expense_lines: List[ExpenseLine]
    total_amount: int
    balance_amount: int

class ReimbursementRequest(BaseModel):
    """立替金申請"""
    applicant_name: str
    application_date: date
    site_name: str
    expense_lines: List[ExpenseLine]
    total_amount: int

class ApproveRequestBody(BaseModel):
    """承認リクエストボディ"""
    comment: Optional[str] = None
    received_date: Optional[date] = None

@router.get("/")
async def get_requests(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    申請一覧を取得
    """
    # データベースから申請を取得（リレーションを事前読み込み）
    query = db.query(RequestModel).options(
        joinedload(RequestModel.applicant),
        joinedload(RequestModel.approver)
    )

    # 管理者以外は自分の申請のみ表示
    if current_user.get("role") != "admin":
        query = query.filter(RequestModel.applicant_id == current_user["id"])

    requests = query.order_by(RequestModel.created_at.desc()).all()

    # 仮払金申請情報を一括取得
    expense_request_ids = [req.id for req in requests if req.type == "expense"]
    expense_requests = {}
    if expense_request_ids:
        expenses = db.query(ExpenseRequestModel).filter(
            ExpenseRequestModel.request_id.in_(expense_request_ids)
        ).all()
        expense_requests = {exp.request_id: exp for exp in expenses}

    # レスポンスデータを構築
    requests_data = []
    for req in requests:
        request_dict = {
            "id": str(req.id),
            "type": req.type,
            "applicant_id": str(req.applicant_id),
            "applicant_name": req.applicant.name if req.applicant else "不明",
            "status": req.status,
            "title": req.title,
            "description": req.description,
            "applied_at": req.applied_at.isoformat() if req.applied_at else None,
            "created_at": req.created_at.isoformat()
        }

        # 仮払金申請の追加情報
        if req.type == "expense" and req.id in expense_requests:
            expense = expense_requests[req.id]
            request_dict.update({
                "site_name": expense.site_name,
                "request_amount": expense.request_amount,
                "application_date": expense.application_date.isoformat(),
                "received_date": expense.received_date.isoformat() if expense.received_date else None,
                "is_settled": False  # TODO: 精算済みフラグの判定
            })

        requests_data.append(request_dict)

    return {
        "success": True,
        "data": requests_data,
        "total": len(requests_data)
    }

@router.get("/{request_id}")
async def get_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    特定の申請を取得
    """
    request = db.query(RequestModel).filter(RequestModel.id == int(request_id)).first()

    if not request:
        raise HTTPException(status_code=404, detail="申請が見つかりません")

    # 管理者以外は自分の申請のみ閲覧可能
    if current_user.get("role") != "admin" and request.applicant_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="この申請を閲覧する権限がありません")

    # 申請者情報を取得
    applicant = db.query(User).filter(User.id == request.applicant_id).first()

    return {
        "id": str(request.id),
        "type": request.type,
        "applicant_id": str(request.applicant_id),
        "applicant_name": applicant.name if applicant else "不明",
        "status": request.status,
        "title": request.title,
        "description": request.description,
        "applied_at": request.applied_at.isoformat() if request.applied_at else None,
        "created_at": request.created_at.isoformat()
    }

def get_leave_type_japanese(leave_type: str) -> str:
    """休暇タイプを日本語に変換"""
    leave_types = {
        "paid": "有給休暇",
        "compensatory": "代休",
        "special": "特別休暇",
        "sick": "病欠",
        "other": "その他休暇"
    }
    return leave_types.get(leave_type, leave_type)

@router.post("/leave", response_model=Request)
async def create_leave_request(
    request: LeaveRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    休暇申請を作成
    """
    leave_data = request.leave_request

    # 親リクエストを作成
    from datetime import datetime
    leave_type_ja = get_leave_type_japanese(leave_data.leave_type)
    new_request = RequestModel(
        type="leave",
        applicant_id=current_user["id"],
        status="pending",
        title=f"{leave_type_ja}申請",
        description=leave_data.reason,
        applied_at=datetime.now()
    )
    db.add(new_request)
    db.flush()  # IDを取得するため

    # 休暇申請詳細を作成
    leave_request = LeaveRequestModel(
        request_id=new_request.id,
        leave_type=leave_data.leave_type,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        start_duration=leave_data.start_duration,
        end_duration=leave_data.end_duration,
        days=leave_data.days,
        hours=leave_data.hours,
        reason=leave_data.reason,
        handover_notes=leave_data.handover_notes,
        compensatory_work_date=leave_data.compensatory_work_date
    )
    db.add(leave_request)
    db.commit()
    db.refresh(new_request)

    return Request(
        id=str(new_request.id),
        type=new_request.type,
        applicant_id=str(new_request.applicant_id),
        status=new_request.status,
        title=new_request.title,
        description=new_request.description,
        applied_at=new_request.applied_at,
        created_at=new_request.created_at
    )

@router.post("/overtime", response_model=Request)
async def create_overtime_request(
    request: OvertimeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    時間外労働申請を作成
    """
    overtime_data = request.overtime_request

    # 親リクエストを作成
    from datetime import datetime
    new_request = RequestModel(
        type="overtime",
        applicant_id=current_user["id"],
        status="pending",
        title="時間外労働申請",
        description=overtime_data.reason,
        applied_at=datetime.now()
    )
    db.add(new_request)
    db.flush()

    # 残業申請詳細を作成
    overtime_request = OvertimeRequestModel(
        request_id=new_request.id,
        work_date=overtime_data.work_date,
        start_time=overtime_data.start_time,
        end_time=overtime_data.end_time,
        total_hours=overtime_data.total_hours,
        reason=overtime_data.reason
    )
    db.add(overtime_request)
    db.commit()
    db.refresh(new_request)

    return Request(
        id=str(new_request.id),
        type=new_request.type,
        applicant_id=str(new_request.applicant_id),
        status=new_request.status,
        title=new_request.title,
        description=new_request.description,
        applied_at=new_request.applied_at,
        created_at=new_request.created_at
    )

@router.delete("/{request_id}")
async def cancel_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    申請を取り消し
    """
    request = db.query(RequestModel).filter(RequestModel.id == int(request_id)).first()

    if not request:
        raise HTTPException(status_code=404, detail="申請が見つかりません")

    # 申請者本人のみ取り消し可能
    if request.applicant_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="この申請を取り消す権限がありません")

    # 承認待ちの場合のみ取り消し可能
    if request.status != "pending":
        raise HTTPException(status_code=400, detail="承認待ちの申請のみ取り消しできます")

    # ステータスを「取り消し」に変更
    request.status = "cancelled"
    db.commit()

    return {
        "success": True,
        "message": "申請を取り消しました"
    }

@router.post("/expense", response_model=Request)
async def create_expense_request(
    request: AdvancePaymentRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    仮払金申請を作成
    """
    expense_data = request.advance_payment_request

    # 親リクエストを作成
    from datetime import datetime
    new_request = RequestModel(
        type="expense",
        applicant_id=current_user["id"],
        status="pending",
        title=f"仮払金申請 - {expense_data.site_name}",
        description=f"申請者: {expense_data.applicant_name}, 現場: {expense_data.site_name}, 金額: ¥{expense_data.request_amount:,}",
        applied_at=datetime.now()
    )
    db.add(new_request)
    db.flush()

    # 仮払金申請詳細を作成
    expense_request = ExpenseRequestModel(
        request_id=new_request.id,
        applicant_name=expense_data.applicant_name,
        site_name=expense_data.site_name,
        application_date=expense_data.application_date,
        request_amount=expense_data.request_amount
    )
    db.add(expense_request)
    db.commit()
    db.refresh(new_request)

    return Request(
        id=str(new_request.id),
        type=new_request.type,
        applicant_id=str(new_request.applicant_id),
        status=new_request.status,
        title=new_request.title,
        description=new_request.description,
        applied_at=new_request.applied_at,
        created_at=new_request.created_at
    )

@router.post("/expense-settlement", response_model=Request)
async def create_settlement_request(
    request: SettlementRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    仮払金精算を作成
    """
    # 仮払金申請の存在確認
    advance_request = db.query(ExpenseRequestModel).filter(
        ExpenseRequestModel.id == int(request.advance_payment_request_id)
    ).first()

    if not advance_request:
        raise HTTPException(status_code=404, detail="仮払金申請が見つかりません")

    # 親リクエストを作成
    new_request = RequestModel(
        type="settlement",
        applicant_id=current_user["id"],
        status="draft",
        title=f"仮払金精算 - 申請ID: {request.advance_payment_request_id}",
        description=f"精算期日: {request.settlement_date}, 使用金額: ¥{request.total_amount:,}, 残額: ¥{request.balance_amount:,}"
    )
    db.add(new_request)
    db.flush()

    # 精算申請詳細を作成
    settlement_request = SettlementRequestModel(
        request_id=new_request.id,
        expense_type=request.expense_type,
        advance_payment_request_id=int(request.advance_payment_request_id),
        settlement_date=request.settlement_date,
        total_amount=request.total_amount,
        balance_amount=request.balance_amount,
        applicant_name=advance_request.applicant_name,
        site_name=advance_request.site_name,
        application_date=advance_request.application_date,
        advance_payment_amount=advance_request.request_amount
    )
    db.add(settlement_request)

    # 明細を作成
    for line in request.expense_lines:
        expense_line = ExpenseLineModel(
            settlement_request_id=settlement_request.id,
            date=line.date,
            item=line.item,
            site_name=line.site_name,
            tax_type=line.tax_type,
            amount=line.amount
        )
        db.add(expense_line)

    db.commit()
    db.refresh(new_request)

    return Request(
        id=str(new_request.id),
        type=new_request.type,
        applicant_id=str(new_request.applicant_id),
        status=new_request.status,
        title=new_request.title,
        description=new_request.description,
        applied_at=new_request.applied_at,
        created_at=new_request.created_at
    )

@router.post("/reimbursement", response_model=Request)
async def create_reimbursement_request(
    request: ReimbursementRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    立替金申請を作成
    """
    # 親リクエストを作成
    new_request = RequestModel(
        type="reimbursement",
        applicant_id=current_user["id"],
        status="draft",
        title=f"立替金申請 - {request.site_name}",
        description=f"申請者: {request.applicant_name}, 現場: {request.site_name}, 合計: ¥{request.total_amount:,}"
    )
    db.add(new_request)
    db.flush()

    # 立替金申請詳細を作成
    reimbursement_request = ReimbursementRequestModel(
        request_id=new_request.id,
        applicant_name=request.applicant_name,
        site_name=request.site_name,
        application_date=request.application_date,
        total_amount=request.total_amount
    )
    db.add(reimbursement_request)

    # 明細を作成
    for line in request.expense_lines:
        expense_line = ExpenseLineModel(
            reimbursement_request_id=reimbursement_request.id,
            date=line.date,
            item=line.item,
            site_name=line.site_name,
            tax_type=line.tax_type,
            amount=line.amount
        )
        db.add(expense_line)

    db.commit()
    db.refresh(new_request)

    return Request(
        id=str(new_request.id),
        type=new_request.type,
        applicant_id=str(new_request.applicant_id),
        status=new_request.status,
        title=new_request.title,
        description=new_request.description,
        applied_at=new_request.applied_at,
        created_at=new_request.created_at
    )

@router.post("/holiday-work", response_model=Request)
async def create_holiday_work_request(
    request: HolidayWorkRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    休日出勤申請を作成
    """
    holiday_data = request.holiday_work_request

    # 親リクエストを作成
    from datetime import datetime
    new_request = RequestModel(
        type="holiday_work",
        applicant_id=current_user["id"],
        status="pending",
        title="休日出勤申請",
        description=holiday_data.reason,
        applied_at=datetime.now()
    )
    db.add(new_request)
    db.flush()

    # 休日出勤申請詳細を作成
    holiday_work_request = HolidayWorkRequestModel(
        request_id=new_request.id,
        work_date=holiday_data.work_date,
        start_time=holiday_data.start_time,
        end_time=holiday_data.end_time,
        break_time=holiday_data.break_time,
        work_content=holiday_data.work_content,
        reason=holiday_data.reason,
        compensatory_leave_date=holiday_data.compensatory_leave_date
    )
    db.add(holiday_work_request)
    db.commit()
    db.refresh(new_request)

    return Request(
        id=str(new_request.id),
        type=new_request.type,
        applicant_id=str(new_request.applicant_id),
        status=new_request.status,
        title=new_request.title,
        description=new_request.description,
        applied_at=new_request.applied_at,
        created_at=new_request.created_at
    )

@router.post("/{request_id}/submit")
async def submit_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    申請を提出
    """
    request = db.query(RequestModel).filter(RequestModel.id == int(request_id)).first()

    if not request:
        raise HTTPException(status_code=404, detail="申請が見つかりません")

    # 自分の申請のみ提出可能
    if request.applicant_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="この申請を提出する権限がありません")

    # ステータスを更新
    request.status = "applied"
    request.applied_at = datetime.utcnow()
    db.commit()

    return {"message": f"申請 {request_id} を提出しました"}

@router.post("/{request_id}/approve")
async def approve_request(
    request_id: str,
    body: Optional[ApproveRequestBody] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    """
    申請を承認
    仮払金申請の場合は受領日も記録
    """
    request = db.query(RequestModel).filter(RequestModel.id == int(request_id)).first()

    if not request:
        raise HTTPException(status_code=404, detail="申請が見つかりません")

    # ステータスを更新
    request.status = "approved"
    request.approved_at = datetime.utcnow()
    request.approver_id = current_user["id"]
    if body and body.comment:
        request.approver_comment = body.comment

    # 仮払金申請の場合は受領日を記録
    if request.type == "expense" and body and body.received_date:
        expense = db.query(ExpenseRequestModel).filter(
            ExpenseRequestModel.request_id == request.id
        ).first()
        if expense:
            expense.received_date = body.received_date

    db.commit()

    response = {"message": f"申請 {request_id} を承認しました"}
    if body and body.received_date:
        response["received_date"] = body.received_date.isoformat()

    return response

@router.post("/{request_id}/reject")
async def reject_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    """
    申請を却下
    """
    request = db.query(RequestModel).filter(RequestModel.id == int(request_id)).first()

    if not request:
        raise HTTPException(status_code=404, detail="申請が見つかりません")

    # ステータスを更新
    request.status = "rejected"
    request.rejected_at = datetime.utcnow()
    request.approver_id = current_user["id"]
    db.commit()

    return {"message": f"申請 {request_id} を却下しました"}





