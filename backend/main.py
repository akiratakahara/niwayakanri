from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from datetime import datetime
from typing import Optional, List, Dict, Any
import os
import uvicorn
import io

from models import *
from database_sqlite import db_manager
from auth import auth_manager
from exceptions import APIException, create_error_response, AuthenticationError, AuthorizationError, NotFoundError, ValidationError, ConflictError
from logger import configure_logging, get_request_logger, get_security_logger, get_app_logger
from export_service import export_service
from notification_service import notification_service
from scheduler_service import scheduler_service

# ロギング設定を初期化
configure_logging()

# ロガーインスタンスを取得
app_logger = get_app_logger()
request_logger = get_request_logger()
security_logger = get_security_logger()

# FastAPIアプリケーション初期化
app = FastAPI(
    title="勤怠・社内申請システム API",
    description="勤怠管理と社内申請のためのAPI",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発用に全許可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # 24時間
)

# セキュリティ
security = HTTPBearer()

# 認証の依存関数
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    # JWTトークンを検証
    payload = auth_manager.verify_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise AuthenticationError(
            message="認証に失敗しました",
            detail="Invalid token payload"
        )

    # ユーザー情報を取得
    user_data = await db_manager.get_user_by_id(user_id)
    if not user_data:
        raise AuthenticationError(
            message="ユーザーが見つかりません",
            detail="User not found"
        )

    return user_data

# 管理者権限チェック
async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise AuthorizationError(
            message="管理者権限が必要です",
            detail="Admin access required"
        )
    return current_user

# 承認者権限チェック
async def require_approver(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') not in ['approver', 'admin']:
        raise AuthorizationError(
            message="承認者権限が必要です",
            detail="Approver access required"
        )
    return current_user

# アプリケーション起動・終了イベント
@app.on_event("startup")
async def startup_event():
    app_logger.info("Starting application...")
    await db_manager.init_pool()

    # スケジューラーサービスを開始
    scheduler_service.start_scheduler()
    app_logger.info("Scheduler service started")

    app_logger.info("Application started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    app_logger.info("Shutting down application...")

    # スケジューラーサービスを停止
    scheduler_service.stop_scheduler()
    app_logger.info("Scheduler service stopped")

    await db_manager.close_pool()
    app_logger.info("Application shut down successfully")

# エラーハンドリング
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return create_error_response(exc)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # エラーをログに記録
    app_logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={
            "path": str(request.url.path),
            "method": request.method,
            "exception_type": type(exc).__name__,
            "user_agent": request.headers.get("user-agent"),
            "ip_address": request.client.host if request.client else None
        }
    )

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error_code": "INTERNAL_ERROR",
            "status_code": 500,
            "detail": str(exc) if os.getenv("DEBUG") else "An error occurred"
        }
    )

# ヘルスチェック
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# 認証エンドポイント
@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    ip_address = "127.0.0.1"  # 簡単化
    user_agent = "test"

    user_data = await db_manager.authenticate_user(login_data.email, login_data.password)

    if not user_data:
        # ログイン失敗をログに記録
        request_logger.log_authentication(
            email=login_data.email,
            success=False,
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Invalid credentials"
        )
        security_logger.log_suspicious_activity(
            activity_type="failed_login",
            description=f"Failed login attempt for {login_data.email}",
            ip_address=ip_address
        )
        raise AuthenticationError(
            message="ログインに失敗しました",
            detail="Invalid email or password"
        )

    # ログイン成功をログに記録
    request_logger.log_authentication(
        email=login_data.email,
        success=True,
        ip_address=ip_address,
        user_agent=user_agent
    )

    # JWTトークンを生成
    access_token = auth_manager.create_access_token(
        data={"sub": str(user_data['id']), "email": user_data['email'], "role": user_data['role']}
    )

    # レスポンス用のユーザーデータ（パスワードハッシュ除外）
    user = User(
        id=user_data['id'],
        email=user_data['email'],
        name=user_data['name'],
        role=user_data['role'],
        department=user_data['department'],
        position=user_data['position'],
        employee_id=user_data['employee_id'],
        is_active=user_data['is_active'],
        created_at=user_data['created_at'],
        updated_at=user_data['updated_at']
    )

    return LoginResponse(
        access_token=access_token,
        user=user
    )

