from fastapi import APIRouter, HTTPException, status, Depends, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.models.database import User

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

@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    ユーザーログイン
    """
    # メールアドレスでユーザーを検索
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません"
        )

    # パスワード検証
    print(f"[LOGIN DEBUG] Email: {request.email}")
    print(f"[LOGIN DEBUG] Input password: {request.password}")
    print(f"[LOGIN DEBUG] Stored hash: {user.hashed_password[:60]}")
    print(f"[LOGIN DEBUG] Password verification result: {verify_password(request.password, user.hashed_password)}")

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません"
        )

    # アクティブユーザーチェック
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このアカウントは無効化されています"
        )

    # JWTトークン生成
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role
        },
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "name": user.name,
        "role": user.role,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "position": user.position
        }
    }

@router.post("/logout")
async def logout():
    """
    ユーザーログアウト
    """
    return {"message": "ログアウトしました"}

@router.get("/me")
async def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    現在のユーザー情報を取得
    """
    from app.core.auth import get_current_user

    # get_current_userを直接呼び出す
    current_user = await get_current_user(authorization, db)

    return {
        "id": str(current_user["id"]),
        "user_id": str(current_user["id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "department": current_user.get("department"),
        "position": current_user.get("position")
    }





