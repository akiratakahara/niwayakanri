'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { generateAdvancePaymentPDFFromHTML } from '@/lib/pdf-generator-html'

interface ExpenseLine {
  account_code: string
  account_name: string
  tax_type: string
  amount: number
  description: string
}

export default function ExpenseRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    applicant_name: '',
    site_name: '',
    application_date: new Date().toISOString().split('T')[0],
    request_amount: 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.createExpenseRequest({
        expense_type: 'advance',
        ...formData
      })
      console.log('仮払金申請作成成功:', response)
      router.push('/dashboard')
    } catch (err) {
      setError('仮払金申請の作成に失敗しました。')
      console.error('Advance payment request error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'request_amount' ? parseFloat(value) || 0 : value
    }))
  }

  const handleDownloadPDF = async () => {
    try {
      await generateAdvancePaymentPDFFromHTML(formData)
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
              <h1 className="text-3xl font-bold text-gray-900">仮払金申請</h1>
              <p className="text-gray-600">仮払金の申請</p>
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
              <h2 className="card-title">仮払金申請書</h2>
              <p className="card-description">仮払金の申請内容を入力してください</p>
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
                      placeholder="申請者氏名"
                      required
                    />
                  </div>
                </div>

                {/* 現場名・申請金額 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="site_name" className="label">現場名</label>
                    <input
                      type="text"
                      id="site_name"
                      name="site_name"
                      value={formData.site_name}
                      onChange={handleChange}
                      className="input"
                      placeholder="例: 宮城県立こども病院院内緑地管理業務"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="request_amount" className="label">申請金額（円）</label>
                    <input
                      type="number"
                      id="request_amount"
                      name="request_amount"
                      value={formData.request_amount}
                      onChange={handleChange}
                      className="input"
                      min="0"
                      step="1"
                      placeholder="100000"
                      required
                    />
                  </div>
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
                      <h3 className="text-sm font-medium text-blue-800">仮払金について</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>仮払金を受け取った後は、精算申請が必要です</li>
                          <li>領収書など支払いを証明する書類を保管してください</li>
                          <li>精算期日までに必ず精算を完了してください</li>
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





