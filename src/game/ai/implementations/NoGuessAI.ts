import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile } from '../../../types'
import { selectTileByMaxPoints } from '../utils/aiCommon'
import { AI_METADATA } from '../../gameRepository'

/**
 * NoGuessAI - Simple AI implementation based on intent points
 * Selects randomly from tiles with maximum intent points
 * Never uses revealed adjacency information for deductions
 */
export class NoGuessAI implements RivalAI {
  readonly name = AI_METADATA['noguess'].name
  readonly description = AI_METADATA['noguess'].description
  readonly icon = AI_METADATA['noguess'].icon

  selectTilesToReveal(
    state: GameState,
    rivalIntentPoints: { [key: string]: number },
    _context: AIContext
  ): Tile[] {
    console.log(`\n[AI-NOGUESS] ========== NoGuessAI selectTilesToReveal ==========`)
    console.log(`[AI-NOGUESS] Intent points: ${Object.keys(rivalIntentPoints).length} tiles`)

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
          console.log(`[AI-NOGUESS] Removing already-revealed tile ${key} from points`)
          delete mutablePoints[key]
        }
      }

      // Select a tile using the max points strategy
      const selectedTile = selectTileByMaxPoints(state, mutablePoints)

      if (!selectedTile) {
        console.log(`[AI-NOGUESS] No tile selected - ending turn with ${tilesToReveal.length} tiles`)
        break
      }

      console.log(`[AI-NOGUESS] Selected tile (${selectedTile.position.x},${selectedTile.position.y})[${selectedTile.owner}]`)

      tilesToReveal.push(selectedTile)

      // Stop if this is not a rival tile (would end turn)
      if (selectedTile.owner !== 'rival') {
        console.log(`[AI-NOGUESS] Stopping: tile is ${selectedTile.owner}, not rival`)
        break
      }

      console.log(`[AI-NOGUESS] Continuing: tile is rival, will select next tile`)

      // Remove the revealed tile's points so we don't select it again
      const tileKey = `${selectedTile.position.x},${selectedTile.position.y}`
      delete mutablePoints[tileKey]
    }

    return tilesToReveal
  }
}
