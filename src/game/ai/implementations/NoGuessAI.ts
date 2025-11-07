import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile, ClueResult, Position } from '../../../types'
import { calculateTilePriorities } from '../utils/priorityScoring'
import { logAIPriorityAnalysis } from '../utils/aiCommon'
import { hasSpecialTile } from '../../boardSystem'
import { AI_METADATA } from '../../gameRepository'

/**
 * NoGuessAI - The current default AI implementation
 * Uses clue-based priority scoring to select rival tiles
 * Never uses revealed adjacency information for deductions
 */
export class NoGuessAI implements RivalAI {
  readonly name = AI_METADATA['noguess'].name
  readonly description = AI_METADATA['noguess'].description
  readonly icon = AI_METADATA['noguess'].icon

  selectTilesToReveal(
    state: GameState,
    hiddenClues: { clueResult: ClueResult; targetPosition: Position }[],
    context: AIContext
  ): Tile[] {
    // Calculate priorities for all unrevealed tiles
    const tilesWithPriority = calculateTilePriorities(state, hiddenClues)

    if (tilesWithPriority.length === 0) return []

    // Check if this level has the rivalNeverMines special behavior
    const rivalNeverMines = context.specialBehaviors.rivalNeverMines || false

    // Log the top tiles for debugging
    logAIPriorityAnalysis()

    // Return ordered list, stopping when we would reveal a non-rival tile
    // Skip mines if rivalNeverMines is enabled
    // Skip surface mines (AI never reveals them)
    const tilesToReveal: Tile[] = []
    for (const item of tilesWithPriority) {
      // Skip surface mine tiles (AI never reveals them)
      if (hasSpecialTile(item.tile, 'surfaceMine')) {
        continue
      }

      // Skip mine tiles if rivalNeverMines is enabled
      if (rivalNeverMines && item.tile.owner === 'mine') {
        continue
      }

      tilesToReveal.push(item.tile)
      // Stop after adding a non-rival tile (this will be the last tile revealed)
      if (item.tile.owner !== 'rival') {
        break
      }
    }

    return tilesToReveal
  }
}
