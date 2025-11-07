import { Tile as TileType, ClueResult } from '../types'
import { useGameStore } from '../store'
import { useState, useEffect } from 'react'
import { Tooltip } from './Tooltip'

interface TileProps {
  tile: TileType
  onClick: (tile: TileType) => void
  isTargeting?: boolean
  isSelected?: boolean
  isEnemyHighlighted?: boolean
  isTrystHighlighted?: boolean
  isBrushHighlighted?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

// Helper function to get hover text for clue pips
const getClueHoverText = (clueResult: ClueResult): string => {
  if (clueResult.cardType === 'solid_clue') {
    return clueResult.enhanced ? 'Imperious+' : 'Imperious'
  } else if (clueResult.cardType === 'stretch_clue') {
    return clueResult.enhanced ? 'Vague+' : 'Vague'
  } else if (clueResult.cardType === 'sarcastic_orders') {
    const antiClueText = clueResult.isAntiClue ? " (CLUED *AGAINST*)" : ''
    return (clueResult.enhanced ? 'Sarcastic+' : 'Sarcastic') + antiClueText
  }
  return 'Rival Clue'
}

export function Tile({ tile, onClick, isTargeting = false, isSelected = false, isEnemyHighlighted = false, isTrystHighlighted = false, isBrushHighlighted = false, onMouseEnter, onMouseLeave }: TileProps) {
  const {
    hoveredClueId,
    setHoveredClueId,
    tingleAnimation,
    adjacencyPatternAnimation,
    cycleAnnotationOnTile,
    board
  } = useGameStore()
  const [isHovered, setIsHovered] = useState(false)
  
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
           tingleAnimation.isActive &&
           tingleAnimation.targetTile &&
           tingleAnimation.targetTile.x === tile.position.x &&
           tingleAnimation.targetTile.y === tile.position.y &&
           tingleAnimation.isEmphasized
  }

  // Check if this tile should be highlighted due to adjacency pattern animation
  const isAdjacencyHighlighted = () => {
    if (!adjacencyPatternAnimation || !adjacencyPatternAnimation.isActive) return null

    const isHighlighted = adjacencyPatternAnimation.highlightedTiles.some(
      pos => pos.x === tile.position.x && pos.y === tile.position.y
    )

    return isHighlighted ? adjacencyPatternAnimation.color : null
  }
  
