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
    console.log(`\n[AI-NOGUESS] ========== NoGuessAI selectTilesToReveal ==========`)
    console.log(`[AI-NOGUESS] Hidden clues: ${hiddenClues.length}`)

    // Calculate priorities for all unrevealed tiles (this will log its own details)
    const tilesWithPriority = calculateTilePriorities(state, hiddenClues)

    if (tilesWithPriority.length === 0) {
      console.log(`[AI-NOGUESS] No tiles with priorities - ending turn`)
      return []
    }

    // Check if this level has the rivalNeverMines special behavior
    const rivalNeverMines = context.specialBehaviors.rivalNeverMines || false

    // Log the top tiles for debugging
    logAIPriorityAnalysis()

    // Return ordered list, stopping when we would reveal a non-rival tile
    // Skip mines if rivalNeverMines is enabled
    // Skip surface mines (AI never reveals them)
    const tilesToReveal: Tile[] = []
    let skippedCount = 0
    for (const item of tilesWithPriority) {
      // Skip surface mine tiles (AI never reveals them)
      if (hasSpecialTile(item.tile, 'surfaceMine')) {
        skippedCount++
        continue
      }

      // Skip mine tiles if rivalNeverMines is enabled
      if (rivalNeverMines && item.tile.owner === 'mine') {
        skippedCount++
        continue
      }

      tilesToReveal.push(item.tile)
      console.log(`[AI-NOGUESS] Selecting tile (${item.tile.position.x},${item.tile.position.y})[${item.tile.owner}] with priority ${item.priority.toFixed(3)}`)

      // Stop after adding a non-rival tile (this will be the last tile revealed)
      if (item.tile.owner !== 'rival') {
        console.log(`[AI-NOGUESS] Selected non-rival tile, ending turn`)
        break
      }
    }

    if (skippedCount > 0) {
      console.log(`[AI-NOGUESS] Skipped ${skippedCount} tiles (surface mines or mines with rivalNeverMines)`)
    }
    console.log(`[AI-NOGUESS] Total tiles to reveal: ${tilesToReveal.length}`)

    return tilesToReveal
  }
}
