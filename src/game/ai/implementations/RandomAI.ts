import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile, ClueResult, Position } from '../../../types'
import { hasSpecialTile } from '../../boardSystem'
import { AI_METADATA } from '../../gameRepository'

/**
 * RandomAI - Completely random tile selection
 * Ignores all clues and makes purely random choices
 * Useful for testing and as a difficulty floor
 */
export class RandomAI implements RivalAI {
  readonly name = AI_METADATA['random'].name
  readonly description = AI_METADATA['random'].description
  readonly icon = AI_METADATA['random'].icon

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

    if (rivalNeverMines) {
    }

    // Return tiles in random order, stopping when we would reveal a non-rival tile
    const tilesToReveal: Tile[] = []
    for (const tile of shuffled) {
      tilesToReveal.push(tile)
      // Stop after adding a non-rival tile (this will be the last tile revealed)
      if (tile.owner !== 'rival') {
        break
      }
    }

    return tilesToReveal
  }
}
