from pydantic import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # 環境設定
    ENVIRONMENT: str = "development"
    
    # データベース設定
    DATABASE_URL: str = "sqlite:///./niwayakanri.db"
    
    # API設定
    API_SECRET_KEY: str = "your-secret-key-change-in-production"
    
    # CORS設定
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://niwayakanri.com"]
    ALLOWED_HOSTS: List[str] = ["localhost", "niwayakanri.com"]
    
    # ログ設定
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()



