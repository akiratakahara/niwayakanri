from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # 環境設定
    ENVIRONMENT: str = "development"

    # データベース設定
    DATABASE_URL: str = "sqlite:///./niwayakanri.db"

    # セキュリティ設定
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS設定
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "https://niwayakanri.com"]
    ALLOWED_HOSTS: List[str] = ["localhost", "niwayakanri.com"]

    # アプリケーション設定
    APP_NAME: str = "勤怠・社内申請システム"
    DEBUG: bool = True

    # ログ設定
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()



