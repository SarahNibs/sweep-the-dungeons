import { Board } from '../types'
import { getUnrevealedCounts } from '../game/boardSystem'

interface TileCountsVerticalProps {
  board: Board
  annotationButtons: {
    player: boolean
    enemy: boolean
    neutral: boolean
    mine: boolean
  }
  onToggleButton: (buttonType: 'player' | 'enemy' | 'neutral' | 'mine') => void
}

export function TileCountsVertical({ board, annotationButtons, onToggleButton }: TileCountsVerticalProps) {
  const counts = getUnrevealedCounts(board)
  
  const tileInfo = [
    { type: 'player' as const, count: counts.player, color: '#81b366', label: 'Player tiles remaining' },
    { type: 'enemy' as const, count: counts.enemy, color: '#c65757', label: 'Enemy tiles remaining' },
    { type: 'neutral' as const, count: counts.neutral, color: '#d4aa5a', label: 'Neutral tiles remaining' },
    { type: 'mine' as const, count: counts.mine, color: '#8b6ba8', label: 'Mine tiles remaining' }
  ]
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%'
    }}>
      {tileInfo.map(({ type, count, color, label }) => {
        const isDepressed = annotationButtons[type]
        return (
          <button 
            key={type} 
            onClick={() => onToggleButton(type)}
            style={{
              width: '40px',
              height: '24px',
              backgroundColor: color,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'black',
              fontSize: '14px',
              fontWeight: 'bold',
              margin: '0 auto',
              border: isDepressed ? '3px inset #999' : '3px outset #ccc',
              cursor: 'pointer',
              opacity: isDepressed ? 0.8 : 1,
              transform: isDepressed ? 'translateY(1px)' : 'translateY(0)',
              boxShadow: isDepressed ? 'inset 2px 2px 4px rgba(0,0,0,0.3)' : '2px 2px 4px rgba(0,0,0,0.2)'
            }}
            title={`${label}: ${count} (Click to ${isDepressed ? 'exclude' : 'include'} in annotations)`}
          >
            {count}
          </button>
        )
      })}
    </div>
  )
}