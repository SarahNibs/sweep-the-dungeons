import { Board } from '../types'
import { getUnrevealedCounts } from '../game/boardSystem'

interface TileCountsVerticalProps {
  board: Board
}

export function TileCountsVertical({ board }: TileCountsVerticalProps) {
  const counts = getUnrevealedCounts(board)
  
  const tileInfo = [
    { type: 'player', count: counts.player, color: '#81b366', label: 'Player tiles remaining' },
    { type: 'enemy', count: counts.enemy, color: '#c65757', label: 'Enemy tiles remaining' },
    { type: 'neutral', count: counts.neutral, color: '#d4aa5a', label: 'Neutral tiles remaining' },
    { type: 'mine', count: counts.mine, color: '#8b6ba8', label: 'Mine tiles remaining' }
  ]
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%'
    }}>
      {tileInfo.map(({ type, count, color, label }) => (
        <div 
          key={type} 
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
            margin: '0 auto'
          }}
          title={`${label}: ${count}`}
        >
          {count}
        </div>
      ))}
    </div>
  )
}