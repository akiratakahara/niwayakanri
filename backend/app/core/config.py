from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator
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
    ALLOWED_ORIGINS: Union[List[str], str] = "http://localhost:3000,http://localhost:3001,https://niwayakanri.com,https://determined-ambition-production.up.railway.app"
    ALLOWED_HOSTS: Union[List[str], str] = "localhost,niwayakanri.com,niwayakanri-production.up.railway.app"

    # アプリケーション設定
    APP_NAME: str = "勤怠・社内申請システム"
    DEBUG: bool = True

    # ログ設定
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    @field_validator('ALLOWED_ORIGINS', 'ALLOWED_HOSTS', mode='before')
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            # カンマ区切りまたは単一のURLを処理
            origins = [origin.strip() for origin in v.split(',') if origin.strip()]
            print(f"[Config] Parsed ALLOWED_ORIGINS: {origins}")
            return origins
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()



