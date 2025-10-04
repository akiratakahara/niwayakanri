import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * HTMLからPDFを生成（日本語完全対応・A4サイズ1枚固定）
 */
export const generatePDFFromHTML = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error('Element not found')
  }

  // HTMLをCanvasに変換
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: 794, // A4幅 (210mm at 96dpi * 3.78)
    height: 1123 // A4高さ (297mm at 96dpi * 3.78)
  })

  // CanvasからPDFを生成（A4サイズ固定）
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297

  // A4サイズぴったりに画像を配置
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
  pdf.save(filename)
}

/**
 * 休暇申請書用のHTML要素を生成してPDF化
 */
export const generateLeaveRequestPDFFromHTML = async (data: any) => {
  const tempDiv = document.createElement('div')
  tempDiv.id = 'leave-request-pdf-temp'
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.width = '794px' // A4幅
  tempDiv.style.height = '1123px' // A4高さ
  tempDiv.style.padding = '0'
  tempDiv.style.backgroundColor = 'white'
  tempDiv.style.fontFamily = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'

  const leaveTypeMap: Record<string, string> = {
    'paid': '有給休暇',
    'compensatory': '代休',
    'special': '特別休暇'
  }

  const durationMap: Record<string, string> = {
    'full': '終日',
    'am': '午前',
    'pm': '午後'
  }

  tempDiv.innerHTML = `
    <div style="border: 2px solid #000; padding: 45px; height: 1123px; position: relative; box-sizing: border-box;">
      <div style="text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">休暇申請書</h1>
      </div>

      <div style="text-align: right; margin-bottom: 15px; font-size: 12px;">
        申請日: ${data.application_date || ''}
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">申請者情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">氏名: ${data.applicant_name || ''}</p>
          <p style="margin: 4px 0;">部署: ${data.department || ''}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">休暇情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">休暇種別: ${leaveTypeMap[data.leave_type] || data.leave_type}</p>
          <p style="margin: 4px 0;">開始日: ${data.start_date || ''} (${durationMap[data.start_duration] || '終日'})</p>
          <p style="margin: 4px 0;">終了日: ${data.end_date || ''} (${durationMap[data.end_duration] || '終日'})</p>
          <p style="margin: 4px 0;">日数: ${data.days || 0}日${data.hours ? ` (${data.hours}時間)` : ''}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">理由</h3>
        <div style="margin-top: 8px; font-size: 12px; min-height: 80px; max-height: 80px; overflow: hidden;">
          <p style="margin: 4px 0; white-space: pre-wrap; line-height: 1.6;">${data.reason || ''}</p>
        </div>
      </div>

      ${data.handover_notes ? `
      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">引継事項</h3>
        <div style="margin-top: 8px; font-size: 12px; min-height: 70px; max-height: 70px; overflow: hidden;">
          <p style="margin: 4px 0; white-space: pre-wrap; line-height: 1.6;">${data.handover_notes}</p>
        </div>
      </div>
      ` : ''}

      <div style="position: absolute; bottom: 45px; left: 45px; right: 45px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0 0 12px 0;">承認欄</h3>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">上長承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">部長承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(tempDiv)

  try {
    await generatePDFFromHTML('leave-request-pdf-temp', `休暇申請書_${data.applicant_name || '未入力'}_${data.start_date}.pdf`)
  } finally {
    document.body.removeChild(tempDiv)
  }
}

/**
 * 時間外労働申請書用のPDF生成
 */
export const generateOvertimeRequestPDFFromHTML = async (data: any) => {
  const tempDiv = document.createElement('div')
  tempDiv.id = 'overtime-request-pdf-temp'
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.width = '794px'
  tempDiv.style.height = '1123px'
  tempDiv.style.padding = '0'
  tempDiv.style.backgroundColor = 'white'
  tempDiv.style.fontFamily = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'

  tempDiv.innerHTML = `
    <div style="border: 2px solid #000; padding: 45px; height: 1123px; position: relative; box-sizing: border-box;">
      <div style="text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">時間外労働申請書</h1>
      </div>

      <div style="text-align: right; margin-bottom: 15px; font-size: 12px;">
        申請日: ${data.application_date || new Date().toLocaleDateString('ja-JP')}
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">申請者情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">氏名: ${data.applicant_name || ''}</p>
          <p style="margin: 4px 0;">部署: ${data.department || ''}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">作業情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">作業日: ${data.work_date || ''}</p>
          <p style="margin: 4px 0;">開始時刻: ${data.start_time || ''}</p>
          <p style="margin: 4px 0;">終了時刻: ${data.end_time || ''}</p>
          <p style="margin: 4px 0;">休憩時間: ${data.break_time || 0}分</p>
          <p style="margin: 4px 0;">作業時間: ${data.total_hours || 0}時間</p>
          ${data.project_name ? `<p style="margin: 4px 0;">プロジェクト名: ${data.project_name}</p>` : ''}
        </div>
      </div>

      ${data.work_content ? `
      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">作業内容</h3>
        <div style="margin-top: 8px; font-size: 12px; min-height: 70px; max-height: 70px; overflow: hidden;">
          <p style="margin: 4px 0; white-space: pre-wrap; line-height: 1.6;">${data.work_content}</p>
        </div>
      </div>
      ` : ''}

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">理由</h3>
        <div style="margin-top: 8px; font-size: 12px; min-height: 70px; max-height: 70px; overflow: hidden;">
          <p style="margin: 4px 0; white-space: pre-wrap; line-height: 1.6;">${data.reason || ''}</p>
        </div>
      </div>

      <div style="position: absolute; bottom: 45px; left: 45px; right: 45px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0 0 12px 0;">承認欄</h3>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">上長承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">部長承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(tempDiv)

  try {
    await generatePDFFromHTML('overtime-request-pdf-temp', `時間外労働申請書_${data.applicant_name || '未入力'}_${data.work_date}.pdf`)
  } finally {
    document.body.removeChild(tempDiv)
  }
}

