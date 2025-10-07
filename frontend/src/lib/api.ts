const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    // 認証トークンを追加
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    console.log('[API Request]', endpoint, 'Token:', token ? `${token.substring(0, 20)}...` : 'null')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      console.log('[API Request] Authorization header added')
    } else {
      console.log('[API Request] No token available')
    }

    try {
      const response = await fetch(url, {
        headers,
        ...options,
      })

      if (!response.ok) {
        // レスポンスボディからエラー情報を取得
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch {
          // JSONパースに失敗した場合は空オブジェクト
        }

        if (response.status === 401) {
          // 認証エラーの場合、トークンを削除
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token')
            localStorage.removeItem('user')
            // ログイン画面以外にいる場合のみリダイレクト
            if (!window.location.pathname.includes('/auth/login')) {
              window.location.href = '/auth/login'
            }
          }
        }

        const error = new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`)
        ;(error as any).status = response.status
        ;(error as any).data = errorData
        throw error
      }

      return response.json()
    } catch (error: any) {
      // ネットワークエラーやその他のエラー
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('ネットワークエラーが発生しました。接続を確認してください。')
        ;(networkError as any).status = 0
        throw networkError
      }

      // APIエラーはそのまま再スロー
      throw error
    }
  }

  // 認証関連
  async login(email: string, password: string) {
    // ログインリクエストを送信（トークンなしで送る）
    const url = `${this.baseUrl}/api/v1/auth/login`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Login response:', data)

    // トークンをローカルストレージに保存
    if (data.access_token) {
      console.log('Saving token to localStorage:', data.access_token.substring(0, 20) + '...')
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // 保存確認
      const savedToken = localStorage.getItem('access_token')
      console.log('Token saved successfully:', savedToken ? 'YES' : 'NO')
      console.log('Saved token starts with:', savedToken ? savedToken.substring(0, 20) + '...' : 'null')
    } else {
      console.error('No access_token in response!')
    }

    return data
  }

  async logout() {
    try {
      await this.request('/api/v1/auth/logout', {
        method: 'POST',
      })
    } finally {
      // トークンを削除
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
    }
  }

  async getCurrentUser() {
    return this.request('/api/v1/auth/me')
  }

  // ユーザー関連
  async getUsers() {
    return this.request('/api/v1/users/')
  }

  async getUser(userId: string) {
    return this.request(`/api/v1/users/${userId}`)
  }

  // 申請関連
  async getRequests() {
    const response = await this.request<{success: boolean, data: any[], total: number}>('/api/v1/requests/')
    return response.data || []
  }

  async getRequest(requestId: string) {
    return this.request(`/api/v1/requests/${requestId}`)
  }

  async cancelRequest(requestId: string) {
    return this.request(`/api/v1/requests/${requestId}`, {
      method: 'DELETE'
    })
  }

  async createLeaveRequest(data: any) {
    // バックエンドが期待する形式に変換
    const requestData = {
      request: {
        title: `休暇申請 (${data.start_date} - ${data.end_date})`,
        description: data.reason || ''
      },
      leave_request: {
        leave_type: data.leave_type,
        start_date: data.start_date,
        end_date: data.end_date,
        days: data.days,
        hours: data.hours,
        reason: data.reason,
        handover_notes: data.handover_notes
      }
    }

    return this.request('/api/v1/requests/leave', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  async createOvertimeRequest(data: any) {
    // バックエンドが期待する形式に変換
    const requestData = {
      request: {
        title: `時間外労働申請 (${data.work_date})`,
        description: data.reason || ''
      },
      overtime_request: {
        work_date: data.work_date,
        start_time: data.start_time,
        end_time: data.end_time,
        break_time: data.break_time || 0,
        total_hours: data.total_hours,
        overtime_type: data.overtime_type,
        reason: data.reason,
        project_name: data.project_name
      }
    }

    return this.request('/api/v1/requests/overtime', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  async createExpenseRequest(data: any) {
    // バックエンドが期待する形式に変換
    const requestData = {
      request: {
        title: `経費申請 - ${data.purpose || '経費精算'}`,
        description: data.description || ''
      },
      expense_request: {
        expense_type: data.expense_type,
        purpose: data.purpose,
        total_amount: data.total_amount,
        vendor: data.vendor,
        occurred_date: data.occurred_date,
        description: data.description
      },
      expense_lines: data.expense_lines || []
    }

    return this.request('/api/v1/requests/expense', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  }

  async submitRequest(requestId: string) {
    return this.request(`/api/v1/requests/${requestId}/submit`, {
      method: 'POST',
    })
  }

  async approveRequest(requestId: string, comment?: string, receivedDate?: string) {
    return this.request(`/api/v1/requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment, received_date: receivedDate }),
    })
  }

  async rejectRequest(requestId: string, comment?: string) {
    return this.request(`/api/v1/requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  }

  async returnRequest(requestId: string, comment?: string) {
    return this.request(`/api/v1/requests/${requestId}/return`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  }

  // 承認関連
  async getApprovalRequests() {
    const response = await this.request<{success: boolean, data: any[], total: number}>('/api/v1/approvals/')
    return response.data || []
  }

  // 管理関連
  async getAdminStats() {
    const response = await this.request<{success: boolean, data: any}>('/api/v1/admin/stats')
    return response.data || {}
  }

  async updateUserStatus(userId: string, status: string) {
    return this.request(`/api/v1/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  // 休日出勤申請
  async createHolidayWorkRequest(data: any) {
    return this.request('/api/v1/requests/holiday-work', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // 工事日報
  async createConstructionDailyReport(data: any) {
    return this.request('/api/v1/requests/construction-daily', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // 立替金申請
  async createReimbursementRequest(data: any) {
    return this.request('/api/v1/requests/reimbursement', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // PDF関連
  async generateRequestPDF(requestId: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/requests/${requestId}/pdf`)
    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.status}`)
    }
    return response.blob()
  }

  // エクスポート機能
  async exportRequestsPDF(filters?: {
    status?: string;
    type?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const url = `/api/v1/export/requests/pdf?${params}`;
    return this.downloadFile(url);
  }

  async exportRequestsCSV(filters?: {
    status?: string;
    type?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const url = `/api/v1/export/requests/csv?${params}`;
    return this.downloadFile(url);
  }

  async exportRequestsExcel(filters?: {
    status?: string;
    type?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const url = `/api/v1/export/requests/excel?${params}`;
    return this.downloadFile(url);
  }

  async exportSummaryPDF(filters?: {
    start_date?: string;
    end_date?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const url = `/api/v1/export/summary/pdf?${params}`;
    return this.downloadFile(url);
  }

  async getSummaryReport(filters?: {
    start_date?: string;
    end_date?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const url = `/api/v1/reports/summary?${params}`;
    return this.request(url);
  }

  // 通知設定関連
  async getNotificationSettings() {
    const response = await this.request<{success: boolean, data: any}>('/api/v1/notifications/settings')
    return response.data || {}
  }

  async updateNotificationSettings(settings: {
    enabled: boolean;
    send_time: string;
    skip_weekends: boolean;
    skip_holidays: boolean;
  }) {
    return this.request('/api/v1/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  async sendDailyReportReminderNow() {
    return this.request('/api/v1/notifications/daily-report-reminder', {
      method: 'POST',
    })
  }

  private async downloadFile(url: string) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('認証が必要です');
    }

    const response = await fetch(`${this.baseUrl}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('ダウンロードに失敗しました');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : 'download';

    // ダウンロード処理
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true };
  }
}

export const apiClient = new ApiClient()
