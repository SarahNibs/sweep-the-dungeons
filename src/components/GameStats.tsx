import { useState, useRef, useEffect } from 'react'

interface GameStatsProps {
  onResetGame: () => void
}

export function GameStats({ onResetGame }: GameStatsProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const isAnimatingRef = useRef<boolean>(false)

  const ANIMATION_DURATION = 2000 // 2 seconds

  const startAnimation = () => {
    startTimeRef.current = Date.now()
    isAnimatingRef.current = true
    setIsPressed(true)
    setAnimationProgress(0)
    
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
        // Animation complete - reset game
        onResetGame()
        resetAnimation()
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

  const slideDistance = 100 // percentage

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 20px',
      backgroundColor: '#e5e5e5',
      borderRadius: '8px',
      margin: '20px auto',
      maxWidth: '600px',
      width: 'fit-content'
    }}>
      <div
        title="Click and hold for new game"
        style={{
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
          margin: '0',
          fontSize: '24px',
          color: '#4a4a4a',
          minWidth: '200px',
          minHeight: '30px'
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Original text */}
        <h1 style={{
          margin: '0',
          fontSize: '24px',
          color: isPressed ? '#ff0000' : '#4a4a4a', // Red when pressed for debugging
          transform: `translateX(${isPressed ? animationProgress * slideDistance : 0}%)`,
          transition: isPressed ? 'none' : 'transform 0.2s ease',
          opacity: isPressed ? 1 - animationProgress * 0.3 : 1
        }}>
          Sweep The Dungeons {isPressed ? `(${Math.round(animationProgress * 100)}%)` : ''}
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
            opacity: animationProgress
          }}>
            Sweep The Dungeons
          </h1>
        )}
      </div>
    </div>
  )
}