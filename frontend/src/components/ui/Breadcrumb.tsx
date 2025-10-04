import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex', className)} aria-label="パンくずリスト">
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <Link 
            href="/dashboard" 
            className="text-secondary-500 hover:text-secondary-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">ホーム</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-secondary-400 mx-2" />
            {item.href ? (
              <Link 
                href={item.href}
                className="text-secondary-500 hover:text-secondary-700 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-secondary-900 font-medium">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageHeader({ 
  title, 
  description, 
  breadcrumb,
  actions 
}: {
  title: string
  description?: string
  breadcrumb?: BreadcrumbItem[]
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-8">
      {breadcrumb && (
        <div className="mb-4">
          <Breadcrumb items={breadcrumb} />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="heading-responsive text-secondary-900">
            {title}
          </h1>
          {description && (
            <p className="text-secondary-600 text-lg mt-2">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

