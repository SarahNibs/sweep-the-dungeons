import { Board } from '../types'
import { getUnrevealedCounts } from '../game/boardSystem'

interface TileCountInfoProps {
  board: Board
}

export function TileCountInfo({ board }: TileCountInfoProps) {
  const counts = getUnrevealedCounts(board)
  
  const tileColors = {
    player: '#81b366',
    enemy: '#c65757', 
    neutral: '#d4aa5a',
    mine: '#8b6ba8'
  }
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '8px',
      fontSize: '12px',
      width: '100%' // Use full container width
    }}>
      {Object.entries(counts).map(([type, count]) => (
        <div key={type} style={{
          minWidth: '40px',
          height: '24px',
          backgroundColor: tileColors[type as keyof typeof tileColors],
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'black',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {count}
        </div>
      ))}
    </div>
  )
}