from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import io
from typing import List, Dict, Any
from datetime import date


def generate_construction_daily_pdf(report, user) -> bytes:
    """
    工事日報をPDFで生成
    A4サイズ1枚に収める
    """
    buffer = io.BytesIO()

    # 日本語フォントを登録
    font_registered, font_name = _register_japanese_font()

    # PDFドキュメント作成（A4サイズ、マージン小さめ）
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=10*mm,
        rightMargin=10*mm,
        topMargin=8*mm,
        bottomMargin=8*mm
    )

    # スタイル定義
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName=font_name,
        fontSize=14,
        alignment=TA_CENTER,
        spaceAfter=2*mm
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=7,
        leading=8
    )

    # コンテンツ構築
    content = []

    # タイトル
    content.append(Paragraph("工事日報 - 様式-13", title_style))
    content.append(Paragraph("株式会社 NIWAYA", normal_style))
    content.append(Spacer(1, 2*mm))

    # 基本情報テーブル
    basic_data = [
        ['日付', report.report_date.strftime('%Y年%m月%d日'), '現場名', report.site_name],
        ['作業場所', report.work_location, '記入者', user.name if user else '']
    ]

    basic_table = Table(basic_data, colWidths=[20*mm, 45*mm, 20*mm, 45*mm])
    basic_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), font_name, 7),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('BACKGROUND', (2, 0), (2, -1), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
    ]))
    content.append(basic_table)
    content.append(Spacer(1, 2*mm))

    # 時間情報
    time_data = [
        ['早出', report.early_start or '', '開始', report.work_start_time, '終了', report.work_end_time, '残業', report.overtime or '']
    ]
    time_table = Table(time_data, colWidths=[15*mm, 20*mm, 15*mm, 20*mm, 15*mm, 20*mm, 15*mm, 20*mm])
    time_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), font_name, 7),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
        ('BACKGROUND', (2, 0), (2, 0), colors.lightgrey),
        ('BACKGROUND', (4, 0), (4, 0), colors.lightgrey),
        ('BACKGROUND', (6, 0), (6, 0), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
    ]))
    content.append(time_table)
    content.append(Spacer(1, 2*mm))

    # 作業内容
    work_data = [
        ['作業内容', report.work_content or '']
    ]
    work_table = Table(work_data, colWidths=[25*mm, 165*mm])
    work_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), font_name, 7),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (0, 0), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
    ]))
    content.append(work_table)
    content.append(Spacer(1, 2*mm))

    # 作業員
    if report.workers:
        worker_rows = [['区分', '氏名']]
        for w in report.workers[:6]:  # 最大6人まで表示
            worker_rows.append([w.get('category', ''), w.get('name', '')])

        worker_table = Table(worker_rows, colWidths=[30*mm, 70*mm])
        worker_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), font_name, 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ]))
        content.append(worker_table)
        content.append(Spacer(1, 2*mm))

    # 自社車両
    if report.own_vehicles:
        vehicle_rows = [['種別', 'ナンバー', '運転者', '給油']]
        for v in report.own_vehicles[:4]:  # 最大4台
            vehicle_rows.append([
                v.get('type', ''),
                v.get('number', ''),
                v.get('driver', ''),
                v.get('refuel', '')
            ])

        vehicle_table = Table(vehicle_rows, colWidths=[25*mm, 30*mm, 25*mm, 20*mm])
        vehicle_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), font_name, 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ]))
        content.append(vehicle_table)
        content.append(Spacer(1, 1*mm))

    # 機械
    if report.machinery:
        machinery_rows = [['機械', '使用者']]
        for m in report.machinery[:6]:  # 最大6個
            machinery_rows.append([
                f"{m.get('type', '')} {m.get('code', '')}",
                m.get('user', '')
            ])

        machinery_table = Table(machinery_rows, colWidths=[40*mm, 40*mm])
        machinery_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), font_name, 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ]))
        content.append(machinery_table)
        content.append(Spacer(1, 1*mm))

    # KY活動
    if report.ky_activities:
        checked_ky = [k for k in report.ky_activities if k.get('checked', False)]
        if checked_ky:
            ky_rows = [['危険ポイント', '対策']]
            for k in checked_ky[:5]:  # 最大5項目
                ky_rows.append([
                    k.get('hazard', ''),
                    k.get('countermeasure', '')
                ])

            ky_table = Table(ky_rows, colWidths=[60*mm, 70*mm])
            ky_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), font_name, 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ]))
            content.append(ky_table)
            content.append(Spacer(1, 1*mm))

    # 備考・連絡事項
    if report.customer_requests or report.office_confirmation:
        remarks_data = []
        if report.customer_requests:
            remarks_data.append(['お客様要望', report.customer_requests or ''])
        if report.office_confirmation:
            remarks_data.append(['事務所確認', report.office_confirmation or ''])

        if remarks_data:
            remarks_table = Table(remarks_data, colWidths=[30*mm, 130*mm])
            remarks_table.setStyle(TableStyle([
                ('FONT', (0, 0), (-1, -1), font_name, 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ]))
            content.append(remarks_table)

    # PDFビルド
    doc.build(content)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


def _register_japanese_font() -> tuple[bool, str]:
    """日本語フォントを登録"""
    import os
    import subprocess
    font_registered = False
    font_name = 'Helvetica'

    # デバッグ：利用可能なフォントを確認
    print("[PDF] Checking available fonts...")
    try:
        result = subprocess.run(
            ['find', '/usr/share/fonts', '-name', '*Noto*CJK*', '-type', 'f'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.stdout:
            print(f"[PDF] Found fonts:\n{result.stdout}")
        else:
            print("[PDF] No Noto CJK fonts found")
    except Exception as e:
        print(f"[PDF] Font check failed: {e}")

    # 試すフォントパスとインデックスのリスト
    font_paths = [
        # Windows
        ('C:\\Windows\\Fonts\\msgothic.ttc', [0]),
        # IPAフォント（確実に動作する）- 優先
        ('/usr/share/fonts/truetype/ipafont/ipagp.ttf', [None]),
        ('/usr/share/fonts/truetype/ipafont/ipag.ttf', [None]),
        ('/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf', [None]),
        ('/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.ttf', [None]),
        # Debian/Ubuntu - fonts-noto-cjk パッケージ
        # NotoSansCJK-Regular.ttc には複数の言語が含まれる（JP, KR, SC, TC）
        ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', [0, 1, 2, 3]),
        ('/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc', [0, 1, 2, 3]),
        ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', [0, 1, 2, 3]),
    ]

    for font_path, subfont_indices in font_paths:
        # ファイルの存在確認
        if not os.path.exists(font_path):
            print(f"[PDF] Font file not found: {font_path}")
            continue

        print(f"[PDF] Trying to load: {font_path}")
        for subfont_index in subfont_indices:
            try:
                if subfont_index is not None:
                    pdfmetrics.registerFont(TTFont('Japanese', font_path, subfontIndex=subfont_index))
                else:
                    pdfmetrics.registerFont(TTFont('Japanese', font_path))
                font_registered = True
                font_name = 'Japanese'
                print(f"[PDF] ✓ Font registered successfully: {font_path} (index={subfont_index})")
                break
            except Exception as e:
                print(f"[PDF] ✗ Failed to load {font_path} (index={subfont_index}): {e}")
                continue
        if font_registered:
            break

    if not font_registered:
        print(f"[PDF] Warning: Japanese font not found, using Helvetica")

    return font_registered, font_name


def generate_shift_table_pdf(shift_data: Dict[str, Any]) -> bytes:
    """
    月次シフト表をPDFで生成（横向き・A4）
    参考資料: 7月シフト表.pdf
    """
    buffer = io.BytesIO()
    font_registered, font_name = _register_japanese_font()

    # 横向きA4サイズ
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=10*mm,
        rightMargin=10*mm,
        topMargin=10*mm,
        bottomMargin=10*mm
    )

    content = []
    styles = getSampleStyleSheet()

    # タイトルスタイル
    title_style = ParagraphStyle(
        'ShiftTitle',
        parent=styles['Heading1'],
        fontName=font_name,
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=3*mm
    )

    # 通常スタイル
    normal_style = ParagraphStyle(
        'ShiftNormal',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=7
    )

    # タイトル
    year = shift_data.get('year', 2025)
    month = shift_data.get('month', 1)
    title_text = f"≪ {year}年 NIWAYAホールディングス（株）シフト表≫"
    content.append(Paragraph(title_text, title_style))
    content.append(Paragraph(f"{year}年{month}月分", normal_style))
    content.append(Spacer(1, 3*mm))

    # 凡例
    legend_text = """
    会社休（法定付与分）：■　会社休（計画付与分）：□　代休（振替休）：○<br/>
    有給休暇：有　振替出勤：◎　特別休暇：特　休日出勤：☆
    """
    content.append(Paragraph(legend_text, normal_style))
    content.append(Spacer(1, 2*mm))

    # シフト表本体
    dates = shift_data.get('dates', [])
    employees = shift_data.get('employees', [])

    # ヘッダー行を作成
    header_row = ['']  # 左上空白
    weekday_row = ['']
    for d in dates:
        header_row.append(str(d['day']))
        weekday_row.append(d['weekday'])

    # データ行を作成
    data_rows = [header_row, weekday_row]

    for emp in employees:
        row = [emp['name']]
        daily_status = emp.get('daily_status', {})

        for d in dates:
            date_str = d['date']
            status = daily_status.get(date_str, '')

            # ステータスに応じた記号
            if status:
                row.append(status)
            else:
                # 土日判定（簡易）
                if d['weekday'] in ['土', '日']:
                    row.append('')
                else:
                    row.append('')

        data_rows.append(row)

    # カラム幅を計算（日付分を均等割り）
    num_days = len(dates)
    day_col_width = 6*mm  # 各日付のセル幅
    name_col_width = 25*mm  # 氏名列

    col_widths = [name_col_width] + [day_col_width] * num_days

    shift_table = Table(data_rows, colWidths=col_widths)

    # テーブルスタイル
    table_style = [
        ('FONT', (0, 0), (-1, -1), font_name, 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 1), colors.lightgrey),  # ヘッダー
        ('BACKGROUND', (0, 2), (0, -1), colors.lightyellow),  # 氏名列
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 6),
    ]

    # 土日の背景色をピンクに
    for col_idx, d in enumerate(dates, start=1):
        if d['weekday'] in ['土', '日']:
            table_style.append(('BACKGROUND', (col_idx, 0), (col_idx, -1), colors.pink))

    shift_table.setStyle(TableStyle(table_style))
    content.append(shift_table)
    content.append(Spacer(1, 3*mm))

    # 休暇残日数サマリー（右側）
    summary_data = [['', '休暇残日数', '参考', '休暇残日数']]
    summary_data.append(['', '(8月19日現在まで', '', '(6月30日現在)'])
    summary_data.append(['', 'の届け出分による)', '', ''])
    summary_data.append(['', '有給休暇', '代休', '有給休暇', '代休'])

    for emp in employees:
        balance = emp.get('balance', {})
        summary = emp.get('summary', {})
        row = [
            emp['name'],
            str(summary.get('paid_leave', 0)),
            str(summary.get('compensatory_leave', 0)),
            f"{balance.get('paid_leave', 0):.1f}",
            f"{balance.get('compensatory_leave', 0):.1f}"
        ]
        summary_data.append(row)

    summary_table = Table(summary_data, colWidths=[25*mm, 15*mm, 15*mm, 15*mm, 15*mm])
    summary_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), font_name, 7),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (1, 0), (-1, 0), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ]))
    content.append(summary_table)

    doc.build(content)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


