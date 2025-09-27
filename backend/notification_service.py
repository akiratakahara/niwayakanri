import asyncio
import smtplib
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import os
import logging
from dataclasses import dataclass
from enum import Enum

# ロガー設定
logger = logging.getLogger(__name__)

class NotificationType(str, Enum):
    DAILY_REPORT_REMINDER = "daily_report_reminder"
    APPROVAL_REQUEST = "approval_request"
    REQUEST_APPROVED = "request_approved"
    REQUEST_REJECTED = "request_rejected"
    REQUEST_RETURNED = "request_returned"
    SYSTEM_ANNOUNCEMENT = "system_announcement"

@dataclass
class EmailConfig:
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    username: str = ""
    password: str = ""
    from_email: str = ""
    from_name: str = "勤怠・社内申請システム"

@dataclass
class NotificationTemplate:
    subject: str
    body_text: str
    body_html: str

class NotificationService:
    def __init__(self):
        self.email_config = EmailConfig()
        self.load_email_config()
        self.templates = self._load_templates()

    def load_email_config(self):
        """環境変数からメール設定を読み込み"""
        self.email_config.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.email_config.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.email_config.username = os.getenv("SMTP_USERNAME", "")
        self.email_config.password = os.getenv("SMTP_PASSWORD", "")
        self.email_config.from_email = os.getenv("FROM_EMAIL", "")
        self.email_config.from_name = os.getenv("FROM_NAME", "勤怠・社内申請システム")

    def _load_templates(self) -> Dict[NotificationType, NotificationTemplate]:
        """通知テンプレートを定義"""
        return {
            NotificationType.DAILY_REPORT_REMINDER: NotificationTemplate(
                subject="【リマインド】日報の入力をお忘れではありませんか？",
                body_text="""
{name}様

お疲れ様です。
本日の日報入力のリマインドをお送りします。

まだ本日分の日報が未入力です。
お忙しい中恐れ入りますが、以下のリンクから日報の入力をお願いします。

日報入力画面: {login_url}

※このメールは自動送信されています。

--
勤怠・社内申請システム
""",
                body_html="""
<html>
<body style="font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            【リマインド】日報の入力をお忘れではありませんか？
        </h2>

        <p><strong>{name}</strong>様</p>

        <p>お疲れ様です。<br>
        本日の日報入力のリマインドをお送りします。</p>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">まだ本日分の日報が未入力です。</p>
        </div>

        <p>お忙しい中恐れ入りますが、以下のボタンから日報の入力をお願いします。</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{login_url}"
               style="background-color: #2563eb; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                日報を入力する
            </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #6b7280;">
            ※このメールは自動送信されています。<br>
            勤怠・社内申請システム
        </p>
    </div>
</body>
</html>
"""
            ),

            NotificationType.APPROVAL_REQUEST: NotificationTemplate(
                subject="【承認依頼】新しい申請が届いています",
                body_text="""
{name}様

お疲れ様です。
新しい申請の承認依頼が届いています。

申請者: {applicant_name}
申請種類: {request_type}
申請タイトル: {request_title}
申請日: {applied_date}

承認画面: {approval_url}

お忙しい中恐れ入りますが、確認をお願いします。

--
勤怠・社内申請システム
""",
                body_html="""
<html>
<body style="font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
            【承認依頼】新しい申請が届いています
        </h2>

        <p><strong>{name}</strong>様</p>

        <p>お疲れ様です。<br>
        新しい申請の承認依頼が届いています。</p>

        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 100px;">申請者:</td>
                    <td style="padding: 8px 0;">{applicant_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">申請種類:</td>
                    <td style="padding: 8px 0;">{request_type}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">タイトル:</td>
                    <td style="padding: 8px 0;">{request_title}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">申請日:</td>
                    <td style="padding: 8px 0;">{applied_date}</td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{approval_url}"
               style="background-color: #dc2626; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                承認画面を開く
            </a>
        </div>

        <p>お忙しい中恐れ入りますが、確認をお願いします。</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="font-size: 12px; color: #6b7280;">
            ※このメールは自動送信されています。<br>
            勤怠・社内申請システム
        </p>
    </div>
</body>
</html>
"""
            )
        }

    async def send_email(
        self,
        to_email: str,
        notification_type: NotificationType,
        context: Dict[str, Any],
        to_name: str = None
    ) -> bool:
        """メールを送信"""
        try:
            if not self.email_config.username or not self.email_config.password:
                logger.warning("Email configuration not set. Email not sent.")
                return False

            template = self.templates.get(notification_type)
            if not template:
                logger.error(f"Template not found for notification type: {notification_type}")
                return False

            # メール内容を作成
            msg = MIMEMultipart('alternative')
            msg['Subject'] = Header(template.subject, 'utf-8')
            msg['From'] = f"{self.email_config.from_name} <{self.email_config.from_email}>"
            msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email

            # テキスト版
            text_body = template.body_text.format(**context)
            text_part = MIMEText(text_body, 'plain', 'utf-8')
            msg.attach(text_part)

            # HTML版
            html_body = template.body_html.format(**context)
            html_part = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(html_part)

            # 送信
            await aiosmtplib.send(
                msg,
                hostname=self.email_config.smtp_server,
                port=self.email_config.smtp_port,
                start_tls=True,
                username=self.email_config.username,
                password=self.email_config.password,
            )

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    async def send_daily_report_reminder(self, users: List[Dict[str, Any]], base_url: str = "http://localhost:3002") -> Dict[str, Any]:
        """日報入力リマインドを送信"""
        results = {"success": 0, "failed": 0, "details": []}

        for user in users:
            context = {
                "name": user.get("name", ""),
                "login_url": f"{base_url}/requests/construction-daily"
            }

            success = await self.send_email(
                to_email=user.get("email", ""),
                notification_type=NotificationType.DAILY_REPORT_REMINDER,
                context=context,
                to_name=user.get("name", "")
            )

            if success:
                results["success"] += 1
            else:
                results["failed"] += 1

            results["details"].append({
                "user_id": user.get("id"),
                "email": user.get("email"),
                "name": user.get("name"),
                "status": "success" if success else "failed"
            })

        return results

    async def send_approval_notification(
        self,
        approver: Dict[str, Any],
        request_data: Dict[str, Any],
        base_url: str = "http://localhost:3002"
    ) -> bool:
        """承認依頼通知を送信"""
        context = {
            "name": approver.get("name", ""),
            "applicant_name": request_data.get("applicant_name", ""),
            "request_type": self._get_request_type_text(request_data.get("type", "")),
            "request_title": request_data.get("title", ""),
            "applied_date": datetime.now().strftime("%Y年%m月%d日"),
            "approval_url": f"{base_url}/approvals"
        }

        return await self.send_email(
            to_email=approver.get("email", ""),
            notification_type=NotificationType.APPROVAL_REQUEST,
            context=context,
            to_name=approver.get("name", "")
        )

    def _get_request_type_text(self, request_type: str) -> str:
        """申請タイプの日本語変換"""
        type_map = {
            "leave": "休暇申請",
            "overtime": "時間外労働申請",
            "expense": "仮払・立替申請",
            "construction_daily": "工事日報"
        }
        return type_map.get(request_type, request_type)

# グローバルインスタンス
notification_service = NotificationService()