'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'

interface Worker {
  category: string
  name: string
}

interface OwnVehicle {
  vehicle_id: string
  type: string
  name: string
  number: string
  driver: string
  refuel: string
}

// 自社車両マスタデータ
const COMPANY_VEHICLES = [
  { id: '1', type: '2tD', name: '白キャスター', number: 'つ47-21' },
  { id: '2', type: '2tD', name: '白エルフ', number: 'そ31-76' },
  { id: '3', type: '軽バン', name: 'エブリ', number: 'き43-65' },
  { id: '4', type: '2tD', name: '白エルフ(新)', number: 'ち73-80' },
  { id: '5', type: '2tD', name: '白エルフ(4駆)', number: 'ち78-58' },
  { id: '6', type: '軽トラ', name: 'キャリー', number: 'き74-03' },
  { id: '7', type: '軽トラ', name: 'ハイゼット', number: 'き89-50' },
  { id: '8', type: '軽バンAT', name: 'ハイゼット', number: 'く28-35' },
  { id: '9', type: '軽バンAT', name: 'クリッパー', number: 'け41-20' },
  { id: '10', type: 'バッカー', name: '', number: 'さ95-16' },
]

// 機械マスタデータ（チェンソー・電バリ・C-◯・ENT-◯・ELT-◯・BS-◯等）
const COMPANY_MACHINERY = [
  // チェンソー C-1〜C-20
  { id: '1', code: 'C-1', type: 'チェンソー' },
  { id: '2', code: 'C-2', type: 'チェンソー' },
  { id: '3', code: 'C-3', type: 'チェンソー' },
  { id: '4', code: 'C-4', type: 'チェンソー' },
  { id: '5', code: 'C-5', type: 'チェンソー' },
  { id: '6', code: 'C-6', type: 'チェンソー' },
  { id: '7', code: 'C-7', type: 'チェンソー' },
  { id: '8', code: 'C-8', type: 'チェンソー' },
  { id: '9', code: 'C-9', type: 'チェンソー' },
  { id: '10', code: 'C-10', type: 'チェンソー' },
  { id: '11', code: 'C-11', type: 'チェンソー' },
  { id: '12', code: 'C-12', type: 'チェンソー' },
  { id: '13', code: 'C-13', type: 'チェンソー' },
  { id: '14', code: 'C-14', type: 'チェンソー' },
  { id: '15', code: 'C-15', type: 'チェンソー' },
  { id: '16', code: 'C-16', type: 'チェンソー' },
  { id: '17', code: 'C-17', type: 'チェンソー' },
  { id: '18', code: 'C-18', type: 'チェンソー' },
  { id: '19', code: 'C-19', type: 'チェンソー' },
  { id: '20', code: 'C-20', type: 'チェンソー' },
  // バリカン ENT-1〜ENT-12
  { id: '21', code: 'ENT-1', type: 'バリカン' },
  { id: '22', code: 'ENT-2', type: 'バリカン' },
  { id: '23', code: 'ENT-3', type: 'バリカン' },
  { id: '24', code: 'ENT-4', type: 'バリカン' },
  { id: '25', code: 'ENT-5', type: 'バリカン' },
  { id: '26', code: 'ENT-6', type: 'バリカン' },
  { id: '27', code: 'ENT-7', type: 'バリカン' },
  { id: '28', code: 'ENT-8', type: 'バリカン' },
  { id: '29', code: 'ENT-9', type: 'バリカン' },
  { id: '30', code: 'ENT-10', type: 'バリカン' },
  { id: '31', code: 'ENT-11', type: 'バリカン' },
  { id: '32', code: 'ENT-12', type: 'バリカン' },
  // バリカン 菊-1〜菊-3
  { id: '33', code: '菊-1', type: 'バリカン' },
  { id: '34', code: '菊-2', type: 'バリカン' },
  { id: '35', code: '菊-3', type: 'バリカン' },
  // 電バリ ELT-1〜ELT-10
  { id: '36', code: 'ELT-1', type: '電バリ' },
  { id: '37', code: 'ELT-2', type: '電バリ' },
  { id: '38', code: 'ELT-3', type: '電バリ' },
  { id: '39', code: 'ELT-4', type: '電バリ' },
  { id: '40', code: 'ELT-5', type: '電バリ' },
  { id: '41', code: 'ELT-6', type: '電バリ' },
  { id: '42', code: 'ELT-7', type: '電バリ' },
  { id: '43', code: 'ELT-8', type: '電バリ' },
  { id: '44', code: 'ELT-9', type: '電バリ' },
  { id: '45', code: 'ELT-10', type: '電バリ' },
  // 刈機 K-1〜K-2
  { id: '46', code: 'K-1', type: '刈機' },
  { id: '47', code: 'K-2', type: '刈機' },
  // 替刃
  { id: '48', code: '替刃', type: '刈機' },
  // ブロアー B-1〜B-8、B-9吸、BB-1
  { id: '49', code: 'B-1', type: 'ブロアー' },
  { id: '50', code: 'B-2', type: 'ブロアー' },
  { id: '51', code: 'B-3', type: 'ブロアー' },
  { id: '52', code: 'B-4', type: 'ブロアー' },
  { id: '53', code: 'B-5', type: 'ブロアー' },
  { id: '54', code: 'B-6', type: 'ブロアー' },
  { id: '55', code: 'B-7', type: 'ブロアー' },
  { id: '56', code: 'B-8', type: 'ブロアー' },
  { id: '57', code: 'B-9吸', type: 'ブロアー' },
  { id: '58', code: 'BB-1', type: 'ブロアー' },
  // 動噴 BS-1〜BS-2
  { id: '59', code: 'BS-1', type: '動噴' },
  { id: '60', code: 'BS-2', type: '動噴' },
]

