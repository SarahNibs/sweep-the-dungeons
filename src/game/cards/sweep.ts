import { GameState, Position } from '../../types'
import { removeSpecialTile, cleanGoblin, hasSpecialTile } from '../boardSystem'
import { triggerMopEffect } from '../relicSystem'

export function executeSweepEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  let currentBoard = state.board
  let tilesCleanedCount = 0  // Only count dirt, not goblins

  // Enhanced: 7x7 area (-3 to +3), Normal: 5x5 area (-2 to +2)
  const range = card?.enhanced ? 3 : 2

  // First pass: collect all goblin positions in the area
  const goblinPositions: Position[] = []
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const x = target.x + dx
      const y = target.y + dy
      const key = `${x},${y}`
      const tile = currentBoard.tiles.get(key)

      if (tile && hasSpecialTile(tile, 'goblin')) {
        goblinPositions.push({ x, y })
      }
    }
  }

  // Move all collected goblins (each goblin only moves once, even if it moves within the area)
  for (const position of goblinPositions) {
    const { board: boardAfterGoblinMove } = cleanGoblin(currentBoard, position)
    currentBoard = boardAfterGoblinMove
  }

  // Second pass: clear dirt tiles and count for Mop
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const x = target.x + dx
      const y = target.y + dy
      const key = `${x},${y}`
      const tile = currentBoard.tiles.get(key)

      if (tile && hasSpecialTile(tile, 'extraDirty')) {
        const newTiles = new Map(currentBoard.tiles)
        const updatedTile = removeSpecialTile(tile, 'extraDirty')
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