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

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [comment, setComment] = useState('')

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

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await apiClient.approveRequest(params.id as string, comment)
      await fetchRequest()
    } catch (err) {
      setError('承認に失敗しました。')
      console.error('Approve error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      await apiClient.rejectRequest(params.id as string, comment)
      await fetchRequest()
    } catch (err) {
      setError('却下に失敗しました。')
      console.error('Reject error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturn = async () => {
    setActionLoading(true)
    try {
      await apiClient.returnRequest(params.id as string, comment)
      await fetchRequest()
    } catch (err) {
      setError('差戻しに失敗しました。')
      console.error('Return error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'applied': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'returned': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
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
      case 'leave': return '休暇申請'
      case 'overtime': return '時間外労働申請'
      case 'expense': return '仮払・立替申請'
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">申請詳細</h1>
              <p className="text-gray-600">{getTypeText(request.type)}</p>
            </div>
            <Link href="/dashboard" className="btn btn-secondary">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="card-title">{request.title}</h2>
                    <p className="card-description">申請ID: {request.id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                    {getStatusText(request.status)}
                  </span>
                </div>
              </div>
              <div className="card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">申請内容</h3>
                    <p className="text-gray-900">{request.description}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">申請日時</h3>
                    <p className="text-gray-900">
                      {new Date(request.applied_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">承認履歴</h2>
              </div>
              <div className="card-content">
                <div className="flow-root">
                  <ul className="-mb-8">
                    <li>
                      <div className="relative pb-8">
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                              <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">申請者</p>
                              <p className="text-sm font-medium text-gray-900">田中太郎</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {new Date(request.created_at).toLocaleString('ja-JP')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                    {request.status === 'approved' && (
                      <li>
                        <div className="relative pb-8">
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                                <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">承認者</p>
                                <p className="text-sm font-medium text-gray-900">山田部長</p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {request.approved_at ? new Date(request.approved_at).toLocaleString('ja-JP') : '承認済み'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {request.status === 'applied' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">承認アクション</h2>
                </div>
                <div className="card-content">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="comment" className="label">コメント（オプション）</label>
                      <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="input"
                        rows={3}
                        placeholder="承認・却下・差戻しの理由を入力してください"
                      />
                    </div>

                    {error && (
                      <div className="text-red-600 text-sm">
                        {error}
                      </div>
                    )}

                    <div className="flex justify-end space-x-4">
                      <button
                        onClick={handleReturn}
                        disabled={actionLoading}
                        className="btn btn-warning"
                      >
                        {actionLoading ? '処理中...' : '差戻し'}
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="btn btn-error"
                      >
                        {actionLoading ? '処理中...' : '却下'}
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="btn btn-primary"
                      >
                        {actionLoading ? '処理中...' : '承認'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {request.comments && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">コメント</h2>
                </div>
                <div className="card-content">
                  <p className="text-gray-900">{request.comments}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}


