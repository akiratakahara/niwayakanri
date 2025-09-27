'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'

interface Worker {
  name: string
  role: 'operator' | 'user' | 'other'
}

interface Equipment {
  type: string
  number: string
  company: string
}

export default function ConstructionDailyReportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    site_name: '',
    work_location: '',
    work_content: '',
    work_start_time: '',
    work_end_time: '',
    workers: [{ name: '', role: 'other' as const }],
    equipment: [{ type: '', number: '', company: '' }],
    danger_points: '',
    countermeasures: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.createConstructionDailyReport(formData)
      console.log('工事日報作成成功:', response)
      router.push('/dashboard')
    } catch (err) {
      setError('工事日報の作成に失敗しました。')
      console.error('Construction daily report error:', err)
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

  const addWorker = () => {
    setFormData(prev => ({
      ...prev,
      workers: [...prev.workers, { name: '', role: 'other' }]
    }))
  }

  const removeWorker = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workers: prev.workers.filter((_, i) => i !== index)
    }))
  }

  const updateWorker = (index: number, field: keyof Worker, value: string) => {
    setFormData(prev => ({
      ...prev,
      workers: prev.workers.map((worker, i) => 
        i === index ? { ...worker, [field]: value } : worker
      )
    }))
  }

  const addEquipment = () => {
    setFormData(prev => ({
      ...prev,
      equipment: [...prev.equipment, { type: '', number: '', company: '' }]
    }))
  }

  const removeEquipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== index)
    }))
  }

  const updateEquipment = (index: number, field: keyof Equipment, value: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.map((equipment, i) => 
        i === index ? { ...equipment, [field]: value } : equipment
      )
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">工事日報</h1>
              <p className="text-gray-600">現場作業の日報作成</p>
            </div>
            <Link href="/dashboard" className="btn btn-secondary">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">工事日報</h2>
              <p className="card-description">現場作業の詳細を入力してください</p>
            </div>
            <div className="card-content">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 基本情報 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="report_date" className="label">日付</label>
                    <input
                      type="date"
                      id="report_date"
                      name="report_date"
                      value={formData.report_date}
                      onChange={handleChange}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="site_name" className="label">現場名</label>
                    <input
                      type="text"
                      id="site_name"
                      name="site_name"
                      value={formData.site_name}
                      onChange={handleChange}
                      className="input"
                      placeholder="現場名を入力してください"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="work_location" className="label">作業場所</label>
                    <input
                      type="text"
                      id="work_location"
                      name="work_location"
                      value={formData.work_location}
                      onChange={handleChange}
                      className="input"
                      placeholder="作業場所を入力してください"
                      required
                    />
                  </div>
                </div>

                {/* 作業内容・時間 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="work_content" className="label">作業内容</label>
                    <textarea
                      id="work_content"
                      name="work_content"
                      value={formData.work_content}
                      onChange={handleChange}
                      className="input"
                      rows={3}
                      placeholder="実施した作業内容を詳しく記入してください"
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="work_start_time" className="label">作業開始時間</label>
                      <input
                        type="time"
                        id="work_start_time"
                        name="work_start_time"
                        value={formData.work_start_time}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="work_end_time" className="label">作業終了時間</label>
                      <input
                        type="time"
                        id="work_end_time"
                        name="work_end_time"
                        value={formData.work_end_time}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 作業員 */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">作業員</h3>
                    <button
                      type="button"
                      onClick={addWorker}
                      className="btn btn-sm btn-primary"
                    >
                      作業員を追加
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.workers.map((worker, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="label">作業員名</label>
                            <input
                              type="text"
                              value={worker.name}
                              onChange={(e) => updateWorker(index, 'name', e.target.value)}
                              className="input"
                              placeholder="作業員名を入力"
                              required
                            />
                          </div>
                          <div>
                            <label className="label">役割</label>
                            <select
                              value={worker.role}
                              onChange={(e) => updateWorker(index, 'role', e.target.value as Worker['role'])}
                              className="input"
                            >
                              <option value="operator">運転者</option>
                              <option value="user">使用者</option>
                              <option value="other">その他</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            {formData.workers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeWorker(index)}
                                className="btn btn-sm btn-error"
                              >
                                削除
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 機械・車両 */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">機械・車両</h3>
                    <button
                      type="button"
                      onClick={addEquipment}
                      className="btn btn-sm btn-primary"
                    >
                      機械・車両を追加
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.equipment.map((equipment, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="label">機械・車両種別</label>
                            <input
                              type="text"
                              value={equipment.type}
                              onChange={(e) => updateEquipment(index, 'type', e.target.value)}
                              className="input"
                              placeholder="例: 電バリ、2tD、軽トラ等"
                            />
                          </div>
                          <div>
                            <label className="label">番号</label>
                            <input
                              type="text"
                              value={equipment.number}
                              onChange={(e) => updateEquipment(index, 'number', e.target.value)}
                              className="input"
                              placeholder="例: ELT-1、つ47-21等"
                            />
                          </div>
                          <div>
                            <label className="label">会社名</label>
                            <input
                              type="text"
                              value={equipment.company}
                              onChange={(e) => updateEquipment(index, 'company', e.target.value)}
                              className="input"
                              placeholder="会社名を入力"
                            />
                          </div>
                          <div className="flex items-end">
                            {formData.equipment.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEquipment(index)}
                                className="btn btn-sm btn-error"
                              >
                                削除
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 安全対策 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="danger_points" className="label">危険ポイント</label>
                    <textarea
                      id="danger_points"
                      name="danger_points"
                      value={formData.danger_points}
                      onChange={handleChange}
                      className="input"
                      rows={3}
                      placeholder="作業中の危険ポイントを記入してください"
                    />
                  </div>
                  <div>
                    <label htmlFor="countermeasures" className="label">対策案</label>
                    <textarea
                      id="countermeasures"
                      name="countermeasures"
                      value={formData.countermeasures}
                      onChange={handleChange}
                      className="input"
                      rows={3}
                      placeholder="安全対策を記入してください"
                    />
                  </div>
                </div>

                {/* 備考 */}
                <div>
                  <label htmlFor="notes" className="label">備考</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="input"
                    rows={3}
                    placeholder="その他の特記事項があれば記入してください"
                  />
                </div>

                {/* 注意事項 */}
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">安全注意事項</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>養生の徹底</li>
                          <li>保護具の装着</li>
                          <li>声がけ・周囲確認</li>
                          <li>足元確認</li>
                          <li>手順の確認</li>
                          <li>アウトリガー確認等</li>
                        </ul>
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
                    {loading ? '作成中...' : '日報を作成'}
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



