import jsPDF from 'jspdf'
import 'jspdf-autotable'

// jsPDFの型拡張
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

/**
 * 休暇申請書のPDFを生成（日本語対応版）
 */
export const generateLeaveRequestPDF = (data: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  // 枠線を描画
  doc.setLineWidth(0.5)
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)

  // タイトル（大きめの四角で囲む）
  doc.setFontSize(20)
  const titleWidth = 80
  const titleHeight = 15
  doc.rect((pageWidth - titleWidth) / 2, 25, titleWidth, titleHeight)
  doc.text('Kyuka Shinseisho', pageWidth / 2, 33, { align: 'center' })

  // 申請日
  doc.setFontSize(10)
  doc.text(`Shinsei-bi: ${data.application_date || ''}`, pageWidth - margin - 5, 30, { align: 'right' })

  // 申請者情報のボックス
  let currentY = 50
  doc.setFontSize(12)
  doc.text('[Shinseiha Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  doc.text(`Shimei: ${data.applicant_name || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Busho: ${data.department || ''}`, margin + 10, currentY)

  // 休暇情報のボックス
  currentY += 12
  doc.setFontSize(12)
  doc.text('[Kyuka Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)

  const leaveTypeMap: Record<string, string> = {
    'paid': 'Yukyu Kyuka',
    'compensatory': 'Daikyu',
    'special': 'Tokubetsu Kyuka'
  }
  doc.text(`Kyuka Shubetsu: ${leaveTypeMap[data.leave_type] || data.leave_type}`, margin + 10, currentY)

  currentY += 7
  const startDuration = data.start_duration === 'full' ? 'Shujitsu' : data.start_duration === 'am' ? 'Gozen' : 'Gogo'
  doc.text(`Kaishi-bi: ${data.start_date || ''} (${startDuration})`, margin + 10, currentY)

  currentY += 7
  const endDuration = data.end_duration === 'full' ? 'Shujitsu' : data.end_duration === 'am' ? 'Gozen' : 'Gogo'
  doc.text(`Shuryo-bi: ${data.end_date || ''} (${endDuration})`, margin + 10, currentY)

  currentY += 7
  doc.text(`Nissu: ${data.days || 0}nichi${data.hours ? ` (${data.hours}jikan)` : ''}`, margin + 10, currentY)

  // 理由
  currentY += 12
  doc.setFontSize(12)
  doc.text('[Riyu]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  const reasonLines = doc.splitTextToSize(data.reason || '', pageWidth - margin * 2 - 20)
  doc.text(reasonLines, margin + 10, currentY)
  currentY += reasonLines.length * 5

  // 引継事項
  if (data.handover_notes) {
    currentY += 8
    doc.setFontSize(12)
    doc.text('[Hikitsugi Jiko]', margin + 5, currentY)

    currentY += 8
    doc.setFontSize(10)
    const handoverLines = doc.splitTextToSize(data.handover_notes, pageWidth - margin * 2 - 20)
    doc.text(handoverLines, margin + 10, currentY)
  }

  // 承認欄
  const approvalY = pageHeight - 70
  doc.setFontSize(12)
  doc.text('[Shonin-ran]', margin + 5, approvalY)

  const boxY = approvalY + 8
  const boxWidth = (pageWidth - margin * 2 - 10) / 2
  const boxHeight = 35

  // 上長承認
  doc.rect(margin + 5, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Jocho Shonin', margin + 10, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + 10, boxY + 17)
  doc.text('Shimei: _______________', margin + 10, boxY + 24)
  doc.circle(margin + boxWidth - 10, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', margin + boxWidth - 12, boxY + 30)

  // 部長承認
  doc.rect(margin + boxWidth + 15, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Bucho Shonin', margin + boxWidth + 20, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + boxWidth + 20, boxY + 17)
  doc.text('Shimei: _______________', margin + boxWidth + 20, boxY + 24)
  doc.circle(pageWidth - margin - 15, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', pageWidth - margin - 17, boxY + 30)

  return doc
}

/**
 * 時間外労働申請書のPDFを生成
 */
export const generateOvertimeRequestPDF = (data: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  doc.setLineWidth(0.5)
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)

  // タイトル
  doc.setFontSize(20)
  const titleWidth = 100
  const titleHeight = 15
  doc.rect((pageWidth - titleWidth) / 2, 25, titleWidth, titleHeight)
  doc.text('Jikangai Rodo Shinseisho', pageWidth / 2, 33, { align: 'center' })

  doc.setFontSize(10)
  const appDate = data.application_date || new Date().toLocaleDateString('ja-JP')
  doc.text(`Shinsei-bi: ${appDate}`, pageWidth - margin - 5, 30, { align: 'right' })

  let currentY = 50
  doc.setFontSize(12)
  doc.text('[Shinseiha Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  doc.text(`Shimei: ${data.applicant_name || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Busho: ${data.department || ''}`, margin + 10, currentY)

  currentY += 12
  doc.setFontSize(12)
  doc.text('[Sagyo Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  doc.text(`Sagyo-bi: ${data.work_date || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Kaishi Jikoku: ${data.start_time || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Shuryo Jikoku: ${data.end_time || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Kyukei Jikan: ${data.break_time || 0}fun`, margin + 10, currentY)

  currentY += 7
  doc.text(`Sagyo Jikan: ${data.total_hours || 0}jikan`, margin + 10, currentY)

  if (data.project_name) {
    currentY += 7
    doc.text(`Project-mei: ${data.project_name}`, margin + 10, currentY)
  }

  if (data.work_content) {
    currentY += 12
    doc.setFontSize(12)
    doc.text('[Sagyo Naiyo]', margin + 5, currentY)

    currentY += 8
    doc.setFontSize(10)
    const contentLines = doc.splitTextToSize(data.work_content, pageWidth - margin * 2 - 20)
    doc.text(contentLines, margin + 10, currentY)
    currentY += contentLines.length * 5
  }

  currentY += 8
  doc.setFontSize(12)
  doc.text('[Riyu]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  const reasonLines = doc.splitTextToSize(data.reason || '', pageWidth - margin * 2 - 20)
  doc.text(reasonLines, margin + 10, currentY)

  // 承認欄
  const approvalY = pageHeight - 70
  doc.setFontSize(12)
  doc.text('[Shonin-ran]', margin + 5, approvalY)

  const boxY = approvalY + 8
  const boxWidth = (pageWidth - margin * 2 - 10) / 2
  const boxHeight = 35

  doc.rect(margin + 5, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Jocho Shonin', margin + 10, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + 10, boxY + 17)
  doc.text('Shimei: _______________', margin + 10, boxY + 24)
  doc.circle(margin + boxWidth - 10, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', margin + boxWidth - 12, boxY + 30)

  doc.rect(margin + boxWidth + 15, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Bucho Shonin', margin + boxWidth + 20, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + boxWidth + 20, boxY + 17)
  doc.text('Shimei: _______________', margin + boxWidth + 20, boxY + 24)
  doc.circle(pageWidth - margin - 15, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', pageWidth - margin - 17, boxY + 30)

  return doc
}

/**
 * 休日出勤届のPDFを生成
 */
export const generateHolidayWorkRequestPDF = (data: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  doc.setLineWidth(0.5)
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)

  doc.setFontSize(20)
  const titleWidth = 80
  const titleHeight = 15
  doc.rect((pageWidth - titleWidth) / 2, 25, titleWidth, titleHeight)
  doc.text('Kyujitsu Shukkin Todoke', pageWidth / 2, 33, { align: 'center' })

  doc.setFontSize(10)
  const appDate = data.application_date || new Date().toLocaleDateString('ja-JP')
  doc.text(`Shinsei-bi: ${appDate}`, pageWidth - margin - 5, 30, { align: 'right' })

  let currentY = 50
  doc.setFontSize(12)
  doc.text('[Shinseiha Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  doc.text(`Shimei: ${data.applicant_name || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Busho: ${data.department || ''}`, margin + 10, currentY)

  currentY += 12
  doc.setFontSize(12)
  doc.text('[Shukkin Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  doc.text(`Shukkin-bi: ${data.work_date || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Kaishi Jikoku: ${data.start_time || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Shuryo Jikoku: ${data.end_time || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Kyukei Jikan: ${data.break_time || 0}fun`, margin + 10, currentY)

  currentY += 7
  doc.text(`Daikyu Shutoku Yoteibi: ${data.compensatory_leave_date || 'Mitei'}`, margin + 10, currentY)

  currentY += 12
  doc.setFontSize(12)
  doc.text('[Sagyo Naiyo]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  const contentLines = doc.splitTextToSize(data.work_content || '', pageWidth - margin * 2 - 20)
  doc.text(contentLines, margin + 10, currentY)
  currentY += contentLines.length * 5

  currentY += 8
  doc.setFontSize(12)
  doc.text('[Riyu]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  const reasonLines = doc.splitTextToSize(data.reason || '', pageWidth - margin * 2 - 20)
  doc.text(reasonLines, margin + 10, currentY)

  const approvalY = pageHeight - 70
  doc.setFontSize(12)
  doc.text('[Shonin-ran]', margin + 5, approvalY)

  const boxY = approvalY + 8
  const boxWidth = (pageWidth - margin * 2 - 10) / 2
  const boxHeight = 35

  doc.rect(margin + 5, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Jocho Shonin', margin + 10, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + 10, boxY + 17)
  doc.text('Shimei: _______________', margin + 10, boxY + 24)
  doc.circle(margin + boxWidth - 10, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', margin + boxWidth - 12, boxY + 30)

  doc.rect(margin + boxWidth + 15, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Bucho Shonin', margin + boxWidth + 20, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + boxWidth + 20, boxY + 17)
  doc.text('Shimei: _______________', margin + boxWidth + 20, boxY + 24)
  doc.circle(pageWidth - margin - 15, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', pageWidth - margin - 17, boxY + 30)

  return doc
}

/**
 * 仮払金申請書のPDFを生成
 */
export const generateAdvancePaymentPDF = (data: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  doc.setLineWidth(0.5)
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)

  doc.setFontSize(20)
  const titleWidth = 80
  const titleHeight = 15
  doc.rect((pageWidth - titleWidth) / 2, 25, titleWidth, titleHeight)
  doc.text('Karibarai-kin Shinseisho', pageWidth / 2, 33, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`Shinsei-bi: ${data.application_date || ''}`, pageWidth - margin - 5, 30, { align: 'right' })

  let currentY = 50
  doc.setFontSize(12)
  doc.text('[Shinseiha Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  doc.text(`Shimei: ${data.applicant_name || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Genba-mei: ${data.site_name || ''}`, margin + 10, currentY)

  currentY += 12
  doc.setFontSize(12)
  doc.text('[Karibarai-kin Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(14)
  doc.text(`Karibarai Kingaku: ¥${(data.request_amount || 0).toLocaleString()}`, margin + 10, currentY)

  if (data.received_date) {
    currentY += 10
    doc.setFontSize(10)
    doc.text(`Juryo-bi: ${data.received_date}`, margin + 10, currentY)
  }

  if (data.purpose) {
    currentY += 12
    doc.setFontSize(12)
    doc.text('[Yoto]', margin + 5, currentY)

    currentY += 8
    doc.setFontSize(10)
    const purposeLines = doc.splitTextToSize(data.purpose, pageWidth - margin * 2 - 20)
    doc.text(purposeLines, margin + 10, currentY)
  }

  const approvalY = pageHeight - 70
  doc.setFontSize(12)
  doc.text('[Shonin-ran]', margin + 5, approvalY)

  const boxY = approvalY + 8
  const boxWidth = (pageWidth - margin * 2 - 10) / 2
  const boxHeight = 35

  doc.rect(margin + 5, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Jocho Shonin', margin + 10, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + 10, boxY + 17)
  doc.text('Shimei: _______________', margin + 10, boxY + 24)
  doc.circle(margin + boxWidth - 10, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', margin + boxWidth - 12, boxY + 30)

  doc.rect(margin + boxWidth + 15, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Keiri Shonin', margin + boxWidth + 20, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + boxWidth + 20, boxY + 17)
  doc.text('Shimei: _______________', margin + boxWidth + 20, boxY + 24)
  doc.circle(pageWidth - margin - 15, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', pageWidth - margin - 17, boxY + 30)

  return doc
}

/**
 * 立替金申請書のPDFを生成
 */
export const generateReimbursementPDF = (data: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  doc.setLineWidth(0.5)
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)

  doc.setFontSize(20)
  const titleWidth = 80
  const titleHeight = 15
  doc.rect((pageWidth - titleWidth) / 2, 25, titleWidth, titleHeight)
  doc.text('Tatekae-kin Shinseisho', pageWidth / 2, 33, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`Shinsei-bi: ${data.application_date || ''}`, pageWidth - margin - 5, 30, { align: 'right' })

  let currentY = 50
  doc.setFontSize(12)
  doc.text('[Shinseiha Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  doc.text(`Shimei: ${data.applicant_name || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Genba-mei: ${data.site_name || ''}`, margin + 10, currentY)

  currentY += 12
  doc.setFontSize(12)
  doc.text('[Tatekae-kin Meisai]', margin + 5, currentY)

  currentY += 8
  if (data.expense_lines && data.expense_lines.length > 0) {
    const tableData = data.expense_lines.map((line: any) => [
      line.date || '',
      line.item || '',
      line.site_name || '',
      line.tax_type || '',
      `¥${(line.amount || 0).toLocaleString()}`
    ])

    doc.autoTable({
      startY: currentY,
      head: [['Hizuke', 'Komoku', 'Genba-mei', 'Zei Kubun', 'Kingaku']],
      body: tableData,
      margin: { left: margin + 5, right: margin + 5 },
      styles: { fontSize: 9, font: 'helvetica' },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
      theme: 'grid'
    })

    currentY = (doc as any).lastAutoTable.finalY + 10

    doc.setFontSize(12)
    doc.text(`Gokei Kingaku: ¥${(data.total_amount || 0).toLocaleString()}`, pageWidth - margin - 5, currentY, { align: 'right' })
  }

  const approvalY = pageHeight - 70
  doc.setFontSize(12)
  doc.text('[Shonin-ran]', margin + 5, approvalY)

  const boxY = approvalY + 8
  const boxWidth = (pageWidth - margin * 2 - 10) / 2
  const boxHeight = 35

  doc.rect(margin + 5, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Jocho Shonin', margin + 10, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + 10, boxY + 17)
  doc.text('Shimei: _______________', margin + 10, boxY + 24)
  doc.circle(margin + boxWidth - 10, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', margin + boxWidth - 12, boxY + 30)

  doc.rect(margin + boxWidth + 15, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Keiri Shonin', margin + boxWidth + 20, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + boxWidth + 20, boxY + 17)
  doc.text('Shimei: _______________', margin + boxWidth + 20, boxY + 24)
  doc.circle(pageWidth - margin - 15, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', pageWidth - margin - 17, boxY + 30)

  return doc
}

/**
 * 仮払金精算書のPDFを生成
 */
export const generateSettlementPDF = (data: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  doc.setLineWidth(0.5)
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)

  doc.setFontSize(20)
  const titleWidth = 80
  const titleHeight = 15
  doc.rect((pageWidth - titleWidth) / 2, 25, titleWidth, titleHeight)
  doc.text('Karibarai-kin Seisansho', pageWidth / 2, 33, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`Seisan-bi: ${data.settlement_date || ''}`, pageWidth - margin - 5, 30, { align: 'right' })

  let currentY = 50
  doc.setFontSize(12)
  doc.text('[Shinseiha Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  doc.text(`Shimei: ${data.applicant_name || ''}`, margin + 10, currentY)

  currentY += 7
  doc.text(`Genba-mei: ${data.site_name || ''}`, margin + 10, currentY)

  currentY += 12
  doc.setFontSize(12)
  doc.text('[Karibarai-kin Joho]', margin + 5, currentY)

  currentY += 8
  doc.setFontSize(10)
  doc.text(`Shinsei-bi: ${data.application_date || ''}`, margin + 10, currentY)

  currentY += 7
  doc.setFontSize(12)
  doc.text(`Karibarai Kingaku: ¥${(data.advance_payment_amount || 0).toLocaleString()}`, margin + 10, currentY)

  currentY += 12
  doc.text('[Seisan Meisai]', margin + 5, currentY)

  currentY += 8
  if (data.expense_lines && data.expense_lines.length > 0) {
    const tableData = data.expense_lines.map((line: any) => [
      line.date || '',
      line.item || '',
      line.site_name || '',
      line.tax_type || '',
      `¥${(line.amount || 0).toLocaleString()}`
    ])

    doc.autoTable({
      startY: currentY,
      head: [['Hizuke', 'Komoku', 'Genba-mei', 'Zei Kubun', 'Kingaku']],
      body: tableData,
      margin: { left: margin + 5, right: margin + 5 },
      styles: { fontSize: 9, font: 'helvetica' },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
      theme: 'grid'
    })

    currentY = (doc as any).lastAutoTable.finalY + 10

    doc.setFontSize(12)
    doc.text(`Seisan Gokei: ¥${(data.total_amount || 0).toLocaleString()}`, pageWidth - margin - 5, currentY, { align: 'right' })

    currentY += 7
    const balance = (data.advance_payment_amount || 0) - (data.total_amount || 0)
    const balanceText = balance >= 0 ? `Henkin-gaku: ¥${balance.toLocaleString()}` : `Tsuika Shiharai-gaku: ¥${Math.abs(balance).toLocaleString()}`
    doc.text(balanceText, pageWidth - margin - 5, currentY, { align: 'right' })
  }

  const approvalY = pageHeight - 70
  doc.setFontSize(12)
  doc.text('[Shonin-ran]', margin + 5, approvalY)

  const boxY = approvalY + 8
  const boxWidth = (pageWidth - margin * 2 - 10) / 2
  const boxHeight = 35

  doc.rect(margin + 5, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Jocho Shonin', margin + 10, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + 10, boxY + 17)
  doc.text('Shimei: _______________', margin + 10, boxY + 24)
  doc.circle(margin + boxWidth - 10, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', margin + boxWidth - 12, boxY + 30)

  doc.rect(margin + boxWidth + 15, boxY, boxWidth, boxHeight)
  doc.setFontSize(10)
  doc.text('Keiri Shonin', margin + boxWidth + 20, boxY + 7)
  doc.text('Shonin-bi: _______________', margin + boxWidth + 20, boxY + 17)
  doc.text('Shimei: _______________', margin + boxWidth + 20, boxY + 24)
  doc.circle(pageWidth - margin - 15, boxY + 28, 5)
  doc.setFontSize(8)
  doc.text('In', pageWidth - margin - 17, boxY + 30)

  return doc
}
