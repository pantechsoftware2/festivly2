/**
 * Lightweight UI Components - Consistent Design System
 * Used across all pages: modals, spinners, boxes, cards
 */

'use client'

/**
 * Modal Container - Base for all modals
 */
export function ModalContainer({
  children,
  isOpen = true,
  className = '',
}: {
  children: React.ReactNode
  isOpen?: boolean
  className?: string
}) {
  if (!isOpen) return null
  
  return (
    <div className={`fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 ${className}`}>
      {children}
    </div>
  )
}

/**
 * Card Box - Base for all content boxes
 */
export function CardBox({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-slate-900/10 backdrop-blur-lg border border-purple-400/10 rounded-2xl p-6 shadow-lg shadow-purple-900/5 ${className}`}>
      {children}
    </div>
  )
}

/**
 * Gradient Card Box - For premium/featured content
 */
export function GradientCardBox({
  children,
  className = '',
  from = 'purple',
  to = 'pink',
}: {
  children: React.ReactNode
  className?: string
  from?: string
  to?: string
}) {
  return (
    <div className={`bg-linear-to-br from-${from}-900/10 via-slate-900/5 to-${to}-900/10 backdrop-blur-lg border border-${from}-400/15 rounded-2xl p-6 shadow-lg shadow-${from}-900/5 ${className}`}>
      {children}
    </div>
  )
}

/**
 * Spinner Box - Container for loading spinners
 */
export function SpinnerBox({
  title = 'Loading...',
  subtitle = '',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <ModalContainer>
      <CardBox className="max-w-sm w-full">
        <div className="flex flex-col items-center justify-center gap-6 py-8">
          {/* Modern Spinner */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-3 border-transparent border-b-pink-500 border-l-pink-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-linear-to-r from-purple-500 to-pink-500 rounded-full" />
            </div>
          </div>

          {/* Text */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            {subtitle && <p className="text-purple-200/60 text-sm">{subtitle}</p>}
          </div>

          {/* Animated Dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-linear-to-r from-purple-400 to-pink-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </CardBox>
    </ModalContainer>
  )
}

/**
 * Event Box - For displaying event cards
 */
export function EventBox({
  icon,
  title,
  description,
  onClick,
  isActive = false,
}: {
  icon: string | React.ReactNode
  title: string
  description?: string
  onClick?: () => void
  isActive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full transition-all duration-200 ${
        isActive ? 'ring-2 ring-purple-500' : ''
      }`}
    >
      <CardBox className={`cursor-pointer hover:border-purple-400/30 hover:bg-purple-400/5 transition-all ${isActive ? 'bg-purple-500/5 border-purple-400/30' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="text-3xl">{icon}</div>
          <div className="flex-1">
            <h3 className="text-white/90 font-medium">{title}</h3>
            {description && <p className="text-purple-200/50 text-sm mt-1">{description}</p>}
          </div>
        </div>
      </CardBox>
    </button>
  )
}

/**
 * Info Box - For displaying information
 */
export function InfoBox({
  icon = 'ℹ️',
  title,
  message,
  type = 'info',
}: {
  icon?: string
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
}) {
  const colors = {
    info: 'bg-blue-400/10 border-blue-400/20 text-blue-200',
    success: 'bg-green-400/10 border-green-400/20 text-green-200',
    warning: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-200',
    error: 'bg-red-400/10 border-red-400/20 text-red-200',
  }

  return (
    <div className={`${colors[type]} border rounded-xl p-4 flex gap-3 backdrop-blur-sm`}>
      <span className="text-xl">{icon}</span>
      <div>
        {title && <p className="font-medium text-sm">{title}</p>}
        <p className="text-sm opacity-80">{message}</p>
      </div>
    </div>
  )
}

/**
 * Button - Lightweight action button
 */
export function ButtonBox({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  disabled?: boolean
  className?: string
}) {
  const variants = {
    primary: 'bg-purple-600/80 hover:bg-purple-600 text-white/90',
    secondary: 'bg-slate-700/50 hover:bg-slate-700 text-white/80',
    danger: 'bg-red-600/80 hover:bg-red-600 text-white/90',
    success: 'bg-green-600/80 hover:bg-green-600 text-white/90',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/**
 * Header Box - For section headers
 */
export function HeaderBox({
  icon,
  title,
  subtitle,
}: {
  icon?: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="text-center mb-8">
      {icon && <div className="text-4xl mb-3">{icon}</div>}
      <h2 className="text-2xl font-semibold text-white/90 mb-2">{title}</h2>
      {subtitle && <p className="text-purple-200/50">{subtitle}</p>}
    </div>
  )
}