// その他社有機械マスタデータ
const OTHER_MACHINERY = [
  { id: '1', name: 'ミニBH RX203', type: 'ミニBH' },
  { id: '2', name: 'ハンドガイド', type: 'ハンドガイド' },
  { id: '3', name: '発電機 G-1', type: '発電機' },
  { id: '4', name: '発電機 G-2', type: '発電機' },
]

interface Machinery {
  machinery_id: string
  code: string
  type: string
  user: string
}

interface LeaseMachine {
  category: string
  type: string
  driver: string
  count: string
  company: string
}

interface KYActivity {
  hazard: string
  countermeasure: string
  checked: boolean
}

// KY活動マスタデータ
const KY_ACTIVITIES_MASTER = [
  { hazard: '飛び石による事故', countermeasure: '養生の徹底' },
  { hazard: '使用機械によるケガ', countermeasure: '保護具の装着' },
  { hazard: '通行人との接触', countermeasure: '声がけ・周囲確認' },
  { hazard: '法面からの滑落', countermeasure: '足元確認' },
  { hazard: '高所からの落下', countermeasure: 'フルハーネスの装着' },
  { hazard: '電線等の切断', countermeasure: '目視確認・慎重な作業' },
  { hazard: '伐採木による事故', countermeasure: '伐倒方向の確認' },
  { hazard: '玉掛ミスによる事故', countermeasure: '有資格者による操作' },
  { hazard: '機械操縦ミスによる事故', countermeasure: '手順の確認' },
  { hazard: '高所作業車の墜転', countermeasure: 'アウトリガー確認等' },
]

