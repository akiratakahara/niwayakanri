'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'

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
    expense_type: 'advance',
    purpose: '',
    total_amount: 0,
    vendor: '',
    occurred_date: ''
  })

  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([
    {
      account_code: '',
      account_name: '',
      tax_type: 'included',
      amount: 0,
      description: ''
    }
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.createExpenseRequest({
        ...formData,
        expense_lines: expenseLines
      })
      console.log('仮払・立替申請作成成功:', response)
      router.push('/dashboard')
    } catch (err) {
      setError('仮払・立替申請の作成に失敗しました。')
      console.error('Expense request error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'total_amount' ? parseFloat(value) || 0 : value
    }))
  }

  const handleLineChange = (index: number, field: keyof ExpenseLine, value: string | number) => {
    const newLines = [...expenseLines]
    newLines[index] = {
      ...newLines[index],
      [field]: value
    }
    setExpenseLines(newLines)
    
    // 合計金額を再計算
    const total = newLines.reduce((sum, line) => sum + (line.amount || 0), 0)
    setFormData(prev => ({ ...prev, total_amount: total }))
  }

  const addExpenseLine = () => {
    setExpenseLines([...expenseLines, {
      account_code: '',
      account_name: '',
      tax_type: 'included',
      amount: 0,
      description: ''
    }])
  }

  const removeExpenseLine = (index: number) => {
    if (expenseLines.length > 1) {
      const newLines = expenseLines.filter((_, i) => i !== index)
      setExpenseLines(newLines)
      
      // 合計金額を再計算
      const total = newLines.reduce((sum, line) => sum + (line.amount || 0), 0)
      setFormData(prev => ({ ...prev, total_amount: total }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">仮払・立替申請</h1>
              <p className="text-gray-600">仮払金・立替金の申請</p>
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
              <p className="card-description">仮払・立替の詳細を入力してください</p>
            </div>
            <div className="card-content">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 申請種別 */}
                <div>
                  <label htmlFor="expense_type" className="label">申請種別</label>
                  <select
                    id="expense_type"
                    name="expense_type"
                    value={formData.expense_type}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="advance">仮払金申請</option>
                    <option value="reimbursement">立替金精算</option>
                  </select>
                </div>

                {/* 目的・金額・発生日 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="purpose" className="label">目的</label>
                    <input
                      type="text"
                      id="purpose"
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      className="input"
                      placeholder="申請の目的を入力してください"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="occurred_date" className="label">発生日</label>
                    <input
                      type="date"
                      id="occurred_date"
                      name="occurred_date"
                      value={formData.occurred_date}
                      onChange={handleChange}
                      className="input"
                      required
                    />
                  </div>
                </div>

                {/* 取引先・合計金額 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="vendor" className="label">取引先（オプション）</label>
                    <input
                      type="text"
                      id="vendor"
                      name="vendor"
                      value={formData.vendor}
                      onChange={handleChange}
                      className="input"
                      placeholder="取引先名を入力してください"
                    />
                  </div>
                  <div>
                    <label htmlFor="total_amount" className="label">合計金額（円）</label>
                    <input
                      type="number"
                      id="total_amount"
                      name="total_amount"
                      value={formData.total_amount}
                      onChange={handleChange}
                      className="input"
                      min="0"
                      step="1"
                      readOnly
                    />
                    <p className="text-sm text-gray-500 mt-1">明細の合計金額（自動計算）</p>
                  </div>
                </div>

                {/* 明細行 */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">明細</h3>
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
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <label className="label">科目コード</label>
                            <input
                              type="text"
                              value={line.account_code}
                              onChange={(e) => handleLineChange(index, 'account_code', e.target.value)}
                              className="input"
                              placeholder="例: 5210"
                            />
                          </div>
                          <div>
                            <label className="label">科目名</label>
                            <input
                              type="text"
                              value={line.account_name}
                              onChange={(e) => handleLineChange(index, 'account_name', e.target.value)}
                              className="input"
                              placeholder="例: 旅費交通費"
                            />
                          </div>
                          <div>
                            <label className="label">税区分</label>
                            <select
                              value={line.tax_type}
                              onChange={(e) => handleLineChange(index, 'tax_type', e.target.value)}
                              className="input"
                            >
                              <option value="included">税込</option>
                              <option value="excluded">税抜</option>
                              <option value="free">非課税</option>
                            </select>
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
                            />
                          </div>
                          <div className="flex items-end">
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
                        <div className="mt-4">
                          <label className="label">備考</label>
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                            className="input"
                            placeholder="明細の詳細を入力してください"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 承認フロー表示 */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">承認フロー</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>金額に応じた承認フロー:</p>
                        <ul className="list-disc list-inside mt-1">
                          <li>〜10万円: 上長承認</li>
                          <li>10〜30万円: 上長 → 経理部長</li>
                          <li>30万円超: 上長 → 経理部長 → 役員</li>
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



