import { Tile as TileType } from '../types'
import { useGameStore } from '../store'
import { useState, useEffect } from 'react'

interface TileProps {
  tile: TileType
  onClick: (tile: TileType) => void
  isTargeting?: boolean
  isSelected?: boolean
  isEnemyHighlighted?: boolean
  isBrushHighlighted?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function Tile({ tile, onClick, isTargeting = false, isSelected = false, isEnemyHighlighted = false, isBrushHighlighted = false, onMouseEnter, onMouseLeave }: TileProps) {
  const { hoveredClueId, setHoveredClueId, togglePlayerAnnotation, setPlayerAnnotationMode, playerAnnotationMode, tingleAnimation } = useGameStore()
  const [isHovered, setIsHovered] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [rightClickTimer, setRightClickTimer] = useState<NodeJS.Timeout | null>(null)
  
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
    e.preventDefault() // Prevent browser context menu
    // Let the mouseUp handler deal with the annotation logic
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 && !tile.revealed) { // Right mouse button
      e.preventDefault()
      
      // Start timer for hold detection
      const timer = setTimeout(() => {
        // Show context menu
        setContextMenuPosition({ x: e.clientX, y: e.clientY })
        setShowContextMenu(true)
      }, 500) // 500ms hold time
      
      setRightClickTimer(timer)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) {
      if (rightClickTimer) {
        clearTimeout(rightClickTimer)
        setRightClickTimer(null)
        
        // If context menu is not showing, this was a quick right-click
        if (!showContextMenu && !tile.revealed) {
          togglePlayerAnnotation(tile.position)
        }
      }
    }
  }

  const handleContextMenuSelect = (mode: 'slash' | 'big_checkmark' | 'small_checkmark') => {
    setPlayerAnnotationMode(mode)
    setShowContextMenu(false)
  }

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false)
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showContextMenu])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (rightClickTimer) {
        clearTimeout(rightClickTimer)
      }
    }
  }, [rightClickTimer])
  
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
      const playerBigCheckmarkAnnotation = tile.annotations.find(a => a.type === 'player_big_checkmark')
      const playerSmallCheckmarkAnnotation = tile.annotations.find(a => a.type === 'player_small_checkmark')
      
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
                width: '4px',
                height: '4px',
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
      
      // Render player big checkmark annotation (center)
      if (playerBigCheckmarkAnnotation) {
        elements.push(
          <div
            key="player-big-checkmark"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '32px',
              color: '#28a745',
              pointerEvents: 'none',
              zIndex: 1001,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            ✓
          </div>
        )
      }
      
      // Render player small checkmark annotation (top-right corner)
      if (playerSmallCheckmarkAnnotation) {
        elements.push(
          <div
            key="player-small-checkmark"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              fontSize: '12px',
              color: '#8b5cf6',
              pointerEvents: 'none',
              zIndex: 1001,
              textShadow: '1px 1px 1px rgba(0,0,0,0.8)'
            }}
          >
            ✓
          </div>
        )
      }
      
      // Add dirty scribbles for extraDirty tiles (always, regardless of other annotations)
      if (tile.specialTile === 'extraDirty') {
        elements.push(
          <div
            key="dirty-scribbles"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '32px',
              height: '32px',
              pointerEvents: 'none',
              zIndex: 998 // Below player slash but above other annotations
            }}
          >
            {/* Generate random scribbles */}
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '2px',
                  height: `${4 + Math.floor(Math.random() * 6)}px`,
                  backgroundColor: 'black',
                  left: `${Math.floor(Math.random() * 28)}px`,
                  top: `${Math.floor(Math.random() * 28)}px`,
                  transform: `rotate(${Math.floor(Math.random() * 360)}deg)`,
                  borderRadius: '1px'
                }}
              />
            ))}
          </div>
        )
      }
      
      return <>{elements}</>
    }

    // Show dirty scribbles for extraDirty tiles even when no other annotations exist
    if (!tile.revealed && tile.specialTile === 'extraDirty') {
      return (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '32px',
            height: '32px',
            pointerEvents: 'none',
            zIndex: 998
          }}
        >
          {/* Generate random scribbles */}
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '2px',
                height: `${4 + Math.floor(Math.random() * 6)}px`,
                backgroundColor: 'black',
                left: `${Math.floor(Math.random() * 28)}px`,
                top: `${Math.floor(Math.random() * 28)}px`,
                transform: `rotate(${Math.floor(Math.random() * 360)}deg)`,
                borderRadius: '1px'
              }}
            />
          ))}
        </div>
      )
    }

    return null
  }

  // Handle empty tiles (holes in the grid) after all hooks have been called
  if (tile.owner === 'empty') {
    return (
      <div style={{
        width: '56px',
        height: '56px',
        backgroundColor: 'transparent'
      }} />
    )
  }

  return (
    <>
      <div
        onClick={handleClick}
        onContextMenu={handleRightClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        title={tile.specialTile === 'extraDirty' && !tile.revealed ? 'Cannot reveal tile without cleaning it!' : undefined}
      style={{
        position: 'relative',
        width: '56px',
        height: '56px',
        backgroundColor: getTileColor(),
        border: isSelected ? '3px solid #ffc107' : 
                isTargeting ? '2px solid #007bff' : 
                isEnemyHighlighted || isTingleEmphasized() ? '3px solid #dc3545' :
                isBrushHighlighted ? '3px solid #007bff' :
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
                   isBrushHighlighted ? '0 0 12px rgba(0, 123, 255, 0.8)' :
                   isClueHighlighted() ? '0 0 8px rgba(64, 192, 87, 0.4)' :
                   (isHovered && !tile.revealed) ? '0 2px 4px rgba(0,0,0,0.3)' : 
                   'none',
        animation: isEnemyHighlighted || isTingleEmphasized() ? 'pulse 1s ease-in-out infinite' : 
                   'none'
      }}
      onMouseEnter={() => {
        setIsHovered(true)
        onMouseEnter?.()
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        onMouseLeave?.()
      }}
      >
        {getOverlay()}
      </div>
      
      {/* Context Menu */}
      {showContextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            zIndex: 10000,
            padding: '4px',
            fontSize: '12px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '4px 8px',
              cursor: 'pointer',
              backgroundColor: playerAnnotationMode === 'slash' ? '#e9ecef' : 'transparent'
            }}
            onClick={() => handleContextMenuSelect('slash')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = playerAnnotationMode === 'slash' ? '#e9ecef' : 'transparent'}
          >
            Black slash only
          </div>
          <div
            style={{
              padding: '4px 8px',
              cursor: 'pointer',
              backgroundColor: playerAnnotationMode === 'big_checkmark' ? '#e9ecef' : 'transparent'
            }}
            onClick={() => handleContextMenuSelect('big_checkmark')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = playerAnnotationMode === 'big_checkmark' ? '#e9ecef' : 'transparent'}
          >
            Slash + big ✓
          </div>
          <div
            style={{
              padding: '4px 8px',
              cursor: 'pointer',
              backgroundColor: playerAnnotationMode === 'small_checkmark' ? '#e9ecef' : 'transparent'
            }}
            onClick={() => handleContextMenuSelect('small_checkmark')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = playerAnnotationMode === 'small_checkmark' ? '#e9ecef' : 'transparent'}
          >
            Slash + small ✓
          </div>
        </div>
      )}
    </>
  )
}