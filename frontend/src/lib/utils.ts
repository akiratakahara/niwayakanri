import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'success'
    case 'rejected':
      return 'error'
    case 'applied':
      return 'warning'
    case 'draft':
      return 'secondary'
    default:
      return 'secondary'
  }
}

export function getStatusText(status: string) {
  switch (status) {
    case 'approved':
      return '承認済み'
    case 'rejected':
      return '却下'
    case 'applied':
      return '申請中'
    case 'draft':
      return '下書き'
    default:
      return '不明'
  }
}

export function getRequestTypeText(type: string) {
  switch (type) {
    case 'leave':
      return '休暇'
    case 'overtime':
      return '時間外'
    case 'holiday_work':
      return '休日出勤'
    case 'expense':
      return '仮払・立替'
    case 'construction_daily':
      return '工事日報'
    default:
      return '不明'
  }
}

export function getRequestTypeColor(type: string) {
  switch (type) {
    case 'leave':
      return 'primary'
    case 'overtime':
      return 'warning'
    case 'holiday_work':
      return 'info'
    case 'expense':
      return 'success'
    case 'construction_daily':
      return 'secondary'
    default:
      return 'secondary'
  }
}

