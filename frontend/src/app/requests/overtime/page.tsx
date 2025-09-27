'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'

export default function OvertimeRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    application_date: new Date().toISOString().split('T')[0],
    applicant_name: '',
    department: '',
    work_date: '',
    start_time: '',
    end_time: '',
    break_time: 0,
    total_hours: 0,
    overtime_type: 'overtime',
    reason: '',
    work_content: '',
    project_name: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.createOvertimeRequest(formData)
      console.log('時間外労働申請作成成功:', response)
      router.push('/dashboard')
    } catch (err) {
      setError('時間外労働申請の作成に失敗しました。')
      console.error('Overtime request error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'break_time' || name === 'total_hours' ? parseFloat(value) || 0 : value
    }))
  }

  // 時間計算
  const calculateHours = () => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`)
      const end = new Date(`2000-01-01T${formData.end_time}`)
      const diffMs = end.getTime() - start.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      const totalHours = Math.max(0, diffHours - (formData.break_time || 0))
      
      setFormData(prev => ({
        ...prev,
        total_hours: Math.round(totalHours * 10) / 10
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">時間外労働申請</h1>
              <p className="text-gray-600">残業・早出・休日出勤の申請</p>
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
              <p className="card-description">時間外労働の詳細を入力してください</p>
            </div>
            <div className="card-content">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 申請日・申請者・部署 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <div>
                    <label htmlFor="department" className="label">部署</label>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="input"
                      required
                    >
                      <option value="">選択してください</option>
                      <option value="construction">工事部工事課</option>
                      <option value="landscape">造園事業部管理課</option>
                      <option value="sales">営業部</option>
                      <option value="management">施工管理部管理課</option>
                      <option value="sales_management">施工管理部営業部</option>
                      <option value="general">総務部</option>
                    </select>
                  </div>
                </div>

                {/* 勤務日 */}
                <div>
                  <label htmlFor="work_date" className="label">予定日</label>
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

                {/* 時間外労働種別 */}
                <div>
                  <label htmlFor="overtime_type" className="label">時間外労働種別</label>
                  <select
                    id="overtime_type"
                    name="overtime_type"
                    value={formData.overtime_type}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="early">早出</option>
                    <option value="overtime">残業</option>
                    <option value="holiday">休日出勤</option>
                  </select>
                </div>

                {/* 勤務時間 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="start_time" className="label">開始時間</label>
                    <input
                      type="time"
                      id="start_time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={(e) => {
                        handleChange(e)
                        setTimeout(calculateHours, 100)
                      }}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="end_time" className="label">終了時間</label>
                    <input
                      type="time"
                      id="end_time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={(e) => {
                        handleChange(e)
                        setTimeout(calculateHours, 100)
                      }}
                      className="input"
                      required
                    />
                  </div>
                </div>

                {/* 休憩時間・総時間 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="break_time" className="label">休憩時間（時間）</label>
                    <input
                      type="number"
                      id="break_time"
                      name="break_time"
                      value={formData.break_time}
                      onChange={(e) => {
                        handleChange(e)
                        setTimeout(calculateHours, 100)
                      }}
                      className="input"
                      min="0"
                      max="8"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label htmlFor="total_hours" className="label">総勤務時間（時間）</label>
                    <input
                      type="number"
                      id="total_hours"
                      name="total_hours"
                      value={formData.total_hours}
                      onChange={handleChange}
                      className="input"
                      min="0"
                      max="24"
                      step="0.1"
                      readOnly
                    />
                    <p className="text-sm text-gray-500 mt-1">自動計算されます</p>
                  </div>
                </div>

                {/* 勤務内容 */}
                <div>
                  <label htmlFor="work_content" className="label">勤務内容</label>
                  <textarea
                    id="work_content"
                    name="work_content"
                    value={formData.work_content}
                    onChange={handleChange}
                    className="input"
                    rows={3}
                    placeholder="時間外労働で行う具体的な作業内容を入力してください"
                    required
                  />
                </div>

                {/* 理由 */}
                <div>
                  <label htmlFor="reason" className="label">事由</label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="input"
                    rows={3}
                    placeholder="時間外労働が必要な理由を入力してください"
                    required
                  />
                </div>

                {/* プロジェクト名 */}
                <div>
                  <label htmlFor="project_name" className="label">プロジェクト名（オプション）</label>
                  <input
                    type="text"
                    id="project_name"
                    name="project_name"
                    value={formData.project_name}
                    onChange={handleChange}
                    className="input"
                    placeholder="関連するプロジェクト名を入力してください"
                  />
                </div>

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
                        <ul className="list-disc list-inside space-y-1">
                          <li>残業分の日報を併せて提出すること</li>
                          <li>36協定の範囲内で時間外労働を行うこと</li>
                          <li>事前に上司と時間外労働の必要性について協議すること</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 36協定チェック */}
                {formData.total_hours > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">36協定チェック</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>月45時間・年360時間の上限を確認してください</p>
                          <p>現在の申請時間: {formData.total_hours}時間</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
