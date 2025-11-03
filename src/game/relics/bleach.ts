import { GameState, Position } from '../../types'
import { getTile, removeSpecialTile, positionToKey, hasSpecialTile } from '../boardSystem'
import { hasRelic } from './relicUtils'
import { triggerMopEffect } from './mop'

/**
 * Bleach relic: whenever you clean a tile, also clean the N/S/E/W adjacent tiles
 * This function should be called after cleaning a tile to trigger the spreading effect
 */
export function triggerBleachEffect(state: GameState, cleanedPosition: Position): GameState {
  if (!hasRelic(state, 'Bleach')) {
    return state
  }

  console.log(`🧴 BLEACH EFFECT: Spreading clean from (${cleanedPosition.x}, ${cleanedPosition.y})`)

  // Cardinal directions (N, S, E, W)
  const adjacentPositions: Position[] = [
    { x: cleanedPosition.x, y: cleanedPosition.y - 1 }, // North
    { x: cleanedPosition.x, y: cleanedPosition.y + 1 }, // South
    { x: cleanedPosition.x - 1, y: cleanedPosition.y }, // West
    { x: cleanedPosition.x + 1, y: cleanedPosition.y }  // East
  ]

  let currentBoard = state.board
  let additionalCleanCount = 0

  for (const pos of adjacentPositions) {
    const tile = getTile(currentBoard, pos)

    // Clean dirt if present
    if (tile && hasSpecialTile(tile, 'extraDirty')) {
      console.log(`  - Cleaning adjacent dirt at (${pos.x}, ${pos.y})`)
      const key = positionToKey(pos)
      const newTiles = new Map(currentBoard.tiles)
      const cleanedTile = removeSpecialTile(tile, 'extraDirty')
      newTiles.set(key, cleanedTile)

      currentBoard = {
        ...currentBoard,
        tiles: newTiles
      }

      additionalCleanCount++
    }

    // Also clean goblins if present
    const updatedTile = getTile(currentBoard, pos)
    if (updatedTile && hasSpecialTile(updatedTile, 'goblin')) {
      console.log(`  - Cleaning adjacent goblin at (${pos.x}, ${pos.y})`)
      const key = positionToKey(pos)
      const newTiles = new Map(currentBoard.tiles)
      const cleanedTile = removeSpecialTile(updatedTile, 'goblin')
      newTiles.set(key, cleanedTile)

      currentBoard = {
        ...currentBoard,
        tiles: newTiles
      }

      additionalCleanCount++
    }

    // Also defuse surface mines if present
    const finalTile = getTile(currentBoard, pos)
    if (finalTile && hasSpecialTile(finalTile, 'surfaceMine') && !finalTile.cleanedOnce) {
      console.log(`  - Defusing adjacent surface mine at (${pos.x}, ${pos.y})`)
      const key = positionToKey(pos)
      const newTiles = new Map(currentBoard.tiles)
      const defusedTile = { ...finalTile, cleanedOnce: true }
      newTiles.set(key, defusedTile)

      currentBoard = {
        ...currentBoard,
        tiles: newTiles
      }

      additionalCleanCount++
    }
  }

  let finalState = {
    ...state,
    board: currentBoard
  }

  // Trigger Mop effect for additional tiles cleaned
  if (additionalCleanCount > 0) {
    console.log(`  - Triggering Mop effect for ${additionalCleanCount} additional cleaned tiles`)
    finalState = triggerMopEffect(finalState, additionalCleanCount)
  }

  return finalState
}
