import { Board as BoardType, Tile as TileType, Position } from '../types'
import { Tile } from './Tile'
import { positionToKey } from '../game/boardSystem'
import { useGameStore } from '../store'
import { useState, useEffect } from 'react'

interface BoardProps {
  board: BoardType
  onTileClick: (tile: TileType) => void
  targetingInfo?: { count: number; description: string; selected: Position[] } | null
}

export function Board({ board, onTileClick, targetingInfo }: BoardProps) {
  const { rivalAnimation, trystAnimation, selectedCardName, selectedCardId, pendingCardEffect, hand, adjacencyPatternAnimation, clearAdjacencyPatternAnimation } = useGameStore()
  const [areaHoverCenter, setAreaHoverCenter] = useState<Position | null>(null)

  // Clear adjacency pattern animation after 1 second
  useEffect(() => {
    if (adjacencyPatternAnimation?.isActive) {
      const timeout = setTimeout(() => {
        clearAdjacencyPatternAnimation()
      }, 1000)

      return () => clearTimeout(timeout)
    }
  }, [adjacencyPatternAnimation, clearAdjacencyPatternAnimation])

  const isBrushTargeting = selectedCardName === 'Brush' && pendingCardEffect?.type === 'brush'
  const isSweepTargeting = selectedCardName === 'Sweep' && pendingCardEffect?.type === 'sweep'
  const isCanaryTargeting = selectedCardName === 'Canary' && pendingCardEffect?.type === 'canary'
  const isArgumentTargeting = selectedCardName === 'Argument' && pendingCardEffect?.type === 'argument'
  const isHorseTargeting = selectedCardName === 'Horse' && pendingCardEffect?.type === 'horse'
  const isFanTargeting = selectedCardName === 'Fan' && pendingCardEffect?.type === 'fan'
  const isAreaTargeting = isBrushTargeting || isSweepTargeting || isCanaryTargeting || isArgumentTargeting || isHorseTargeting || isFanTargeting

  // Find the current selected card to check if enhanced - use ID to find exact card, not name
  const selectedCard = selectedCardId ? hand.find(card => card.id === selectedCardId) : hand.find(card => card.name === selectedCardName)
  
  // Get area pattern and size based on card type and enhancement
  const getAreaInfo = (cardName: string | null, isEnhanced: boolean = false): { size: number; pattern: 'square' | 'manhattan' } => {
    if (cardName === 'Brush') return { size: 1, pattern: 'square' } // Always 3x3 for Brush (range = 1)
    if (cardName === 'Sweep') return { size: isEnhanced ? 3 : 2, pattern: 'square' } // Enhanced: 7x7 (range = 3), Normal: 5x5 (range = 2)
    if (cardName === 'Canary') return { size: isEnhanced ? 1 : 1, pattern: isEnhanced ? 'square' : 'manhattan' } // Enhanced: 3x3, Normal: star
    if (cardName === 'Argument') return { size: 1, pattern: 'square' } // Always 3x3 for Argument (range = 1)
    if (cardName === 'Horse') return { size: 1, pattern: 'manhattan' } // Manhattan distance 1 (cross shape)
    if (cardName === 'Fan') return { size: isEnhanced ? 1 : 1, pattern: isEnhanced ? 'square' : 'manhattan' } // Enhanced: 3x3, Normal: star (same as Canary)
    return { size: 1, pattern: 'square' } // Default
  }
  
  const areaInfo = getAreaInfo(selectedCardName, selectedCard?.enhanced)
  
  // Debug logging for area targeting
  if (isAreaTargeting && areaHoverCenter) {
  }
  
  const renderTiles = () => {
    const tiles: JSX.Element[] = []
    
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const key = `${x},${y}`
        const tile = board.tiles.get(key)
        
        // Check if this position is in the area effect zone for hover highlighting
        const isInAreaEffect = isAreaTargeting && areaHoverCenter && (() => {
          if (areaInfo.pattern === 'manhattan') {
            // Manhattan distance pattern
            const manhattanDistance = Math.abs(x - areaHoverCenter.x) + Math.abs(y - areaHoverCenter.y)
            return manhattanDistance <= areaInfo.size
          } else {
            // Square pattern (default)
            return Math.abs(x - areaHoverCenter.x) <= areaInfo.size && 
                   Math.abs(y - areaHoverCenter.y) <= areaInfo.size
          }
        })()
        
        
        if (tile) {
          const isTargeting = targetingInfo !== null
          const isSelected = targetingInfo?.selected.some(pos => 
            positionToKey(pos) === key
          ) || false
          
          const isRivalHighlighted = !!(rivalAnimation?.highlightedTile && 
            rivalAnimation.highlightedTile.x === tile.position.x && 
            rivalAnimation.highlightedTile.y === tile.position.y)
            
          const isTrystHighlighted = !!(trystAnimation?.highlightedTile && 
            trystAnimation.highlightedTile.x === tile.position.x && 
            trystAnimation.highlightedTile.y === tile.position.y)
          
          tiles.push(
            <Tile
              key={key}
              tile={tile}
              onClick={onTileClick}
              isTargeting={isTargeting && (isAreaTargeting || !tile.revealed)}
              isSelected={isSelected}
              isEnemyHighlighted={isRivalHighlighted}
              isTrystHighlighted={isTrystHighlighted}
              isBrushHighlighted={isInAreaEffect || false}
              onMouseEnter={() => {
                if (isAreaTargeting) {
                  setAreaHoverCenter({ x, y })
                }
              }}
              onMouseLeave={() => {
                if (isAreaTargeting) {
                  setAreaHoverCenter(null)
                }
              }}
            />
          )
        } else if (isAreaTargeting) {
          // Render placeholder tiles for empty spaces when area targeting
          const emptyTile = {
            position: { x, y },
            owner: 'empty' as const,
            revealed: false,
            revealedBy: null,
            adjacencyCount: null,
            annotations: [],
            specialTiles: []
          }
          
          const isTargeting = targetingInfo !== null
          const isSelected = targetingInfo?.selected.some(pos => 
            positionToKey(pos) === key
          ) || false
          
          tiles.push(
            <Tile
              key={key}
              tile={emptyTile}
              onClick={onTileClick}
              isTargeting={isTargeting}
              isSelected={isSelected}
              isEnemyHighlighted={false}
              isTrystHighlighted={false}
              isBrushHighlighted={isInAreaEffect || false}
              onMouseEnter={() => {
                if (isAreaTargeting) {
                  setAreaHoverCenter({ x, y })
                }
              }}
              onMouseLeave={() => {
                if (isAreaTargeting) {
                  setAreaHoverCenter(null)
                }
              }}
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
      flexDirection: 'column',
      alignItems: 'center',
      margin: '20px 0',
      width: '100%' // Ensure full width
    }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${board.width}, 60px)`,
          gridTemplateRows: `repeat(${board.height}, 60px)`,
          gap: '4px',
          padding: '20px',
          backgroundColor: '#c8ccd4',
          borderRadius: '8px',
          border: '2px solid #dee2e6'
        }}
      >
        {renderTiles()}
      </div>
    </div>
  )
}