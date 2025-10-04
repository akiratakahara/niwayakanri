'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { generateSettlementPDFFromHTML } from '@/lib/pdf-generator-html'

interface ExpenseLine {
  date: string
  item: string
  site_name: string
  tax_type: string
  amount: number
}

interface AdvancePayment {
  id: string
  applicant_name: string
  site_name: string
  request_amount: number
  application_date: string
  received_date?: string
}

function ExpenseSettlementContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get('requestId')

  const [loading, setLoading] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [error, setError] = useState('')
  const [approvedRequests, setApprovedRequests] = useState<AdvancePayment[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string>(requestId || '')

  const [formData, setFormData] = useState({
    settlement_date: '',
    advance_payment_amount: 0,
    applicant_name: '',
    site_name: '',
    application_date: '',
    received_date: ''
  })

  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([
    {
      date: '',
      item: '',
      site_name: '',
      tax_type: 'included',
      amount: 0
    }
  ])

  // 承認済み仮払金申請一覧を取得
  useEffect(() => {
    const fetchApprovedRequests = async () => {
      setLoadingRequests(true)
      try {
        const requests = await apiClient.getRequests()
        // 承認済みで未精算の仮払金申請のみをフィルタ
        const approved = requests.filter((r: any) =>
          r.type === 'expense' &&
          r.status === 'approved' &&
          !r.is_settled
        )
        setApprovedRequests(approved)
      } catch (err) {
        console.error('Failed to fetch approved requests:', err)
      } finally {
        setLoadingRequests(false)
      }
    }

    fetchApprovedRequests()
  }, [])

  // 申請を選択したときに自動入力
  useEffect(() => {
    if (selectedRequestId) {
      const selected = approvedRequests.find(r => r.id === selectedRequestId)
      if (selected) {
        setFormData(prev => ({
          ...prev,
          applicant_name: selected.applicant_name || '',
          site_name: selected.site_name || '',
          advance_payment_amount: selected.request_amount || 0,
          application_date: selected.application_date || '',
          received_date: selected.received_date || ''
        }))
      }
    }
  }, [selectedRequestId, approvedRequests])

  const calculateTotals = () => {
    const total = expenseLines.reduce((sum, line) => sum + (line.amount || 0), 0)
    const balance = (formData.advance_payment_amount || 0) - total
    return { total, balance }
  }

  const { total, balance } = calculateTotals()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRequestId) {
      setError('仮払金申請を選択してください')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiClient.createExpenseRequest({
        expense_type: 'settlement',
        advance_payment_request_id: selectedRequestId,
        ...formData,
        expense_lines: expenseLines,
        total_amount: total,
        balance_amount: balance
      })
      console.log('仮払金精算作成成功:', response)
      router.push('/dashboard')
    } catch (err) {
      setError('仮払金精算の作成に失敗しました。')
      console.error('Expense settlement error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'advance_payment_amount' ? parseFloat(value) || 0 : value
    }))
  }

  const handleLineChange = (index: number, field: keyof ExpenseLine, value: string | number) => {
    const newLines = [...expenseLines]
    newLines[index] = {
      ...newLines[index],
      [field]: value
    }
    setExpenseLines(newLines)
  }

  const addExpenseLine = () => {
    setExpenseLines([...expenseLines, {
      date: '',
      item: '',
      site_name: '',
      tax_type: 'included',
      amount: 0
    }])
  }

  const removeExpenseLine = (index: number) => {
    if (expenseLines.length > 1) {
      const newLines = expenseLines.filter((_, i) => i !== index)
      setExpenseLines(newLines)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await generateSettlementPDFFromHTML({
        ...formData,
        expense_lines: expenseLines,
        total_amount: total,
        balance_amount: balance
      })
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
              <h1 className="text-3xl font-bold text-gray-900">仮払金精算書</h1>
              <p className="text-gray-600">仮払金の精算（管理者専用）</p>
            </div>
            <Link href="/dashboard" className="btn btn-secondary">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">精算内容</h2>
              <p className="card-description">承認済み仮払金申請を選択して精算書を作成してください</p>
            </div>
            <div className="card-content">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 仮払金申請選択 */}
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <label htmlFor="advance_payment_request" className="label text-blue-900 font-semibold">
                    仮払金申請を選択 <span className="text-red-600">*</span>
                  </label>
                  {loadingRequests ? (
                    <p className="text-sm text-gray-600">読み込み中...</p>
                  ) : approvedRequests.length === 0 ? (
                    <p className="text-sm text-amber-600">承認済みの仮払金申請がありません</p>
                  ) : (
                    <select
                      id="advance_payment_request"
                      value={selectedRequestId}
                      onChange={(e) => setSelectedRequestId(e.target.value)}
                      className="input mt-2"
                      required
                    >
                      <option value="">選択してください</option>
                      {approvedRequests.map((request) => (
                        <option key={request.id} value={request.id}>
                          【{request.application_date}】{request.applicant_name} - {request.site_name} - ¥{request.request_amount.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedRequestId && (
                  <>
                    {/* 申請情報表示（自動入力） */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">申請情報</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">申請者:</span>
                          <span className="ml-2 font-medium">{formData.applicant_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">現場名:</span>
                          <span className="ml-2 font-medium">{formData.site_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">申請金額:</span>
                          <span className="ml-2 font-medium">¥{formData.advance_payment_amount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">申請日:</span>
                          <span className="ml-2 font-medium">{formData.application_date}</span>
                        </div>
                        {formData.received_date && (
                          <div>
                            <span className="text-gray-600">受領日:</span>
                            <span className="ml-2 font-medium">{formData.received_date}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 精算期日 */}
                    <div>
                      <label htmlFor="settlement_date" className="label">精算期日</label>
                      <input
                        type="date"
                        id="settlement_date"
                        name="settlement_date"
                        value={formData.settlement_date}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>

                    {/* 明細行 */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">仮払金精算書（明細）</h3>
                        <button
                          type="button"
                          onClick={addExpenseLine}
                          className="btn btn-sm btn-primary"
                        >
                          明細を追加
                        </button>
                      </div>

                      <div className="space-y-4">
                        {expenseLines.map((line, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                              <div>
                                <label className="label">日付</label>
                                <input
                                  type="date"
                                  value={line.date}
                                  onChange={(e) => handleLineChange(index, 'date', e.target.value)}
                                  className="input"
                                  required
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="label">品目</label>
                                <input
                                  type="text"
                                  value={line.item}
                                  onChange={(e) => handleLineChange(index, 'item', e.target.value)}
                                  className="input"
                                  placeholder="例: ゴミ代"
                                  required
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="label">現場名（申請の現場名と異なる場合のみ記入）</label>
                                <input
                                  type="text"
                                  value={line.site_name}
                                  onChange={(e) => handleLineChange(index, 'site_name', e.target.value)}
                                  className="input"
                                  placeholder="現場名"
                                />
                              </div>
                              <div>
                                <label className="label">金額（円）</label>
                                <input
                                  type="number"
                                  value={line.amount}
                                  onChange={(e) => handleLineChange(index, 'amount', parseFloat(e.target.value) || 0)}
                                  className="input"
                                  min="0"
                                  step="1"
                                  required
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-4">
                              <div className="flex-1">
                                <label className="label">税区分</label>
                                <select
                                  value={line.tax_type}
                                  onChange={(e) => handleLineChange(index, 'tax_type', e.target.value)}
                                  className="input max-w-xs"
                                >
                                  <option value="included">税込</option>
                                  <option value="excluded">税抜</option>
                                  <option value="free">非課税</option>
                                </select>
                              </div>
                              {expenseLines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeExpenseLine(index)}
                                  className="btn btn-sm btn-error"
                                >
                                  削除
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 合計・残額表示 */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">仮払金（申請金額）</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ¥{formData.advance_payment_amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">小計（使用金額）</p>
                          <p className="text-2xl font-bold text-blue-600">
                            ¥{total.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">残額（申請金額-合計）</p>
                          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ¥{balance.toLocaleString()}
                          </p>
                          {balance < 0 && (
                            <p className="text-xs text-red-600 mt-1">※超過分は別途精算が必要です</p>
                          )}
                        </div>
                      </div>
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
                          <h3 className="text-sm font-medium text-yellow-800">精算時の注意事項</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <ul className="list-disc list-inside space-y-1">
                              <li>領収書など支払いを証明する書類を確認してください</li>
                              <li>現場名が申請時と異なる場合は必ず記入してください</li>
                              <li>残額がある場合は返金手続きを行ってください</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* エラーメッセージ */}
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
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
                    disabled={loading || !selectedRequestId}
                    className="btn btn-primary"
                  >
                    {loading ? '申請中...' : '精算申請する'}
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

export default function ExpenseSettlementPage() {
  return (
    <RequireAdmin>
      <ExpenseSettlementContent />
    </RequireAdmin>
  )
}
