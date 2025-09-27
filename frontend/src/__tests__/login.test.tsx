// ログインコンポーネントのテスト

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import Login from '../app/auth/login/page'
import { apiClient } from '../lib/api'

// モックの設定
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('../lib/api', () => ({
  apiClient: {
    login: jest.fn(),
  },
}))

const mockPush = jest.fn()
const mockReplace = jest.fn()

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const mockUseRouter = useRouter as jest.Mock
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    })

    // localStorageのモック
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    })
  })

  it('should render login form correctly', () => {
    render(<Login />)

    expect(screen.getByText('ログイン')).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    render(<Login />)

    const submitButton = screen.getByRole('button', { name: 'ログイン' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument()
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument()
    })
  })

  it('should show email validation error for invalid email', async () => {
    render(<Login />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument()
    })
  })

  it('should handle successful login', async () => {
    const mockLoginResponse = {
      access_token: 'test-token',
      token_type: 'bearer',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'employee'
      }
    }

    ;(apiClient.login as jest.Mock).mockResolvedValueOnce(mockLoginResponse)

    render(<Login />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(apiClient.login).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should handle login error', async () => {
    const mockError = new Error('Invalid credentials')
    ;(apiClient.login as jest.Mock).mockRejectedValueOnce(mockError)

    render(<Login />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('should show loading state during login', async () => {
    const mockPromise = new Promise(() => {}) // Never resolving promise
    ;(apiClient.login as jest.Mock).mockReturnValueOnce(mockPromise)

    render(<Login />)

    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    expect(screen.getByText('ログイン中...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('should toggle password visibility', () => {
    render(<Login />)

    const passwordInput = screen.getByLabelText('パスワード')
    const toggleButton = screen.getByLabelText('パスワードを表示')

    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('should show password strength indicator', () => {
    render(<Login />)

    const passwordInput = screen.getByLabelText('パスワード')

    // 弱いパスワード
    fireEvent.change(passwordInput, { target: { value: '123' } })
    expect(screen.getByText('弱い')).toBeInTheDocument()

    // 中程度のパスワード
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    expect(screen.getByText('中程度')).toBeInTheDocument()

    // 強いパスワード
    fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } })
    expect(screen.getByText('強い')).toBeInTheDocument()
  })

  it('should handle remember me functionality', () => {
    render(<Login />)

    const rememberCheckbox = screen.getByLabelText('ログイン状態を保持')

    expect(rememberCheckbox).not.toBeChecked()

    fireEvent.click(rememberCheckbox)
    expect(rememberCheckbox).toBeChecked()
  })
})