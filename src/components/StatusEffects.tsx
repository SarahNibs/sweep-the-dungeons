import { StatusEffect } from '../types'

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
        <div
          key={effect.id}
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
          title={`${effect.name}: ${effect.description}`}
        >
          {effect.icon}
          {/* Enhanced indicator for enhanced effects */}
          {effect.enhanced && (
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
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
      ))}
    </div>
  )
}