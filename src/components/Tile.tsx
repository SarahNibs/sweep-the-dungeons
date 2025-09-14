import { Tile as TileType, TileAnnotation } from '../types'

interface TileProps {
  tile: TileType
  onClick: (tile: TileType) => void
  isTargeting?: boolean
  isSelected?: boolean
}

export function Tile({ tile, onClick, isTargeting = false, isSelected = false }: TileProps) {
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

  const getOverlay = () => {
    // Show adjacency info if revealed
    if (tile.revealed && tile.adjacencyCount !== null) {
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

    // Show all annotations if unrevealed
    if (!tile.revealed && tile.annotations.length > 0) {
      const elements: JSX.Element[] = []
      
      // Group annotations by type
      const clueResultsAnnotation = tile.annotations.find(a => a.type === 'clue_results')
      const safetyAnnotations = tile.annotations.filter(a => a.type === 'safe' || a.type === 'unsafe')
      const enemyAnnotations = tile.annotations.filter(a => a.type === 'enemy')
      
      // Render clue pips (top-left area) - each clue gets its own row
      if (clueResultsAnnotation?.clueResults) {
        let currentRow = 0
        
        clueResultsAnnotation.clueResults.forEach((clueResult, clueIndex) => {
          const strength = clueResult.strengthForThisTile
          for (let i = 0; i < Math.min(strength, 6); i++) {
            elements.push(
              <div
                key={`pip-${clueResult.id}-${i}`}
                style={{
                  position: 'absolute',
                  top: `${4 + currentRow * 8}px`,
                  left: `${4 + i * 8}px`,
                  width: '4px',
                  height: '4px',
                  backgroundColor: '#28a745',
                  borderRadius: '50%',
                  border: '0.5px solid white',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => {
                  // TODO: Implement hover highlighting
                }}
                onMouseLeave={() => {
                  // TODO: Clear hover highlighting
                }}
              />
            )
          }
          currentRow++
        })
      }
      
      // Render safety annotations (top-right)
      if (safetyAnnotations.length > 0) {
        const annotation = safetyAnnotations[safetyAnnotations.length - 1] // Show latest
        const display = annotation.type === 'safe' 
          ? { text: '✓', color: '#28a745' }
          : { text: '!', color: '#dc3545' }
        
        elements.push(
          <div
            key="safety"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '16px',
              height: '16px',
              backgroundColor: display.color,
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              border: '1px solid white'
            }}
          >
            {display.text}
          </div>
        )
      }
      
      // Render enemy annotations (bottom-right)
      if (enemyAnnotations.length > 0) {
        elements.push(
          <div
            key="enemy"
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '16px',
              height: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              border: '1px solid white'
            }}
          >
            E
          </div>
        )
      }
      
      return <>{elements}</>
    }

    return null
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '56px',
        height: '56px',
        backgroundColor: getTileColor(),
        border: isSelected ? '3px solid #ffc107' : isTargeting ? '2px solid #007bff' : '2px solid #333',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: tile.revealed && !isTargeting ? 'default' : 'pointer',
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
      {getOverlay()}
    </div>
  )
}