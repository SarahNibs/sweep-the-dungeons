import { Board as BoardType, Tile as TileType, Position } from '../types'
import { Tile } from './Tile'
import { positionToKey } from '../game/boardSystem'
import { useGameStore } from '../store'
import { useState } from 'react'

interface BoardProps {
  board: BoardType
  onTileClick: (tile: TileType) => void
  targetingInfo?: { count: number; description: string; selected: Position[] } | null
}

export function Board({ board, onTileClick, targetingInfo }: BoardProps) {
  const { enemyAnimation, selectedCardName, pendingCardEffect, hand } = useGameStore()
  const [areaHoverCenter, setAreaHoverCenter] = useState<Position | null>(null)
  
  const isBrushTargeting = selectedCardName === 'Brush' && pendingCardEffect?.type === 'brush'
  const isSweepTargeting = selectedCardName === 'Sweep' && pendingCardEffect?.type === 'sweep'
  const isAreaTargeting = isBrushTargeting || isSweepTargeting
  
  // Find the current selected card to check if enhanced
  const selectedCard = hand.find(card => card.name === selectedCardName)
  
  // Get area size based on card type and enhancement
  const getAreaSize = (cardName: string | null, isEnhanced: boolean = false): number => {
    if (cardName === 'Brush') return 1 // Always 3x3 for Brush (range = 1)
    if (cardName === 'Sweep') return isEnhanced ? 3 : 2 // Enhanced: 7x7 (range = 3), Normal: 5x5 (range = 2)
    return 1 // Default
  }
  
  const areaSize = getAreaSize(selectedCardName, selectedCard?.enhanced)
  
  // Debug logging for area targeting
  if (isAreaTargeting && areaHoverCenter) {
    console.log('Area targeting debug:', {
      selectedCardName,
      selectedCard: selectedCard ? { name: selectedCard.name, enhanced: selectedCard.enhanced } : null,
      areaSize,
      areaHoverCenter,
      isAreaTargeting,
      isBrushTargeting,
      isSweepTargeting
    })
  }
  
  const renderTiles = () => {
    const tiles: JSX.Element[] = []
    
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const key = `${x},${y}`
        const tile = board.tiles.get(key)
        
        // Check if this position is in the area effect zone for hover highlighting
        const isInAreaEffect = isAreaTargeting && areaHoverCenter && 
          Math.abs(x - areaHoverCenter.x) <= areaSize && 
          Math.abs(y - areaHoverCenter.y) <= areaSize
        
        
        if (tile) {
          const isTargeting = targetingInfo !== null
          const isSelected = targetingInfo?.selected.some(pos => 
            positionToKey(pos) === key
          ) || false
          
          const isEnemyHighlighted = !!(enemyAnimation?.highlightedTile && 
            enemyAnimation.highlightedTile.x === tile.position.x && 
            enemyAnimation.highlightedTile.y === tile.position.y)
          
          tiles.push(
            <Tile
              key={key}
              tile={tile}
              onClick={onTileClick}
              isTargeting={isTargeting && (isAreaTargeting || !tile.revealed)}
              isSelected={isSelected}
              isEnemyHighlighted={isEnemyHighlighted}
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
            annotations: []
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