/**
 * 休日出勤届のPDF生成
 */
export const generateHolidayWorkRequestPDFFromHTML = async (data: any) => {
  const tempDiv = document.createElement('div')
  tempDiv.id = 'holiday-work-request-pdf-temp'
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.width = '794px'
  tempDiv.style.height = '1123px'
  tempDiv.style.padding = '0'
  tempDiv.style.backgroundColor = 'white'
  tempDiv.style.fontFamily = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'

  tempDiv.innerHTML = `
    <div style="border: 2px solid #000; padding: 45px; height: 1123px; position: relative; box-sizing: border-box;">
      <div style="text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">休日出勤届</h1>
      </div>

      <div style="text-align: right; margin-bottom: 15px; font-size: 12px;">
        申請日: ${data.application_date || new Date().toLocaleDateString('ja-JP')}
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">申請者情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">氏名: ${data.applicant_name || ''}</p>
          <p style="margin: 4px 0;">部署: ${data.department || ''}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">出勤情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">出勤日: ${data.work_date || ''}</p>
          <p style="margin: 4px 0;">開始時刻: ${data.start_time || ''}</p>
          <p style="margin: 4px 0;">終了時刻: ${data.end_time || ''}</p>
          <p style="margin: 4px 0;">休憩時間: ${data.break_time || 0}分</p>
          <p style="margin: 4px 0;">代休取得予定日: ${data.compensatory_leave_date || '未定'}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">作業内容</h3>
        <div style="margin-top: 8px; font-size: 12px; min-height: 70px; max-height: 70px; overflow: hidden;">
          <p style="margin: 4px 0; white-space: pre-wrap; line-height: 1.6;">${data.work_content || ''}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">理由</h3>
        <div style="margin-top: 8px; font-size: 12px; min-height: 70px; max-height: 70px; overflow: hidden;">
          <p style="margin: 4px 0; white-space: pre-wrap; line-height: 1.6;">${data.reason || ''}</p>
        </div>
      </div>

      <div style="position: absolute; bottom: 45px; left: 45px; right: 45px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0 0 12px 0;">承認欄</h3>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">上長承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">部長承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(tempDiv)

  try {
    await generatePDFFromHTML('holiday-work-request-pdf-temp', `休日出勤届_${data.applicant_name || '未入力'}_${data.work_date}.pdf`)
  } finally {
    document.body.removeChild(tempDiv)
  }
}

/**
 * 仮払金申請書のPDF生成
 */
export const generateAdvancePaymentPDFFromHTML = async (data: any) => {
  const tempDiv = document.createElement('div')
  tempDiv.id = 'advance-payment-pdf-temp'
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.width = '794px'
  tempDiv.style.height = '1123px'
  tempDiv.style.padding = '0'
  tempDiv.style.backgroundColor = 'white'
  tempDiv.style.fontFamily = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'

  tempDiv.innerHTML = `
    <div style="border: 2px solid #000; padding: 45px; height: 1123px; position: relative; box-sizing: border-box;">
      <div style="text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">仮払金申請書</h1>
      </div>

      <div style="text-align: right; margin-bottom: 15px; font-size: 12px;">
        申請日: ${data.application_date || ''}
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">申請者情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">氏名: ${data.applicant_name || ''}</p>
          <p style="margin: 4px 0;">現場名: ${data.site_name || ''}</p>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">仮払金情報</h3>
        <div style="margin-top: 15px; text-align: center;">
          <p style="margin: 0; font-size: 20px; font-weight: bold;">仮払金額: ¥${(data.request_amount || 0).toLocaleString()}</p>
        </div>
        ${data.received_date ? `
        <div style="margin-top: 10px; font-size: 12px;">
          <p style="margin: 4px 0;">受領日: ${data.received_date}</p>
        </div>
        ` : ''}
      </div>

      ${data.purpose ? `
      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">用途</h3>
        <div style="margin-top: 8px; font-size: 12px; min-height: 100px; max-height: 100px; overflow: hidden;">
          <p style="margin: 4px 0; white-space: pre-wrap; line-height: 1.6;">${data.purpose}</p>
        </div>
      </div>
      ` : ''}

      <div style="position: absolute; bottom: 45px; left: 45px; right: 45px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0 0 12px 0;">承認欄</h3>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">上長承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">経理承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(tempDiv)

  try {
    await generatePDFFromHTML('advance-payment-pdf-temp', `仮払金申請書_${data.applicant_name || '未入力'}_${data.application_date}.pdf`)
  } finally {
    document.body.removeChild(tempDiv)
  }
}

