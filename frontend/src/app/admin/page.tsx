'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import { RequireAdmin } from '@/components/auth/RequireAdmin'

interface AdminStats {
  total_requests: number
  pending_requests: number
  approved_requests: number
  rejected_requests: number
  total_users: number
  active_users: number
}

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: string
  last_login: string
}

interface NotificationSettings {
  enabled: boolean
  send_time: string
  skip_weekends: boolean
  skip_holidays: boolean
}

function AdminContent() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [exporting, setExporting] = useState<string | null>(null)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    send_time: '09:00',
    skip_weekends: true,
    skip_holidays: true
  })
  const [updatingNotifications, setUpdatingNotifications] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)

  useEffect(() => {
    fetchAdminData()
    fetchNotificationSettings()
  }, [])

  const fetchAdminData = async () => {
    try {
      const [statsResponse, usersResponse, summaryResponse] = await Promise.all([
        apiClient.getAdminStats(),
        apiClient.getUsers(),
        apiClient.getSummaryReport()
      ])
      setStats(statsResponse)
      setUsers(usersResponse)
      setSummaryData(summaryResponse.data)
    } catch (err) {
      setError('管理データの取得に失敗しました。')
      console.error('Admin data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotificationSettings = async () => {
    try {
      const settings = await apiClient.getNotificationSettings()
      setNotificationSettings({
        enabled: settings.enabled || false,
        send_time: settings.send_time || '09:00',
        skip_weekends: settings.skip_weekends !== undefined ? settings.skip_weekends : true,
        skip_holidays: settings.skip_holidays !== undefined ? settings.skip_holidays : true
      })
    } catch (err) {
      console.error('Notification settings fetch error:', err)
      // デフォルト値を使用（エラーを表示しない）
    }
  }

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingNotifications(true)
    try {
      await apiClient.updateNotificationSettings(notificationSettings)
      setError('')
      // 成功メッセージを表示するため、エラー状態をクリア
      setTimeout(() => {
        setError('')
      }, 3000)
    } catch (err) {
      setError('通知設定の更新に失敗しました。')
      console.error('Notification settings update error:', err)
    } finally {
      setUpdatingNotifications(false)
    }
  }

  const handleSendReminderNow = async () => {
    setSendingReminder(true)
    try {
      await apiClient.sendDailyReportReminderNow()
      setError('')
      // 成功メッセージを表示
      alert('日報リマインダーを送信しました。')
    } catch (err) {
      setError('リマインダーの送信に失敗しました。')
      console.error('Send reminder error:', err)
    } finally {
      setSendingReminder(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'csv' | 'excel' | 'summary-pdf') => {
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
        case 'summary-pdf':
          await apiClient.exportSummaryPDF()
          break
      }
    } catch (error) {
      console.error('エクスポートに失敗しました:', error)
      alert('エクスポートに失敗しました')
    } finally {
      setExporting(null)
    }
  }

  const handleUserStatusChange = async (userId: string, status: string) => {
    try {
      await apiClient.updateUserStatus(userId, status)
      await fetchAdminData()
    } catch (err) {
      setError('ユーザー状態の更新に失敗しました。')
      console.error('User status update error:', err)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">管理画面</h1>
              <p className="text-gray-600">システム全体の管理・監視</p>
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
          {/* タブナビゲーション */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                概要
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ユーザー管理
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                申請管理
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                レポート
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                設定
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                通知設定
              </button>
            </nav>
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

          {/* タブコンテンツ */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* 統計カード */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card">
                  <div className="card-content">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">総申請数</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.total_requests}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-content">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">承認待ち</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.pending_requests}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-content">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">承認済み</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.approved_requests}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-content">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">却下</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.rejected_requests}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ユーザー統計 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">ユーザー統計</h2>
                  </div>
                  <div className="card-content">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">総ユーザー数</span>
                        <span className="text-sm font-medium text-gray-900">{stats.total_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">アクティブユーザー</span>
                        <span className="text-sm font-medium text-gray-900">{stats.active_users}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">申請統計</h2>
                  </div>
                  <div className="card-content">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">承認率</span>
                        <span className="text-sm font-medium text-gray-900">
                          {stats.total_requests > 0 
                            ? Math.round((stats.approved_requests / stats.total_requests) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">却下率</span>
                        <span className="text-sm font-medium text-gray-900">
                          {stats.total_requests > 0 
                            ? Math.round((stats.rejected_requests / stats.total_requests) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">ユーザー一覧</h2>
                  <Link href="/admin/users/register" className="btn btn-primary btn-sm">
                    新規ユーザー追加
                  </Link>
                </div>
                <div className="card-content">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ユーザー
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            部署
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ロール
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ステータス
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            最終ログイン
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            アクション
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.role}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                user.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {user.status === 'active' ? 'アクティブ' : '無効'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.last_login).toLocaleDateString('ja-JP')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleUserStatusChange(
                                  user.id, 
                                  user.status === 'active' ? 'inactive' : 'active'
                                )}
                                className={`btn btn-sm ${
                                  user.status === 'active' ? 'btn-error' : 'btn-primary'
                                }`}
                              >
                                {user.status === 'active' ? '無効化' : '有効化'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">申請管理</h2>
                  <Link href="/approvals" className="btn btn-primary btn-sm">
                    承認管理へ
                  </Link>
                </div>
                <div className="card-content">
                  <p className="text-gray-600">
                    申請の詳細管理は承認管理画面で行えます。
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <div className="flex justify-between items-center">
                    <h2 className="card-title">データエクスポート</h2>
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
                  <p className="text-gray-600 mb-4">
                    申請データを各種形式でエクスポートできます。
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="flex justify-between items-center">
                    <h2 className="card-title">集計レポート</h2>
                    <button
                      onClick={() => handleExport('summary-pdf')}
                      disabled={exporting === 'summary-pdf'}
                      className="btn btn-primary btn-sm"
                    >
                      {exporting === 'summary-pdf' ? 'エクスポート中...' : '集計レポートPDF'}
                    </button>
                  </div>
                </div>
                <div className="card-content">
                  {summaryData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">総申請数</h3>
                        <p className="text-3xl font-bold text-blue-600">{summaryData.total_requests}</p>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-900 mb-2">承認率</h3>
                        <p className="text-3xl font-bold text-green-600">{summaryData.approval_rate}%</p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">ステータス別</h3>
                        <div className="space-y-1">
                          {Object.entries(summaryData.status_summary || {}).map(([status, data]: [string, any]) => (
                            <div key={status} className="flex justify-between text-sm">
                              <span>{status}</span>
                              <span>{data.count}件 ({data.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-purple-900 mb-2">申請種類別</h3>
                        <div className="space-y-1">
                          {Object.entries(summaryData.type_summary || {}).map(([type, data]: [string, any]) => (
                            <div key={type} className="flex justify-between text-sm">
                              <span>{type}</span>
                              <span>{data.count}件 ({data.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-orange-50 p-4 rounded-lg md:col-span-2">
                        <h3 className="text-lg font-semibold text-orange-900 mb-2">月別推移</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(summaryData.monthly_summary || {}).map(([month, count]: [string, any]) => (
                            <div key={month} className="flex justify-between text-sm">
                              <span>{month}</span>
                              <span>{count}件</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">システム設定</h2>
                </div>
                <div className="card-content">
                  <div className="space-y-6">
                    <div>
                      <label className="label">承認フロー設定</label>
                      <p className="text-sm text-gray-600 mb-4">
                        申請種別ごとの承認フローを設定できます。
                      </p>
                      <button className="btn btn-secondary">
                        承認フローを編集
                      </button>
                    </div>

                    <div>
                      <label className="label">PDF設定</label>
                      <p className="text-sm text-gray-600 mb-4">
                        PDF出力のテンプレートを設定できます。
                      </p>
                      <button className="btn btn-secondary">
                        PDF設定を編集
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">通知設定</h2>
                </div>
                <div className="card-content">
                  <form onSubmit={handleNotificationSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="label">日報リマインダー</label>
                        <select
                          value={notificationSettings.enabled ? 'true' : 'false'}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            enabled: e.target.value === 'true'
                          })}
                          className="input"
                        >
                          <option value="true">有効</option>
                          <option value="false">無効</option>
                        </select>
                        <p className="text-sm text-gray-600 mt-2">
                          日報の入力漏れを防ぐためのリマインダーメールを送信します。
                        </p>
                      </div>

                      <div>
                        <label className="label">送信時刻</label>
                        <input
                          type="time"
                          value={notificationSettings.send_time}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            send_time: e.target.value
                          })}
                          className="input"
                        />
                        <p className="text-sm text-gray-600 mt-2">
                          リマインダーメールを送信する時刻を設定します。
                        </p>
                      </div>

                      <div>
                        <label className="label">土日をスキップ</label>
                        <select
                          value={notificationSettings.skip_weekends ? 'true' : 'false'}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            skip_weekends: e.target.value === 'true'
                          })}
                          className="input"
                        >
                          <option value="true">スキップする</option>
                          <option value="false">スキップしない</option>
                        </select>
                        <p className="text-sm text-gray-600 mt-2">
                          土日にリマインダーを送信するかどうかを設定します。
                        </p>
                      </div>

                      <div>
                        <label className="label">祝日をスキップ</label>
                        <select
                          value={notificationSettings.skip_holidays ? 'true' : 'false'}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            skip_holidays: e.target.value === 'true'
                          })}
                          className="input"
                        >
                          <option value="true">スキップする</option>
                          <option value="false">スキップしない</option>
                        </select>
                        <p className="text-sm text-gray-600 mt-2">
                          祝日にリマインダーを送信するかどうかを設定します。
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                      <button
                        type="submit"
                        disabled={updatingNotifications}
                        className="btn btn-primary"
                      >
                        {updatingNotifications ? '更新中...' : '設定を更新'}
                      </button>

                      <button
                        type="button"
                        onClick={handleSendReminderNow}
                        disabled={sendingReminder}
                        className="btn btn-secondary"
                      >
                        {sendingReminder ? '送信中...' : '今すぐリマインダーを送信'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">メール設定について</h2>
                </div>
                <div className="card-content">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">環境変数の設定が必要です</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p className="mb-2">メール通知を利用するには、以下の環境変数を設定してください：</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li><code className="bg-white px-1 rounded">SMTP_SERVER</code> - SMTPサーバーのホスト名</li>
                            <li><code className="bg-white px-1 rounded">SMTP_PORT</code> - SMTPサーバーのポート番号</li>
                            <li><code className="bg-white px-1 rounded">SMTP_USERNAME</code> - SMTP認証のユーザー名</li>
                            <li><code className="bg-white px-1 rounded">SMTP_PASSWORD</code> - SMTP認証のパスワード</li>
                            <li><code className="bg-white px-1 rounded">FROM_EMAIL</code> - 送信者のメールアドレス</li>
                          </ul>
                          <p className="mt-2">これらの設定により、システムからメール通知が送信されます。</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminContent />
    </RequireAdmin>
  )
}

