import { GameState, Position } from '../../types'
import { removeSpecialTile, cleanGoblin, hasSpecialTile } from '../boardSystem'
import { triggerMopEffect } from '../relicSystem'

export function executeSweepEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  let currentBoard = state.board
  let tilesCleanedCount = 0  // Only count dirt, not goblins

  // Enhanced: 7x7 area (-3 to +3), Normal: 5x5 area (-2 to +2)
  const range = card?.enhanced ? 3 : 2

  // Clear dirt and move goblins in the specified area around the target position
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const x = target.x + dx
      const y = target.y + dy
      const position = { x, y }
      const key = `${x},${y}`
      const tile = currentBoard.tiles.get(key)

      if (!tile) continue

      // Handle goblins - move them but don't count for Mop
      if (hasSpecialTile(tile, 'goblin')) {
        const { board: boardAfterGoblinMove } = cleanGoblin(currentBoard, position)
        currentBoard = boardAfterGoblinMove
      }

      // Handle extraDirty tiles - clean them and count for Mop
      // Note: Check current tile state in case goblin was just cleaned above
      const currentTile = currentBoard.tiles.get(key)
      if (currentTile && hasSpecialTile(currentTile, 'extraDirty')) {
        const newTiles = new Map(currentBoard.tiles)
        const updatedTile = removeSpecialTile(currentTile, 'extraDirty')
        newTiles.set(key, updatedTile)
        currentBoard = {
          ...currentBoard,
          tiles: newTiles
        }
        tilesCleanedCount++
      }
    }
  }

  let finalState = {
    ...state,
    board: currentBoard
  }

  // Trigger Mop effect only for cleaned dirt tiles (not goblins)
  finalState = triggerMopEffect(finalState, tilesCleanedCount)

  return finalState
}