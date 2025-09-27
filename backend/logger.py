#!/usr/bin/env python3

import logging
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

class JSONFormatter(logging.Formatter):
    """JSON形式でログを出力するフォーマッター"""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }

        # 追加の属性があれば含める
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id

        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id

        if hasattr(record, 'ip_address'):
            log_entry['ip_address'] = record.ip_address

        if hasattr(record, 'user_agent'):
            log_entry['user_agent'] = record.user_agent

        if hasattr(record, 'method'):
            log_entry['http_method'] = record.method

        if hasattr(record, 'path'):
            log_entry['http_path'] = record.path

        if hasattr(record, 'status_code'):
            log_entry['http_status'] = record.status_code

        if hasattr(record, 'response_time'):
            log_entry['response_time_ms'] = record.response_time

        # 例外情報
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False)

def setup_logging(
    log_level: str = 'INFO',
    log_file: Optional[str] = None,
    enable_console: bool = True
) -> logging.Logger:
    """ロギングをセットアップ"""

    # ルートロガーを取得
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper()))

    # 既存のハンドラーをクリア
    logger.handlers.clear()

    # JSON フォーマッターを作成
    json_formatter = JSONFormatter()

    # コンソール出力
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(json_formatter)
        logger.addHandler(console_handler)

    # ファイル出力
    if log_file:
        # ログディレクトリが存在しない場合は作成
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setFormatter(json_formatter)
        logger.addHandler(file_handler)

    return logger

def get_logger(name: str = __name__) -> logging.Logger:
    """指定された名前のロガーを取得"""
    return logging.getLogger(name)

class RequestLogger:
    """HTTPリクエストのロギングクラス"""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def log_request(
        self,
        method: str,
        path: str,
        status_code: int,
        response_time: float,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        """HTTPリクエストをログに記録"""

        extra = {
            'method': method,
            'path': path,
            'status_code': status_code,
            'response_time': response_time,
        }

        if user_id:
            extra['user_id'] = user_id
        if ip_address:
            extra['ip_address'] = ip_address
        if user_agent:
            extra['user_agent'] = user_agent
        if request_id:
            extra['request_id'] = request_id

        message = f"{method} {path} {status_code} {response_time:.2f}ms"

        if status_code >= 500:
            self.logger.error(message, extra=extra)
        elif status_code >= 400:
            self.logger.warning(message, extra=extra)
        else:
            self.logger.info(message, extra=extra)

    def log_authentication(
        self,
        email: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        reason: Optional[str] = None
    ):
        """認証試行をログに記録"""

        extra = {
            'email': email,
            'auth_success': success,
        }

        if ip_address:
            extra['ip_address'] = ip_address
        if user_agent:
            extra['user_agent'] = user_agent
        if reason:
            extra['failure_reason'] = reason

        message = f"Authentication {'successful' if success else 'failed'} for {email}"

        if success:
            self.logger.info(message, extra=extra)
        else:
            self.logger.warning(message, extra=extra)

    def log_authorization(
        self,
        user_id: str,
        action: str,
        resource: str,
        granted: bool,
        reason: Optional[str] = None
    ):
        """認可チェックをログに記録"""

        extra = {
            'user_id': user_id,
            'action': action,
            'resource': resource,
            'access_granted': granted,
        }

        if reason:
            extra['reason'] = reason

        message = f"Access {'granted' if granted else 'denied'} for user {user_id} to {action} {resource}"

        if granted:
            self.logger.info(message, extra=extra)
        else:
            self.logger.warning(message, extra=extra)

class SecurityLogger:
    """セキュリティ関連のロギングクラス"""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def log_suspicious_activity(
        self,
        activity_type: str,
        description: str,
        ip_address: Optional[str] = None,
        user_id: Optional[str] = None,
        severity: str = 'warning'
    ):
        """疑わしい活動をログに記録"""

        extra = {
            'activity_type': activity_type,
            'severity': severity,
        }

        if ip_address:
            extra['ip_address'] = ip_address
        if user_id:
            extra['user_id'] = user_id

        message = f"Suspicious activity detected: {description}"

        if severity == 'critical':
            self.logger.critical(message, extra=extra)
        elif severity == 'error':
            self.logger.error(message, extra=extra)
        else:
            self.logger.warning(message, extra=extra)

    def log_password_policy_violation(
        self,
        user_id: str,
        violation_type: str,
        ip_address: Optional[str] = None
    ):
        """パスワードポリシー違反をログに記録"""

        extra = {
            'user_id': user_id,
            'violation_type': violation_type,
        }

        if ip_address:
            extra['ip_address'] = ip_address

        message = f"Password policy violation by user {user_id}: {violation_type}"
        self.logger.warning(message, extra=extra)

    def log_rate_limit_exceeded(
        self,
        ip_address: str,
        endpoint: str,
        limit: int,
        window: int
    ):
        """レート制限超過をログに記録"""

        extra = {
            'ip_address': ip_address,
            'endpoint': endpoint,
            'rate_limit': limit,
            'time_window': window,
        }

        message = f"Rate limit exceeded for {ip_address} on {endpoint}"
        self.logger.warning(message, extra=extra)

# グローバル設定
def configure_logging():
    """アプリケーション全体のロギングを設定"""

    log_level = os.getenv('LOG_LEVEL', 'INFO')
    log_file = os.getenv('LOG_FILE', 'logs/app.log')
    enable_console = os.getenv('LOG_CONSOLE', 'true').lower() == 'true'

    return setup_logging(
        log_level=log_level,
        log_file=log_file,
        enable_console=enable_console
    )

# 使いやすさのためのエイリアス
def get_request_logger() -> RequestLogger:
    """リクエストロガーを取得"""
    return RequestLogger(get_logger('request'))

def get_security_logger() -> SecurityLogger:
    """セキュリティロガーを取得"""
    return SecurityLogger(get_logger('security'))

def get_app_logger() -> logging.Logger:
    """アプリケーションロガーを取得"""
    return get_logger('app')

# 使用例
if __name__ == '__main__':
    # ロギング設定
    configure_logging()

    # 各種ロガーのテスト
    app_logger = get_app_logger()
    app_logger.info("Application started")

    request_logger = get_request_logger()
    request_logger.log_request(
        method='POST',
        path='/api/v1/auth/login',
        status_code=200,
        response_time=123.45,
        user_id='user123',
        ip_address='192.168.1.1'
    )

    security_logger = get_security_logger()
    security_logger.log_suspicious_activity(
        activity_type='multiple_failed_logins',
        description='5 failed login attempts in 1 minute',
        ip_address='192.168.1.100',
        severity='warning'
    )