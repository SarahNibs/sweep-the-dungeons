import { useState } from 'react'
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
  const [showHelp, setShowHelp] = useState(false)

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
          width: '100%',
          padding: '3px', // Space for the border to prevent layout shifts
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* New Game button */}
        <Tooltip text="New Game" style={{ display: 'inline-block' }}>
          <div
            onClick={(e) => {
              e.stopPropagation()
              onResetGame()
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
            +
          </div>
        </Tooltip>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 20px',
            backgroundColor: '#e5e5e5',
            borderRadius: '8px',
            userSelect: 'none',
            border: isGameEnded ? `3px solid ${getPulseBorderColor()}` : '3px solid transparent',
            animation: isGameEnded ? 'pulseGlow 1.5s ease-in-out infinite' : 'none',
            color: getPulseBorderColor()
          }}
        >
          <h1 style={{
            margin: '0',
            fontSize: '24px',
            color: '#4a4a4a',
            whiteSpace: 'nowrap'
          }}>
            Sweep The Dungeons
          </h1>
        </div>

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