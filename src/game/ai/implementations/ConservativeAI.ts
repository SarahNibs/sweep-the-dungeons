import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile } from '../../../types'
import { selectTileByMaxPoints } from '../utils/aiCommon'
import { revealTile, hasSpecialTile } from '../../boardSystem'
import { analyzeExclusionsAndGuarantees } from '../reasoning/exclusionLogic'
import { AI_METADATA } from '../../gameRepository'

/**
 * ConservativeAI - Uses iterative constraint propagation for logical deduction
 *
 * Key features:
 * 1. Builds ownership possibility flags for each tile (player/rival/neutral/mine)
 * 2. Iteratively propagates constraints using adjacency information until convergence
 * 3. After stabilization, uses flags to:
 *    - Skip tiles that can't be rival (ruled out)
 *    - Prioritize tiles that must be rival (guaranteed)
 *    - Fall back to clue-based selection for ambiguous tiles
 * 4. Re-applies full logic after each reveal to use new information
 */
export class ConservativeAI implements RivalAI {
  readonly name = AI_METADATA['conservative'].name
  readonly description = AI_METADATA['conservative'].description
  readonly icon = AI_METADATA['conservative'].icon

  selectTilesToReveal(
    state: GameState,
    rivalIntentPoints: { [key: string]: number },
    context: AIContext
  ): Tile[] {
    if (state.debugFlags.debugLogging) {
      console.log(`\n[AI-CONSERVATIVE] ========== ConservativeAI selectTilesToReveal ==========`)
      console.log(`[AI-CONSERVATIVE] Intent points: ${Object.keys(rivalIntentPoints).length} tiles`)
    }

    const tilesToReveal: Tile[] = []
    let simulatedState = state
    let revealIterationCount = 0
    const maxRevealIterations = 50 // Safety limit

    while (revealIterationCount < maxRevealIterations) {
      revealIterationCount++

      if (state.debugFlags.debugLogging) {
      console.log(`\n[AI-CONSERVATIVE] --- Reveal iteration ${revealIterationCount} ---`)
      }

      // Use extracted exclusion analysis logic
      const analysis = analyzeExclusionsAndGuarantees(simulatedState)
      const { guaranteedRivals, ruledOutRivals } = analysis

      if (state.debugFlags.debugLogging) {
      console.log(`[AI-CONSERVATIVE] Exclusion analysis: ${guaranteedRivals.length} guaranteed rivals, ${ruledOutRivals.size} ruled out tiles`)
      }

      let nextTile: Tile | null = null

      // Step 4: Prefer guaranteed rivals (but skip mines if rivalNeverMines and skip surface mines)
      if (guaranteedRivals.length > 0) {
        // Filter out surface mines (AI never reveals them) and mines if rivalNeverMines behavior is enabled
        const selectableGuaranteed = guaranteedRivals.filter(tile => {
          if (hasSpecialTile(tile, 'surfaceMine')) return false
          if (context.specialBehaviors.rivalNeverMines && tile.owner === 'mine') return false
          return true
        })

        if (selectableGuaranteed.length > 0) {
          nextTile = selectableGuaranteed[0]
          if (state.debugFlags.debugLogging) {
          console.log(`[AI-CONSERVATIVE] Selected guaranteed rival at (${nextTile.position.x},${nextTile.position.y})`)
          }
        }
      }

      if (!nextTile) {
        // Step 5: Fall back to max points selection
        if (state.debugFlags.debugLogging) {
          console.log(`[AI-CONSERVATIVE] No guaranteed rivals, falling back to max points selection`)
        }

        nextTile = selectTileByMaxPoints(simulatedState, rivalIntentPoints)

        if (!nextTile) {
          if (state.debugFlags.debugLogging) {
            console.log(`[AI-CONSERVATIVE] No tile selected from max points - ending turn`)
          }
          break
        }

        if (state.debugFlags.debugLogging) {
          console.log(`[AI-CONSERVATIVE] Selected tile at (${nextTile.position.x},${nextTile.position.y})[${nextTile.owner}]`)
        }
      }

      if (!nextTile) break

      tilesToReveal.push(nextTile)

      // Stop if this is not a rival tile (would end turn)
      if (nextTile.owner !== 'rival') {
        break
      }

      // Simulate revealing this tile to use new info in next iteration
      simulatedState = this.simulateReveal(simulatedState, nextTile)
    }


    return tilesToReveal
  }


  /**
   * Simulate revealing a tile to see what information it would provide
   */
  private simulateReveal(state: GameState, tile: Tile): GameState {
    const newBoard = revealTile(state.board, tile.position, 'rival')
    return {
      ...state,
      board: newBoard
    }
  }
}
