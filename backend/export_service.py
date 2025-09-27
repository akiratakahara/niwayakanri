from typing import List, Dict, Any, Optional
from datetime import datetime, date
import io
import csv
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import json

class ExportService:
    def __init__(self):
        self.styles = getSampleStyleSheet()

    def generate_pdf_report(self, requests_data: List[Dict], report_type: str = "requests") -> bytes:
        """申請データのPDFレポートを生成"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=18
        )

        story = []

        # タイトル
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER
        )

        if report_type == "requests":
            title_text = f"申請一覧レポート ({datetime.now().strftime('%Y年%m月%d日')})"
        else:
            title_text = f"集計レポート ({datetime.now().strftime('%Y年%m月%d日')})"

        story.append(Paragraph(title_text, title_style))
        story.append(Spacer(1, 12))

        if not requests_data:
            story.append(Paragraph("データがありません。", self.styles['Normal']))
        else:
            # テーブルヘッダー
            if report_type == "requests":
                headers = ['申請ID', '種類', '申請者', 'タイトル', 'ステータス', '申請日', '承認日']
                data = [headers]

                for req in requests_data:
                    row = [
                        str(req.get('id', ''))[:8] + '...',
                        self._get_type_text(req.get('type', '')),
                        req.get('applicant', {}).get('name', ''),
                        req.get('title', '')[:20] + ('...' if len(req.get('title', '')) > 20 else ''),
                        self._get_status_text(req.get('status', '')),
                        self._format_date(req.get('applied_at')),
                        self._format_date(req.get('approved_at')) if req.get('approved_at') else '-'
                    ]
                    data.append(row)
            else:
                # 集計レポート
                headers = ['項目', '件数', '比率']
                data = [headers]

                total_requests = len(requests_data)
                status_counts = {}
                type_counts = {}

                for req in requests_data:
                    status = req.get('status', '')
                    req_type = req.get('type', '')

                    status_counts[status] = status_counts.get(status, 0) + 1
                    type_counts[req_type] = type_counts.get(req_type, 0) + 1

                # ステータス別集計
                data.append(['=== ステータス別 ===', '', ''])
                for status, count in status_counts.items():
                    ratio = f"{count/total_requests*100:.1f}%" if total_requests > 0 else "0%"
                    data.append([self._get_status_text(status), str(count), ratio])

                data.append(['', '', ''])
                data.append(['=== 申請種類別 ===', '', ''])
                for req_type, count in type_counts.items():
                    ratio = f"{count/total_requests*100:.1f}%" if total_requests > 0 else "0%"
                    data.append([self._get_type_text(req_type), str(count), ratio])

                data.append(['', '', ''])
                data.append(['合計', str(total_requests), '100%'])

            # テーブル作成
            table = Table(data, repeatRows=1)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))

            story.append(table)

        # 生成日時
        story.append(Spacer(1, 24))
        footer_style = ParagraphStyle(
            'Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER
        )
        story.append(Paragraph(f"生成日時: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}", footer_style))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_csv_export(self, requests_data: List[Dict]) -> str:
        """申請データのCSVエクスポートを生成"""
        output = io.StringIO()
        writer = csv.writer(output)

        # ヘッダー
        headers = [
            '申請ID', '申請種類', '申請者名', '申請者メール', 'タイトル', '説明',
            'ステータス', '申請日', '承認日', '承認者', 'コメント'
        ]
        writer.writerow(headers)

        # データ行
        for req in requests_data:
            row = [
                req.get('id', ''),
                self._get_type_text(req.get('type', '')),
                req.get('applicant', {}).get('name', ''),
                req.get('applicant', {}).get('email', ''),
                req.get('title', ''),
                req.get('description', ''),
                self._get_status_text(req.get('status', '')),
                self._format_date(req.get('applied_at')),
                self._format_date(req.get('approved_at')) if req.get('approved_at') else '',
                req.get('approver', {}).get('name', '') if req.get('approver') else '',
                req.get('comments', '')
            ]
            writer.writerow(row)

        return output.getvalue()

    def generate_excel_export(self, requests_data: List[Dict]) -> bytes:
        """申請データのExcelエクスポートを生成"""
        output = io.BytesIO()

        # DataFrameを作成
        df_data = []
        for req in requests_data:
            row = {
                '申請ID': req.get('id', ''),
                '申請種類': self._get_type_text(req.get('type', '')),
                '申請者名': req.get('applicant', {}).get('name', ''),
                '申請者メール': req.get('applicant', {}).get('email', ''),
                'タイトル': req.get('title', ''),
                '説明': req.get('description', ''),
                'ステータス': self._get_status_text(req.get('status', '')),
                '申請日': self._format_date(req.get('applied_at')),
                '承認日': self._format_date(req.get('approved_at')) if req.get('approved_at') else '',
                '承認者': req.get('approver', {}).get('name', '') if req.get('approver') else '',
                'コメント': req.get('comments', '')
            }
            df_data.append(row)

        df = pd.DataFrame(df_data)

        # Excelに書き込み
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='申請一覧', index=False)

            # ワークシートの幅を調整
            worksheet = writer.sheets['申請一覧']
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width

        output.seek(0)
        return output.getvalue()

    def generate_summary_report(self, requests_data: List[Dict]) -> Dict[str, Any]:
        """集計レポートデータを生成"""
        total_requests = len(requests_data)

        if total_requests == 0:
            return {
                "total_requests": 0,
                "status_summary": {},
                "type_summary": {},
                "monthly_summary": {},
                "approval_rate": 0
            }

        # ステータス別集計
        status_counts = {}
        type_counts = {}
        monthly_counts = {}
        approved_count = 0

        for req in requests_data:
            status = req.get('status', '')
            req_type = req.get('type', '')

            status_counts[status] = status_counts.get(status, 0) + 1
            type_counts[req_type] = type_counts.get(req_type, 0) + 1

            if status == 'approved':
                approved_count += 1

            # 月別集計
            applied_at = req.get('applied_at')
            if applied_at:
                try:
                    if isinstance(applied_at, str):
                        date_obj = datetime.fromisoformat(applied_at.replace('Z', '+00:00'))
                    else:
                        date_obj = applied_at
                    month_key = date_obj.strftime('%Y-%m')
                    monthly_counts[month_key] = monthly_counts.get(month_key, 0) + 1
                except:
                    pass

        approval_rate = (approved_count / total_requests * 100) if total_requests > 0 else 0

        return {
            "total_requests": total_requests,
            "status_summary": {
                status: {
                    "count": count,
                    "percentage": round(count / total_requests * 100, 1)
                }
                for status, count in status_counts.items()
            },
            "type_summary": {
                req_type: {
                    "count": count,
                    "percentage": round(count / total_requests * 100, 1)
                }
                for req_type, count in type_counts.items()
            },
            "monthly_summary": monthly_counts,
            "approval_rate": round(approval_rate, 1)
        }

    def _get_type_text(self, type_value: str) -> str:
        """申請種類の日本語変換"""
        type_map = {
            'leave': '休暇申請',
            'overtime': '時間外労働申請',
            'expense': '仮払・立替申請'
        }
        return type_map.get(type_value, type_value)

    def _get_status_text(self, status_value: str) -> str:
        """ステータスの日本語変換"""
        status_map = {
            'draft': '下書き',
            'applied': '申請中',
            'approved': '承認済み',
            'rejected': '却下',
            'returned': '差戻し',
            'completed': '完了'
        }
        return status_map.get(status_value, status_value)

    def _format_date(self, date_value) -> str:
        """日付フォーマット"""
        if not date_value:
            return ""

        try:
            if isinstance(date_value, str):
                date_obj = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            else:
                date_obj = date_value
            return date_obj.strftime('%Y/%m/%d')
        except:
            return str(date_value)

# グローバルインスタンス
export_service = ExportService()