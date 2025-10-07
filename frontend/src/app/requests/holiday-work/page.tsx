'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { generateHolidayWorkRequestPDFFromHTML } from '@/lib/pdf-generator-html'

export default function HolidayWorkRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    application_date: new Date().toISOString().split('T')[0],
    applicant_name: '',
    work_date: '',
    holiday_type: 'sunday',
    work_duration: 'full',
    work_reasons: [] as string[],
    work_reason_detail: '',
    compensatory_leave: 'no',
    compensatory_leave_date: '',
    compensatory_leave_duration: 'full',
    work_location: '',
    work_content: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // バックエンドが期待するネスト構造に変換
      const requestData = {
        holiday_work_request: formData
      }
      const response = await apiClient.createHolidayWorkRequest(requestData)
      console.log('休日出勤申請作成成功:', response)
      router.push('/dashboard')
    } catch (err) {
      setError('休日出勤申請の作成に失敗しました。')
      console.error('Holiday work request error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleReasonCheckbox = (reason: string) => {
    setFormData(prev => {
      const isChecked = prev.work_reasons.includes(reason)
      const newReasons = isChecked
        ? prev.work_reasons.filter(r => r !== reason)
        : [...prev.work_reasons, reason]
      return {
        ...prev,
        work_reasons: newReasons
      }
    })
  }

  const handleDownloadPDF = async () => {
    try {
      await generateHolidayWorkRequestPDFFromHTML(formData)
    } catch (error) {
      console.error('PDF生成エラー:', error)
      alert('PDFの生成に失敗しました')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">休日出勤届</h1>
              <p className="text-gray-600">土曜日・日曜日・祝祭日の出勤申請</p>
            </div>
            <Link href="/dashboard" className="btn btn-secondary">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">申請内容</h2>
              <p className="card-description">休日出勤の詳細を入力してください</p>
            </div>
            <div className="card-content">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 申請日・申請者 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="application_date" className="label">申請日</label>
                    <input
                      type="date"
                      id="application_date"
                      name="application_date"
                      value={formData.application_date}
                      onChange={handleChange}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="applicant_name" className="label">申請者氏名</label>
                    <input
                      type="text"
                      id="applicant_name"
                      name="applicant_name"
                      value={formData.applicant_name}
                      onChange={handleChange}
                      className="input"
                      placeholder="佐藤一郎"
                      required
                    />
                  </div>
                </div>

                {/* 出勤日・休日の種類 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="work_date" className="label">出勤日</label>
                    <input
                      type="date"
                      id="work_date"
                      name="work_date"
                      value={formData.work_date}
                      onChange={handleChange}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="holiday_type" className="label">休日の種類</label>
                    <select
                      id="holiday_type"
                      name="holiday_type"
                      value={formData.holiday_type}
                      onChange={handleChange}
                      className="input"
                      required
                    >
                      <option value="saturday">土曜日</option>
                      <option value="sunday">日曜日</option>
                      <option value="holiday">祝祭日</option>
                    </select>
                  </div>
                </div>

                {/* 出勤時間 */}
                <div>
                  <label htmlFor="work_duration" className="label">出勤時間</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="work_duration"
                        value="full"
                        checked={formData.work_duration === 'full'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      1日
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="work_duration"
                        value="half"
                        checked={formData.work_duration === 'half'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      半日
                    </label>
                  </div>
                </div>

                {/* 出勤の事由 */}
                <div>
                  <label className="label">出勤の事由（複数選択可）</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.work_reasons.includes('company_instruction')}
                        onChange={() => handleReasonCheckbox('company_instruction')}
                        className="mr-2"
                      />
                      ① 会社からの指示による
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.work_reasons.includes('site_necessity')}
                        onChange={() => handleReasonCheckbox('site_necessity')}
                        className="mr-2"
                      />
                      ② 現場事情により作業等が必要な為
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.work_reasons.includes('compensatory_work')}
                        onChange={() => handleReasonCheckbox('compensatory_work')}
                        className="mr-2"
                      />
                      ③ その他（取得代休の振替出勤等）
                    </label>
                  </div>
                </div>

                {/* 出勤理由の詳細 */}
                <div>
                  <label htmlFor="work_reason_detail" className="label">出勤理由の詳細</label>
                  <textarea
                    id="work_reason_detail"
                    name="work_reason_detail"
                    value={formData.work_reason_detail}
                    onChange={handleChange}
                    className="input"
                    rows={3}
                    placeholder="出勤が必要な理由を詳しく記入してください"
                    required
                  />
                </div>

                {/* 現場名・作業内容 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="work_location" className="label">現場名等</label>
                    <input
                      type="text"
                      id="work_location"
                      name="work_location"
                      value={formData.work_location}
                      onChange={handleChange}
                      className="input"
                      placeholder="現場名を入力してください"
                    />
                  </div>
                  <div>
                    <label htmlFor="work_content" className="label">作業内容</label>
                    <input
                      type="text"
                      id="work_content"
                      name="work_content"
                      value={formData.work_content}
                      onChange={handleChange}
                      className="input"
                      placeholder="作業内容を入力してください"
                    />
                  </div>
                </div>

                {/* 代休取得の有無 */}
                <div>
                  <label className="label">代休取得の有・無</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="compensatory_leave"
                        value="yes"
                        checked={formData.compensatory_leave === 'yes'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      有
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="compensatory_leave"
                        value="no"
                        checked={formData.compensatory_leave === 'no'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      無
                    </label>
                  </div>
                </div>

                {/* 代休希望日（有の場合のみ表示） */}
                {formData.compensatory_leave === 'yes' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="compensatory_leave_date" className="label">代休希望年月日</label>
                      <input
                        type="date"
                        id="compensatory_leave_date"
                        name="compensatory_leave_date"
                        value={formData.compensatory_leave_date}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                    <div>
                      <label htmlFor="compensatory_leave_duration" className="label">代休取得時間</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="compensatory_leave_duration"
                            value="full"
                            checked={formData.compensatory_leave_duration === 'full'}
                            onChange={handleChange}
                            className="mr-2"
                          />
                          1日
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="compensatory_leave_duration"
                            value="half"
                            checked={formData.compensatory_leave_duration === 'half'}
                            onChange={handleChange}
                            className="mr-2"
                          />
                          半日
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="compensatory_leave_duration"
                            value="undecided"
                            checked={formData.compensatory_leave_duration === 'undecided'}
                            onChange={handleChange}
                            className="mr-2"
                          />
                          未定
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 注意事項 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">注意事項</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <div className="space-y-2">
                          <div>
                            <strong>出勤事由が①の場合:</strong> 原則として出勤日の前日までに提出すること。前日までの提出が困難な場合は、出勤日の翌日までに提出すること。
                          </div>
                          <div>
                            <strong>出勤事由が②の場合:</strong> 事前に社長又は専務に連絡のうえ了承を得てから提出することとし、原則として出勤日の前日までに提出すること。なお、前日までの提出が困難な場合は、出勤日の翌日までに提出すること。
                          </div>
                          <div>
                            <strong>出勤事由が③の場合:</strong> 事前に社長又は専務と出勤理由について協議し了承を得てから提出することとし、原則として出勤日の1週間前までに提出すること。なお、困難な場合は、遅くとも出勤日の前日までに提出すること。
                          </div>
                          <div>
                            <strong>代休の取得を希望する場合:</strong> (3)の欄の「有」を○で囲み、代休希望日を下段に記入する。希望しない場合は「無」を○で囲む。
                          </div>
                          <div>
                            <strong>代休の先行取得に伴う休日出勤届の場合:</strong> (2)事由の欄③を○で囲み「取得代休の振替出勤」と記載し、様式-1の「休暇届」を同時に提出すること。
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 提出先 */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">提出先</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>NIWAYAホールディングス(株) 千葉幸子 ・鈴木聖子</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* エラーメッセージ */}
                {error && (
                  <div className="text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* ボタン */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="btn btn-outline"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDFダウンロード
                  </button>
                  <Link href="/dashboard" className="btn btn-secondary">
                    キャンセル
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? '申請中...' : '申請する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
