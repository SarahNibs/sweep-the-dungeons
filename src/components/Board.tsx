import { Board as BoardType, Tile as TileType, Position } from '../types'
import { Tile } from './Tile'
import { TileCountInfo } from './TileCountInfo'
import { positionToKey } from '../game/boardSystem'
import { useGameStore } from '../store'
import { useState } from 'react'

interface BoardProps {
  board: BoardType
  onTileClick: (tile: TileType) => void
  targetingInfo?: { count: number; description: string; selected: Position[] } | null
}

export function Board({ board, onTileClick, targetingInfo }: BoardProps) {
  const { enemyAnimation, selectedCardName, pendingCardEffect } = useGameStore()
  const [brushHoverCenter, setBrushHoverCenter] = useState<Position | null>(null)
  
  const isBrushTargeting = selectedCardName === 'Brush' && pendingCardEffect?.type === 'brush'
  
  const renderTiles = () => {
    const tiles: JSX.Element[] = []
    
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const key = `${x},${y}`
        const tile = board.tiles.get(key)
        
        if (tile) {
          const isTargeting = targetingInfo !== null
          const isSelected = targetingInfo?.selected.some(pos => 
            positionToKey(pos) === key
          ) || false
          
          const isEnemyHighlighted = !!(enemyAnimation?.highlightedTile && 
            enemyAnimation.highlightedTile.x === tile.position.x && 
            enemyAnimation.highlightedTile.y === tile.position.y)
          
          // Check if this tile is in the 3x3 brush area
          const isInBrushArea = isBrushTargeting && brushHoverCenter && 
            Math.abs(tile.position.x - brushHoverCenter.x) <= 1 && 
            Math.abs(tile.position.y - brushHoverCenter.y) <= 1
          
          tiles.push(
            <Tile
              key={key}
              tile={tile}
              onClick={onTileClick}
              isTargeting={isTargeting && (isBrushTargeting || !tile.revealed)}
              isSelected={isSelected}
              isEnemyHighlighted={isEnemyHighlighted}
              isBrushHighlighted={isInBrushArea || false}
              onMouseEnter={() => {
                if (isBrushTargeting) {
                  setBrushHoverCenter({ x, y })
                }
              }}
              onMouseLeave={() => {
                if (isBrushTargeting) {
                  setBrushHoverCenter(null)
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
      <TileCountInfo board={board} />
      
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