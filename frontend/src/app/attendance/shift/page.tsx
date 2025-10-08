'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface ShiftData {
  year: number
  month: number
  dates: Array<{
    date: string
    day: number
    weekday: string
  }>
  employees: Array<{
    user_id: number
    name: string
    department: string
    daily_status: { [key: string]: string | null }
    summary: {
      paid_leave: number
      compensatory_leave: number
      special_leave: number
      holiday_work: number
    }
    balance: {
      paid_leave: number
      compensatory_leave: number
    }
  }>
}

export default function ShiftTablePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [shiftData, setShiftData] = useState<ShiftData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // デフォルトは今月
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // 管理者チェック
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  // シフトデータ取得
  const fetchShiftData = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await apiClient.getMonthlyShift(year, month)
      setShiftData(data)
    } catch (err: any) {
      setError(err.message || 'シフト表の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchShiftData()
    }
  }, [year, month, user])

  // PDF出力
  const handleDownloadPdf = async () => {
    try {
      await apiClient.downloadShiftTablePdf(year, month)
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

  if (user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-full mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">月次シフト表</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← ダッシュボードに戻る
            </button>
          </div>

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

        {/* シフト表 */}
        {!loading && shiftData && (
          <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
            {/* 凡例 */}
            <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p>
                <span className="font-semibold">凡例:</span>
                {' '}有：有給休暇 / 代：代休 / 特：特別休暇 / ◎：振替出勤 / ☆：休日出勤
              </p>
            </div>

            {/* シフト表本体 */}
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-2 py-1 sticky left-0 bg-gray-200 z-10">
                    氏名
                  </th>
                  {shiftData.dates.map((d) => (
                    <th
                      key={d.date}
                      className={`border border-gray-300 px-1 py-1 ${
                        d.weekday === '土' || d.weekday === '日' ? 'bg-pink-100' : ''
                      }`}
                    >
                      {d.day}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1 sticky left-0 bg-gray-100 z-10">
                    曜日
                  </th>
                  {shiftData.dates.map((d) => (
                    <th
                      key={d.date}
                      className={`border border-gray-300 px-1 py-1 ${
                        d.weekday === '土' || d.weekday === '日' ? 'bg-pink-100' : ''
                      }`}
                    >
                      {d.weekday}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shiftData.employees.map((emp) => (
                  <tr key={emp.user_id}>
                    <td className="border border-gray-300 px-2 py-1 sticky left-0 bg-yellow-50 font-semibold z-10">
                      {emp.name}
                    </td>
                    {shiftData.dates.map((d) => {
                      const status = emp.daily_status[d.date]
                      return (
                        <td
                          key={d.date}
                          className={`border border-gray-300 px-1 py-1 text-center ${
                            d.weekday === '土' || d.weekday === '日' ? 'bg-pink-50' : ''
                          }`}
                        >
                          {status || ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 休暇残日数サマリー */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">休暇残日数</h3>
              <table className="border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 px-4 py-2">氏名</th>
                    <th className="border border-gray-300 px-4 py-2" colSpan={2}>
                      当月使用
                    </th>
                    <th className="border border-gray-300 px-4 py-2" colSpan={2}>
                      残日数
                    </th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2"></th>
                    <th className="border border-gray-300 px-4 py-2">有給</th>
                    <th className="border border-gray-300 px-4 py-2">代休</th>
                    <th className="border border-gray-300 px-4 py-2">有給</th>
                    <th className="border border-gray-300 px-4 py-2">代休</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftData.employees.map((emp) => (
                    <tr key={emp.user_id}>
                      <td className="border border-gray-300 px-4 py-2 font-semibold">
                        {emp.name}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {emp.summary.paid_leave}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {emp.summary.compensatory_leave}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {emp.balance.paid_leave.toFixed(1)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {emp.balance.compensatory_leave.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
