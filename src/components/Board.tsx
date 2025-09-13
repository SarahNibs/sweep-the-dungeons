import { Board as BoardType, Tile as TileType } from '../types'
import { Tile } from './Tile'

interface BoardProps {
  board: BoardType
  onTileClick: (tile: TileType) => void
}

export function Board({ board, onTileClick }: BoardProps) {
  const renderTiles = () => {
    const tiles: JSX.Element[] = []
    
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const key = `${x},${y}`
        const tile = board.tiles.get(key)
        
        if (tile) {
          tiles.push(
            <Tile
              key={key}
              tile={tile}
              onClick={onTileClick}
            />
          )
        }
      }
    }
    
    return tiles
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      margin: '20px 0'
    }}>
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${board.width}, 60px)`,
          gridTemplateRows: `repeat(${board.height}, 60px)`,
          gap: '2px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '2px solid #dee2e6'
        }}
      >
        {renderTiles()}
      </div>
    </div>
  )
}