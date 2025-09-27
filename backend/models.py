from datetime import datetime, date, time
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID, uuid4

# Enums for various types
class UserRole(str, Enum):
    USER = "user"
    APPROVER = "approver"
    ADMIN = "admin"

class RequestType(str, Enum):
    LEAVE = "leave"
    OVERTIME = "overtime"
    EXPENSE = "expense"

class RequestStatus(str, Enum):
    DRAFT = "draft"
    APPLIED = "applied"
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED = "returned"
    COMPLETED = "completed"

class LeaveType(str, Enum):
    ANNUAL = "annual"
    SICK = "sick"
    COMPENSATORY = "compensatory"
    SPECIAL = "special"

class OvertimeType(str, Enum):
    EARLY = "early"
    OVERTIME = "overtime"
    HOLIDAY = "holiday"

class ExpenseType(str, Enum):
    ADVANCE = "advance"
    REIMBURSEMENT = "reimbursement"

class ApprovalAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    RETURN = "return"

# Base Models
class BaseDBModel(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole
    department: Optional[str] = None
    position: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str
    department: Optional[str] = None
    position: Optional[str] = None
    employee_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    position: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordReset(BaseModel):
    new_password: str = Field(..., min_length=8)

class User(UserBase, BaseDBModel):
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSession(BaseDBModel):
    user_id: UUID
    session_token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: datetime
    is_active: bool = True
    last_accessed: datetime = Field(default_factory=datetime.now)

# Request Models
class RequestBase(BaseModel):
    type: RequestType
    title: Optional[str] = None
    description: Optional[str] = None

class RequestCreate(RequestBase):
    pass

class RequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[RequestStatus] = None

class Request(RequestBase, BaseDBModel):
    applicant_id: UUID
    status: RequestStatus = RequestStatus.DRAFT
    applied_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Leave Request Models
class LeaveRequestBase(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    days: float
    hours: Optional[float] = None
    reason: Optional[str] = None
    handover_notes: Optional[str] = None

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequestUpdate(BaseModel):
    leave_type: Optional[LeaveType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    days: Optional[float] = None
    hours: Optional[float] = None
    reason: Optional[str] = None
    handover_notes: Optional[str] = None

class LeaveRequest(LeaveRequestBase, BaseDBModel):
    request_id: UUID

    class Config:
        from_attributes = True

# Overtime Request Models
class OvertimeRequestBase(BaseModel):
    work_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_time: int = 0  # minutes
    total_hours: float
    overtime_type: OvertimeType
    reason: str
    project_name: Optional[str] = None

class OvertimeRequestCreate(OvertimeRequestBase):
    pass

class OvertimeRequestUpdate(BaseModel):
    work_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_time: Optional[int] = None
    total_hours: Optional[float] = None
    overtime_type: Optional[OvertimeType] = None
    reason: Optional[str] = None
    project_name: Optional[str] = None

class OvertimeRequest(OvertimeRequestBase, BaseDBModel):
    request_id: UUID

    class Config:
        from_attributes = True

# Expense Request Models
class ExpenseRequestBase(BaseModel):
    expense_type: ExpenseType
    purpose: str
    total_amount: int  # yen
    vendor: Optional[str] = None
    occurred_date: date
    description: Optional[str] = None

class ExpenseRequestCreate(ExpenseRequestBase):
    pass

class ExpenseRequestUpdate(BaseModel):
    expense_type: Optional[ExpenseType] = None
    purpose: Optional[str] = None
    total_amount: Optional[int] = None
    vendor: Optional[str] = None
    occurred_date: Optional[date] = None
    description: Optional[str] = None

class ExpenseRequest(ExpenseRequestBase, BaseDBModel):
    request_id: UUID

    class Config:
        from_attributes = True

# Expense Line Models
class ExpenseLineBase(BaseModel):
    account_code: Optional[str] = None
    account_name: Optional[str] = None
    tax_type: Optional[str] = None
    amount: int
    description: Optional[str] = None
    receipt_url: Optional[str] = None

class ExpenseLineCreate(ExpenseLineBase):
    pass

class ExpenseLineUpdate(BaseModel):
    account_code: Optional[str] = None
    account_name: Optional[str] = None
    tax_type: Optional[str] = None
    amount: Optional[int] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None

class ExpenseLine(ExpenseLineBase, BaseDBModel):
    request_id: UUID

    class Config:
        from_attributes = True

# Approval Models
class ApprovalBase(BaseModel):
    action: ApprovalAction
    comment: Optional[str] = None

class ApprovalCreate(ApprovalBase):
    request_id: UUID
    step: int = 1

class ApprovalUpdate(BaseModel):
    action: Optional[ApprovalAction] = None
    comment: Optional[str] = None

class Approval(ApprovalBase, BaseDBModel):
    request_id: UUID
    approver_id: UUID
    step: int = 1
    acted_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

# Leave Balance Models
class LeaveBalanceBase(BaseModel):
    leave_type: LeaveType
    year: int
    total_days: float = 0
    used_days: float = 0

class LeaveBalanceCreate(LeaveBalanceBase):
    user_id: UUID

class LeaveBalanceUpdate(BaseModel):
    total_days: Optional[float] = None
    used_days: Optional[float] = None

class LeaveBalance(LeaveBalanceBase, BaseDBModel):
    user_id: UUID
    remaining_days: float = 0

    class Config:
        from_attributes = True

# Response Models
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class RequestDetailResponse(BaseModel):
    request: Request
    leave_request: Optional[LeaveRequest] = None
    overtime_request: Optional[OvertimeRequest] = None
    expense_request: Optional[ExpenseRequest] = None
    expense_lines: Optional[List[ExpenseLine]] = None
    approvals: List[Approval] = []
    applicant: User

class DashboardStats(BaseModel):
    total_requests: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    my_pending_approvals: int

# Complete Request Models (for creation with nested data)
class CompleteLeaveRequestCreate(BaseModel):
    request: RequestCreate
    leave_request: LeaveRequestCreate

class CompleteOvertimeRequestCreate(BaseModel):
    request: RequestCreate
    overtime_request: OvertimeRequestCreate

class CompleteExpenseRequestCreate(BaseModel):
    request: RequestCreate
    expense_request: ExpenseRequestCreate
    expense_lines: List[ExpenseLineCreate] = []

# API Response Models
class APIResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[dict] = None

class PaginatedResponse(BaseModel):
    success: bool
    data: List[dict]
    total: int
    page: int
    per_page: int
    total_pages: int