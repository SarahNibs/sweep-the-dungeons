import { Tile as TileType } from '../types'
import { useGameStore } from '../store'
import { useState, useEffect } from 'react'

interface TileProps {
  tile: TileType
  onClick: (tile: TileType) => void
  isTargeting?: boolean
  isSelected?: boolean
  isEnemyHighlighted?: boolean
}

export function Tile({ tile, onClick, isTargeting = false, isSelected = false, isEnemyHighlighted = false }: TileProps) {
  const { hoveredClueId, setHoveredClueId, togglePlayerSlash, tingleAnimation } = useGameStore()
  const [isHovered, setIsHovered] = useState(false)
  
  // Don't render anything for empty tiles (holes in the grid)
  if (tile.owner === 'empty') {
    return (
      <div style={{
        width: '56px',
        height: '56px',
        backgroundColor: 'transparent'
      }} />
    )
  }
  
  // Add animation styles when component mounts
  useEffect(() => {
    if (!document.getElementById('tile-animations')) {
      const style = document.createElement('style')
      style.id = 'tile-animations'
      style.textContent = `
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }
      `
      document.head.appendChild(style)
    }
  }, [])
  
  // Check if this tile should be emphasized due to Tingle animation
  const isTingleEmphasized = () => {
    return tingleAnimation && 
           tingleAnimation.targetTile &&
           tingleAnimation.targetTile.x === tile.position.x &&
           tingleAnimation.targetTile.y === tile.position.y &&
           tingleAnimation.isEmphasized
  }
  
  const handleClick = () => {
    onClick(tile)
  }
  
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent context menu
    if (!tile.revealed) {
      togglePlayerSlash(tile.position)
    }
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
      case 'mine':
        return '#8b6ba8' // Muted purple for mine
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
      const subsetAnnotations = tile.annotations.filter(a => a.type === 'owner_subset')
      // Legacy annotations - keeping for backward compatibility
      const safetyAnnotations = tile.annotations.filter(a => a.type === 'safe' || a.type === 'unsafe')
      const enemyAnnotations = tile.annotations.filter(a => a.type === 'enemy')
      const playerSlashAnnotation = tile.annotations.find(a => a.type === 'player_slash')
      
      // Render clue pips - player clues (top-left) and enemy clues (bottom-left) 
      if (clueResultsAnnotation?.clueResults) {
        
        clueResultsAnnotation.clueResults.forEach((clueResult, clueIndex) => {
          const strength = clueResult.strengthForThisTile
          const isThisClueHovered = hoveredClueId === clueResult.id
          const isEnemyClue = clueResult.cardType === 'enemy_clue'
          
          // Position based on clue row position (already separated by player/enemy)
          // Fallback to clueOrder if clueRowPosition is not available (backward compatibility)
          const rowPosition = (clueResult.clueRowPosition || clueResult.clueOrder || 1) - 1
          
          for (let i = 0; i < Math.min(strength, 6); i++) {
            if (isEnemyClue) {
              // Enemy Xs: bottom-left, going up and right
              elements.push(
                <div
                  key={`pip-${clueResult.id}-${clueIndex}-${i}`}
                  style={{
                    position: 'absolute',
                    bottom: `${2 + rowPosition * 6}px`,
                    left: `${2 + i * 6}px`,
                    color: '#000000',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transform: isThisClueHovered ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={() => {
                    setHoveredClueId(clueResult.id)
                  }}
                  onMouseLeave={() => {
                    setHoveredClueId(null)
                  }}
                >
                  ×
                </div>
              )
            } else {
              // Player pips: top-left, going down and right
              elements.push(
                <div
                  key={`pip-${clueResult.id}-${clueIndex}-${i}`}
                  style={{
                    position: 'absolute',
                    top: `${2 + rowPosition * 6}px`,
                    left: `${2 + i * 6}px`,
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: isThisClueHovered ? '#22c55e' : '#16a34a',
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
          }
        })
      }
      
      // Render safety annotations (top-right)
      if (safetyAnnotations.length > 0) {
        const annotation = safetyAnnotations[safetyAnnotations.length - 1] // Show latest
        const display = annotation.type === 'safe' 
          ? { text: '✓', color: '#ffc107', tooltip: 'Tile is either yours or neutral' }
          : { text: '!', color: '#dc3545', tooltip: 'Tile is either enemy or mine' }
        
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
      
      // Legacy enemy annotations - keeping for backward compatibility but Report now uses subset system
      if (enemyAnnotations.length > 0) {
        elements.push(
          <div
            key="enemy"
            title="Tile is enemy's"
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '18px', // Moved left to avoid conflict with subset annotations
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
      
      // Render subset annotations (bottom-right) as 2x2 grid of small squares
      if (subsetAnnotations.length > 0) {
        const latestSubset = subsetAnnotations[subsetAnnotations.length - 1]
        const ownerSubset = latestSubset.ownerSubset || new Set()
        
        // Define owner colors and positions in 2x2 grid (positioned from bottom-right)
        const ownerInfo = [
          { owner: 'player' as const, color: '#81b366', position: { top: 4, left: 8 }, name: 'Player' },
          { owner: 'enemy' as const, color: '#c65757', position: { top: 4, left: 4 }, name: 'Enemy' },
          { owner: 'neutral' as const, color: '#d4aa5a', position: { top: 0, left: 8 }, name: 'Neutral' },
          { owner: 'mine' as const, color: '#8b6ba8', position: { top: 0, left: 4 }, name: 'Mine' }
        ]
        
        const includedOwners = ownerInfo.filter(info => ownerSubset.has(info.owner))
        const tooltipText = includedOwners.length === 1 
          ? `Tile is ${includedOwners[0].name.toLowerCase()}`
          : `Tile is ${includedOwners.map(info => info.name.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ', or $1')}`
        
        // Render the squares that are included in the subset
        includedOwners.forEach(info => {
          elements.push(
            <div
              key={`subset-${info.owner}`}
              title={tooltipText}
              style={{
                position: 'absolute',
                bottom: `${2 + info.position.top}px`,
                right: `${2 + info.position.left}px`,
                width: '3px',
                height: '3px',
                backgroundColor: info.color,
                border: '0.5px solid black'
              }}
            />
          )
        })
      }
      
      // Render player slash annotation (always on top)
      if (playerSlashAnnotation) {
        elements.push(
          <div
            key="player-slash"
            style={{
              position: 'absolute',
              top: '0px',
              left: '0px',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1000 // Ensure it's always on top
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                right: '2px',
                bottom: '2px',
                background: 'linear-gradient(135deg, transparent 47%, black 47%, black 53%, transparent 53%)',
                pointerEvents: 'none'
              }}
            />
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
      onContextMenu={handleRightClick}
      style={{
        position: 'relative',
        width: '56px',
        height: '56px',
        backgroundColor: getTileColor(),
        border: isSelected ? '3px solid #ffc107' : 
                isTargeting ? '2px solid #007bff' : 
                isEnemyHighlighted || isTingleEmphasized() ? '3px solid #dc3545' :
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
        boxShadow: isEnemyHighlighted || isTingleEmphasized() ? '0 0 12px rgba(220, 53, 69, 0.6)' :
                   isClueHighlighted() ? '0 0 8px rgba(64, 192, 87, 0.4)' :
                   (isHovered && !tile.revealed) ? '0 2px 4px rgba(0,0,0,0.3)' : 
                   'none',
        animation: isEnemyHighlighted || isTingleEmphasized() ? 'pulse 1s ease-in-out infinite' : 
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