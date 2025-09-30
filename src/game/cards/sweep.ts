import { GameState, Position } from '../../types'
import { clearSpecialTileState } from '../boardSystem'
import { triggerMopEffect } from '../relicSystem'

export function executeSweepEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const newTiles = new Map(state.board.tiles)
  let tilesCleanedCount = 0
  
  // Enhanced: 7x7 area (-3 to +3), Normal: 5x5 area (-2 to +2)
  const range = card?.enhanced ? 3 : 2
  
  // Clear dirt in the specified area around the target position
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const x = target.x + dx
      const y = target.y + dy
      const key = `${x},${y}`
      const tile = newTiles.get(key)
      
      // Only process tiles that exist and have extraDirty special tile
      if (tile && tile.specialTile === 'extraDirty') {
        const updatedTile = clearSpecialTileState(tile)
        newTiles.set(key, updatedTile)
        tilesCleanedCount++
      }
    }
  }
  
  let finalState = {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
  
  // Trigger Mop effect for all cleaned tiles
  finalState = triggerMopEffect(finalState, tilesCleanedCount)
  
  return finalState
}