export default function ConstructionDailyReportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    site_name: '',
    work_location: '',
    work_content: '',
    early_start: '',
    work_start_time: '08:30',
    work_end_time: '17:00',
    overtime: '',
    workers: [{ category: '世話役', name: '' }] as Worker[],
    own_vehicles: [] as OwnVehicle[],
    machinery: [] as Machinery[],
    other_machinery: [] as { machinery_id: string; name: string; type: string; user: string; refuel: string }[],
    lease_machines: [] as LeaseMachine[],
    other_materials: '',
    ky_activities: KY_ACTIVITIES_MASTER.map(activity => ({ ...activity, checked: false })),
    customer_requests: '',
    office_confirmation: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiClient.createConstructionDailyReport(formData)
      console.log('工事日報作成成功:', response)
      router.push('/dashboard')
    } catch (err) {
      setError('工事日報の作成に失敗しました。')
      console.error('Construction daily report error:', err)
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

  // 作業員関連
  const addWorker = () => {
    setFormData(prev => ({
      ...prev,
      workers: [...prev.workers, { category: '', name: '' }]
    }))
  }

  const updateWorker = (index: number, field: keyof Worker, value: string) => {
    setFormData(prev => ({
      ...prev,
      workers: prev.workers.map((worker, i) =>
        i === index ? { ...worker, [field]: value } : worker
      )
    }))
  }

  const removeWorker = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workers: prev.workers.filter((_, i) => i !== index)
    }))
  }

  // 自社車両関連
  const addOwnVehicle = () => {
    setFormData(prev => ({
      ...prev,
      own_vehicles: [...prev.own_vehicles, { vehicle_id: '', type: '', name: '', number: '', driver: '', refuel: '' }]
    }))
  }

  const updateOwnVehicle = (index: number, field: keyof OwnVehicle, value: string) => {
    setFormData(prev => ({
      ...prev,
      own_vehicles: prev.own_vehicles.map((vehicle, i) =>
        i === index ? { ...vehicle, [field]: value } : vehicle
      )
    }))
  }

  const handleVehicleSelect = (index: number, vehicleId: string) => {
    const selectedVehicle = COMPANY_VEHICLES.find(v => v.id === vehicleId)
    if (selectedVehicle) {
      setFormData(prev => ({
        ...prev,
        own_vehicles: prev.own_vehicles.map((vehicle, i) =>
          i === index ? {
            ...vehicle,
            vehicle_id: vehicleId,
            type: selectedVehicle.type,
            name: selectedVehicle.name,
            number: selectedVehicle.number
          } : vehicle
        )
      }))
    }
  }

  const removeOwnVehicle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      own_vehicles: prev.own_vehicles.filter((_, i) => i !== index)
    }))
  }

  // 機械関連
  const addMachinery = () => {
    setFormData(prev => ({
      ...prev,
      machinery: [...prev.machinery, { machinery_id: '', code: '', type: '', user: '' }]
    }))
  }

  const updateMachinery = (index: number, field: keyof Machinery, value: string) => {
    setFormData(prev => ({
      ...prev,
      machinery: prev.machinery.map((machine, i) =>
        i === index ? { ...machine, [field]: value } : machine
      )
    }))
  }

  const handleMachinerySelect = (index: number, machineryId: string) => {
    const selectedMachinery = COMPANY_MACHINERY.find(m => m.id === machineryId)
    if (selectedMachinery) {
      setFormData(prev => ({
        ...prev,
        machinery: prev.machinery.map((machine, i) =>
          i === index ? {
            ...machine,
            machinery_id: machineryId,
            code: selectedMachinery.code,
            type: selectedMachinery.type
          } : machine
        )
      }))
    }
  }

  const removeMachinery = (index: number) => {
    setFormData(prev => ({
      ...prev,
      machinery: prev.machinery.filter((_, i) => i !== index)
    }))
  }

  // その他機械
  const addOtherMachinery = () => {
    setFormData(prev => ({
      ...prev,
      other_machinery: [...prev.other_machinery, { machinery_id: '', name: '', type: '', user: '', refuel: '' }]
    }))
  }

  const updateOtherMachinery = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      other_machinery: prev.other_machinery.map((machine, i) =>
        i === index ? { ...machine, [field]: value } : machine
      )
    }))
  }

  const handleOtherMachinerySelect = (index: number, machineryId: string) => {
    const selectedMachinery = OTHER_MACHINERY.find(m => m.id === machineryId)
    if (selectedMachinery) {
      setFormData(prev => ({
        ...prev,
        other_machinery: prev.other_machinery.map((machine, i) =>
          i === index ? {
            ...machine,
            machinery_id: machineryId,
            name: selectedMachinery.name,
            type: selectedMachinery.type
          } : machine
        )
      }))
    }
  }

  const removeOtherMachinery = (index: number) => {
    setFormData(prev => ({
      ...prev,
      other_machinery: prev.other_machinery.filter((_, i) => i !== index)
    }))
  }

  // リース機械
  const addLeaseMachine = () => {
    setFormData(prev => ({
      ...prev,
      lease_machines: [...prev.lease_machines, { category: '', type: '', driver: '', count: '', company: '' }]
    }))
  }

  const updateLeaseMachine = (index: number, field: keyof LeaseMachine, value: string) => {
    setFormData(prev => ({
      ...prev,
      lease_machines: prev.lease_machines.map((lease, i) =>
        i === index ? { ...lease, [field]: value } : lease
      )
    }))
  }

  const removeLeaseMachine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lease_machines: prev.lease_machines.filter((_, i) => i !== index)
    }))
  }

  // KY活動
  const toggleKYActivity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ky_activities: prev.ky_activities.map((activity, i) =>
        i === index ? { ...activity, checked: !activity.checked } : activity
      )
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-sm shadow-soft border-b border-secondary-200">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
            <div className="space-y-2">
              <h1 className="heading-responsive text-secondary-900">工事日報</h1>
              <p className="text-secondary-600 text-lg">現場作業の日報作成</p>
            </div>
            <Link href="/dashboard" className="btn btn-outline btn-md">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container-responsive py-8">
        <div className="max-w-7xl mx-auto">
          <div className="card">
            <div className="card-header bg-primary-600 text-white">
              <h2 className="card-title text-white">工事日報 - 様式-13</h2>
              <p className="text-primary-100">株式会社 NIWAYA</p>
            </div>
            <div className="card-content">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 基本情報 */}
                <div className="form-section">
                  <h3 className="form-section-title">基本情報</h3>
                  <div className="form-row">
                    <div>
                      <label htmlFor="report_date" className="label label-required">日付</label>
                      <input
                        type="date"
                        id="report_date"
                        name="report_date"
                        value={formData.report_date}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="site_name" className="label label-required">現場名</label>
                      <input
                        type="text"
                        id="site_name"
                        name="site_name"
                        value={formData.site_name}
                        onChange={handleChange}
                        className="input"
                        placeholder="現場名を入力してください"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">※現場ごとに、タブが発生しています</p>
                    </div>
                  </div>
                </div>

                {/* 作業場所・内容 */}
                <div className="form-section">
                  <h3 className="form-section-title">作業情報</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="work_location" className="label label-required">作業場所</label>
                      <input
                        type="text"
                        id="work_location"
                        name="work_location"
                        value={formData.work_location}
                        onChange={handleChange}
                        className="input"
                        placeholder="出来る限り正確に記入"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">※公共工事の場合は、路線名、公園名も記入。 ○○線、○○公園 等。継続が完了からも記入。</p>
                    </div>
                    <div>
                      <label htmlFor="work_content" className="label label-required">作業内容</label>
                      <textarea
                        id="work_content"
                        name="work_content"
                        value={formData.work_content}
                        onChange={handleChange}
                        className="input"
                        rows={3}
                        placeholder="実施した作業内容を詳しく記入"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">※公共工事の場合は工種も記入してください。 機械除草、人力除草、寄植伐定 等。</p>
                    </div>
                  </div>
                </div>

                {/* 時間 */}
                <div className="form-section">
                  <h3 className="form-section-title">早出・作業時間・残業</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="early_start" className="label">早出</label>
                      <input
                        type="time"
                        id="early_start"
                        name="early_start"
                        value={formData.early_start}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                    <div>
                      <label htmlFor="work_start_time" className="label label-required">作業開始</label>
                      <input
                        type="time"
                        id="work_start_time"
                        name="work_start_time"
                        value={formData.work_start_time}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="work_end_time" className="label label-required">作業終了</label>
                      <input
                        type="time"
                        id="work_end_time"
                        name="work_end_time"
                        value={formData.work_end_time}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="overtime" className="label">残業</label>
                      <input
                        type="time"
                        id="overtime"
                        name="overtime"
                        value={formData.overtime}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* 作業員名 */}
                <div className="form-section">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="form-section-title">作業員名</h3>
                    <button
                      type="button"
                      onClick={addWorker}
                      className="btn btn-sm btn-primary"
                    >
                      + 作業員追加
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.workers.map((worker, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={worker.category}
                            onChange={(e) => updateWorker(index, 'category', e.target.value)}
                            className="input"
                            placeholder="区分（世話役、など）"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={worker.name}
                            onChange={(e) => updateWorker(index, 'name', e.target.value)}
                            className="input"
                            placeholder="氏名"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeWorker(index)}
                          className="btn btn-sm btn-error mt-0"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">※世話役の欄は、世話役がいない場合は記入無しで構いません。 ※協力業者は現場毎に人数を記入願います。</p>
                </div>

                {/* 自社車両 */}
                <div className="form-section">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="form-section-title">自社車両</h3>
                    <button
                      type="button"
                      onClick={addOwnVehicle}
                      className="btn btn-sm btn-primary"
                    >
                      + 車両追加
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.own_vehicles.map((vehicle, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-2">
                          <select
                            value={vehicle.vehicle_id}
                            onChange={(e) => handleVehicleSelect(index, e.target.value)}
                            className="input"
                          >
                            <option value="">車両を選択...</option>
                            {COMPANY_VEHICLES.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.type} {v.name} {v.number}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={vehicle.type}
                          className="input bg-gray-50"
                          placeholder="種別"
                          readOnly
                        />
                        <input
                          type="text"
                          value={vehicle.number}
                          className="input bg-gray-50"
                          placeholder="ナンバー"
                          readOnly
                        />
                        <input
                          type="text"
                          value={vehicle.driver}
                          onChange={(e) => updateOwnVehicle(index, 'driver', e.target.value)}
                          className="input"
                          placeholder="運転者"
                        />
                        <input
                          type="text"
                          value={vehicle.refuel}
                          onChange={(e) => updateOwnVehicle(index, 'refuel', e.target.value)}
                          className="input"
                          placeholder="給油㍑"
                        />
                        <button
                          type="button"
                          onClick={() => removeOwnVehicle(index)}
                          className="btn btn-sm btn-error"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* チェンソー・電バリ等の機械 */}
                <div className="form-section">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="form-section-title">チェンソー・バリカン・電バリ・刈機・ブロアー・動噴</h3>
                    <button
                      type="button"
                      onClick={addMachinery}
                      className="btn btn-sm btn-primary"
                    >
                      + 機械追加
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">機械選択</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">種別</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">記号</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">使用者</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.machinery.map((machine, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 border-r border-gray-300">
                              <select
                                value={machine.machinery_id}
                                onChange={(e) => handleMachinerySelect(index, e.target.value)}
                                className="input"
                              >
                                <option value="">機械を選択...</option>
                                <optgroup label="チェンソー">
                                  {COMPANY_MACHINERY.filter(m => m.type === 'チェンソー').map(m => (
                                    <option key={m.id} value={m.id}>{m.code}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="バリカン">
                                  {COMPANY_MACHINERY.filter(m => m.type === 'バリカン').map(m => (
                                    <option key={m.id} value={m.id}>{m.code}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="電バリ">
                                  {COMPANY_MACHINERY.filter(m => m.type === '電バリ').map(m => (
                                    <option key={m.id} value={m.id}>{m.code}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="刈機">
                                  {COMPANY_MACHINERY.filter(m => m.type === '刈機').map(m => (
                                    <option key={m.id} value={m.id}>{m.code}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="ブロアー">
                                  {COMPANY_MACHINERY.filter(m => m.type === 'ブロアー').map(m => (
                                    <option key={m.id} value={m.id}>{m.code}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="動噴">
                                  {COMPANY_MACHINERY.filter(m => m.type === '動噴').map(m => (
                                    <option key={m.id} value={m.id}>{m.code}</option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center border-r border-gray-300 bg-gray-50">
                              {machine.type}
                            </td>
                            <td className="px-4 py-3 text-center border-r border-gray-300 bg-gray-50">
                              {machine.code}
                            </td>
                            <td className="px-4 py-3 border-r border-gray-300">
                              <input
                                type="text"
                                value={machine.user}
                                onChange={(e) => updateMachinery(index, 'user', e.target.value)}
                                className="input"
                                placeholder="使用者"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeMachinery(index)}
                                className="btn btn-sm btn-error"
                              >
                                削除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* その他社有機械 */}
                <div className="form-section">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="form-section-title">その他社有機械（ミニBH、ハンドガイド、発電機等）</h3>
                    <button
                      type="button"
                      onClick={addOtherMachinery}
                      className="btn btn-sm btn-primary"
                    >
                      + 機械追加
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.other_machinery.map((machine, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2">
                          <select
                            value={machine.machinery_id}
                            onChange={(e) => handleOtherMachinerySelect(index, e.target.value)}
                            className="input"
                          >
                            <option value="">機械を選択...</option>
                            {OTHER_MACHINERY.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={machine.name}
                          className="input bg-gray-50"
                          placeholder="機械名"
                          readOnly
                        />
                        <input
                          type="text"
                          value={machine.user}
                          onChange={(e) => updateOtherMachinery(index, 'user', e.target.value)}
                          className="input"
                          placeholder="使用者"
                        />
                        <input
                          type="text"
                          value={machine.refuel}
                          onChange={(e) => updateOtherMachinery(index, 'refuel', e.target.value)}
                          className="input"
                          placeholder="給油㍑"
                        />
                        <button
                          type="button"
                          onClick={() => removeOtherMachinery(index)}
                          className="btn btn-sm btn-error"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* リース機械 */}
                <div className="form-section">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="form-section-title">リース</h3>
                    <button
                      type="button"
                      onClick={addLeaseMachine}
                      className="btn btn-sm btn-primary"
                    >
                      + 追加
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">種別</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">運転者</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">台数</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">会社名</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.lease_machines.map((lease, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 border-r border-gray-300">
                              <input
                                type="text"
                                value={lease.type}
                                onChange={(e) => updateLeaseMachine(index, 'type', e.target.value)}
                                className="input"
                                placeholder="種別"
                              />
                            </td>
                            <td className="px-4 py-3 border-r border-gray-300">
                              <input
                                type="text"
                                value={lease.driver}
                                onChange={(e) => updateLeaseMachine(index, 'driver', e.target.value)}
                                className="input"
                                placeholder="運転者"
                              />
                            </td>
                            <td className="px-4 py-3 border-r border-gray-300">
                              <input
                                type="text"
                                value={lease.count}
                                onChange={(e) => updateLeaseMachine(index, 'count', e.target.value)}
                                className="input"
                                placeholder="台数"
                              />
                            </td>
                            <td className="px-4 py-3 border-r border-gray-300">
                              <input
                                type="text"
                                value={lease.company}
                                onChange={(e) => updateLeaseMachine(index, 'company', e.target.value)}
                                className="input"
                                placeholder="エルビダ/仙台銘板/その他"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeLeaseMachine(index)}
                                className="btn btn-sm btn-error"
                              >
                                削除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* その他機材 */}
                <div className="form-section">
                  <h3 className="form-section-title">その他、上記以外の機材、材料等があれば記入</h3>
                  <textarea
                    id="other_materials"
                    name="other_materials"
                    value={formData.other_materials}
                    onChange={handleChange}
                    className="input"
                    rows={3}
                    placeholder="その他の機材・材料を記入してください"
                  />
                </div>

                {/* KY活動 */}
                <div className="form-section">
                  <h3 className="form-section-title mb-4">KY活動</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300 w-12">選択</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-300">危険ポイント</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">対策案</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.ky_activities.map((activity, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-center border-r border-gray-300">
                              <input
                                type="checkbox"
                                checked={activity.checked}
                                onChange={() => toggleKYActivity(index)}
                                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center border-r border-gray-300">
                              {activity.hazard}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {activity.countermeasure}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* お客様からの要望・会社への報告 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="customer_requests" className="label">お客様からの要望、及び会社への報告事項記入欄</label>
                    <textarea
                      id="customer_requests"
                      name="customer_requests"
                      value={formData.customer_requests}
                      onChange={handleChange}
                      className="input"
                      rows={4}
                      placeholder="お客様からの要望や会社への報告事項を記入してください"
                    />
                  </div>
                  <div>
                    <label htmlFor="office_confirmation" className="label">事務所確認</label>
                    <textarea
                      id="office_confirmation"
                      name="office_confirmation"
                      value={formData.office_confirmation}
                      onChange={handleChange}
                      className="input"
                      rows={4}
                      placeholder="事務所確認事項"
                    />
                  </div>
                </div>

                {/* エラーメッセージ */}
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
                    {error}
                  </div>
                )}

                {/* ボタン */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Link href="/dashboard" className="btn btn-secondary">
                    キャンセル
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? '作成中...' : '日報を作成'}
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
