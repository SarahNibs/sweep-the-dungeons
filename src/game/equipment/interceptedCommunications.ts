import { GameState } from '../../types'
import { positionToKey, removeSpecialTile } from '../boardSystem'
import { revealTileWithEquipmentEffects } from '../cardEffects'
import { hasEquipment } from './equipmentUtils'

export function triggerInterceptedNoteEffect(state: GameState): GameState {
  if (!hasEquipment(state, 'Intercepted Communications')) {
    return state
  }

  console.log('🕵️ Triggering Intercepted Communications effect')

  // Find all unrevealed rival tiles
  const unrevealedRivalTiles = Array.from(state.board.tiles.values()).filter(tile =>
    tile.owner === 'rival' && !tile.revealed
  )

  if (unrevealedRivalTiles.length === 0) {
    console.log('  - No unrevealed rival tiles found')
    return state
  }

  // Pick a random rival tile to reveal
  const randomIndex = Math.floor(Math.random() * unrevealedRivalTiles.length)
  const tileToReveal = unrevealedRivalTiles[randomIndex]
  const position = tileToReveal.position

  console.log(`  - Revealing rival tile at (${position.x}, ${position.y})`)

  // Clean dirt first if present (like rivals do), then reveal with 'player' to get player adjacency info
  let currentState = state
  if (tileToReveal.specialTiles.includes('extraDirty')) {
    const key = positionToKey(position)
    const newTiles = new Map(currentState.board.tiles)
    const cleanedTile = removeSpecialTile(tileToReveal, 'extraDirty')
    newTiles.set(key, cleanedTile)
    currentState = {
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    }
  }

  // Reveal the tile with 'player' to show player adjacency info (uncontrollable - random selection)
  const newState = revealTileWithEquipmentEffects(currentState, position, 'player', false)

  console.log('  - Intercepted Communications effect completed')
  return newState
}
