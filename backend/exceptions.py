from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

class APIException(HTTPException):
    """カスタムAPI例外クラス"""
    def __init__(
        self,
        status_code: int,
        message: str,
        detail: Optional[str] = None,
        error_code: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ):
        self.status_code = status_code
        self.message = message
        self.detail = detail
        self.error_code = error_code
        self.data = data
        super().__init__(status_code=status_code, detail=detail or message)

class AuthenticationError(APIException):
    """認証エラー"""
    def __init__(self, message: str = "Authentication failed", detail: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            detail=detail,
            error_code="AUTH_ERROR"
        )

class AuthorizationError(APIException):
    """認可エラー"""
    def __init__(self, message: str = "Access denied", detail: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            detail=detail,
            error_code="ACCESS_DENIED"
        )

class NotFoundError(APIException):
    """リソースが見つからないエラー"""
    def __init__(self, message: str = "Resource not found", detail: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            detail=detail,
            error_code="NOT_FOUND"
        )

class ValidationError(APIException):
    """バリデーションエラー"""
    def __init__(self, message: str = "Validation failed", detail: Optional[str] = None, data: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            detail=detail,
            error_code="VALIDATION_ERROR",
            data=data
        )

class ConflictError(APIException):
    """競合エラー"""
    def __init__(self, message: str = "Conflict occurred", detail: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            message=message,
            detail=detail,
            error_code="CONFLICT"
        )

class InternalServerError(APIException):
    """内部サーバーエラー"""
    def __init__(self, message: str = "Internal server error", detail: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            detail=detail,
            error_code="INTERNAL_ERROR"
        )

def create_error_response(exc: APIException) -> JSONResponse:
    """エラーレスポンスを作成"""
    response_data = {
        "success": False,
        "message": exc.message,
        "error_code": exc.error_code,
        "status_code": exc.status_code
    }

    if exc.detail:
        response_data["detail"] = exc.detail

    if exc.data:
        response_data["data"] = exc.data

    return JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )