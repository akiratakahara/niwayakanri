'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'

export default function LeaveRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    application_date: new Date().toISOString().split('T')[0],
    applicant_name: '',
    leave_type: 'paid',
    start_date: '',
    end_date: '',
    start_duration: 'full',
    end_duration: 'full',
    days: 1,
    hours: 0,
    reason: '',
    handover_notes: '',
    compensatory_work_date: '',
    compensatory_work_undecided: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.createLeaveRequest(formData)
      console.log('休暇申請作成成功:', response)
      router.push('/dashboard')
    } catch (err) {
      setError('休暇申請の作成に失敗しました。')
      console.error('Leave request error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'days' || name === 'hours' ? parseFloat(value) || 0 : value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">休暇申請</h1>
              <p className="text-gray-600">有給・代休・特別休暇の申請</p>
            </div>
            <Link href="/dashboard" className="btn btn-secondary">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">申請内容</h2>
              <p className="card-description">休暇の詳細を入力してください</p>
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

                {/* 休暇の種類 */}
                <div>
                  <label className="label">(2) 休暇の種類（いずれか○で囲む）</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="leave_type"
                        value="paid"
                        checked={formData.leave_type === 'paid'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      有給休暇
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="leave_type"
                        value="compensatory"
                        checked={formData.leave_type === 'compensatory'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      代休
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="leave_type"
                        value="compensatory_advance"
                        checked={formData.leave_type === 'compensatory_advance'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      代休先行取得
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="leave_type"
                        value="sick"
                        checked={formData.leave_type === 'sick'}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      欠勤
                    </label>
                  </div>
                </div>

                {/* 休暇希望日 */}
                <div>
                  <label className="label">(1) 休暇希望日</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="start_date" className="label">自</label>
                      <div className="flex space-x-2">
                        <input
                          type="date"
                          id="start_date"
                          name="start_date"
                          value={formData.start_date}
                          onChange={handleChange}
                          className="input flex-1"
                          required
                        />
                        <div className="flex space-x-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="start_duration"
                              value="full"
                              checked={formData.start_duration === 'full'}
                              onChange={handleChange}
                              className="mr-1"
                            />
                            1日
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="start_duration"
                              value="half"
                              checked={formData.start_duration === 'half'}
                              onChange={handleChange}
                              className="mr-1"
                            />
                            半日
                          </label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="end_date" className="label">至</label>
                      <div className="flex space-x-2">
                        <input
                          type="date"
                          id="end_date"
                          name="end_date"
                          value={formData.end_date}
                          onChange={handleChange}
                          className="input flex-1"
                          required
                        />
                        <div className="flex space-x-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="end_duration"
                              value="full"
                              checked={formData.end_duration === 'full'}
                              onChange={handleChange}
                              className="mr-1"
                            />
                            1日
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="end_duration"
                              value="half"
                              checked={formData.end_duration === 'half'}
                              onChange={handleChange}
                              className="mr-1"
                            />
                            半日
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 日数・時間 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="days" className="label">日数</label>
                    <input
                      type="number"
                      id="days"
                      name="days"
                      value={formData.days}
                      onChange={handleChange}
                      className="input"
                      min="0.5"
                      max="30"
                      step="0.5"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">0.5日 = 4時間、1日 = 8時間</p>
                  </div>
                  <div>
                    <label htmlFor="hours" className="label">時間（オプション）</label>
                    <input
                      type="number"
                      id="hours"
                      name="hours"
                      value={formData.hours}
                      onChange={handleChange}
                      className="input"
                      min="0"
                      max="8"
                      step="0.5"
                    />
                    <p className="text-sm text-gray-500 mt-1">時間単位での申請（1時間単位）</p>
                  </div>
                </div>

                {/* 理由 */}
                <div>
                  <label htmlFor="reason" className="label">理由</label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="input"
                    rows={3}
                    placeholder="休暇を取得する理由を入力してください"
                    required
                  />
                </div>

                {/* 代休の場合の振替出勤日 */}
                {(formData.leave_type === 'compensatory' || formData.leave_type === 'compensatory_advance') && (
                  <div>
                    <label className="label">(3) 代休の場合振替の出勤日を記入（未定の場合は未定を○で囲む）</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="date"
                        id="compensatory_work_date"
                        name="compensatory_work_date"
                        value={formData.compensatory_work_date}
                        onChange={handleChange}
                        className="input"
                        disabled={formData.compensatory_work_undecided}
                        placeholder="令和 年 月 日 ( 曜)"
                      />
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="compensatory_work_undecided"
                          checked={formData.compensatory_work_undecided}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            compensatory_work_undecided: e.target.checked,
                            compensatory_work_date: e.target.checked ? '' : prev.compensatory_work_date
                          }))}
                          className="mr-2"
                        />
                        未定
                      </label>
                    </div>
                  </div>
                )}

                {/* 引継内容 */}
                <div>
                  <label htmlFor="handover_notes" className="label">引継内容</label>
                  <textarea
                    id="handover_notes"
                    name="handover_notes"
                    value={formData.handover_notes}
                    onChange={handleChange}
                    className="input"
                    rows={4}
                    placeholder="業務の引継ぎ内容を入力してください"
                  />
                </div>

                {/* 注意事項 */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">注意事項</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>原則として1週間前までに、遅くとも前々日までに届け出ること</li>
                          <li>但し、届出が後日となっても取得日を含めた取得日以前の届出日とすること</li>
                          <li>欠勤を有給休暇及び代休に振り替えることができる</li>
                          <li>ともに、休日出勤届（様式－３）を同時に提出すること</li>
                          <li>慶弔時で特別休暇に該当する場合は、本様式によらず様式－２により申請すること</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 提出先 */}
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">提出先</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>NIWAYAホールディングス(株)代表取締役 様</p>
                        <p>株式会社NIWAYA 代表取締役 様</p>
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
