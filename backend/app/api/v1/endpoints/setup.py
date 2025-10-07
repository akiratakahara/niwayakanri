from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.database import User
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/initialize")
async def initialize_users(db: Session = Depends(get_db)):
    """
    初期ユーザーを作成（一度だけ実行）
    """
    # 既存ユーザーチェック
    existing_user = db.query(User).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="ユーザーが既に存在します")

    # 初期ユーザー
    users_to_create = [
        {
            "email": "admin@company.com",
            "name": "システム管理者",
            "hashed_password": get_password_hash("admin123"),
            "role": "admin",
            "department": "情報システム部",
            "position": "部長",
            "is_active": True
        },
        {
            "email": "approver@company.com",
            "name": "承認者 太郎",
            "hashed_password": get_password_hash("approver123"),
            "role": "approver",
            "department": "人事部",
            "position": "課長",
            "is_active": True
        },
        {
            "email": "yamada@company.com",
            "name": "山田 太郎",
            "hashed_password": get_password_hash("password123"),
            "role": "user",
            "department": "営業部",
            "position": "主任",
            "is_active": True
        }
    ]

    try:
        for user_data in users_to_create:
            user = User(**user_data)
            db.add(user)

        db.commit()

        return {
            "message": "初期ユーザー作成完了",
            "users": [
                {"email": "admin@company.com", "password": "admin123"},
                {"email": "approver@company.com", "password": "approver123"},
                {"email": "yamada@company.com", "password": "password123"}
            ]
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"ユーザー作成エラー: {str(e)}")
