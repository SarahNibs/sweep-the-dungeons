import { Board } from '../types'
import { getUnrevealedCounts } from '../game/boardSystem'
import { Tooltip } from './Tooltip'

interface TileCountsVerticalProps {
  board: Board
  selectedAnnotationTileType: 'player' | 'rival' | 'neutral' | 'mine'
  onSelectType: (tileType: 'player' | 'rival' | 'neutral' | 'mine') => void
}

export function TileCountsVertical({ board, selectedAnnotationTileType, onSelectType }: TileCountsVerticalProps) {
  const counts = getUnrevealedCounts(board)

  // Layout: upper left = mine, upper right = neutral, lower left = rival, lower right = player
  const gridLayout = [
    { type: 'mine' as const, count: counts.mine, color: '#8b6ba8', label: 'Mine tiles remaining', row: 0, col: 0 },
    { type: 'neutral' as const, count: counts.neutral, color: '#d4aa5a', label: 'Neutral tiles remaining', row: 0, col: 1 },
    { type: 'rival' as const, count: counts.rival, color: '#c65757', label: 'Rival tiles remaining', row: 1, col: 0 },
    { type: 'player' as const, count: counts.player, color: '#81b366', label: 'Player tiles remaining', row: 1, col: 1 }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: '4px',
      width: '52px',
      margin: '0 auto 8px auto'
    }}>
      {gridLayout.map(({ type, count, color, label }) => {
        const isSelected = selectedAnnotationTileType === type
        return (
          <Tooltip
            key={type}
            text={`${label}: ${count}`}
            style={{ display: 'block' }}
          >
            <button
              onClick={() => onSelectType(type)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'black',
                fontSize: '11px',
                fontWeight: 'bold',
                border: '1px solid black',
                cursor: 'pointer',
                padding: 0,
                // White border with gap when selected
                outline: isSelected ? '1px solid white' : 'none',
                outlineOffset: isSelected ? '1px' : '0'
              }}
            >
              {count}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}