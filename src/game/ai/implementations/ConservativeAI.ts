import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile, ClueResult, Position } from '../../../types'
import { calculateTilePriorities } from '../utils/priorityScoring'
import { revealTile, positionToKey, hasSpecialTile } from '../../boardSystem'
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
    hiddenClues: { clueResult: ClueResult; targetPosition: Position }[],
    context: AIContext
  ): Tile[] {
    console.log('=== CONSERVATIVE AI SELECTION (CONSTRAINT PROPAGATION) ===')

    const tilesToReveal: Tile[] = []
    let simulatedState = state
    let revealIterationCount = 0
    const maxRevealIterations = 50 // Safety limit

    while (revealIterationCount < maxRevealIterations) {
      revealIterationCount++
      console.log(`\n🧠 Reveal Iteration ${revealIterationCount}:`)

      // Use extracted exclusion analysis logic
      const analysis = analyzeExclusionsAndGuarantees(simulatedState)
      const { guaranteedRivals, ruledOutRivals } = analysis

      console.log(`  - Guaranteed rivals: ${guaranteedRivals.length} tiles`)
      console.log(`  - Ruled out as rival: ${ruledOutRivals.size} tiles`)

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
          console.log(`  ✓ Selected guaranteed rival at (${nextTile.position.x},${nextTile.position.y})`)
        }
      }

      if (!nextTile) {
        // Step 5: Fall back to priority-based selection, skipping ruled-out tiles, surface mines, and mines
        const availableTiles = Array.from(simulatedState.board.tiles.values())
          .filter(tile =>
            !tile.revealed &&
            tile.owner !== 'empty' &&
            !hasSpecialTile(tile, 'surfaceMine') && // Skip surface mines (AI never reveals them)
            !ruledOutRivals.has(positionToKey(tile.position)) &&
            // Skip mines if rivalNeverMines is enabled (only affects tile selection, not deduction)
            !(context.specialBehaviors.rivalNeverMines && tile.owner === 'mine')
          )

        if (availableTiles.length === 0) {
          console.log('  ⚠ No available tiles left')
          break
        }

        // Use priority scoring with available tiles
        const tilesWithPriority = calculateTilePriorities(simulatedState, hiddenClues)
        const filteredPriorities = tilesWithPriority.filter(tp =>
          availableTiles.some(t => positionToKey(t.position) === positionToKey(tp.tile.position))
        )

        if (filteredPriorities.length === 0) {
          console.log('  ⚠ No tiles with priority available')
          break
        }

        // Sort by priority and pick highest
        filteredPriorities.sort((a, b) => b.priority - a.priority)
        nextTile = filteredPriorities[0].tile
        console.log(`  → Selected by priority: (${nextTile.position.x},${nextTile.position.y}) with priority ${filteredPriorities[0].priority}`)
      }

      if (!nextTile) break

      tilesToReveal.push(nextTile)

      // Stop if this is not a rival tile (would end turn)
      if (nextTile.owner !== 'rival') {
        console.log(`  ⚠ Selected non-rival tile [${nextTile.owner}], stopping`)
        break
      }

      // Simulate revealing this tile to use new info in next iteration
      console.log(`  ⟳ Simulating reveal to continue with updated info`)
      simulatedState = this.simulateReveal(simulatedState, nextTile)
    }

    console.log(`\n🧠 CONSERVATIVE AI: Selected ${tilesToReveal.length} tiles total`)
    console.log('=======================================================\n')

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
