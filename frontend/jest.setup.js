// Jest設定ファイル

import '@testing-library/jest-dom'

// React Testing Libraryの設定
import { configure } from '@testing-library/react'

configure({
  testIdAttribute: 'data-testid',
})

// グローバルモック
global.console = {
  ...console,
  // エラーログのテストで邪魔にならないようにする
  error: jest.fn(),
  warn: jest.fn(),
}

// window.matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// IntersectionObserverのモック
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// ResizeObserverのモック
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// localStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

global.localStorage = localStorageMock

// sessionStorageのモック
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

global.sessionStorage = sessionStorageMock

// Fetchのモック
global.fetch = jest.fn()

// URLのモック
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// FileReaderのモック
global.FileReader = class {
  readAsDataURL() {
    this.onload({ target: { result: 'data:image/png;base64,mock' } })
  }
  readAsText() {
    this.onload({ target: { result: 'mock text' } })
  }
}