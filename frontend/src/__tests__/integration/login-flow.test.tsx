// ログインフローの統合テスト

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../../app/auth/login/page'
import { apiClient } from '../../lib/api'

// モックの設定
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

jest.mock('../../lib/api')

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('Login Flow Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // localStorageのリセット
    window.localStorage.clear()

    // fetchのモック
    global.fetch = jest.fn()
  })

  it('should complete full login flow successfully', async () => {
    const mockLoginResponse = {
      access_token: 'test-access-token',
      token_type: 'bearer',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@example.com',
        name: '管理者',
        role: 'admin',
        department: '情報システム部',
        position: '部長'
      }
    }

    mockApiClient.login.mockResolvedValueOnce(mockLoginResponse)

    render(<Login />)

    // フォームの表示確認
    expect(screen.getByText('勤怠・社内申請システム')).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()

    // フォーム入力
    await user.type(screen.getByLabelText('メールアドレス'), 'admin@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'password')

    // ログインボタンクリック
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    // ローディング状態の確認
    expect(screen.getByText('ログイン中...')).toBeInTheDocument()

    // API呼び出しの確認
    await waitFor(() => {
      expect(mockApiClient.login).toHaveBeenCalledWith('admin@example.com', 'password')
    })

    // ローカルストレージへの保存確認は実際のAPIClientで行われるためここではモック確認のみ
    expect(mockApiClient.login).toHaveBeenCalledTimes(1)
  })

  it('should handle validation errors properly', async () => {
    render(<Login />)

    // 空のフォームで送信
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    // バリデーションエラーの表示確認
    await waitFor(() => {
      expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument()
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument()
    })

    // 無効なメールアドレス
    await user.type(screen.getByLabelText('メールアドレス'), 'invalid-email')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    mockApiClient.login.mockRejectedValueOnce(new Error('Invalid credentials'))

    render(<Login />)

    // 正しい形式で入力
    await user.type(screen.getByLabelText('メールアドレス'), 'admin@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    // エラーメッセージの表示確認
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    // フォームが再度使用可能になることを確認
    expect(screen.getByRole('button', { name: 'ログイン' })).not.toBeDisabled()
  })

  it('should handle network errors', async () => {
    const networkError = new Error('ネットワークエラーが発生しました')
    mockApiClient.login.mockRejectedValueOnce(networkError)

    render(<Login />)

    await user.type(screen.getByLabelText('メールアドレス'), 'admin@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'password')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument()
    })
  })

  it('should toggle password visibility', async () => {
    render(<Login />)

    const passwordInput = screen.getByLabelText('パスワード')
    const toggleButton = screen.getByLabelText('パスワードを表示')

    // 初期状態は非表示
    expect(passwordInput).toHaveAttribute('type', 'password')

    // 表示に切り替え
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')

    // 再度非表示に切り替え
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('should show password strength indicator', async () => {
    render(<Login />)

    const passwordInput = screen.getByLabelText('パスワード')

    // 弱いパスワード
    await user.type(passwordInput, '123')
    expect(screen.getByText('弱い')).toBeInTheDocument()
    expect(screen.getByText('弱い').closest('div')).toHaveClass('text-red-500')

    // 入力をクリア
    await user.clear(passwordInput)

    // 中程度のパスワード
    await user.type(passwordInput, 'password123')
    expect(screen.getByText('中程度')).toBeInTheDocument()
    expect(screen.getByText('中程度').closest('div')).toHaveClass('text-yellow-500')

    // 入力をクリア
    await user.clear(passwordInput)

    // 強いパスワード
    await user.type(passwordInput, 'StrongPassword123!')
    expect(screen.getByText('強い')).toBeInTheDocument()
    expect(screen.getByText('強い').closest('div')).toHaveClass('text-green-500')
  })

  it('should handle remember me functionality', async () => {
    render(<Login />)

    const rememberCheckbox = screen.getByLabelText('ログイン状態を保持')

    // 初期状態は未チェック
    expect(rememberCheckbox).not.toBeChecked()

    // チェックボックスをクリック
    await user.click(rememberCheckbox)
    expect(rememberCheckbox).toBeChecked()

    // 再度クリックで未チェック
    await user.click(rememberCheckbox)
    expect(rememberCheckbox).not.toBeChecked()
  })

  it('should disable form during login process', async () => {
    // ログインが完了しないPromiseを返す
    mockApiClient.login.mockImplementation(() => new Promise(() => {}))

    render(<Login />)

    await user.type(screen.getByLabelText('メールアドレス'), 'admin@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'password')

    const submitButton = screen.getByRole('button', { name: 'ログイン' })
    await user.click(submitButton)

    // ローディング中はフォームが無効化される
    expect(screen.getByLabelText('メールアドレス')).toBeDisabled()
    expect(screen.getByLabelText('パスワード')).toBeDisabled()
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('ログイン中...')).toBeInTheDocument()
  })

  it('should focus first error field on validation failure', async () => {
    render(<Login />)

    // パスワードのみ入力して送信
    await user.type(screen.getByLabelText('パスワード'), 'password')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    // メールアドレス入力欄にフォーカスが当たることを確認
    await waitFor(() => {
      expect(screen.getByLabelText('メールアドレス')).toHaveFocus()
    })
  })
})