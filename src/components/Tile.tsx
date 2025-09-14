import { Tile as TileType } from '../types'
import { useGameStore } from '../store'
import { useState } from 'react'

interface TileProps {
  tile: TileType
  onClick: (tile: TileType) => void
  isTargeting?: boolean
  isSelected?: boolean
}

export function Tile({ tile, onClick, isTargeting = false, isSelected = false }: TileProps) {
  const { hoveredClueId, setHoveredClueId } = useGameStore()
  const [isHovered, setIsHovered] = useState(false)
  
  const handleClick = () => {
    onClick(tile)
  }
  
  // Check if this tile should be highlighted due to clue hover
  const isClueHighlighted = () => {
    if (!hoveredClueId || tile.revealed) return false
    
    const clueResultsAnnotation = tile.annotations.find(a => a.type === 'clue_results')
    if (!clueResultsAnnotation?.clueResults) return false
    
    // Check if this tile has a clue result with the hovered clue ID
    return clueResultsAnnotation.clueResults.some(result => result.id === hoveredClueId)
  }

  const getTileColor = () => {
    // If clue highlighted and unrevealed, use darker background 
    if (!tile.revealed && isClueHighlighted()) {
      return '#6c757d' // Darker gray when highlighted (original unrevealed color)
    }
    
    if (!tile.revealed) {
      return '#9ca3af' // Lighter gray for unrevealed
    }
    
    switch (tile.owner) {
      case 'player':
        return '#81b366' // Muted green for player
      case 'enemy':
        return '#c65757' // Muted red for enemy
      case 'neutral':
        return '#d4aa5a' // Muted yellow for neutral
      case 'assassin':
        return '#8b6ba8' // Muted purple for assassin
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
          borderRadius: tile.revealedBy === 'player' ? '50%' : '3px',
          minWidth: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          border: '1px solid black'
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
      
      // Render clue pips (top-left area) - each clue gets its own row based on play order
      if (clueResultsAnnotation?.clueResults) {
        clueResultsAnnotation.clueResults.forEach((clueResult) => {
          const strength = clueResult.strengthForThisTile
          const isThisClueHovered = hoveredClueId === clueResult.id
          const rowPosition = clueResult.clueOrder - 1 // Convert 1-based to 0-based for positioning
          
          for (let i = 0; i < Math.min(strength, 6); i++) {
            elements.push(
              <div
                key={`pip-${clueResult.id}-${i}`}
                style={{
                  position: 'absolute',
                  top: `${4 + rowPosition * 8}px`,
                  left: `${4 + i * 8}px`,
                  width: '4px',
                  height: '4px',
                  backgroundColor: isThisClueHovered ? '#22c55e' : '#16a34a',
                  borderRadius: '50%',
                  border: '0.5px solid black',
                  cursor: 'pointer',
                  transform: isThisClueHovered ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  boxShadow: isThisClueHovered ? '0 1px 3px rgba(40, 167, 69, 0.5)' : 'none'
                }}
                onMouseEnter={() => {
                  setHoveredClueId(clueResult.id)
                }}
                onMouseLeave={() => {
                  setHoveredClueId(null)
                }}
              />
            )
          }
        })
      }
      
      // Render safety annotations (top-right)
      if (safetyAnnotations.length > 0) {
        const annotation = safetyAnnotations[safetyAnnotations.length - 1] // Show latest
        const display = annotation.type === 'safe' 
          ? { text: '✓', color: '#ffc107', tooltip: 'Tile is either yours or neutral' }
          : { text: '!', color: '#dc3545', tooltip: 'Tile is either enemy\'s or assassin' }
        
        elements.push(
          <div
            key="safety"
            title={display.tooltip}
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
              border: '1px solid black'
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
            title="Tile is enemy's"
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
              border: '1px solid black'
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
        border: isSelected ? '3px solid #ffc107' : 
                isTargeting ? '2px solid #007bff' : 
                isClueHighlighted() ? '2px solid #40c057' : 
                '2px solid #333',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: tile.revealed && !isTargeting ? 'default' : 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        color: tile.revealed ? 'white' : '#ddd',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        transform: (isHovered && !tile.revealed) ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isClueHighlighted() ? '0 0 8px rgba(64, 192, 87, 0.4)' :
                   (isHovered && !tile.revealed) ? '0 2px 4px rgba(0,0,0,0.3)' : 
                   'none'
      }}
      onMouseEnter={() => {
        setIsHovered(true)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
      }}
    >
      {getOverlay()}
    </div>
  )
}