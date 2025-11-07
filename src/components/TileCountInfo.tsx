import { Board } from '../types'
import { getUnrevealedCounts } from '../game/boardSystem'

interface TileCountInfoProps {
  board: Board
}

export function TileCountInfo({ board }: TileCountInfoProps) {
  const counts = getUnrevealedCounts(board)

  const tileColors = {
    player: '#81b366',
    rival: '#c65757',
    neutral: '#d4aa5a',
    mine: '#8b6ba8'
  }

  // Layout: upper left = mine, upper right = neutral, lower left = rival, lower right = player
  const gridLayout = [
    { type: 'mine', position: { row: 0, col: 0 } },
    { type: 'neutral', position: { row: 0, col: 1 } },
    { type: 'rival', position: { row: 1, col: 0 } },
    { type: 'player', position: { row: 1, col: 1 } }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: '3px',
      width: '50px',
      height: '50px',
      margin: '0 auto 8px auto'
    }}>
      {gridLayout.map(({ type }) => (
        <div key={type} style={{
          backgroundColor: tileColors[type as keyof typeof tileColors],
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'black',
          fontSize: '11px',
          fontWeight: 'bold',
          border: '1px solid black'
        }}>
          {counts[type as keyof typeof counts]}
        </div>
      ))}
    </div>
  )
}