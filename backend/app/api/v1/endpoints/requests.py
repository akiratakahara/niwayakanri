from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

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

class LeaveRequest(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    days: float
    reason: str

class OvertimeRequest(BaseModel):
    work_date: date
    start_time: str
    end_time: str
    total_hours: float
    reason: str

class ExpenseRequest(BaseModel):
    expense_type: str
    purpose: str
    total_amount: int
    vendor: Optional[str] = None
    occurred_date: date

@router.get("/", response_model=List[Request])
async def get_requests():
    """
    申請一覧を取得
    """
    # 簡単な実装（後でデータベースから取得）
    return [
        Request(
            id="1",
            type="leave",
            applicant_id="2",
            status="applied",
            title="有給休暇申請",
            description="家族旅行のため",
            applied_at=datetime.now(),
            created_at=datetime.now()
        ),
        Request(
            id="2",
            type="overtime",
            applicant_id="2",
            status="approved",
            title="残業申請",
            description="プロジェクトの締切対応",
            applied_at=datetime.now(),
            created_at=datetime.now()
        )
    ]

@router.get("/{request_id}", response_model=Request)
async def get_request(request_id: str):
    """
    特定の申請を取得
    """
    if request_id == "1":
        return Request(
            id="1",
            type="leave",
            applicant_id="2",
            status="applied",
            title="有給休暇申請",
            description="家族旅行のため",
            applied_at=datetime.now(),
            created_at=datetime.now()
        )
    
    raise HTTPException(status_code=404, detail="申請が見つかりません")

@router.post("/leave", response_model=Request)
async def create_leave_request(request: LeaveRequest):
    """
    休暇申請を作成
    """
    # 簡単な実装（後でデータベースに保存）
    return Request(
        id="3",
        type="leave",
        applicant_id="2",
        status="draft",
        title="有給休暇申請",
        description=request.reason,
        created_at=datetime.now()
    )

@router.post("/overtime", response_model=Request)
async def create_overtime_request(request: OvertimeRequest):
    """
    時間外労働申請を作成
    """
    # 簡単な実装（後でデータベースに保存）
    return Request(
        id="4",
        type="overtime",
        applicant_id="2",
        status="draft",
        title="時間外労働申請",
        description=request.reason,
        created_at=datetime.now()
    )

@router.post("/expense", response_model=Request)
async def create_expense_request(request: ExpenseRequest):
    """
    仮払・立替申請を作成
    """
    # 簡単な実装（後でデータベースに保存）
    return Request(
        id="5",
        type="expense",
        applicant_id="2",
        status="draft",
        title="仮払申請",
        description=request.purpose,
        created_at=datetime.now()
    )

@router.post("/{request_id}/submit")
async def submit_request(request_id: str):
    """
    申請を提出
    """
    return {"message": f"申請 {request_id} を提出しました"}

@router.post("/{request_id}/approve")
async def approve_request(request_id: str):
    """
    申請を承認
    """
    return {"message": f"申請 {request_id} を承認しました"}

@router.post("/{request_id}/reject")
async def reject_request(request_id: str):
    """
    申請を却下
    """
    return {"message": f"申請 {request_id} を却下しました"}



