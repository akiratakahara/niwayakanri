from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class User(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department: Optional[str] = None

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    department: Optional[str] = None

@router.get("/", response_model=List[User])
async def get_users():
    """
    ユーザー一覧を取得
    """
    # 簡単な実装（後でデータベースから取得）
    return [
        User(
            id="1",
            name="管理者",
            email="admin@example.com",
            role="admin",
            department="管理部"
        ),
        User(
            id="2",
            name="田中太郎",
            email="tanaka@example.com",
            role="employee",
            department="営業部"
        )
    ]

@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str):
    """
    特定のユーザーを取得
    """
    if user_id == "1":
        return User(
            id="1",
            name="管理者",
            email="admin@example.com",
            role="admin",
            department="管理部"
        )
    
    raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

@router.post("/", response_model=User)
async def create_user(user: UserCreate):
    """
    新しいユーザーを作成
    """
    # 簡単な実装（後でデータベースに保存）
    return User(
        id="3",
        name=user.name,
        email=user.email,
        role=user.role,
        department=user.department
    )



