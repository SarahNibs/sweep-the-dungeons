import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile } from '../../../types'
import { selectTileByMaxPoints } from '../utils/aiCommon'
import { AI_METADATA } from '../../gameRepository'

/**
 * RandomAI - Simple tile selection based on intent points
 * Selects randomly from tiles with maximum intent points
 * Useful for testing and as a difficulty floor
 */
export class RandomAI implements RivalAI {
  readonly name = AI_METADATA['random'].name
  readonly description = AI_METADATA['random'].description
  readonly icon = AI_METADATA['random'].icon

  selectTilesToReveal(
    state: GameState,
    rivalIntentPoints: { [key: string]: number },
    _context: AIContext
  ): Tile[] {
    const tilesToReveal: Tile[] = []

    // IMPORTANT: Create a mutable copy so we don't mutate the store's state object
    const mutablePoints = { ...rivalIntentPoints }

    // Keep selecting tiles until we hit a non-rival tile
    while (true) {
      // Clean up any already-revealed tiles from mutablePoints before selecting
      // This handles cases where player revealed a tile on their turn
      for (const [key] of Object.entries(mutablePoints)) {
        const tile = state.board.tiles.get(key)
        if (tile?.revealed) {
          delete mutablePoints[key]
        }
      }

      const selectedTile = selectTileByMaxPoints(state, mutablePoints)

      if (!selectedTile) {
        break
      }

      tilesToReveal.push(selectedTile)

      // Stop if this is not a rival tile
      if (selectedTile.owner !== 'rival') {
        break
      }

      // Remove the revealed tile's points so we don't select it again
      const tileKey = `${selectedTile.position.x},${selectedTile.position.y}`
      delete mutablePoints[tileKey]
    }

    return tilesToReveal
  }
}
