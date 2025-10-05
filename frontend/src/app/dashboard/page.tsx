'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { user: authUser, isAdmin } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, requestsData] = await Promise.all([
          apiClient.getCurrentUser(),
          apiClient.getRequests()
        ])
        setUser(userData as any)

        // 一般ユーザーの場合は自分の申請のみフィルタリング
        if (authUser && authUser.role === 'user') {
          const filteredRequests = (requestsData as any[]).filter(
            (req: any) => req.applicant_id === authUser.id || req.applicant_id === authUser.user_id
          )
          setRequests(filteredRequests)
        } else {
          setRequests(requestsData as any[])
        }
      } catch (error) {
        console.error('データの取得に失敗しました:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authUser])

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    setExporting(format)
    try {
      switch (format) {
        case 'pdf':
          await apiClient.exportRequestsPDF()
          break
        case 'csv':
          await apiClient.exportRequestsCSV()
          break
        case 'excel':
          await apiClient.exportRequestsExcel()
          break
      }
    } catch (error) {
      console.error('エクスポートに失敗しました:', error)
      alert('エクスポートに失敗しました')
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">
                勤怠・社内申請システム
              </h1>
              <p className="text-gray-600">
                ようこそ、{user?.name}さん
              </p>
            </div>
            <div className="flex space-x-4">
              {isAdmin && (
                <>
                  <Link href="/approvals" className="btn btn-secondary">
                    承認管理
                  </Link>
                  <Link href="/admin" className="btn btn-secondary">
                    管理画面
                  </Link>
                </>
              )}
              <button className="btn btn-secondary">
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* クイックアクション */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/requests/leave" className="card hover:shadow-lg transition-shadow">
              <div className="card-content">
                <h3 className="card-title text-lg">休暇申請</h3>
                <p className="card-description">有給・代休・特別休暇の申請</p>
              </div>
            </Link>
            
            <Link href="/requests/overtime" className="card hover:shadow-lg transition-shadow">
              <div className="card-content">
                <h3 className="card-title text-lg">時間外労働申請</h3>
                <p className="card-description">残業・早出・休日出勤の申請</p>
              </div>
            </Link>
            
            <Link href="/requests/holiday-work" className="card hover:shadow-lg transition-shadow">
              <div className="card-content">
                <h3 className="card-title text-lg">休日出勤届</h3>
                <p className="card-description">土曜日・日曜日・祝祭日の出勤申請</p>
              </div>
            </Link>

            <Link href="/requests/expense" className="card hover:shadow-lg transition-shadow">
              <div className="card-content">
                <h3 className="card-title text-lg">仮払金申請</h3>
                <p className="card-description">仮払金の申請</p>
              </div>
            </Link>

            <Link href="/requests/reimbursement" className="card hover:shadow-lg transition-shadow">
              <div className="card-content">
                <h3 className="card-title text-lg">立替金申請</h3>
                <p className="card-description">立替金の精算申請</p>
              </div>
            </Link>

            <Link href="/requests/construction-daily" className="card hover:shadow-lg transition-shadow">
              <div className="card-content">
                <h3 className="card-title text-lg">工事日報</h3>
                <p className="card-description">現場作業の日報作成</p>
              </div>
            </Link>
          </div>

          {/* 申請一覧 */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h2 className="card-title">最近の申請</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={exporting === 'pdf'}
                    className="btn btn-secondary btn-sm"
                  >
                    {exporting === 'pdf' ? 'エクスポート中...' : 'PDF'}
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={exporting === 'csv'}
                    className="btn btn-secondary btn-sm"
                  >
                    {exporting === 'csv' ? 'エクスポート中...' : 'CSV'}
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={exporting === 'excel'}
                    className="btn btn-secondary btn-sm"
                  >
                    {exporting === 'excel' ? 'エクスポート中...' : 'Excel'}
                  </button>
                </div>
              </div>
            </div>
            <div className="card-content">
              {requests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  申請がありません
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr className="table-row">
                        <th className="table-head">申請種別</th>
                        <th className="table-head">タイトル</th>
                        <th className="table-head">ステータス</th>
                        <th className="table-head">申請日</th>
                        <th className="table-head">操作</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {requests && requests.length > 0 ? requests.map((request) => (
                        <tr key={request.id} className="table-row">
                          <td className="table-cell">
                            <span className="badge badge-primary">
                              {request.type === 'leave' && '休暇'}
                              {request.type === 'overtime' && '時間外'}
                              {request.type === 'holiday_work' && '休日出勤'}
                              {request.type === 'expense' && '仮払金'}
                              {request.type === 'reimbursement' && '立替金'}
                              {request.type === 'settlement' && '仮払金精算'}
                              {request.type === 'construction_daily' && '工事日報'}
                            </span>
                          </td>
                          <td className="table-cell">{request.title}</td>
                          <td className="table-cell">
                            <span className={`badge ${
                              request.status === 'approved' ? 'badge-success' :
                              request.status === 'rejected' ? 'badge-error' :
                              request.status === 'applied' ? 'badge-warning' :
                              'badge-default'
                            }`}>
                              {request.status === 'approved' && '承認済み'}
                              {request.status === 'rejected' && '却下'}
                              {request.status === 'applied' && '申請中'}
                              {request.status === 'draft' && '下書き'}
                            </span>
                          </td>
                          <td className="table-cell">
                            {request.applied_at ? 
                              new Date(request.applied_at).toLocaleDateString('ja-JP') : 
                              '-'
                            }
                          </td>
                          <td className="table-cell">
                            <Link href={`/requests/${request.id}`} className="btn btn-sm btn-primary">
                              詳細
                            </Link>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="table-cell text-center text-gray-500">
                            申請がありません
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
