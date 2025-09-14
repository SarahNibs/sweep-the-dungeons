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
    assassin: '#8b6ba8'
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
          minWidth: '32px',
          height: '20px',
          backgroundColor: tileColors[type as keyof typeof tileColors],
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'black',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {count}
        </div>
      ))}
    </div>
  )
}