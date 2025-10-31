import { StatusEffect } from '../types'
import { Tooltip } from './Tooltip'

interface StatusEffectsProps {
  statusEffects: StatusEffect[]
}

export function StatusEffects({ statusEffects }: StatusEffectsProps) {
  // Filter out default NoGuess AI status effect - only show non-default AI types
  const visibleEffects = statusEffects.filter(effect =>
    !(effect.type === 'rival_ai_type' && effect.name === 'NoGuess Rival')
  )

  if (visibleEffects.length === 0) {
    return null
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column-reverse', // Bottom-up ordering
      gap: '6px',
      alignItems: 'center'
    }}>
      {visibleEffects.map((effect) => (
        <Tooltip key={effect.id} text={`${effect.name}: ${effect.description}`} style={{ display: 'inline-block' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              border: '2px solid #e17055',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              backgroundColor: 'rgba(225, 112, 85, 0.1)',
              cursor: 'pointer',
              position: 'relative'
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
      ))}
    </div>
  )
}