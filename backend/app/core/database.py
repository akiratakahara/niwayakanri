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





