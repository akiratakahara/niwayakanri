// エラーハンドリングユーティリティ

export interface APIError {
  message: string
  status?: number
  code?: string
  details?: any
}

export class AppError extends Error {
  public status: number
  public code: string
  public details?: any

  constructor(message: string, status: number = 500, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// API エラーを AppError に変換
export function handleAPIError(error: any): AppError {
  if (error instanceof AppError) {
    return error
  }

  // ネットワークエラー
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new AppError(
      'サーバーに接続できませんでした。ネットワーク接続を確認してください。',
      0,
      'NETWORK_ERROR'
    )
  }

  // HTTPエラー
  if (error.message?.includes('API Error:')) {
    const match = error.message.match(/API Error: (\d+) (.+)/)
    if (match) {
      const [, statusStr, statusText] = match
      const status = parseInt(statusStr)

      let message = 'エラーが発生しました。'
      let code = 'HTTP_ERROR'

      switch (status) {
        case 400:
          message = '入力内容に問題があります。'
          code = 'BAD_REQUEST'
          break
        case 401:
          message = '認証が必要です。再度ログインしてください。'
          code = 'UNAUTHORIZED'
          break
        case 403:
          message = 'この操作を行う権限がありません。'
          code = 'FORBIDDEN'
          break
        case 404:
          message = '要求されたリソースが見つかりません。'
          code = 'NOT_FOUND'
          break
        case 429:
          message = 'リクエストが多すぎます。しばらく時間をおいてください。'
          code = 'TOO_MANY_REQUESTS'
          break
        case 500:
          message = 'サーバーエラーが発生しました。しばらく時間をおいてください。'
          code = 'INTERNAL_SERVER_ERROR'
          break
        default:
          message = `サーバーエラー (${status}): ${statusText}`
      }

      return new AppError(message, status, code)
    }
  }

  // その他のエラー
  return new AppError(
    error.message || '予期しないエラーが発生しました。',
    500,
    'UNKNOWN_ERROR',
    error
  )
}

// フロントエンド用エラー表示
export function getErrorMessage(error: any): string {
  const appError = handleAPIError(error)
  return appError.message
}

// ログ出力
export function logError(error: any, context?: string) {
  const appError = handleAPIError(error)

  console.error(`[ERROR${context ? ` - ${context}` : ''}]`, {
    message: appError.message,
    status: appError.status,
    code: appError.code,
    details: appError.details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  })

  // 本番環境では外部ログサービスに送信
  if (process.env.NODE_ENV === 'production') {
    // Sentry, LogRocket などのログサービスに送信
    // sendToLogService(appError, context)
  }
}

// Toast通知用のエラーハンドラー
export function showErrorToast(error: any, context?: string) {
  const message = getErrorMessage(error)
  logError(error, context)

  // Toast通知を表示 (react-hot-toast を使用)
  if (typeof window !== 'undefined') {
    // 動的インポートでToastライブラリを読み込み
    import('react-hot-toast').then(({ default: toast }) => {
      toast.error(message, {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#FEF2F2',
          color: '#DC2626',
          border: '1px solid #FECACA',
        }
      })
    }).catch(() => {
      // Toastライブラリが利用できない場合はalertを使用
      alert(message)
    })
  }
}

// リトライ機能付きのAPI呼び出し
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries) {
        break
      }

      // 認証エラーの場合はリトライしない
      const appError = handleAPIError(error)
      if (appError.status === 401) {
        break
      }

      // 指数バックオフでリトライ
      const backoffDelay = delay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, backoffDelay))

      logError(error, `Retry attempt ${attempt}/${maxRetries}`)
    }
  }

  throw lastError
}

// フォームバリデーションエラー
export interface ValidationErrorDetail {
  field: string
  message: string
}

export class ValidationError extends AppError {
  public errors: ValidationErrorDetail[]

  constructor(errors: ValidationErrorDetail[]) {
    const messages = errors.map(e => `${e.field}: ${e.message}`).join(', ')
    super(`入力エラー: ${messages}`, 400, 'VALIDATION_ERROR')
    this.errors = errors
  }
}

// バリデーションヘルパー
export function validateRequired(value: any, fieldName: string): ValidationErrorDetail | null {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { field: fieldName, message: '必須項目です' }
  }
  return null
}

export function validateEmail(email: string): ValidationErrorDetail | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { field: 'email', message: '有効なメールアドレスを入力してください' }
  }
  return null
}

export function validatePassword(password: string): ValidationErrorDetail | null {
  if (password.length < 6) {
    return { field: 'password', message: 'パスワードは6文字以上で入力してください' }
  }
  return null
}