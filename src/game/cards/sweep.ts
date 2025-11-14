import { GameState, Position } from '../../types'
import { removeSpecialTile, cleanGoblin, hasSpecialTile } from '../boardSystem'
import { triggerMopEffect, hasEquipment } from '../equipment'

export function executeSweepEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  let currentBoard = state.board
  let tilesCleanedCount = 0  // Count dirt, goblins, and surface mines for Mop

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
    tilesCleanedCount++  // Count goblin for Mop effect
  }

  // Second pass: clear dirt tiles and count for Mop
  const cleanedPositions: Position[] = []
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
        cleanedPositions.push({ x, y })
      }
    }
  }

  let finalState = {
    ...state,
    board: currentBoard
  }

  // Third pass: handle surface mines based on cleaning state
  let copperFromDefusing = 0
  let surfaceMinesDefused = 0
  const hasMop = hasEquipment(finalState, 'Mop')

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const x = target.x + dx
      const y = target.y + dy
      const key = `${x},${y}`
      const tile = finalState.board.tiles.get(key)

      if (tile && hasSpecialTile(tile, 'surfaceMine')) {
        let shouldDefuse = false
        const newTiles = new Map(finalState.board.tiles)
        let currentTile = tile

        // With Mop: always defuse
        if (hasMop) {
          shouldDefuse = true
        }
        // Second cleaning (already cleaned once by Spritz or Sweep): defuse
        else if (currentTile.surfaceMineState?.cleanedOnce) {
          shouldDefuse = true
        }
        // First cleaning without Mop: mark surface mine as cleanedOnce
        else {
          currentTile = { ...currentTile, surfaceMineState: { cleanedOnce: true } }
          newTiles.set(key, currentTile)
          finalState = {
            ...finalState,
            board: {
              ...finalState.board,
              tiles: newTiles
            }
          }
        }

        if (shouldDefuse) {
          const defusedTile = removeSpecialTile(currentTile, 'surfaceMine')
          newTiles.set(key, defusedTile)
          finalState = {
            ...finalState,
            board: {
              ...finalState.board,
              tiles: newTiles
            }
          }
          copperFromDefusing += 3
          surfaceMinesDefused++
        }
      }
    }
  }

  if (surfaceMinesDefused > 0) {
    finalState = {
      ...finalState,
      copper: finalState.copper + copperFromDefusing
    }

    // Count defused mines as cleaning for Mop effect (card draw)
    tilesCleanedCount += surfaceMinesDefused
  }

  // Trigger Mop effect for cleaned dirt tiles + defused surface mines
  finalState = triggerMopEffect(finalState, tilesCleanedCount)

  return finalState
}