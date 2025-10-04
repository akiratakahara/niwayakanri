from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Boolean, Text, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String)
    position = Column(String)
    role = Column(String, default="user")  # "admin" or "user"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    requests = relationship("Request", back_populates="applicant", foreign_keys="Request.applicant_id")
    approvals = relationship("Request", back_populates="approver", foreign_keys="Request.approver_id")


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # leave, overtime, expense, reimbursement, settlement, holiday_work
    applicant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="draft")  # draft, applied, approved, rejected, returned
    title = Column(String, nullable=False)
    description = Column(Text)

    # 申請・承認日時
    created_at = Column(DateTime, default=datetime.utcnow)
    applied_at = Column(DateTime)
    approved_at = Column(DateTime)
    rejected_at = Column(DateTime)

    # コメント
    applicant_comment = Column(Text)
    approver_comment = Column(Text)

    # Relationships
    applicant = relationship("User", back_populates="requests", foreign_keys=[applicant_id])
    approver = relationship("User", back_populates="approvals", foreign_keys=[approver_id])
    leave_request = relationship("LeaveRequest", back_populates="request", uselist=False)
    overtime_request = relationship("OvertimeRequest", back_populates="request", uselist=False)
    expense_request = relationship("ExpenseRequest", back_populates="request", uselist=False)
    reimbursement_request = relationship("ReimbursementRequest", back_populates="request", uselist=False)
    settlement_request = relationship("SettlementRequest", back_populates="request", uselist=False)
    holiday_work_request = relationship("HolidayWorkRequest", back_populates="request", uselist=False)


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    leave_type = Column(String, nullable=False)  # paid, compensatory, special
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    start_duration = Column(String, default="full")  # full, am, pm
    end_duration = Column(String, default="full")
    days = Column(Float, nullable=False)
    hours = Column(Float)
    reason = Column(Text)
    handover_notes = Column(Text)
    compensatory_work_date = Column(Date)

    # Relationships
    request = relationship("Request", back_populates="leave_request")


class OvertimeRequest(Base):
    __tablename__ = "overtime_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    work_date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    break_time = Column(Integer, default=0)
    total_hours = Column(Float, nullable=False)
    work_content = Column(Text)
    reason = Column(Text)
    project_name = Column(String)

    # Relationships
    request = relationship("Request", back_populates="overtime_request")


class ExpenseRequest(Base):
    __tablename__ = "expense_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    applicant_name = Column(String, nullable=False)
    site_name = Column(String, nullable=False)
    application_date = Column(Date, nullable=False)
    request_amount = Column(Integer, nullable=False)
    received_date = Column(Date)
    purpose = Column(Text)

    # Relationships
    request = relationship("Request", back_populates="expense_request")


class ReimbursementRequest(Base):
    __tablename__ = "reimbursement_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    applicant_name = Column(String, nullable=False)
    site_name = Column(String, nullable=False)
    application_date = Column(Date, nullable=False)
    total_amount = Column(Integer, nullable=False)

    # Relationships
    request = relationship("Request", back_populates="reimbursement_request")
    expense_lines = relationship("ExpenseLine", back_populates="reimbursement_request")


class SettlementRequest(Base):
    __tablename__ = "settlement_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    expense_type = Column(String, nullable=False)
    advance_payment_request_id = Column(Integer, ForeignKey("expense_requests.id"))
    settlement_date = Column(Date, nullable=False)
    total_amount = Column(Integer, nullable=False)
    balance_amount = Column(Integer, nullable=False)
    applicant_name = Column(String)
    site_name = Column(String)
    application_date = Column(Date)
    advance_payment_amount = Column(Integer)

    # Relationships
    request = relationship("Request", back_populates="settlement_request")
    expense_lines = relationship("ExpenseLine", back_populates="settlement_request")


class HolidayWorkRequest(Base):
    __tablename__ = "holiday_work_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    work_date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    break_time = Column(Integer, default=0)
    work_content = Column(Text)
    reason = Column(Text)
    compensatory_leave_date = Column(Date)

    # Relationships
    request = relationship("Request", back_populates="holiday_work_request")


class ExpenseLine(Base):
    __tablename__ = "expense_lines"

    id = Column(Integer, primary_key=True, index=True)
    reimbursement_request_id = Column(Integer, ForeignKey("reimbursement_requests.id"))
    settlement_request_id = Column(Integer, ForeignKey("settlement_requests.id"))
    date = Column(Date, nullable=False)
    item = Column(String, nullable=False)
    site_name = Column(String)
    tax_type = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)

    # Relationships
    reimbursement_request = relationship("ReimbursementRequest", back_populates="expense_lines")
    settlement_request = relationship("SettlementRequest", back_populates="expense_lines")


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    file_type = Column(String)
    file_size = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