  const handleClick = () => {
    onClick(tile)
  }
  
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent browser context menu
    if (!tile.revealed) {
      cycleAnnotationOnTile(tile.position)
    }
  }

  // Combine player annotation with card results to get the actual display annotation
  const getCombinedOwnerPossibility = (): Set<'player' | 'rival' | 'neutral' | 'mine'> | null => {
    // Find player owner possibility annotation
    const playerAnnotation = tile.annotations.find(a => a.type === 'player_owner_possibility')
    if (!playerAnnotation?.playerOwnerPossibility) return null

    // Find card/equipment result annotations (owner_subset)
    const cardAnnotations = tile.annotations.filter(a => a.type === 'owner_subset')
    
    let result = new Set(playerAnnotation.playerOwnerPossibility)
    
    // Intersect with all card result sets
    for (const cardAnnotation of cardAnnotations) {
      if (cardAnnotation.ownerSubset) {
        const intersection = new Set<'player' | 'rival' | 'neutral' | 'mine'>()
        for (const owner of result) {
          if (cardAnnotation.ownerSubset.has(owner)) {
            intersection.add(owner)
          }
        }
        result = intersection
      }
    }
    
    return result.size > 0 ? result : null
  }

  
  // Check if this tile should be highlighted due to clue hover
  const isClueHighlighted = () => {
    if (!hoveredClueId) return false

    const clueResultsAnnotation = tile.annotations.find(a => a.type === 'clue_results')

    // Check if this tile has a clue result with the hovered clue ID
    if (clueResultsAnnotation?.clueResults) {
      const hasMatchingClue = clueResultsAnnotation.clueResults.some(result => result.id === hoveredClueId)
      if (hasMatchingClue) return true
    }

    // For rival clues: also highlight tiles that were revealed during that clue's turn
    // Search across all tiles to find the hovered clue and its tilesRevealedDuringTurn
    for (const boardTile of board.tiles.values()) {
      const boardClueAnnotation = boardTile.annotations.find(a => a.type === 'clue_results')
      if (boardClueAnnotation?.clueResults) {
        const hoveredClueResult = boardClueAnnotation.clueResults.find(result => result.id === hoveredClueId)
        if (hoveredClueResult?.cardType === 'rival_clue' && hoveredClueResult.tilesRevealedDuringTurn) {
          const isInRevealedList = hoveredClueResult.tilesRevealedDuringTurn.some(
            pos => pos.x === tile.position.x && pos.y === tile.position.y
          )
          if (isInRevealedList) return true
        }
      }
    }

    return false
  }

  const getTileColor = () => {
    // Destroyed tiles look like background
    if (tile.specialTiles.includes('destroyed')) {
      return 'transparent'
    }

    // If clue highlighted, darken the color
    const highlighted = isClueHighlighted()

    if (!tile.revealed) {
      // Unrevealed tiles: darker gray when highlighted
      return highlighted ? '#6c757d' : '#9ca3af'
    }

    // Revealed tiles: darken by ~20% when highlighted
    const baseColors = {
      player: highlighted ? '#6b9c54' : '#81b366',    // Darker green when highlighted
      rival: highlighted ? '#a84545' : '#c65757',     // Darker red when highlighted
      neutral: highlighted ? '#b88f48' : '#d4aa5a',   // Darker yellow when highlighted
      mine: highlighted ? '#715596' : '#8b6ba8'       // Darker purple when highlighted
    }

    return baseColors[tile.owner as keyof typeof baseColors] || '#6c757d'
  }

  const getOverlay = () => {
    const elements: JSX.Element[] = []
    
    // Show adjacency info if revealed
    if (tile.revealed && tile.adjacencyCount !== null) {
      const getAdjacencyColor = () => {
        if (tile.revealedBy === 'player') {
          return '#40c057'
        } else if (tile.revealedBy === 'rival') {
          return '#dc3545'
        }
        return '#6c757d'
      }
      
      elements.push(
        <div key="adjacency-count" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: getAdjacencyColor(),
          color: 'black',
          borderRadius: tile.revealedBy === 'player' ? '50%' : '3px',
          minWidth: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          border: '1px solid black',
          zIndex: 1000
        }}>
          {tile.adjacencyCount}
        </div>
      )
    }

    // Show all annotations for unrevealed tiles, or just adjacency info for revealed tiles
    // Also show if there are special tiles that need rendering (goblins, dirty scribbles, etc.)
    const shouldShowAnnotations = !tile.revealed && (tile.annotations.length > 0 || tile.specialTiles.length > 0)
    const shouldShowAdjacencyOnRevealed = tile.revealed && tile.annotations.some(a => a.type === 'adjacency_info')

    // Calculate combined annotation once for use in multiple places
    const combinedPossibility = getCombinedOwnerPossibility()

    if (shouldShowAnnotations || shouldShowAdjacencyOnRevealed) {
      // Note: Use the same elements array from above

      // Group annotations by type
      const clueResultsAnnotation = tile.annotations.find(a => a.type === 'clue_results')
      const subsetAnnotations = tile.annotations.filter(a => a.type === 'owner_subset')
      // Legacy annotations - keeping for backward compatibility
      const safetyAnnotations = tile.annotations.filter(a => a.type === 'safe' || a.type === 'unsafe')
      const rivalAnnotations = tile.annotations.filter(a => a.type === 'rival')
      const playerBigCheckmarkAnnotation = tile.annotations.find(a => a.type === 'player_big_checkmark')
      const playerSmallCheckmarkAnnotation = tile.annotations.find(a => a.type === 'player_small_checkmark')
      
      // Render clue pips - player clues (top-left) and rival clues (bottom-left)
      // Only show these for unrevealed tiles
      if (!tile.revealed && clueResultsAnnotation?.clueResults) {
        clueResultsAnnotation.clueResults.forEach((clueResult, clueIndex) => {
          const strength = clueResult.strengthForThisTile
          const isThisClueHovered = hoveredClueId === clueResult.id
          const isEnemyClue = clueResult.cardType === 'rival_clue'
          const isAntiClue = clueResult.isAntiClue || false

          // Position based on clue row position (already separated by player/rival)
          // Fallback to clueOrder if clueRowPosition is not available (backward compatibility)
          const rowPosition = (clueResult.clueRowPosition || clueResult.clueOrder || 1) - 1

          for (let i = 0; i < Math.min(strength, 6); i++) {
            if (isEnemyClue) {
              // Enemy Xs: bottom-left, going up and right
              elements.push(
                <Tooltip key={`pip-${clueResult.id}-${clueIndex}-${i}`} text={getClueHoverText(clueResult)} style={{ position: 'absolute', bottom: `${2 + rowPosition * 6}px`, left: `${2 + i * 6}px` }}>
                  <div
                    style={{
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
                </Tooltip>
              )
            } else if (isAntiClue) {
              // Anti-clue (red) Xs: top-left, going down and right, RED color
              elements.push(
                <Tooltip key={`pip-${clueResult.id}-${clueIndex}-${i}`} text={getClueHoverText(clueResult)} style={{ position: 'absolute', top: `${2 + rowPosition * 6}px`, left: `${2 + i * 6}px` }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isThisClueHovered ? '#dc2626' : '#991b1b',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transform: isThisClueHovered ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                      textShadow: '0 0 2px rgba(0, 0, 0, 0.8)'
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
                </Tooltip>
              )
            } else {
              // Player pips (green): top-left, going down and right
              elements.push(
                <Tooltip key={`pip-${clueResult.id}-${clueIndex}-${i}`} text={getClueHoverText(clueResult)} style={{ position: 'absolute', top: `${2 + rowPosition * 6}px`, left: `${2 + i * 6}px` }}>
                  <div
                    style={{
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
                </Tooltip>
              )
            }
          }
        })
      }
      
      // Only render non-adjacency annotations for unrevealed tiles
      if (!tile.revealed) {
        // Render safety annotations (top-right)
      if (safetyAnnotations.length > 0) {
        const annotation = safetyAnnotations[safetyAnnotations.length - 1] // Show latest
        const display = annotation.type === 'safe' 
          ? { text: '✓', color: '#ffc107', tooltip: 'Tile is either yours or neutral' }
          : { text: '!', color: '#dc3545', tooltip: 'Tile is either rival or mine' }
        
        elements.push(
          <Tooltip key="safety" text={display.tooltip} style={{ position: 'absolute', top: '2px', right: '2px' }}>
            <div
              style={{
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
          </Tooltip>
        )
      }
      
      // Legacy rival annotations - keeping for backward compatibility but Report now uses subset system
      if (rivalAnnotations.length > 0) {
        elements.push(
          <Tooltip key="rival" text="Tile is rival's" style={{ position: 'absolute', bottom: '2px', right: '18px' }}>
            <div
              style={{
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
          </Tooltip>
        )
      }
      
      // Render subset annotations (bottom-right) as 2x2 grid of small squares
      if (subsetAnnotations.length > 0) {
        const latestSubset = subsetAnnotations[subsetAnnotations.length - 1]
        const ownerSubset = latestSubset.ownerSubset || new Set()
        
        // Define owner colors and positions in 2x2 grid (positioned from bottom-right)
        const ownerInfo = [
          { owner: 'player' as const, color: '#81b366', position: { top: 0, left: 4 }, name: 'Player' }, // upper-left
          { owner: 'rival' as const, color: '#c65757', position: { top: 0, left: 8 }, name: 'Rival' }, // upper-right
          { owner: 'neutral' as const, color: '#d4aa5a', position: { top: 4, left: 4 }, name: 'Neutral' }, // lower-left
          { owner: 'mine' as const, color: '#8b6ba8', position: { top: 4, left: 8 }, name: 'Mine' } // lower-right
        ]
        
        const includedOwners = ownerInfo.filter(info => ownerSubset.has(info.owner))
        const tooltipText = includedOwners.length === 1 
          ? `Tile is ${includedOwners[0].name.toLowerCase()}`
          : `Tile is ${includedOwners.map(info => info.name.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ', or $1')}`
        
        // Render the squares that are included in the subset
        includedOwners.forEach(info => {
          elements.push(
            <Tooltip key={`subset-${info.owner}`} text={tooltipText} style={{ position: 'absolute', bottom: `${2 + info.position.top}px`, right: `${2 + info.position.left}px` }}>
              <div
                style={{
                  width: '4px',
                  height: '4px',
                  backgroundColor: info.color,
                  border: '0.5px solid black'
                }}
              />
            </Tooltip>
          )
        })
      }
      
      // Render player slash and green circle based on combined annotations
      // Black slash: player is NOT in the combined possibilities
      // Green circle: player is the ONLY possibility in the combined annotation
      const shouldShowSlash = combinedPossibility && !combinedPossibility.has('player')
      const shouldShowGreenCircle = combinedPossibility && combinedPossibility.size === 1 && combinedPossibility.has('player')

      // Render black slash if player is excluded
      if (shouldShowSlash) {
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

      // Render green circle if player is the only possibility
      if (shouldShowGreenCircle) {
        elements.push(
          <div
            key="green-circle"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#28a745',
              border: '2px solid black',
              pointerEvents: 'none',
              zIndex: 999,
              opacity: 0.7
            }}
          />
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
      
      // Render combined player owner possibility annotation (upper-right corner)
      if (combinedPossibility) {
        // Use same 2x2 grid system as subset annotations but in upper-right
        const ownerInfo = [
          { owner: 'player' as const, color: '#81b366', position: { top: 0, left: 4 }, name: 'Player' }, // upper-left
          { owner: 'rival' as const, color: '#c65757', position: { top: 0, left: 8 }, name: 'Rival' }, // upper-right
          { owner: 'neutral' as const, color: '#d4aa5a', position: { top: 4, left: 4 }, name: 'Neutral' }, // lower-left
          { owner: 'mine' as const, color: '#8b6ba8', position: { top: 4, left: 8 }, name: 'Mine' } // lower-right
        ]
        
        const includedOwners = ownerInfo.filter(info => combinedPossibility.has(info.owner))
        const tooltipText = includedOwners.length === 1
          ? `Could only be ${includedOwners[0].name.toLowerCase()}`
          : `Could be ${includedOwners.map(info => info.name.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ', or $1')}`
        
        if (includedOwners.length === 1) {
          // Single possibility: large colored square
          const info = includedOwners[0]
          elements.push(
            <Tooltip key={`combined-single`} text={tooltipText} style={{ position: 'absolute', top: '2px', right: '2px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: info.color,
                  borderRadius: '2px',
                  border: '1px solid black',
                  opacity: 0.9
                }}
              />
            </Tooltip>
          )
        } else {
          // Multiple possibilities: small squares in 2x2 grid
          includedOwners.forEach(info => {
            elements.push(
              <Tooltip key={`combined-${info.owner}`} text={tooltipText} style={{ position: 'absolute', top: `${2 + (4 - info.position.top)}px`, right: `${2 + info.position.left}px` }}>
                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    backgroundColor: info.color,
                    borderRadius: '1px',
                    border: '0.5px solid black',
                    opacity: 0.8
                  }}
                />
              </Tooltip>
            )
          })
        }
      }

      // Add dirty scribbles for extraDirty tiles (always, regardless of other annotations)
      if (tile.specialTiles.includes('extraDirty')) {
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

      // Add goblin icon for goblin tiles
      if (tile.specialTiles.includes('goblin')) {
        elements.push(
          <div
            key="goblin-icon"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '28px',
              pointerEvents: 'none',
              zIndex: 999
            }}
          >
            👺
          </div>
        )
      }

      // Add surface mine icon for surface mine tiles
      if (tile.specialTiles.includes('surfaceMine')) {
        const hasBeenCleanedOnce = tile.cleanedOnce
        const tooltipText = hasBeenCleanedOnce
          ? "Surface Mine (Cleaned Once): Will be defused if cleaned again!"
          : "Surface Mine: Explodes when revealed or hit by Emanation"

        elements.push(
          <Tooltip key="surface-mine-icon" text={tooltipText} style={{ position: 'absolute', top: '50%', right: '4px', transform: 'translateY(-50%)' }}>
            <div
              style={{
                fontSize: '16px',
                pointerEvents: 'none',
                zIndex: 999,
                padding: '2px',
                border: hasBeenCleanedOnce ? '2px solid #28a745' : 'none',
                borderRadius: hasBeenCleanedOnce ? '4px' : '0',
                backgroundColor: hasBeenCleanedOnce ? 'rgba(40, 167, 69, 0.2)' : 'transparent'
              }}
            >
              💣
            </div>
          </Tooltip>
        )
      }
      } // End of non-adjacency annotations for unrevealed tiles

    // Render destroyed tile explosion (shown for both revealed and unrevealed)
    if (tile.specialTiles.includes('destroyed')) {
      elements.push(
        <div
          key="destroyed-explosion"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          {/* Jagged red explosion shape */}
          <svg width="100%" height="100%" viewBox="0 0 56 56" style={{ position: 'absolute' }}>
            <polygon
              points="28,8 32,20 44,16 36,28 48,32 36,36 44,48 32,40 28,52 24,40 12,48 20,36 8,32 20,28 12,16 24,20"
              fill="#dc3545"
              stroke="#8b0000"
              strokeWidth="2"
              opacity="0.8"
            />
          </svg>
        </div>
      )
    }
      
      // Render adjacency info from Eavesdropping card (center of tile)
      // This is shown for both revealed and unrevealed tiles
      const adjacencyAnnotation = tile.annotations.find(a => a.type === 'adjacency_info')
      
      if (adjacencyAnnotation?.adjacencyInfo) {
        const { player, neutral, rival, mine } = adjacencyAnnotation.adjacencyInfo
        
        // Count how many values we have to determine layout
        const values = [player, neutral, rival, mine].filter(v => v !== undefined)
        
        if (values.length === 1) {
          // Single value: show appropriate colored circle
          // Determine which value and color to use
          let value: number
          let color: string
          if (player !== undefined) {
            value = player
            color = '#81b366' // Green for player (matches revealed tile color)
          } else if (rival !== undefined) {
            value = rival
            color = '#c65757' // Red for rival (matches revealed tile color)
          } else if (neutral !== undefined) {
            value = neutral
            color = '#d4aa5a' // Yellow for neutral (matches revealed tile color)
          } else { // mine !== undefined
            value = mine!
            color = '#8b6ba8' // Purple for mine (matches revealed tile color)
          }

          // For revealed tiles, position it offset from center to avoid conflict with adjacency count
          const isRevealed = tile.revealed
          elements.push(
            <div
              key="adjacency-single"
              style={{
                position: 'absolute',
                top: isRevealed ? '30%' : '50%',
                left: isRevealed ? '70%' : '50%',
                transform: 'translate(-50%, -50%)',
                width: '16px',
                height: '16px',
                backgroundColor: color,
                color: 'black',
                border: '1px solid black',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                zIndex: 1100
              }}
            >
              {value}
            </div>
          )
        } else if (values.length > 1) {
          // Enhanced version: four smaller circles in 2x2 grid
          const positions = [
            { top: '30%', left: '30%', label: 'P', name: 'Player', value: player, color: '#81b366' }, // Green for player (matches revealed tile color)
            { top: '30%', left: '70%', label: 'N', name: 'Neutral', value: neutral, color: '#d4aa5a' }, // Yellow for neutral (matches revealed tile color)
            { top: '70%', left: '30%', label: 'R', name: 'Rival', value: rival, color: '#c65757' }, // Red for rival (matches revealed tile color)
            { top: '70%', left: '70%', label: 'M', name: 'Mine', value: mine, color: '#8b6ba8' }  // Purple for mine (matches revealed tile color)
          ]

          positions.forEach((pos, index) => {
            if (pos.value !== undefined) {
              elements.push(
                <Tooltip key={`adjacency-${index}`} text={`${pos.name}: ${pos.value}`} style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)', zIndex: 1100 }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: pos.color,
                      color: 'black',
                      border: '1px solid black',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      zIndex: 1100
                    }}
                  >
                    {pos.value}
                  </div>
                </Tooltip>
              )
            }
          })
        }
      }
      
      return <>{elements}</>
    }

    // Show dirty scribbles for extraDirty tiles even when no other annotations exist
    if (!tile.revealed && tile.specialTiles.includes('extraDirty')) {
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

    // Return all overlay elements (adjacency count + any annotations)
    return elements.length > 0 ? <>{elements}</> : null
  }

  // Handle empty tiles (holes in the grid) after all hooks have been called
  if (tile.owner === 'empty') {
    // Check if this empty tile has a lair
    const hasLair = tile.specialTiles.includes('lair')
    const hasDestroyed = tile.specialTiles.includes('destroyed')

    const content = (
      <div
        onClick={handleClick}
        onMouseEnter={() => {
          setIsHovered(true)
          onMouseEnter?.()
        }}
        onMouseLeave={() => {
          setIsHovered(false)
          onMouseLeave?.()
        }}
        style={{
          position: 'relative',
          width: '56px',
          height: '56px',
          backgroundColor: 'transparent',
          border: hasLair && !hasDestroyed && isTargeting ? '2px solid #007bff' : 'none',
          borderRadius: '4px',
          cursor: isTargeting ? 'pointer' : 'default'
        }}
      >
        {/* Render lair house icon */}
        {hasLair && !hasDestroyed && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '36px',
              pointerEvents: 'none',
              zIndex: 999
            }}
          >
            🏠
          </div>
        )}

        {/* Render destroyed explosion if lair was destroyed */}
        {hasDestroyed && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          >
            {/* Jagged red explosion shape */}
            <svg width="100%" height="100%" viewBox="0 0 56 56" style={{ position: 'absolute' }}>
              <polygon
                points="28,8 32,20 44,16 36,28 48,32 36,36 44,48 32,40 28,52 24,40 12,48 20,36 8,32 20,28 12,16 24,20"
                fill="#dc3545"
                stroke="#8b0000"
                strokeWidth="2"
                opacity="0.8"
              />
            </svg>
          </div>
        )}
      </div>
    )

    return hasLair && !hasDestroyed ? (
      <Tooltip text="Goblin Lair: Spawns a goblin after each rival turn">
        {content}
      </Tooltip>
    ) : content
  }

  const mainTile = (
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
                isAdjacencyHighlighted() === 'green' ? '3px solid #22c55e' :
                isAdjacencyHighlighted() === 'red' ? '3px solid #dc3545' :
                isEnemyHighlighted || isTingleEmphasized() ? '3px solid #dc3545' :
                isTrystHighlighted ? '3px solid #9b59b6' :
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
        boxShadow: isAdjacencyHighlighted() === 'green' ? '0 0 12px rgba(34, 197, 94, 0.6)' :
                   isAdjacencyHighlighted() === 'red' ? '0 0 12px rgba(220, 53, 69, 0.6)' :
                   isEnemyHighlighted || isTingleEmphasized() ? '0 0 12px rgba(220, 53, 69, 0.6)' :
                   isTrystHighlighted ? '0 0 12px rgba(155, 89, 182, 0.6)' :
                   isBrushHighlighted ? '0 0 12px rgba(0, 123, 255, 0.8)' :
                   isClueHighlighted() ? '0 0 8px rgba(64, 192, 87, 0.4)' :
                   (isHovered && !tile.revealed) ? '0 2px 4px rgba(0,0,0,0.3)' :
                   'none',
        animation: isAdjacencyHighlighted() ? 'pulse 1s ease-in-out infinite' :
                   isEnemyHighlighted || isTingleEmphasized() ? 'pulse 1s ease-in-out infinite' :
                   isTrystHighlighted ? 'pulse 1s ease-in-out infinite' :
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
  )

  return tile.specialTiles.includes('extraDirty') && !tile.revealed ? (
    <Tooltip text="Cannot reveal tile without cleaning it!">
      {mainTile}
    </Tooltip>
  ) : mainTile
}