@app.post("/api/v1/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    # JWTトークンはステートレスなので、単純に成功を返す
    # 本格的なログアウトを実装する場合は、トークンのブラックリストが必要
    return {"success": True, "message": "Logged out successfully"}

@app.get("/api/v1/auth/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

# 従業員用ユーザー登録エンドポイント（管理者のみ）
# 一般ユーザーの自己登録は無効化
# @app.post("/api/v1/auth/register", response_model=LoginResponse)
# async def register_user(request: Request, user_register: UserRegister):
#     """新規ユーザー登録（無効化済み - 管理者による従業員作成のみ）"""
#     raise AuthorizationError(
#         message="一般ユーザーの自己登録は許可されていません",
#         detail="Self-registration is not allowed. Please contact administrator."
#     )

# ユーザー管理エンドポイント
@app.get("/api/v1/users/", response_model=List[User])
async def get_users(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(require_admin)
):
    users_data = await db_manager.get_users(limit, offset)
    return [User(**user) for user in users_data]

@app.get("/api/v1/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    # 自分の情報か管理者のみアクセス可能
    if current_user['id'] != user_id and current_user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    user_data = await db_manager.get_user_by_id(user_id)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return User(**user_data)

@app.post("/api/v1/users/", response_model=APIResponse)
async def create_user(
    user_create: UserCreate,
    current_user: dict = Depends(require_admin)
):
    try:
        user_id = await db_manager.create_user(
            user_create.dict(exclude={'password'}),
            user_create.password
        )
        return APIResponse(
            success=True,
            message="User created successfully",
            data={"user_id": user_id}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user: {str(e)}"
        )

@app.put("/api/v1/users/{user_id}", response_model=APIResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(require_admin)
):
    # 管理者が自分自身の権限を下げることを防止
    if (user_id == current_user['id'] and
        user_update.role is not None and
        user_update.role != 'admin'):
        raise AuthorizationError(
            message="自分自身の管理者権限を変更することはできません",
            detail="Cannot change your own admin role"
        )

    success = await db_manager.update_user(user_id, user_update.dict(exclude_unset=True))

    if not success:
        raise NotFoundError(
            message="ユーザーが見つからないか、更新できませんでした",
            detail="User not found or no changes made"
        )

    # 監査ログ
    app_logger.info(
        f"User updated by admin: {user_id}",
        extra={
            "admin_id": current_user['id'],
            "target_user_id": user_id,
            "action": "user_update",
            "changes": user_update.dict(exclude_unset=True)
        }
    )

    return APIResponse(
        success=True,
        message="User updated successfully",
        data={"user_id": user_id}
    )

@app.delete("/api/v1/users/{user_id}", response_model=APIResponse)
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    # 管理者が自分自身を削除することを防止
    if user_id == current_user['id']:
        raise AuthorizationError(
            message="自分自身を削除することはできません",
            detail="Cannot delete yourself"
        )

    success = await db_manager.delete_user(user_id)

    if not success:
        raise NotFoundError(
            message="ユーザーが見つかりません",
            detail="User not found"
        )

    # 監査ログ
    security_logger.log_suspicious_activity(
        activity_type="user_deletion",
        description=f"User {user_id} deleted by admin {current_user['id']}",
        user_id=current_user['id'],
        severity="warning"
    )

    return APIResponse(
        success=True,
        message="User deleted successfully",
        data={"user_id": user_id}
    )

@app.post("/api/v1/users/{user_id}/deactivate", response_model=APIResponse)
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    # 管理者が自分自身を無効化することを防止
    if user_id == current_user['id']:
        raise AuthorizationError(
            message="自分自身を無効化することはできません",
            detail="Cannot deactivate yourself"
        )

    success = await db_manager.deactivate_user(user_id)

    if not success:
        raise NotFoundError(
            message="ユーザーが見つかりません",
            detail="User not found"
        )

    # 監査ログ
    app_logger.info(
        f"User deactivated by admin: {user_id}",
        extra={
            "admin_id": current_user['id'],
            "target_user_id": user_id,
            "action": "user_deactivate"
        }
    )

    return APIResponse(
        success=True,
        message="User deactivated successfully",
        data={"user_id": user_id}
    )

@app.post("/api/v1/users/{user_id}/reset-password", response_model=APIResponse)
async def reset_user_password(
    user_id: str,
    password_reset: PasswordReset,
    current_user: dict = Depends(require_admin)
):
    success = await db_manager.reset_user_password(user_id, password_reset.new_password)

    if not success:
        raise NotFoundError(
            message="ユーザーが見つかりません",
            detail="User not found"
        )

    # 監査ログ
    security_logger.log_suspicious_activity(
        activity_type="password_reset",
        description=f"Password reset for user {user_id} by admin {current_user['id']}",
        user_id=current_user['id'],
        severity="warning"
    )

    return APIResponse(
        success=True,
        message="Password reset successfully",
        data={"user_id": user_id}
    )

# 申請管理エンドポイント
@app.get("/api/v1/requests/")
async def get_requests(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    # 管理者・承認者は全申請、一般ユーザーは自分の申請のみ
    user_id = None if current_user['role'] in ['admin', 'approver'] else current_user['id']

    requests_data = await db_manager.get_requests(user_id, status_filter, limit, offset)
    return {
        "success": True,
        "data": requests_data,
        "total": len(requests_data)
    }

@app.get("/api/v1/requests/{request_id}")
async def get_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request_data = await db_manager.get_request_by_id(request_id)

    if not request_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    # アクセス権限チェック
    if (current_user['role'] not in ['admin', 'approver'] and
        request_data['applicant_id'] != current_user['id']):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return {
        "success": True,
        "data": request_data
    }

# 休暇申請
@app.post("/api/v1/requests/leave")
async def create_leave_request(
    leave_request: CompleteLeaveRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        request_id = await db_manager.create_leave_request(
            current_user['id'],
            leave_request.request.dict(),
            leave_request.leave_request.dict()
        )
        return {
            "success": True,
            "message": "Leave request created successfully",
            "data": {"request_id": request_id}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create leave request: {str(e)}"
        )

# 時間外労働申請
@app.post("/api/v1/requests/overtime")
async def create_overtime_request(
    overtime_request: CompleteOvertimeRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        request_id = await db_manager.create_overtime_request(
            current_user['id'],
            overtime_request.request.dict(),
            overtime_request.overtime_request.dict()
        )
        return {
            "success": True,
            "message": "Overtime request created successfully",
            "data": {"request_id": request_id}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create overtime request: {str(e)}"
        )

# 経費申請
@app.post("/api/v1/requests/expense")
async def create_expense_request(
    expense_request: CompleteExpenseRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        request_id = await db_manager.create_expense_request(
            current_user['id'],
            expense_request.request.dict(),
            expense_request.expense_request.dict(),
            [line.dict() for line in expense_request.expense_lines]
        )
        return {
            "success": True,
            "message": "Expense request created successfully",
            "data": {"request_id": request_id}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create expense request: {str(e)}"
        )

# 申請提出
@app.post("/api/v1/requests/{request_id}/submit")
async def submit_request(request_id: str, current_user: dict = Depends(get_current_user)):
    # 申請者本人のみ提出可能
    request_data = await db_manager.get_request_by_id(request_id)

    if not request_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    if request_data['applicant_id'] != current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the applicant can submit this request"
        )

    success = await db_manager.submit_request(request_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to submit request"
        )

    return {
        "success": True,
        "message": "Request submitted successfully"
    }

# 申請承認
@app.post("/api/v1/requests/{request_id}/approve")
async def approve_request(
    request_id: str,
    approval_data: ApprovalCreate,
    current_user: dict = Depends(require_approver)
):
    success = await db_manager.approve_request(
        request_id,
        current_user['id'],
        approval_data.comment
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to approve request"
        )

    return {
        "success": True,
        "message": "Request approved successfully"
    }

# 申請却下
@app.post("/api/v1/requests/{request_id}/reject")
async def reject_request(
    request_id: str,
    approval_data: ApprovalCreate,
    current_user: dict = Depends(require_approver)
):
    success = await db_manager.reject_request(
        request_id,
        current_user['id'],
        approval_data.comment
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reject request"
        )

    return {
        "success": True,
        "message": "Request rejected successfully"
    }

# 承認待ち申請一覧
@app.get("/api/v1/approvals/")
async def get_approval_requests(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(require_approver)
):
    # 承認待ちの申請を取得
    requests_data = await db_manager.get_requests(
        user_id=None,
        status='applied',
        limit=limit,
        offset=offset
    )

    return {
        "success": True,
        "data": requests_data,
        "total": len(requests_data)
    }

# ダッシュボード
@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    stats = await db_manager.get_dashboard_stats(current_user['id'])
    return {
        "success": True,
        "data": stats
    }

# 管理者統計
@app.get("/api/v1/admin/stats")
async def get_admin_stats(current_user: dict = Depends(require_admin)):
    stats = await db_manager.get_admin_stats()
    return {
        "success": True,
        "data": stats
    }

# 監査ログ
@app.get("/api/v1/admin/audit-logs")
async def get_audit_logs(
    limit: int = 50,
    offset: int = 0,
    action_type: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """監査ログを取得"""
    # 実際の実装では専用のaudit_logsテーブルが必要
    # ここでは簡易的な実装として、アプリケーションログから抽出する想定
    logs = []

    return {
        "success": True,
        "data": logs,
        "total": len(logs)
    }

# 一括操作
@app.post("/api/v1/admin/bulk-operations", response_model=APIResponse)
async def bulk_operations(
    operation: Dict[str, Any],
    current_user: dict = Depends(require_admin)
):
    """一括操作の実行"""
    operation_type = operation.get("type")
    target_ids = operation.get("target_ids", [])

    if not operation_type or not target_ids:
        raise ValidationError(
            message="操作タイプとターゲットIDが必要です",
            detail="Operation type and target IDs are required"
        )

    results = []
    failed_count = 0

    if operation_type == "deactivate_users":
        for user_id in target_ids:
            if user_id == current_user['id']:
                results.append({"user_id": user_id, "status": "skipped", "reason": "Cannot deactivate self"})
                failed_count += 1
                continue

            success = await db_manager.deactivate_user(user_id)
            if success:
                results.append({"user_id": user_id, "status": "success"})
                # 監査ログ
                app_logger.info(
                    f"Bulk user deactivation: {user_id}",
                    extra={
                        "admin_id": current_user['id'],
                        "target_user_id": user_id,
                        "action": "bulk_deactivate"
                    }
                )
            else:
                results.append({"user_id": user_id, "status": "failed", "reason": "User not found"})
                failed_count += 1

    elif operation_type == "activate_users":
        for user_id in target_ids:
            success = await db_manager.update_user(user_id, {"is_active": True})
            if success:
                results.append({"user_id": user_id, "status": "success"})
                # 監査ログ
                app_logger.info(
                    f"Bulk user activation: {user_id}",
                    extra={
                        "admin_id": current_user['id'],
                        "target_user_id": user_id,
                        "action": "bulk_activate"
                    }
                )
            else:
                results.append({"user_id": user_id, "status": "failed", "reason": "User not found"})
                failed_count += 1

    else:
        raise ValidationError(
            message="サポートされていない操作タイプです",
            detail=f"Unsupported operation type: {operation_type}"
        )

    return APIResponse(
        success=failed_count == 0,
        message=f"Bulk operation completed. Success: {len(target_ids) - failed_count}, Failed: {failed_count}",
        data={
            "results": results,
            "total": len(target_ids),
            "success_count": len(target_ids) - failed_count,
            "failed_count": failed_count
        }
    )

# =====================
# エクスポート機能
# =====================

@app.get("/api/v1/export/requests/pdf", response_class=StreamingResponse)
async def export_requests_pdf(
    current_user: Dict[str, Any] = Depends(get_current_user),
    status: Optional[str] = None,
    type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """申請一覧をPDFでエクスポート"""
    try:
        # 申請データを取得
        requests_data = await db_manager.get_requests_with_details(
            user_id=current_user["id"] if current_user["role"] != "admin" else None,
            status=status,
            request_type=type,
            start_date=start_date,
            end_date=end_date
        )

        # PDFを生成
        pdf_data = export_service.generate_pdf_report(requests_data, "requests")

        # レスポンスヘッダーを設定
        headers = {
            'Content-Disposition': f'attachment; filename="requests_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
        }

        return StreamingResponse(
            io.BytesIO(pdf_data),
            media_type="application/pdf",
            headers=headers
        )

    except Exception as e:
        app_logger.error(f"PDF export failed: {str(e)}")
        raise HTTPException(status_code=500, detail="PDFエクスポートに失敗しました")

@app.get("/api/v1/export/requests/csv", response_class=StreamingResponse)
async def export_requests_csv(
    current_user: Dict[str, Any] = Depends(get_current_user),
    status: Optional[str] = None,
    type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """申請一覧をCSVでエクスポート"""
    try:
        # 申請データを取得
        requests_data = await db_manager.get_requests_with_details(
            user_id=current_user["id"] if current_user["role"] != "admin" else None,
            status=status,
            request_type=type,
            start_date=start_date,
            end_date=end_date
        )

        # CSVを生成
        csv_data = export_service.generate_csv_export(requests_data)

        # レスポンスヘッダーを設定
        headers = {
            'Content-Disposition': f'attachment; filename="requests_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        }

        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers=headers
        )

    except Exception as e:
        app_logger.error(f"CSV export failed: {str(e)}")
        raise HTTPException(status_code=500, detail="CSVエクスポートに失敗しました")

@app.get("/api/v1/export/requests/excel", response_class=StreamingResponse)
async def export_requests_excel(
    current_user: Dict[str, Any] = Depends(get_current_user),
    status: Optional[str] = None,
    type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """申請一覧をExcelでエクスポート"""
    try:
        # 申請データを取得
        requests_data = await db_manager.get_requests_with_details(
            user_id=current_user["id"] if current_user["role"] != "admin" else None,
            status=status,
            request_type=type,
            start_date=start_date,
            end_date=end_date
        )

        # Excelを生成
        excel_data = export_service.generate_excel_export(requests_data)

        # レスポンスヘッダーを設定
        headers = {
            'Content-Disposition': f'attachment; filename="requests_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
        }

        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )

    except Exception as e:
        app_logger.error(f"Excel export failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Excelエクスポートに失敗しました")

@app.get("/api/v1/export/summary/pdf", response_class=StreamingResponse)
async def export_summary_pdf(
    current_user: Dict[str, Any] = Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """集計レポートをPDFでエクスポート"""
    try:
        # 管理者または承認者のみ
        if current_user["role"] not in ["admin", "approver"]:
            raise AuthorizationError("この操作には管理者または承認者権限が必要です")

        # 申請データを取得
        requests_data = await db_manager.get_requests_with_details(
            start_date=start_date,
            end_date=end_date
        )

        # PDFを生成
        pdf_data = export_service.generate_pdf_report(requests_data, "summary")

        # レスポンスヘッダーを設定
        headers = {
            'Content-Disposition': f'attachment; filename="summary_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
        }

        return StreamingResponse(
            io.BytesIO(pdf_data),
            media_type="application/pdf",
            headers=headers
        )

    except Exception as e:
        app_logger.error(f"Summary PDF export failed: {str(e)}")
        raise HTTPException(status_code=500, detail="集計レポートのエクスポートに失敗しました")

@app.get("/api/v1/reports/summary")
async def get_summary_report(
    current_user: Dict[str, Any] = Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """集計レポートデータを取得"""
    try:
        # 管理者または承認者のみ
        if current_user["role"] not in ["admin", "approver"]:
            raise AuthorizationError("この操作には管理者または承認者権限が必要です")

        # 申請データを取得
        requests_data = await db_manager.get_requests_with_details(
            start_date=start_date,
            end_date=end_date
        )

        # 集計レポートを生成
        summary_data = export_service.generate_summary_report(requests_data)

        return APIResponse(
            success=True,
            message="集計レポートを取得しました",
            data=summary_data
        )

    except Exception as e:
        app_logger.error(f"Summary report failed: {str(e)}")
        raise HTTPException(status_code=500, detail="集計レポートの取得に失敗しました")

# =====================
# 通知・リマインド機能
# =====================

@app.get("/api/v1/notifications/settings", response_model=APIResponse)
async def get_notification_settings(current_user: dict = Depends(require_admin)):
    """通知設定を取得"""
    try:
        settings = scheduler_service.get_daily_report_settings()
        return APIResponse(
            success=True,
            message="通知設定を取得しました",
            data=settings
        )
    except Exception as e:
        app_logger.error(f"Failed to get notification settings: {str(e)}")
        raise HTTPException(status_code=500, detail="通知設定の取得に失敗しました")

@app.put("/api/v1/notifications/settings", response_model=APIResponse)
async def update_notification_settings(
    settings: Dict[str, Any],
    current_user: dict = Depends(require_admin)
):
    """通知設定を更新"""
    try:
        success = scheduler_service.update_daily_report_settings(settings)
        if not success:
            raise HTTPException(status_code=400, detail="通知設定の更新に失敗しました")

        # 監査ログ
        app_logger.info(
            f"Notification settings updated by admin: {current_user['id']}",
            extra={
                "admin_id": current_user['id'],
                "action": "notification_settings_update",
                "changes": settings
            }
        )

        return APIResponse(
            success=True,
            message="通知設定を更新しました",
            data=scheduler_service.get_daily_report_settings()
        )
    except Exception as e:
        app_logger.error(f"Failed to update notification settings: {str(e)}")
        raise HTTPException(status_code=500, detail="通知設定の更新に失敗しました")

@app.post("/api/v1/notifications/daily-report-reminder", response_model=APIResponse)
async def send_daily_report_reminder_now(current_user: dict = Depends(require_admin)):
    """日報リマインドを即座に送信（管理者用）"""
    try:
        result = await scheduler_service.send_daily_report_reminder_now()

        # 監査ログ
        app_logger.info(
            f"Manual daily report reminder sent by admin: {current_user['id']}",
            extra={
                "admin_id": current_user['id'],
                "action": "manual_reminder_send",
                "results": result.get("results", {})
            }
        )

        return APIResponse(
            success=result["success"],
            message=result["message"],
            data=result.get("results", {})
        )
    except Exception as e:
        app_logger.error(f"Failed to send daily report reminder: {str(e)}")
        raise HTTPException(status_code=500, detail="日報リマインドの送信に失敗しました")

@app.post("/api/v1/notifications/approval-request", response_model=APIResponse)
async def send_approval_notification(
    request_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """承認依頼通知を送信"""
    try:
        # 承認者一覧を取得（管理者・承認者）
        approvers = await db_manager.get_users_by_role(['admin', 'approver'])

        results = {"success": 0, "failed": 0, "details": []}

        for approver in approvers:
            if approver.get('email') and approver.get('is_active'):
                success = await notification_service.send_approval_notification(
                    approver=approver,
                    request_data=request_data
                )

                if success:
                    results["success"] += 1
                else:
                    results["failed"] += 1

                results["details"].append({
                    "approver_id": approver.get('id'),
                    "email": approver.get('email'),
                    "name": approver.get('name'),
                    "status": "success" if success else "failed"
                })

        # 監査ログ
        app_logger.info(
            f"Approval notifications sent for request: {request_data.get('id', 'unknown')}",
            extra={
                "requester_id": current_user['id'],
                "action": "approval_notification_send",
                "results": results
            }
        )

        return APIResponse(
            success=True,
            message=f"承認依頼通知を送信しました: 成功 {results['success']}件, 失敗 {results['failed']}件",
            data=results
        )
    except Exception as e:
        app_logger.error(f"Failed to send approval notifications: {str(e)}")
        raise HTTPException(status_code=500, detail="承認依頼通知の送信に失敗しました")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )