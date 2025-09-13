import { Tile as TileType } from '../types'

interface TileProps {
  tile: TileType
  onClick: (tile: TileType) => void
}

export function Tile({ tile, onClick }: TileProps) {
  const handleClick = () => {
    onClick(tile)
  }

  const getTileColor = () => {
    if (!tile.revealed) {
      return '#6c757d' // Gray for unrevealed
    }
    
    switch (tile.owner) {
      case 'player':
        return '#28a745' // Green for player
      case 'enemy':
        return '#dc3545' // Red for enemy
      case 'neutral':
        return '#ffc107' // Yellow for neutral
      case 'assassin':
        return '#6f42c1' // Purple for assassin
      default:
        return '#6c757d'
    }
  }

  const getAdjacencyBox = () => {
    if (!tile.revealed || tile.adjacencyCount === null) {
      return null
    }
    
    const getAdjacencyColor = () => {
      if (tile.revealedBy === 'player') {
        return '#007bff'
      } else if (tile.revealedBy === 'enemy') {
        return '#dc3545'
      }
      return '#6c757d'
    }
    
    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: getAdjacencyColor(),
        color: 'white',
        borderRadius: '3px',
        minWidth: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        border: '1px solid white'
      }}>
        {tile.adjacencyCount}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '56px',
        height: '56px',
        backgroundColor: getTileColor(),
        border: '2px solid #333',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: tile.revealed ? 'default' : 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        color: tile.revealed ? 'white' : '#ddd',
        transition: 'all 0.2s ease',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!tile.revealed) {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
        }
      }}
      onMouseLeave={(e) => {
        if (!tile.revealed) {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {getAdjacencyBox()}
    </div>
  )
}