def generate_timesheet_pdf(timesheet_data: Dict[str, Any]) -> bytes:
    """
    個人別月次出勤簿をPDFで生成（A4）
    参考資料: 出勤簿7月　ホールディングス.pdf
    """
    buffer = io.BytesIO()
    font_registered, font_name = _register_japanese_font()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=10*mm,
        rightMargin=10*mm,
        topMargin=10*mm,
        bottomMargin=10*mm
    )

    content = []
    styles = getSampleStyleSheet()

    # タイトルスタイル
    title_style = ParagraphStyle(
        'TimesheetTitle',
        parent=styles['Heading1'],
        fontName=font_name,
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=2*mm
    )

    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=8
    )

    # タイトル
    year = timesheet_data.get('year', 2025)
    month = timesheet_data.get('month', 1)
    user_info = timesheet_data.get('user', {})

    title = f"出勤簿　{year}年　{month}月分"
    content.append(Paragraph(title, title_style))
    content.append(Paragraph(f"氏名: {user_info.get('name', '')}", small_style))
    content.append(Spacer(1, 3*mm))

    # 出勤簿テーブル
    daily_records = timesheet_data.get('daily_records', [])

    # ヘッダー
    table_data = [[
        '日', '曜日',
        '午前\n8:00-12:00', '午後\n13:00-17:00',
        '早出(H)', '残業(H)',
        '現場担当者', '業務内容'
    ]]

    # データ行
    for record in daily_records:
        date_obj = date.fromisoformat(record['date'])
        row = [
            f"{date_obj.month}/{date_obj.day}",
            record['weekday'],
            record.get('attendance_am', ''),
            record.get('attendance_pm', ''),
            f"{record.get('early_hours', 0):.1f}" if record.get('early_hours', 0) > 0 else '',
            f"{record.get('overtime_hours', 0):.1f}" if record.get('overtime_hours', 0) > 0 else '',
            record.get('supervisor', ''),
            record.get('work_content', '')
        ]
        table_data.append(row)

    # カラム幅
    col_widths = [12*mm, 10*mm, 15*mm, 15*mm, 12*mm, 12*mm, 20*mm, 94*mm]

    timesheet_table = Table(table_data, colWidths=col_widths, repeatRows=1)

    # スタイル
    table_style = [
        ('FONT', (0, 0), (-1, -1), font_name, 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (5, -1), 'CENTER'),
        ('ALIGN', (6, 1), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 6),
    ]

    # 土日の背景色
    for idx, record in enumerate(daily_records, start=1):
        if record['weekday'] in ['土', '日']:
            table_style.append(('BACKGROUND', (0, idx), (-1, idx), colors.lightyellow))

    timesheet_table.setStyle(TableStyle(table_style))
    content.append(timesheet_table)
    content.append(Spacer(1, 3*mm))

    # サマリーテーブル
    summary = timesheet_data.get('summary', {})

    summary_data = [
        ['早出(H)', '残業(H)', '', ''],
        [
            f"{summary.get('total_early_hours', 0):.1f}",
            f"{summary.get('total_overtime_hours', 0):.1f}",
            '',
            ''
        ],
        ['出勤日数', '振替出', '休勤', '出勤数', '有給', '振替休', '特別休', '労働時間', '欠勤'],
        [
            str(summary.get('total_work_days', 0)),
            str(summary.get('substitute_work_days', 0)),
            '0.0',
            str(summary.get('total_work_days', 0)),
            str(summary.get('paid_leave_days', 0)),
            '0.0',
            str(summary.get('special_leave_days', 0)),
            f"{summary.get('total_work_hours', 0):.2f}",
            str(summary.get('absence_days', 0))
        ]
    ]

    summary_table = Table(summary_data, colWidths=[15*mm, 15*mm, 15*mm, 15*mm, 15*mm, 15*mm, 15*mm, 20*mm, 15*mm])
    summary_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), font_name, 7),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('BACKGROUND', (0, 2), (-1, 2), colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    content.append(summary_table)

    doc.build(content)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes
