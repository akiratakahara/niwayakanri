'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { generateReimbursementPDFFromHTML } from '@/lib/pdf-generator-html'

interface ExpenseLine {
  date: string
  item: string
  site_name: string
  tax_type: string
  amount: number
}

export default function ReimbursementRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const [formData, setFormData] = useState({
    applicant_name: '',
    application_date: new Date().toISOString().split('T')[0],
    site_name: ''
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

  const calculateTotal = () => {
    return expenseLines.reduce((sum, line) => sum + (line.amount || 0), 0)
  }

  const total = calculateTotal()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.createReimbursementRequest({
        ...formData,
        expense_lines: expenseLines,
        total_amount: total
      })
      console.log('立替金申請作成成功:', response)
      router.push('/dashboard')
    } catch (err) {
      setError('立替金申請の作成に失敗しました。')
      console.error('Reimbursement request error:', err)
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setUploadedFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDownloadPDF = async () => {
    try {
      await generateReimbursementPDFFromHTML({
        ...formData,
        expense_lines: expenseLines,
        total_amount: total
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
              <h1 className="text-3xl font-bold text-gray-900">立替金申請</h1>
              <p className="text-gray-600">立替金の申請・精算</p>
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
              <h2 className="card-title">立替金申請書（申請者控）</h2>
              <p className="card-description">自費で立て替えた経費の精算申請</p>
            </div>
            <div className="card-content">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 申請日・申請者・現場名 */}
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
                    <label htmlFor="applicant_name" className="label">申請者</label>
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
                  <div>
                    <label htmlFor="site_name" className="label">現場名</label>
                    <input
                      type="text"
                      id="site_name"
                      name="site_name"
                      value={formData.site_name}
                      onChange={handleChange}
                      className="input"
                      placeholder="現場名"
                      required
                    />
                  </div>
                </div>

                {/* 立替金合計表示 */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">立替金合計</span>
                    <span className="text-2xl font-bold text-blue-900">¥{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* 明細行 */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">立替金内訳（会社控）</h3>
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
                            <label className="label">月日</label>
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
                              placeholder="例: ガソリン代"
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

                {/* ファイルアップロード（領収書） */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">領収書・レシート添付</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            ファイルを選択
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            PNG, JPG, PDF（最大10MB）
                          </span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            multiple
                            accept="image/*,.pdf"
                            onChange={handleFileUpload}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* アップロード済みファイル一覧 */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">添付ファイル ({uploadedFiles.length}件)</h4>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                      <h3 className="text-sm font-medium text-yellow-800">立替金申請時の注意事項</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>領収書やレシートなど、支払いを証明する書類を必ず保管してください</li>
                          <li>申請内容と領収書の内容が一致していることを確認してください</li>
                          <li>承認後、指定口座に払い戻しが行われます</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 承認フロー情報 */}
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
                        <p>申請受付 → 柿沼・鈴木（聖）印 → 立替金発行 → 鈴木 聖子 印</p>
                      </div>
                    </div>
                  </div>
                </div>

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
