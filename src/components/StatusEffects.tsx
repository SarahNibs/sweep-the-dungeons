import { StatusEffect } from '../types'
import { Tooltip } from './Tooltip'
import { useGameStore } from '../store'
import { useEffect, useState } from 'react'

interface StatusEffectsProps {
  statusEffects: StatusEffect[]
}

export function StatusEffects({ statusEffects }: StatusEffectsProps) {
  const { pulsingStatusEffectIds } = useGameStore()
  const [isPulsing, setIsPulsing] = useState(true)

  // Filter out default NoGuess AI status effect - only show non-default AI types
  const visibleEffects = statusEffects.filter(effect =>
    !(effect.type === 'rival_ai_type' && effect.name === 'NoGuess Rival')
  )

  // Add CSS for pulse animation
  useEffect(() => {
    if (!document.getElementById('status-effect-pulse-animation')) {
      const style = document.createElement('style')
      style.id = 'status-effect-pulse-animation'
      style.textContent = `
        @keyframes statusEffectPulse {
          0% {
            background-color: rgba(225, 112, 85, 0.1);
            transform: scale(1);
          }
          50% {
            background-color: rgba(225, 112, 85, 0.6);
            transform: scale(1.1);
          }
          100% {
            background-color: rgba(225, 112, 85, 0.1);
            transform: scale(1);
          }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Stop pulsing after 2 seconds
  useEffect(() => {
    if (pulsingStatusEffectIds && pulsingStatusEffectIds.length > 0) {
      setIsPulsing(true)
      const timeout = setTimeout(() => {
        setIsPulsing(false)
        // Clear the pulsing IDs from store
        useGameStore.setState({ pulsingStatusEffectIds: [] })
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [pulsingStatusEffectIds])

  // Early return AFTER all hooks
  if (visibleEffects.length === 0) {
    return null
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      {visibleEffects.map((effect) => {
        const shouldPulse = isPulsing && pulsingStatusEffectIds.includes(effect.id)
        // Determine border color: red for rival-related effects, green for others
        const isRivalEffect = ['rival_never_mines', 'rival_ai_type', 'rival_mine_protection', 'rival_places_mines'].includes(effect.type)
        const borderColor = isRivalEffect ? '#dc3545' : '#28a745'

        return (
        <Tooltip key={effect.id} text={`${effect.name}: ${effect.description}`} style={{ display: 'block', margin: '0 auto' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              border: `2px solid ${borderColor}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              backgroundColor: 'rgba(225, 112, 85, 0.1)',
              cursor: 'pointer',
              position: 'relative',
              animation: shouldPulse ? 'statusEffectPulse 1s ease-in-out 2' : 'none',
              margin: '0 auto'
            }}
          >
          {effect.icon}
          {/* Count indicator for effects with counts */}
          {effect.count !== undefined && effect.count > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              minWidth: '14px',
              height: '14px',
              backgroundColor: '#555',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              border: '1px solid #333',
              padding: '0 2px'
            }}>
              {effect.count}
            </div>
          )}
          {/* Enhanced indicator for enhanced effects */}
          {effect.enhanced && (
            <div style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '16px',
              height: '16px',
              backgroundColor: '#a29bfe',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              border: '1px solid white'
            }}>
              +
            </div>
          )}
        </div>
        </Tooltip>
        )
      })}
    </div>
  )
}