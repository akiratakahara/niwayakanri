// エラーハンドリングユーティリティのテスト

import {
  AppError,
  handleAPIError,
  getErrorMessage,
  logError,
  withRetry,
  ValidationError,
  validateRequired,
  validateEmail,
  validatePassword
} from '../lib/error-handler'

// グローバルオブジェクトのモック
global.navigator = {
  userAgent: 'Test User Agent'
} as Navigator;

global.window = {
  location: {
    href: 'http://localhost:3000/test'
  }
} as Window & typeof globalThis;

describe('AppError', () => {
  it('should create AppError with default values', () => {
    const error = new AppError('Test error')

    expect(error.message).toBe('Test error')
    expect(error.status).toBe(500)
    expect(error.code).toBe('UNKNOWN_ERROR')
    expect(error.name).toBe('AppError')
  })

  it('should create AppError with custom values', () => {
    const error = new AppError('Custom error', 404, 'NOT_FOUND', { resource: 'user' })

    expect(error.message).toBe('Custom error')
    expect(error.status).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.details).toEqual({ resource: 'user' })
  })
})

describe('handleAPIError', () => {
  it('should return AppError as is', () => {
    const originalError = new AppError('Original error', 400, 'BAD_REQUEST')
    const result = handleAPIError(originalError)

    expect(result).toBe(originalError)
  })

  it('should handle network errors', () => {
    const networkError = new TypeError('Failed to fetch')
    const result = handleAPIError(networkError)

    expect(result.message).toBe('サーバーに接続できませんでした。ネットワーク接続を確認してください。')
    expect(result.status).toBe(0)
    expect(result.code).toBe('NETWORK_ERROR')
  })

  it('should handle HTTP 400 errors', () => {
    const httpError = new Error('API Error: 400 Bad Request')
    const result = handleAPIError(httpError)

    expect(result.message).toBe('入力内容に問題があります。')
    expect(result.status).toBe(400)
    expect(result.code).toBe('BAD_REQUEST')
  })

  it('should handle HTTP 401 errors', () => {
    const httpError = new Error('API Error: 401 Unauthorized')
    const result = handleAPIError(httpError)

    expect(result.message).toBe('認証が必要です。再度ログインしてください。')
    expect(result.status).toBe(401)
    expect(result.code).toBe('UNAUTHORIZED')
  })

  it('should handle HTTP 403 errors', () => {
    const httpError = new Error('API Error: 403 Forbidden')
    const result = handleAPIError(httpError)

    expect(result.message).toBe('この操作を行う権限がありません。')
    expect(result.status).toBe(403)
    expect(result.code).toBe('FORBIDDEN')
  })

  it('should handle HTTP 404 errors', () => {
    const httpError = new Error('API Error: 404 Not Found')
    const result = handleAPIError(httpError)

    expect(result.message).toBe('要求されたリソースが見つかりません。')
    expect(result.status).toBe(404)
    expect(result.code).toBe('NOT_FOUND')
  })

  it('should handle HTTP 429 errors', () => {
    const httpError = new Error('API Error: 429 Too Many Requests')
    const result = handleAPIError(httpError)

    expect(result.message).toBe('リクエストが多すぎます。しばらく時間をおいてください。')
    expect(result.status).toBe(429)
    expect(result.code).toBe('TOO_MANY_REQUESTS')
  })

  it('should handle HTTP 500 errors', () => {
    const httpError = new Error('API Error: 500 Internal Server Error')
    const result = handleAPIError(httpError)

    expect(result.message).toBe('サーバーエラーが発生しました。しばらく時間をおいてください。')
    expect(result.status).toBe(500)
    expect(result.code).toBe('INTERNAL_SERVER_ERROR')
  })

  it('should handle unknown errors', () => {
    const unknownError = new Error('Unknown error')
    const result = handleAPIError(unknownError)

    expect(result.message).toBe('Unknown error')
    expect(result.status).toBe(500)
    expect(result.code).toBe('UNKNOWN_ERROR')
  })
})

describe('getErrorMessage', () => {
  it('should return error message', () => {
    const error = new AppError('Test error message')
    const message = getErrorMessage(error)

    expect(message).toBe('Test error message')
  })
})

