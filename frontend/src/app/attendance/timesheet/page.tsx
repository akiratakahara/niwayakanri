'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface TimesheetData {
  year: number
  month: number
  user: {
    id: number
    name: string
    department: string
  }
  daily_records: Array<{
    date: string
    day: number
    weekday: string
    attendance_am: string | null
    attendance_pm: string | null
    early_hours: number
    overtime_hours: number
    supervisor: string
    work_content: string
    leave_status: string | null
  }>
  summary: {
    total_work_days: number
    substitute_work_days: number
    holiday_work_days: number
    paid_leave_days: number
    compensatory_leave_days: number
    special_leave_days: number
    total_early_hours: number
    total_overtime_hours: number
    total_work_hours: number
    absence_days: number
  }
}

export default function TimesheetPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [timesheetData, setTimesheetData] = useState<TimesheetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // デフォルトは今月
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [users, setUsers] = useState<any[]>([])

  // ユーザー一覧取得（管理者のみ）
  useEffect(() => {
    const fetchUsers = async () => {
      if (user?.role === 'admin') {
        try {
          const data = await apiClient.getUsers() as any[]
          setUsers(data)
          if (data.length > 0) {
            setSelectedUserId(Number(data[0].id))
          }
        } catch (err) {
          console.error('ユーザー一覧取得エラー:', err)
        }
      } else if (user) {
        setSelectedUserId(Number(user.id))
      }
    }

    fetchUsers()
  }, [user])

  // 出勤簿データ取得
  const fetchTimesheetData = async () => {
    if (!selectedUserId) return

    setLoading(true)
    setError(null)

    try {
      const data = await apiClient.getMonthlyTimesheet(selectedUserId, year, month) as TimesheetData
      setTimesheetData(data)
    } catch (err: any) {
      setError(err.message || '出勤簿の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedUserId) {
      fetchTimesheetData()
    }
  }, [year, month, selectedUserId])

  // PDF出力
  const handleDownloadPdf = async () => {
    if (!selectedUserId) return

    try {
      await apiClient.downloadTimesheetPdf(selectedUserId, year, month)
    } catch (err: any) {
      alert('PDFダウンロードに失敗しました: ' + err.message)
    }
  }

  // 年月変更
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">出勤簿</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← ダッシュボードに戻る
            </button>
          </div>

          {/* ユーザー選択（管理者のみ） */}
          {user?.role === 'admin' && users.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                従業員選択
              </label>
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 年月選択 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevMonth}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                ← 前月
              </button>
              <div className="text-xl font-semibold">
                {year}年 {month}月
              </div>
              <button
                onClick={handleNextMonth}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                次月 →
              </button>
            </div>

            <button
              onClick={handleDownloadPdf}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              PDF出力
            </button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        )}

        {/* 出勤簿 */}
        {!loading && timesheetData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                氏名: {timesheetData.user.name}
              </h2>
              {timesheetData.user.department && (
                <p className="text-gray-600">部署: {timesheetData.user.department}</p>
              )}
            </div>

            {/* 出勤簿テーブル */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 px-2 py-2">日</th>
                    <th className="border border-gray-300 px-2 py-2">曜日</th>
                    <th className="border border-gray-300 px-2 py-2">
                      午前
                      <br />
                      8:00-12:00
                    </th>
                    <th className="border border-gray-300 px-2 py-2">
                      午後
                      <br />
                      13:00-17:00
                    </th>
                    <th className="border border-gray-300 px-2 py-2">早出(H)</th>
                    <th className="border border-gray-300 px-2 py-2">残業(H)</th>
                    <th className="border border-gray-300 px-2 py-2">現場担当者</th>
                    <th className="border border-gray-300 px-3 py-2 min-w-[300px]">業務内容</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheetData.daily_records.map((record) => (
                    <tr
                      key={record.date}
                      className={
                        record.weekday === '土' || record.weekday === '日'
                          ? 'bg-yellow-50'
                          : ''
                      }
                    >
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {record.day}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {record.weekday}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {record.attendance_am || ''}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {record.attendance_pm || ''}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {record.early_hours > 0 ? record.early_hours.toFixed(1) : ''}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {record.overtime_hours > 0 ? record.overtime_hours.toFixed(1) : ''}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {record.supervisor || ''}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-left text-xs">
                        {record.work_content || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* サマリー */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">月次集計</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded shadow">
                  <p className="text-sm text-gray-600">出勤日数</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {timesheetData.summary.total_work_days}日
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow">
                  <p className="text-sm text-gray-600">労働時間</p>
                  <p className="text-2xl font-bold text-green-600">
                    {timesheetData.summary.total_work_hours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow">
                  <p className="text-sm text-gray-600">早出時間</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {timesheetData.summary.total_early_hours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow">
                  <p className="text-sm text-gray-600">残業時間</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {timesheetData.summary.total_overtime_hours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow">
                  <p className="text-sm text-gray-600">有給休暇</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {timesheetData.summary.paid_leave_days}日
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow">
                  <p className="text-sm text-gray-600">代休</p>
                  <p className="text-2xl font-bold text-teal-600">
                    {timesheetData.summary.compensatory_leave_days}日
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow">
                  <p className="text-sm text-gray-600">特別休暇</p>
                  <p className="text-2xl font-bold text-pink-600">
                    {timesheetData.summary.special_leave_days}日
                  </p>
                </div>
                <div className="bg-white p-3 rounded shadow">
                  <p className="text-sm text-gray-600">休日出勤</p>
                  <p className="text-2xl font-bold text-red-600">
                    {timesheetData.summary.holiday_work_days}日
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
