'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'

interface RequestDetail {
  id: string
  type: string
  applicant_id: string
  status: string
  title: string
  description: string
  applied_at: string
  created_at: string
  approved_at?: string
  approver_id?: string
  comments?: string
}

export default function RequestPDFPage() {
  const params = useParams()
  const router = useRouter()
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchRequest()
  }, [params.id])

  const fetchRequest = async () => {
    try {
      const response = await apiClient.getRequest(params.id as string)
      setRequest(response)
    } catch (err) {
      setError('申請の取得に失敗しました。')
      console.error('Request fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async () => {
    setGenerating(true)
    try {
      const response = await apiClient.generateRequestPDF(params.id as string)
      // PDFをダウンロード
      const blob = new Blob([response], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `申請書_${request?.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('PDF生成に失敗しました。')
      console.error('PDF generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '下書き'
      case 'applied': return '申請中'
      case 'approved': return '承認済み'
      case 'rejected': return '却下'
      case 'returned': return '差戻し'
      default: return status
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'leave': return '休暇申請書'
      case 'overtime': return '時間外労働申請書'
      case 'expense': return '仮払・立替申請書'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '申請が見つかりません'}</p>
          <Link href="/dashboard" className="btn btn-primary">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PDF出力</h1>
              <p className="text-gray-600">{getTypeText(request.type)}</p>
            </div>
            <div className="flex space-x-4">
              <Link href={`/requests/${request.id}`} className="btn btn-secondary">
                詳細に戻る
              </Link>
              <Link href="/dashboard" className="btn btn-secondary">
                ダッシュボード
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-6">
            {/* PDF生成ボタン */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">PDF生成</h2>
                <p className="card-description">申請書をPDF形式で出力できます</p>
              </div>
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{request.title}</h3>
                    <p className="text-sm text-gray-600">ステータス: {getStatusText(request.status)}</p>
                  </div>
                  <button
                    onClick={generatePDF}
                    disabled={generating}
                    className="btn btn-primary"
                  >
                    {generating ? '生成中...' : 'PDFを生成'}
                  </button>
                </div>
              </div>
            </div>

            {/* 申請書プレビュー */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">申請書プレビュー</h2>
                <p className="card-description">PDF出力される内容のプレビュー</p>
              </div>
              <div className="card-content">
                <div className="bg-white border border-gray-200 rounded-lg p-8">
                  {/* 申請書ヘッダー */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {getTypeText(request.type)}
                    </h1>
                    <p className="text-sm text-gray-600">申請ID: {request.id}</p>
                  </div>

                  {/* 申請者情報 */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">申請者情報</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">氏名:</span>
                        <span className="ml-2 text-gray-900">田中太郎</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">部署:</span>
                        <span className="ml-2 text-gray-900">営業部</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">申請日:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(request.applied_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">ステータス:</span>
                        <span className="ml-2 text-gray-900">{getStatusText(request.status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 申請内容 */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">申請内容</h2>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900">{request.description}</p>
                    </div>
                  </div>

                  {/* 承認欄 */}
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">承認欄</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <div className="border border-gray-300 rounded-lg p-4 h-32">
                          <p className="text-sm text-gray-600 mb-2">上長承認</p>
                          <div className="flex justify-between items-end h-full">
                            <div>
                              <p className="text-xs text-gray-500">承認日: ___________</p>
                              <p className="text-xs text-gray-500">氏名: ___________</p>
                            </div>
                            <div className="text-xs text-gray-500">印</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="border border-gray-300 rounded-lg p-4 h-32">
                          <p className="text-sm text-gray-600 mb-2">経理部長承認</p>
                          <div className="flex justify-between items-end h-full">
                            <div>
                              <p className="text-xs text-gray-500">承認日: ___________</p>
                              <p className="text-xs text-gray-500">氏名: ___________</p>
                            </div>
                            <div className="text-xs text-gray-500">印</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* コメント */}
                  {request.comments && (
                    <div className="mt-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">コメント</h2>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-900">{request.comments}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}



