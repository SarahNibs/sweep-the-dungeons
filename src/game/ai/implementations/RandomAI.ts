import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile, ClueResult, Position } from '../../../types'
import { hasSpecialTile } from '../../boardSystem'

/**
 * RandomAI - Completely random tile selection
 * Ignores all clues and makes purely random choices
 * Useful for testing and as a difficulty floor
 */
export class RandomAI implements RivalAI {
  readonly name = 'Random Rival'
  readonly description = 'Makes completely random choices, ignoring all clues'
  readonly icon = '🎲'

  selectTilesToReveal(
    state: GameState,
    _hiddenClues: { clueResult: ClueResult; targetPosition: Position }[],
    context: AIContext
  ): Tile[] {
    // Get all unrevealed tiles (excluding surface mines - AI never reveals them)
    const unrevealedTiles = Array.from(state.board.tiles.values())
      .filter(tile => !tile.revealed && tile.owner !== 'empty' && !hasSpecialTile(tile, 'surfaceMine'))

    if (unrevealedTiles.length === 0) return []

    // Check if this level has the rivalNeverMines special behavior
    const rivalNeverMines = context.specialBehaviors.rivalNeverMines || false

    // Filter out mines if rivalNeverMines is enabled
    let availableTiles = unrevealedTiles
    if (rivalNeverMines) {
      availableTiles = unrevealedTiles.filter(tile => tile.owner !== 'mine')
    }

    if (availableTiles.length === 0) return []

    // Shuffle tiles randomly
    const shuffled = [...availableTiles].sort(() => Math.random() - 0.5)

    console.log('=== RANDOM AI SELECTION ===')
    console.log(`Total unrevealed tiles: ${unrevealedTiles.length}`)
    console.log(`Available tiles (after filtering mines): ${availableTiles.length}`)
    if (rivalNeverMines) {
      console.log('SPECIAL BEHAVIOR: Rival will skip mine tiles')
    }

    // Return tiles in random order, stopping when we would reveal a non-rival tile
    const tilesToReveal: Tile[] = []
    for (const tile of shuffled) {
      tilesToReveal.push(tile)
      // Stop after adding a non-rival tile (this will be the last tile revealed)
      if (tile.owner !== 'rival') {
        console.log(`Selected ${tilesToReveal.length} tile(s) randomly`)
        console.log(`First tile: (${tilesToReveal[0].position.x},${tilesToReveal[0].position.y}) [${tilesToReveal[0].owner}]`)
        break
      }
    }
    console.log('============================')

    return tilesToReveal
  }
}