describe('logError', () => {
  const originalConsoleError = console.error

  beforeEach(() => {
    console.error = jest.fn()
  })

  afterEach(() => {
    console.error = originalConsoleError
  })

  it('should log error to console', () => {
    const error = new AppError('Test error', 400, 'TEST_ERROR')
    logError(error, 'test context')

    expect(console.error).toHaveBeenCalledWith(
      '[ERROR - test context]',
      expect.objectContaining({
        message: 'Test error',
        status: 400,
        code: 'TEST_ERROR',
        timestamp: expect.any(String),
        userAgent: 'Test User Agent',
        url: 'http://localhost:3000/test'
      })
    )
  })
})

describe('withRetry', () => {
  jest.useFakeTimers()

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('should return result on first success', async () => {
    const mockFn = jest.fn().mockResolvedValueOnce('success')

    const result = await withRetry(mockFn, 3, 1000)

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success')

    const resultPromise = withRetry(mockFn, 3, 1000)

    // 最初の呼び出し
    await jest.runOnlyPendingTimersAsync()

    // 1回目のリトライ
    await jest.runOnlyPendingTimersAsync()

    const result = await resultPromise

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(3)
  })

  it('should not retry on 401 error', async () => {
    const authError = new AppError('Unauthorized', 401, 'UNAUTHORIZED')
    const mockFn = jest.fn().mockRejectedValue(authError)

    await expect(withRetry(mockFn, 3, 1000)).rejects.toThrow('Unauthorized')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should throw last error after max retries', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'))

    const resultPromise = withRetry(mockFn, 2, 1000)

    // 最初の呼び出し
    await jest.runOnlyPendingTimersAsync()

    await expect(resultPromise).rejects.toThrow('Persistent failure')
    expect(mockFn).toHaveBeenCalledTimes(2)
  })
})

describe('ValidationError', () => {
  it('should create ValidationError with multiple errors', () => {
    const errors = [
      { field: 'email', message: 'Invalid email' },
      { field: 'password', message: 'Too short' }
    ]

    const validationError = new ValidationError(errors)

    expect(validationError.message).toBe('入力エラー: email: Invalid email, password: Too short')
    expect(validationError.status).toBe(400)
    expect(validationError.code).toBe('VALIDATION_ERROR')
    expect(validationError.errors).toEqual(errors)
  })
})

describe('Validation helpers', () => {
  describe('validateRequired', () => {
    it('should return null for valid values', () => {
      expect(validateRequired('test', 'field')).toBeNull()
      expect(validateRequired(123, 'field')).toBeNull()
      expect(validateRequired(true, 'field')).toBeNull()
    })

    it('should return error for empty values', () => {
      expect(validateRequired('', 'field')).toEqual({
        field: 'field',
        message: '必須項目です'
      })
      expect(validateRequired('   ', 'field')).toEqual({
        field: 'field',
        message: '必須項目です'
      })
      expect(validateRequired(null, 'field')).toEqual({
        field: 'field',
        message: '必須項目です'
      })
      expect(validateRequired(undefined, 'field')).toEqual({
        field: 'field',
        message: '必須項目です'
      })
    })
  })

  describe('validateEmail', () => {
    it('should return null for valid emails', () => {
      expect(validateEmail('test@example.com')).toBeNull()
      expect(validateEmail('user.name@domain.co.jp')).toBeNull()
    })

    it('should return error for invalid emails', () => {
      expect(validateEmail('invalid-email')).toEqual({
        field: 'email',
        message: '有効なメールアドレスを入力してください'
      })
      expect(validateEmail('test@')).toEqual({
        field: 'email',
        message: '有効なメールアドレスを入力してください'
      })
      expect(validateEmail('@example.com')).toEqual({
        field: 'email',
        message: '有効なメールアドレスを入力してください'
      })
    })
  })

  describe('validatePassword', () => {
    it('should return null for valid passwords', () => {
      expect(validatePassword('password123')).toBeNull()
      expect(validatePassword('123456')).toBeNull()
    })

    it('should return error for short passwords', () => {
      expect(validatePassword('12345')).toEqual({
        field: 'password',
        message: 'パスワードは6文字以上で入力してください'
      })
      expect(validatePassword('')).toEqual({
        field: 'password',
        message: 'パスワードは6文字以上で入力してください'
      })
    })
  })
})