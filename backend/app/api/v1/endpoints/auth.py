from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    name: str
    role: str

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    ユーザーログイン
    """
    # 簡単な認証（後でSupabaseに置き換え）
    if request.email == "admin@example.com" and request.password == "password":
        return LoginResponse(
            access_token="dummy-token",
            token_type="bearer",
            user_id="1",
            name="管理者",
            role="admin"
        )
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="メールアドレスまたはパスワードが正しくありません"
    )

@router.post("/logout")
async def logout():
    """
    ユーザーログアウト
    """
    return {"message": "ログアウトしました"}

@router.get("/me")
async def get_current_user():
    """
    現在のユーザー情報を取得
    """
    # 簡単な実装（後でJWTトークンから取得）
    return {
        "user_id": "1",
        "name": "管理者",
        "email": "admin@example.com",
        "role": "admin"
    }



