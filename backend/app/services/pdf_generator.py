from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io
from typing import List, Dict


def generate_construction_daily_pdf(report, user) -> bytes:
    """
    工事日報をPDFで生成
    A4サイズ1枚に収める
    """
    buffer = io.BytesIO()

    # 日本語フォントを登録（システムにあるフォントを使用）
    try:
        # Windowsの場合
        pdfmetrics.registerFont(TTFont('Japanese', 'C:\\Windows\\Fonts\\msgothic.ttc', subfontIndex=0))
    except:
        try:
            # Linuxの場合
            pdfmetrics.registerFont(TTFont('Japanese', '/usr/share/fonts/truetype/takao-gothic/TakaoGothic.ttf'))
        except:
            # フォールバック（IPAフォント）
            try:
                pdfmetrics.registerFont(TTFont('Japanese', '/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.ttf'))
            except:
                # デフォルトフォントを使用
                pass

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

    # 日本語対応のスタイル
    try:
        title_style = ParagraphStyle(
            'JapaneseTitle',
            parent=styles['Heading1'],
            fontName='Japanese',
            fontSize=14,
            alignment=TA_CENTER,
            spaceAfter=2*mm
        )

        normal_style = ParagraphStyle(
            'JapaneseNormal',
            parent=styles['Normal'],
            fontName='Japanese',
            fontSize=7,
            leading=8
        )
    except:
        # フォントが登録できなかった場合はデフォルトを使用
        title_style = styles['Heading1']
        normal_style = styles['Normal']

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
        ('FONT', (0, 0), (-1, -1), 'Japanese', 7),
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
        ('FONT', (0, 0), (-1, -1), 'Japanese', 7),
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
        ('FONT', (0, 0), (-1, -1), 'Japanese', 7),
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
            ('FONT', (0, 0), (-1, -1), 'Japanese', 7),
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
            ('FONT', (0, 0), (-1, -1), 'Japanese', 6),
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
            ('FONT', (0, 0), (-1, -1), 'Japanese', 6),
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
                ('FONT', (0, 0), (-1, -1), 'Japanese', 6),
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
                ('FONT', (0, 0), (-1, -1), 'Japanese', 6),
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
