import asyncio
import schedule
import time
import threading
from datetime import datetime, date, timedelta, time as dt_time
from typing import List, Dict, Any, Optional
import logging
from dataclasses import dataclass
from enum import Enum

from database_sqlite import db_manager
from notification_service import notification_service

# ロガー設定
logger = logging.getLogger(__name__)

class ReminderType(str, Enum):
    DAILY_REPORT = "daily_report"
    WEEKLY_REPORT = "weekly_report"
    APPROVAL_DEADLINE = "approval_deadline"

@dataclass
class ReminderSettings:
    enabled: bool = True
    send_time: str = "18:00"  # HH:MM format
    target_roles: List[str] = None
    skip_weekends: bool = True
    skip_holidays: bool = True

class SchedulerService:
    def __init__(self):
        self.running = False
        self.scheduler_thread = None
        self.daily_report_settings = ReminderSettings(
            enabled=True,
            send_time="18:00",
            target_roles=["user", "admin"],
            skip_weekends=True,
            skip_holidays=True
        )

    def start_scheduler(self):
        """スケジューラーを開始"""
        if self.running:
            logger.warning("Scheduler is already running")
            return

        self.running = True

        # 日報リマインドのスケジュール設定
        schedule.every().day.at(self.daily_report_settings.send_time).do(
            self._schedule_daily_report_reminder
        )

        # 毎時実行（テスト用）- 実際は日次で十分
        # schedule.every().hour.do(self._schedule_daily_report_reminder)

        # バックグラウンドスレッドでスケジューラーを実行
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()

        logger.info("Scheduler started successfully")

    def stop_scheduler(self):
        """スケジューラーを停止"""
        self.running = False
        schedule.clear()
        logger.info("Scheduler stopped")

    def _run_scheduler(self):
        """スケジューラーのメインループ"""
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(60)  # 1分間隔でチェック
            except Exception as e:
                logger.error(f"Scheduler error: {str(e)}")
                time.sleep(60)

    def _schedule_daily_report_reminder(self):
        """日報リマインドのスケジュール実行"""
        try:
            # 土日をスキップ
            if self.daily_report_settings.skip_weekends and datetime.now().weekday() >= 5:
                logger.info("Skipping daily report reminder (weekend)")
                return

            # 非同期関数を同期的に実行
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self._send_daily_report_reminders())
            loop.close()

        except Exception as e:
            logger.error(f"Failed to send daily report reminders: {str(e)}")

    async def _send_daily_report_reminders(self):
        """日報リマインドを送信"""
        try:
            # 今日の日報が未入力のユーザーを取得
            users_without_daily_report = await self._get_users_without_daily_report()

            if not users_without_daily_report:
                logger.info("No users need daily report reminders")
                return

            # リマインドメール送信
            results = await notification_service.send_daily_report_reminder(
                users=users_without_daily_report
            )

            logger.info(
                f"Daily report reminders sent: {results['success']} success, "
                f"{results['failed']} failed"
            )

            # 送信ログを記録
            await self._log_reminder_sent(
                reminder_type=ReminderType.DAILY_REPORT,
                results=results
            )

        except Exception as e:
            logger.error(f"Failed to send daily report reminders: {str(e)}")

    async def _get_users_without_daily_report(self) -> List[Dict[str, Any]]:
        """今日の日報が未入力のユーザー一覧を取得"""
        try:
            # 現在の実装では工事日報テーブルがないため、
            # 代わりに全アクティブユーザーを対象とする
            # 実際の運用では日報テーブルをチェックする

            users = await db_manager.get_all_users()

            # アクティブユーザーで対象役割のユーザーをフィルタ
            target_users = []
            today = date.today()

            for user in users:
                if (user.get('is_active', False) and
                    user.get('role', '') in self.daily_report_settings.target_roles):

                    # 今日の日報チェック（現在は省略、実際はDBクエリ）
                    # has_daily_report = await self._check_daily_report_exists(user['id'], today)
                    # if not has_daily_report:
                    target_users.append(user)

            return target_users

        except Exception as e:
            logger.error(f"Failed to get users without daily report: {str(e)}")
            return []

    async def _check_daily_report_exists(self, user_id: str, target_date: date) -> bool:
        """指定日の日報が存在するかチェック"""
        try:
            # 将来の実装: 日報テーブルをチェック
            # 現在は常にFalseを返す（リマインド送信のため）
            return False
        except Exception as e:
            logger.error(f"Failed to check daily report existence: {str(e)}")
            return False

    async def _log_reminder_sent(self, reminder_type: ReminderType, results: Dict[str, Any]):
        """リマインド送信ログを記録"""
        try:
            # データベースにログを記録する実装
            # 現在は簡単なログ出力のみ
            logger.info(f"Reminder log: {reminder_type.value} - {results}")
        except Exception as e:
            logger.error(f"Failed to log reminder: {str(e)}")

    # 手動実行用のメソッド
    async def send_daily_report_reminder_now(self) -> Dict[str, Any]:
        """日報リマインドを即座に送信（管理者用）"""
        try:
            users_without_daily_report = await self._get_users_without_daily_report()

            if not users_without_daily_report:
                return {"success": True, "message": "対象ユーザーがいません", "results": {"success": 0, "failed": 0}}

            results = await notification_service.send_daily_report_reminder(
                users=users_without_daily_report
            )

            await self._log_reminder_sent(ReminderType.DAILY_REPORT, results)

            return {
                "success": True,
                "message": f"リマインドを送信しました: 成功 {results['success']}件, 失敗 {results['failed']}件",
                "results": results
            }

        except Exception as e:
            logger.error(f"Failed to send daily report reminder now: {str(e)}")
            return {"success": False, "message": f"送信に失敗しました: {str(e)}"}

    def update_daily_report_settings(self, settings: Dict[str, Any]):
        """日報リマインド設定を更新"""
        try:
            if 'enabled' in settings:
                self.daily_report_settings.enabled = settings['enabled']
            if 'send_time' in settings:
                self.daily_report_settings.send_time = settings['send_time']
                # スケジュールを再設定
                schedule.clear()
                if self.daily_report_settings.enabled:
                    schedule.every().day.at(self.daily_report_settings.send_time).do(
                        self._schedule_daily_report_reminder
                    )
            if 'target_roles' in settings:
                self.daily_report_settings.target_roles = settings['target_roles']
            if 'skip_weekends' in settings:
                self.daily_report_settings.skip_weekends = settings['skip_weekends']
            if 'skip_holidays' in settings:
                self.daily_report_settings.skip_holidays = settings['skip_holidays']

            logger.info("Daily report settings updated successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to update daily report settings: {str(e)}")
            return False

    def get_daily_report_settings(self) -> Dict[str, Any]:
        """現在の日報リマインド設定を取得"""
        return {
            "enabled": self.daily_report_settings.enabled,
            "send_time": self.daily_report_settings.send_time,
            "target_roles": self.daily_report_settings.target_roles,
            "skip_weekends": self.daily_report_settings.skip_weekends,
            "skip_holidays": self.daily_report_settings.skip_holidays
        }

# グローバルインスタンス
scheduler_service = SchedulerService()