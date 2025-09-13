import { Board } from '../types'
import { getUnrevealedCounts } from '../game/boardSystem'

interface TileCountInfoProps {
  board: Board
}

export function TileCountInfo({ board }: TileCountInfoProps) {
  const counts = getUnrevealedCounts(board)
  
  const tileColors = {
    player: '#28a745',
    enemy: '#dc3545', 
    neutral: '#ffc107',
    assassin: '#6f42c1'
  }
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '8px',
      fontSize: '12px'
    }}>
      {Object.entries(counts).map(([type, count]) => (
        <div key={type} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: tileColors[type as keyof typeof tileColors],
            borderRadius: '2px'
          }} />
          <span>{count}</span>
        </div>
      ))}
    </div>
  )
}