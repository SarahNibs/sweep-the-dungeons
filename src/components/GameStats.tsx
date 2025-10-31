import { useState, useRef, useEffect } from 'react'
import { GameStatusInfo } from '../types'
import { helpText } from '../helpText'
import { Tooltip } from './Tooltip'

// Inject CSS for pulse animation
const pulseAnimation = `
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 5px currentColor;
  }
  50% {
    box-shadow: 0 0 25px currentColor;
  }
}
`

// Add CSS to document if not already present
if (typeof document !== 'undefined' && !document.getElementById('pulse-glow-styles')) {
  const style = document.createElement('style')
  style.id = 'pulse-glow-styles'
  style.textContent = pulseAnimation
  document.head.appendChild(style)
}

interface GameStatsProps {
  onResetGame: () => void
  gameStatus: GameStatusInfo
}

export function GameStats({ onResetGame, gameStatus }: GameStatsProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [allowTransition, setAllowTransition] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const isAnimatingRef = useRef<boolean>(false)

  const ANIMATION_DURATION = 2000 // 2 seconds

  const startAnimation = () => {
    startTimeRef.current = Date.now()
    isAnimatingRef.current = true
    setIsPressed(true)
    setAnimationProgress(0)
    setAllowTransition(false)
    
    const animate = () => {
      if (!startTimeRef.current || !isAnimatingRef.current) {
        return
      }
      
      const elapsed = Date.now() - startTimeRef.current
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1)
      
      // Easing function: slow start, fast finish
      const easedProgress = progress * progress * (3 - 2 * progress)
      setAnimationProgress(easedProgress)
      
      if (progress >= 1) {
        // Animation complete - reset animation state first, then reset game
        isAnimatingRef.current = false
        setIsPressed(false)
        setAnimationProgress(0)
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
        // Reset game after state is cleared
        onResetGame()
        // Re-enable transitions after a brief delay
        setTimeout(() => setAllowTransition(true), 100)
      } else {
        animationRef.current = requestAnimationFrame(animate)
      }
    }
    
    animationRef.current = requestAnimationFrame(animate)
  }

  const resetAnimation = () => {
    isAnimatingRef.current = false
    setIsPressed(false)
    setAnimationProgress(0)
    setAllowTransition(true)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startAnimation()
  }

  const handleMouseUp = () => {
    resetAnimation()
  }

  const handleMouseLeave = () => {
    resetAnimation()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetAnimation()
    }
  }, [])

  const slideDistance = 110 // percentage - extra 10% for spacing

  const isGameEnded = gameStatus.status !== 'playing'
  
  const getPulseBorderColor = () => {
    if (gameStatus.status === 'player_won') return '#28a745' // Green
    if (gameStatus.status === 'player_lost') return '#dc3545' // Red
    return 'transparent'
  }

  return (
    <>
      <div
        style={{
          margin: '20px auto',
          width: 'fit-content',
          padding: '3px', // Space for the border to prevent layout shifts
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}
      >
        <Tooltip text="Click and hold for new game" style={{ display: 'inline-block' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 20px',
              backgroundColor: '#e5e5e5',
              borderRadius: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              border: isGameEnded ? `3px solid ${getPulseBorderColor()}` : '3px solid transparent',
              animation: isGameEnded ? 'pulseGlow 1.5s ease-in-out infinite' : 'none',
              color: getPulseBorderColor()
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              margin: '0',
              fontSize: '24px',
              color: '#4a4a4a',
              minWidth: '200px',
              minHeight: '30px'
            }}
          >
            {/* Original text */}
            <h1 style={{
              margin: '0',
              fontSize: '24px',
              color: '#4a4a4a',
              transform: `translateX(${isPressed ? animationProgress * slideDistance : 0}%)`,
              transition: allowTransition && !isPressed ? 'transform 0.2s ease' : 'none',
              opacity: isPressed ? 1 - animationProgress * 0.3 : 1,
              width: '100%',
              whiteSpace: 'nowrap'
            }}>
              Sweep The Dungeons
            </h1>

            {/* New text sliding in */}
            {isPressed && (
              <h1 style={{
                position: 'absolute',
                top: '0',
                left: '0',
                margin: '0',
                fontSize: '24px',
                color: '#4a4a4a',
                transform: `translateX(${-slideDistance + animationProgress * slideDistance}%)`,
                opacity: animationProgress,
                width: '100%',
                whiteSpace: 'nowrap'
              }}>
                Sweep The Dungeons
              </h1>
            )}
          </div>
        </div>
        </Tooltip>

        {/* Help button */}
        <Tooltip text="Help" style={{ display: 'inline-block' }}>
          <div
            onClick={(e) => {
            e.stopPropagation()
            setShowHelp(true)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            backgroundColor: '#e5e5e5',
            borderRadius: '8px',
            cursor: 'pointer',
            userSelect: 'none',
            border: '3px solid transparent',
            fontSize: '18px',
            color: '#4a4a4a',
            fontWeight: 'bold'
          }}
        >
          ?
        </div>
        </Tooltip>
      </div>

      {/* Help Screen Overlay */}
      {showHelp && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowHelp(false)}
        >
          <div
            style={{
              backgroundColor: '#2d3748',
              borderRadius: '8px',
              padding: '30px',
              border: '2px solid #4a5568',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80%',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowHelp(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '30px',
                height: '30px',
                backgroundColor: '#4a5568',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>

            <h2 style={{
              color: '#e2e8f0',
              marginBottom: '20px',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              Help
            </h2>

            <div style={{
              color: '#e2e8f0',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }}>
              {helpText}
            </div>
          </div>
        </div>
      )}
    </>
  )
}