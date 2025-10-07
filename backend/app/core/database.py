from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLite データベース設定
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./niwayakanri.db")

# SQLite データベースエンジンを作成
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=True  # SQL文をログ出力（開発時のみ）
)

# セッションファクトリーを作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ベースクラスを作成
Base = declarative_base()

# データベースセッションの依存性
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# データベース初期化
def init_db():
    """データベーステーブル作成"""
    from app.models.database import Base as ModelsBase
    ModelsBase.metadata.create_all(bind=engine)

    # 初期ユーザー作成
    _create_initial_users()

def _create_initial_users():
    """初期ユーザー（管理者・承認者・従業員）を作成"""
    from app.models.database import User
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        # 既存の管理者をチェック
        existing_admin = db.query(User).filter(User.email == "admin@company.com").first()
        if existing_admin:
            print("⚠️  初期ユーザー既存: スキップします")
            return

        # 初期ユーザーリスト
        initial_users = [
            {
                "email": "admin@company.com",
                "name": "システム管理者",
                "hashed_password": get_password_hash("admin123!"),
                "role": "admin",
                "department": "情報システム部",
                "position": "部長",
                "employee_id": "ADM001",
                "is_active": True
            },
            {
                "email": "approver@company.com",
                "name": "承認者 太郎",
                "hashed_password": get_password_hash("approver123!"),
                "role": "approver",
                "department": "人事部",
                "position": "課長",
                "employee_id": "APP001",
                "is_active": True
            },
            {
                "email": "yamada@company.com",
                "name": "山田 太郎",
                "hashed_password": get_password_hash("password123!"),
                "role": "user",
                "department": "営業部",
                "position": "主任",
                "employee_id": "EMP001",
                "is_active": True
            }
        ]

        # ユーザーを作成
        for user_data in initial_users:
            user = User(**user_data)
            db.add(user)

        db.commit()
        print("✅ 初期ユーザー作成完了")
        print("   - admin@company.com / admin123!")
        print("   - approver@company.com / approver123!")
        print("   - yamada@company.com / password123!")

    except Exception as e:
        print(f"❌ 初期ユーザー作成エラー: {e}")
        db.rollback()
    finally:
        db.close()