/**
 * 立替金申請書のPDF生成
 */
export const generateReimbursementPDFFromHTML = async (data: any) => {
  const tempDiv = document.createElement('div')
  tempDiv.id = 'reimbursement-pdf-temp'
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.width = '794px'
  tempDiv.style.height = '1123px'
  tempDiv.style.padding = '0'
  tempDiv.style.backgroundColor = 'white'
  tempDiv.style.fontFamily = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'

  let tableRows = ''
  if (data.expense_lines && data.expense_lines.length > 0) {
    tableRows = data.expense_lines.map((line: any) => `
      <tr>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${line.date || ''}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${line.item || ''}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${line.site_name || ''}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${line.tax_type || ''}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px; text-align: right;">¥${(line.amount || 0).toLocaleString()}</td>
      </tr>
    `).join('')
  }

  tempDiv.innerHTML = `
    <div style="border: 2px solid #000; padding: 45px; height: 1123px; position: relative; box-sizing: border-box;">
      <div style="text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">立替金申請書</h1>
      </div>

      <div style="text-align: right; margin-bottom: 15px; font-size: 12px;">
        申請日: ${data.application_date || ''}
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">申請者情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">氏名: ${data.applicant_name || ''}</p>
          <p style="margin: 4px 0;">現場名: ${data.site_name || ''}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">立替金明細</h3>
        <table style="width: 100%; margin-top: 8px; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">日付</th>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">項目</th>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">現場名</th>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">税区分</th>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">金額</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div style="margin-top: 10px; text-align: right; font-size: 14px; font-weight: bold;">
          合計金額: ¥${(data.total_amount || 0).toLocaleString()}
        </div>
      </div>

      <div style="position: absolute; bottom: 45px; left: 45px; right: 45px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0 0 12px 0;">承認欄</h3>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">上長承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">経理承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(tempDiv)

  try {
    await generatePDFFromHTML('reimbursement-pdf-temp', `立替金申請書_${data.applicant_name || '未入力'}_${data.application_date}.pdf`)
  } finally {
    document.body.removeChild(tempDiv)
  }
}

/**
 * 仮払金精算書のPDF生成
 */
export const generateSettlementPDFFromHTML = async (data: any) => {
  const tempDiv = document.createElement('div')
  tempDiv.id = 'settlement-pdf-temp'
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.width = '794px'
  tempDiv.style.height = '1123px'
  tempDiv.style.padding = '0'
  tempDiv.style.backgroundColor = 'white'
  tempDiv.style.fontFamily = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'

  let tableRows = ''
  if (data.expense_lines && data.expense_lines.length > 0) {
    tableRows = data.expense_lines.map((line: any) => `
      <tr>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${line.date || ''}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${line.item || ''}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${line.site_name || ''}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px;">${line.tax_type || ''}</td>
        <td style="border: 1px solid #000; padding: 6px; font-size: 10px; text-align: right;">¥${(line.amount || 0).toLocaleString()}</td>
      </tr>
    `).join('')
  }

  const balance = (data.advance_payment_amount || 0) - (data.total_amount || 0)
  const balanceText = balance >= 0 ? `返金額: ¥${balance.toLocaleString()}` : `追加支払額: ¥${Math.abs(balance).toLocaleString()}`

  tempDiv.innerHTML = `
    <div style="border: 2px solid #000; padding: 45px; height: 1123px; position: relative; box-sizing: border-box;">
      <div style="text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">仮払金精算書</h1>
      </div>

      <div style="text-align: right; margin-bottom: 15px; font-size: 12px;">
        精算日: ${data.settlement_date || ''}
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">申請者情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">氏名: ${data.applicant_name || ''}</p>
          <p style="margin: 4px 0;">現場名: ${data.site_name || ''}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">仮払金情報</h3>
        <div style="margin-top: 8px; font-size: 12px;">
          <p style="margin: 4px 0;">申請日: ${data.application_date || ''}</p>
          <p style="margin: 4px 0; font-size: 14px; font-weight: bold;">仮払金額: ¥${(data.advance_payment_amount || 0).toLocaleString()}</p>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0;">精算明細</h3>
        <table style="width: 100%; margin-top: 8px; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">日付</th>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">項目</th>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">現場名</th>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">税区分</th>
              <th style="border: 1px solid #000; padding: 6px; font-size: 11px; background-color: #f0f0f0;">金額</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div style="margin-top: 10px; text-align: right; font-size: 13px;">
          <p style="margin: 4px 0; font-weight: bold;">精算合計: ¥${(data.total_amount || 0).toLocaleString()}</p>
          <p style="margin: 4px 0; font-weight: bold; color: ${balance >= 0 ? '#0066cc' : '#cc0000'};">${balanceText}</p>
        </div>
      </div>

      <div style="position: absolute; bottom: 45px; left: 45px; right: 45px;">
        <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 0 0 12px 0;">承認欄</h3>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">上長承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
          <div style="flex: 1; border: 1px solid #000; padding: 12px; height: 90px; position: relative;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">経理承認</p>
            <p style="margin: 4px 0; font-size: 11px;">承認日: _______________</p>
            <p style="margin: 4px 0; font-size: 11px;">氏名: _______________</p>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">印</div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(tempDiv)

  try {
    await generatePDFFromHTML('settlement-pdf-temp', `仮払金精算書_${data.applicant_name || '未入力'}_${data.settlement_date}.pdf`)
  } finally {
    document.body.removeChild(tempDiv)
  }
}
