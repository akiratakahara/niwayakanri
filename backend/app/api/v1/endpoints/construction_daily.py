from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import io
from urllib.parse import quote

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.database import ConstructionDailyReport as ReportModel, User
from app.services.pdf_generator import generate_construction_daily_pdf

router = APIRouter()

class Worker(BaseModel):
    category: str
    name: str

class OwnVehicle(BaseModel):
    vehicle_id: str
    type: str
    name: str
    number: str
    driver: str
    refuel: str

class Machinery(BaseModel):
    machinery_id: str
    code: str
    type: str
    user: str

class OtherMachinery(BaseModel):
    machinery_id: str
    name: str
    type: str
    user: str
    refuel: str

class LeaseMachine(BaseModel):
    category: str
    type: str
    driver: str
    count: str
    company: str

class KYActivity(BaseModel):
    hazard: str
    countermeasure: str
    checked: bool

class ConstructionDailyReportCreate(BaseModel):
    report_date: date
    site_name: str
    work_location: str
    work_content: str
    early_start: Optional[str] = None
    work_start_time: str
    work_end_time: str
    overtime: Optional[str] = None
    workers: List[Worker]
    own_vehicles: List[OwnVehicle] = []
    machinery: List[Machinery] = []
    other_machinery: List[OtherMachinery] = []
    lease_machines: List[LeaseMachine] = []
    ky_activities: List[KYActivity] = []
    other_materials: Optional[str] = None
    customer_requests: Optional[str] = None
    office_confirmation: Optional[str] = None

class ConstructionDailyReportResponse(BaseModel):
    id: int
    report_date: date
    site_name: str
    work_location: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("/", response_model=ConstructionDailyReportResponse)
async def create_construction_daily_report(
    report_data: ConstructionDailyReportCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    工事日報を作成
    """
    # データベースに保存
    new_report = ReportModel(
        user_id=current_user["id"],
        report_date=report_data.report_date,
        site_name=report_data.site_name,
        work_location=report_data.work_location,
        work_content=report_data.work_content,
        early_start=report_data.early_start,
        work_start_time=report_data.work_start_time,
        work_end_time=report_data.work_end_time,
        overtime=report_data.overtime,
        workers=[w.dict() for w in report_data.workers],
        own_vehicles=[v.dict() for v in report_data.own_vehicles],
        machinery=[m.dict() for m in report_data.machinery],
        other_machinery=[m.dict() for m in report_data.other_machinery],
        lease_machines=[l.dict() for l in report_data.lease_machines],
        ky_activities=[k.dict() for k in report_data.ky_activities],
        other_materials=report_data.other_materials,
        customer_requests=report_data.customer_requests,
        office_confirmation=report_data.office_confirmation
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return ConstructionDailyReportResponse(
        id=new_report.id,
        report_date=new_report.report_date,
        site_name=new_report.site_name,
        work_location=new_report.work_location,
        created_at=new_report.created_at.isoformat()
    )


@router.get("/")
async def get_construction_daily_reports(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    工事日報一覧を取得
    """
    query = db.query(ReportModel)

    # 管理者以外は自分の日報のみ表示
    if current_user.get("role") != "admin":
        query = query.filter(ReportModel.user_id == current_user["id"])

    reports = query.order_by(ReportModel.report_date.desc()).all()

    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "report_date": r.report_date.isoformat(),
                "site_name": r.site_name,
                "work_location": r.work_location,
                "created_at": r.created_at.isoformat()
            }
            for r in reports
        ]
    }


@router.get("/{report_id}/pdf")
async def get_construction_daily_pdf(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    工事日報をPDFで出力
    """
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="工事日報が見つかりません")

    # 管理者以外は自分の日報のみ閲覧可能
    if current_user.get("role") != "admin" and report.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="この工事日報を閲覧する権限がありません")

    # ユーザー情報を取得
    user = db.query(User).filter(User.id == report.user_id).first()

    # PDFを生成
    pdf_bytes = generate_construction_daily_pdf(report, user)

    # PDFをStreamingResponseで返す
    filename = f"construction_daily_{report.report_date.strftime('%Y%m%d')}.pdf"
    filename_encoded = quote(f"工事日報_{report.report_date.strftime('%Y%m%d')}_{report.site_name}.pdf")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}; filename*=UTF-8''{filename_encoded}"
        }
    )
