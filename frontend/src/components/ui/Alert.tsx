import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

const alertStyles = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
}

const alertIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function Alert({ 
  type = 'info', 
  title, 
  children, 
  className,
  onClose 
}: AlertProps) {
  const Icon = alertIcons[type]
  
  return (
    <div className={cn('alert', alertStyles[type], className)}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex text-current hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
            >
              <span className="sr-only">閉じる</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ErrorAlert({ 
  title = 'エラーが発生しました', 
  children, 
  onClose 
}: Omit<AlertProps, 'type'>) {
  return (
    <Alert type="error" title={title} onClose={onClose}>
      {children}
    </Alert>
  )
}

export function SuccessAlert({ 
  title = '成功', 
  children, 
  onClose 
}: Omit<AlertProps, 'type'>) {
  return (
    <Alert type="success" title={title} onClose={onClose}>
      {children}
    </Alert>
  )
}

export function WarningAlert({ 
  title = '注意', 
  children, 
  onClose 
}: Omit<AlertProps, 'type'>) {
  return (
    <Alert type="warning" title={title} onClose={onClose}>
      {children}
    </Alert>
  )
}

export function InfoAlert({ 
  title = '情報', 
  children, 
  onClose 
}: Omit<AlertProps, 'type'>) {
  return (
    <Alert type="info" title={title} onClose={onClose}>
      {children}
    </Alert>
  )
}

