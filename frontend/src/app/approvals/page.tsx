'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { RequireAdmin } from '@/components/auth/RequireAdmin'

interface ApprovalRequest {
  id: string
  type: string
  applicant_id: string
  status: string
  title: string
  description: string
  applied_at: string
  created_at: string
  applicant_name: string
  priority: 'high' | 'medium' | 'low'
}

function ApprovalsContent() {
  const router = useRouter()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('applied_at')
  const [showReceivedDateModal, setShowReceivedDateModal] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string>('')
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchApprovals()
  }, [])

  const fetchApprovals = async () => {
    try {
      const response = await apiClient.getApprovalRequests()
      setRequests(response as ApprovalRequest[])
    } catch (err) {
      setError('承認待ち申請の取得に失敗しました。')
      console.error('Approvals fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string, requestType: string) => {
    // 仮払金申請の場合のみ受領日モーダルを表示（精算・立替金は不要）
    if (requestType === 'expense') {
      setSelectedRequestId(requestId)
      setShowReceivedDateModal(true)
      return
    }

    // その他の申請（立替金、精算、休暇、残業など）は通常の承認処理
    try {
      await apiClient.approveRequest(requestId, '承認しました')
      await fetchApprovals()
    } catch (err) {
      setError('承認に失敗しました。')
      console.error('Approve error:', err)
    }
  }

  const handleApproveWithReceivedDate = async () => {
    try {
      await apiClient.approveRequest(selectedRequestId, '承認しました', receivedDate)
      setShowReceivedDateModal(false)
      setSelectedRequestId('')
      setReceivedDate(new Date().toISOString().split('T')[0])
      await fetchApprovals()
    } catch (err) {
      setError('承認に失敗しました。')
      console.error('Approve error:', err)
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      await apiClient.rejectRequest(requestId, '却下しました')
      await fetchApprovals()
    } catch (err) {
      setError('却下に失敗しました。')
      console.error('Reject error:', err)
    }
  }

  const handleReturn = async (requestId: string) => {
    try {
      await apiClient.returnRequest(requestId, '差戻ししました')
      await fetchApprovals()
    } catch (err) {
      setError('差戻しに失敗しました。')
      console.error('Return error:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800'
      case 'applied': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'returned': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '承認待ち'
      case 'applied': return '承認待ち'
      case 'approved': return '承認済み'
      case 'rejected': return '却下'
      case 'returned': return '差戻し'
      case 'cancelled': return '取り消し'
      default: return status
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'leave': return '休暇申請'
      case 'overtime': return '時間外労働申請'
      case 'expense': return '仮払金申請'
      case 'reimbursement': return '立替金申請'
      case 'settlement': return '仮払金精算'
      case 'holiday_work': return '休日出勤申請'
      default: return type
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true
    return request.status === filter
  })

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    switch (sortBy) {
      case 'applied_at':
        return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      case 'type':
        return a.type.localeCompare(b.type)
      default:
        return 0
    }
  })

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">承認管理</h1>
              <p className="text-gray-600">承認待ちの申請を管理</p>
            </div>
            <Link href="/dashboard" className="btn btn-secondary">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* フィルター・ソート */}
          <div className="card mb-6">
            <div className="card-content">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="filter" className="label">ステータス</label>
                  <select
                    id="filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="input"
                  >
                    <option value="all">すべて</option>
                    <option value="pending">承認待ち</option>
                    <option value="approved">承認済み</option>
                    <option value="rejected">却下</option>
                    <option value="returned">差戻し</option>
                    <option value="cancelled">取り消し</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="sort" className="label">並び順</label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input"
                  >
                    <option value="applied_at">申請日時</option>
                    <option value="priority">優先度</option>
                    <option value="type">申請種別</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
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

          {/* 申請一覧 */}
          <div className="space-y-4">
            {sortedRequests.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">承認待ちの申請がありません</h3>
                <p className="mt-1 text-sm text-gray-500">新しい申請が来るとここに表示されます。</p>
              </div>
            ) : (
              sortedRequests.map((request) => (
                <div key={request.id} className="card">
                  <div className="card-content">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{request.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusText(request.status)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                            {request.priority === 'high' ? '高' : request.priority === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">申請者:</span> {request.applicant_name}
                          </div>
                          <div>
                            <span className="font-medium">種別:</span> {getTypeText(request.type)}
                          </div>
                          <div>
                            <span className="font-medium">申請日:</span> {new Date(request.applied_at).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                        <p className="mt-2 text-gray-700">{request.description}</p>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <Link
                          href={`/requests/${request.id}`}
                          className="btn btn-sm btn-secondary"
                        >
                          詳細
                        </Link>
                        {(request.status === 'pending' || request.status === 'applied') && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleReturn(request.id)}
                              className="btn btn-sm btn-warning"
                            >
                              差戻し
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="btn btn-sm btn-error"
                            >
                              却下
                            </button>
                            <button
                              onClick={() => handleApprove(request.id, request.type)}
                              className="btn btn-sm btn-primary"
                            >
                              承認
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* 受領日入力モーダル */}
      {showReceivedDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">仮払金の受領日を入力</h3>
            <p className="text-sm text-gray-600 mb-4">
              承認と同時に受領日を記録します。
            </p>
            <div className="mb-6">
              <label htmlFor="received_date" className="label">受領日</label>
              <input
                type="date"
                id="received_date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReceivedDateModal(false)
                  setSelectedRequestId('')
                  setReceivedDate(new Date().toISOString().split('T')[0])
                }}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleApproveWithReceivedDate}
                className="btn btn-primary"
              >
                承認する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApprovalsPage() {
  return (
    <RequireAdmin>
      <ApprovalsContent />
    </RequireAdmin>
  )
}

