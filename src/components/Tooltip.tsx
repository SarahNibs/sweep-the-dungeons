import { ReactNode, useState, useRef, useEffect, CSSProperties } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  children: ReactNode
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  style?: CSSProperties
}

export function Tooltip({ children, text, position = 'top', style }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const scrollX = window.scrollX || window.pageXOffset
      const scrollY = window.scrollY || window.pageYOffset

      let top = 0
      let left = 0

      switch (position) {
        case 'top':
          top = rect.top + scrollY - 8
          left = rect.left + scrollX + rect.width / 2
          break
        case 'bottom':
          top = rect.bottom + scrollY + 8
          left = rect.left + scrollX + rect.width / 2
          break
        case 'left':
          top = rect.top + scrollY + rect.height / 2
          left = rect.left + scrollX - 8
          break
        case 'right':
          top = rect.top + scrollY + rect.height / 2
          left = rect.right + scrollX + 8
          break
      }

      setTooltipPos({ top, left })
    }
  }, [isVisible, position])

  const getPositionStyles = (): CSSProperties => {
    const baseStyles: CSSProperties = {
      position: 'absolute',
      backgroundColor: '#1f2937',
      color: 'white',
      fontSize: '12px',
      borderRadius: '6px',
      padding: '4px 8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      whiteSpace: 'pre-wrap',
      minWidth: '200px',
      maxWidth: '400px',
      zIndex: 10000,
      pointerEvents: 'none',
      textAlign: 'center',
      top: `${tooltipPos.top}px`,
      left: `${tooltipPos.left}px`
    }

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          transform: 'translate(-50%, -100%)'
        }
      case 'bottom':
        return {
          ...baseStyles,
          transform: 'translateX(-50%)'
        }
      case 'left':
        return {
          ...baseStyles,
          transform: 'translate(-100%, -50%)'
        }
      case 'right':
        return {
          ...baseStyles,
          transform: 'translateY(-50%)'
        }
    }
  }

  return (
    <div
      ref={triggerRef}
      style={{ position: 'relative', display: 'inline-block', ...style }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && text && createPortal(
        <div style={getPositionStyles()}>
          {text}
        </div>,
        document.body
      )}
    </div>
  )
}