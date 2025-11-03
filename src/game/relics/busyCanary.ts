import { GameState } from '../../types'
import { hasRelic } from './relicUtils'
import { addOwnerSubsetAnnotation } from '../cardEffects'

export function triggerBusyCanaryEffect(state: GameState): GameState {
  if (!hasRelic(state, 'Busy Canary')) {
    return state
  }

  let currentState = state
  let mineFound = false
  const maxReveals = 2 // Try at most 2 area reveals

  for (let revealAttempt = 0; revealAttempt < maxReveals && !mineFound; revealAttempt++) {
    // Get all tiles on the board
    const allTiles = Array.from(currentState.board.tiles.values()).filter(tile =>
      tile.owner !== 'empty' && !tile.revealed
    )

    if (allTiles.length === 0) {
      break // No tiles to scan
    }

    // Pick a random tile as center
    const randomTile = allTiles[Math.floor(Math.random() * allTiles.length)]
    const centerPosition = randomTile.position

    // Apply enhanced Canary effect (3x3 area)
    const tilesToCheck: { x: number, y: number }[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tilesToCheck.push({
          x: centerPosition.x + dx,
          y: centerPosition.y + dy
        })
      }
    }

    // Check each tile and add appropriate annotation
    for (const pos of tilesToCheck) {
      const key = `${pos.x},${pos.y}`
      const tile = currentState.board.tiles.get(key)

      // Only process unrevealed tiles that exist on the board
      if (tile && !tile.revealed && tile.owner !== 'empty') {
        if (tile.owner === 'mine') {
          // This is a mine - exclude everything else (only mine possible)
          const mineOnlySubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['mine'])
          currentState = addOwnerSubsetAnnotation(currentState, pos, mineOnlySubset)
          mineFound = true
        } else {
          // This is not a mine - exclude mine from possibilities
          const noMineSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'rival', 'neutral'])
          currentState = addOwnerSubsetAnnotation(currentState, pos, noMineSubset)
        }
      }
    }
  }

  return currentState
}
