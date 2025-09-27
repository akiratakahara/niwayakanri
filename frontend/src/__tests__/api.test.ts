// API クライアントのテスト

import { apiClient } from '../lib/api'

// モックの設定
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// localStorageのモック
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    mockLocalStorage.removeItem.mockClear()
  })

  describe('login', () => {
    it('should login successfully and store token', async () => {
      const mockResponse = {
        access_token: 'test-token',
        token_type: 'bearer',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'employee'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await apiClient.login('test@example.com', 'password')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password'
          })
        })
      )

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'access_token',
        'test-token'
      )
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockResponse.user)
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle login error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid credentials' }),
      } as Response)

      await expect(
        apiClient.login('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('logout', () => {
    it('should logout and clear tokens', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      await apiClient.logout()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user')
    })
  })

  describe('authenticated requests', () => {
    it('should include Authorization header when token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      await apiClient.getRequests()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/requests/',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })

    it('should handle 401 error and redirect to login', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token')

      // window.location.href のモック
      delete (window as any).location
      window.location = { href: '' } as any

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Token expired' }),
      } as Response)

      await expect(apiClient.getRequests()).rejects.toThrow('Token expired')

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user')
    })
  })

  describe('network errors', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      )

      await expect(
        apiClient.login('test@example.com', 'password')
      ).rejects.toThrow('ネットワークエラーが発生しました')
    })
  })
})