import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile } from '../../../types'
import { revealTile, hasSpecialTile } from '../../boardSystem'
import { analyzeExclusionsAndGuarantees } from '../reasoning/exclusionLogic'
import { extractAdjacencyInfo } from '../reasoning/adjacencyExtractor'
import { runMonteCarloSimulation } from '../reasoning/monteCarloRunner'
import { calculatePriorities, calculateBasePriorities } from '../reasoning/priorityCalculator'
import { AI_METADATA } from '../../gameRepository'

/**
 * ReasoningAI - Uses Monte Carlo simulation with hill climbing for probabilistic tile selection
 *
 * Algorithm:
 * 1. Use constraint propagation to find excluded/guaranteed tiles
 * 2. If guaranteed tiles exist, reveal one immediately (early exit)
 * 3. Run Monte Carlo simulation (20 iterations of random assignment + hill climbing)
 * 4. Calculate priorities combining intent points + Monte Carlo results + penalties
 * 5. Select highest priority tile
 */
export class ReasoningAI implements RivalAI {
  readonly name = AI_METADATA['reasoning'].name
  readonly description = AI_METADATA['reasoning'].description
  readonly icon = AI_METADATA['reasoning'].icon

  selectTilesToReveal(
    state: GameState,
    rivalIntentPoints: { [key: string]: number },
    context: AIContext
  ): Tile[] {
    if (state.debugFlags.debugLogging) {
      console.log(`\n[AI-DECISION] ========== ReasoningAI selectTilesToReveal ==========`)
    }

    // Calculate base priorities ONCE upfront (from rival intent points)
    // These remain constant throughout the rival's turn
    const basePriorities = calculateBasePriorities(state, rivalIntentPoints)

    if (state.debugFlags.debugLogging) {
      console.log(`[AI-DECISION] Intent points: ${Object.keys(rivalIntentPoints).length}, Base priorities calculated for ${basePriorities.size} tiles`)
    }

    const tilesToReveal: Tile[] = []
    let simulatedState = state
    let revealIterationCount = 0
    const maxRevealIterations = 50 // Safety limit

    while (revealIterationCount < maxRevealIterations) {
      revealIterationCount++

      if (state.debugFlags.debugLogging) {
      console.log(`\n[AI-DECISION] --- Reveal iteration ${revealIterationCount} ---`)
      }

      // Phase 1: Exclusion analysis
      const analysis = analyzeExclusionsAndGuarantees(simulatedState)

      if (state.debugFlags.debugLogging) {
      console.log(`[AI-DECISION] Exclusion analysis: ${analysis.guaranteedRivals.length} guaranteed rivals, ${analysis.ruledOutRivals.size} ruled out tiles`)
      }

      let nextTile: Tile | null = null

      // Phase 2: Prefer guaranteed rivals (fast path)
      if (analysis.guaranteedRivals.length > 0) {
        // Filter out surface mines (AI never reveals them) and mines if rivalNeverMines behavior is enabled
        const selectableGuaranteed = analysis.guaranteedRivals.filter(tile => {
          if (hasSpecialTile(tile, 'surfaceMine')) return false
          if (context.specialBehaviors.rivalNeverMines && tile.owner === 'mine') return false
          return true
        })

        if (selectableGuaranteed.length > 0) {
          nextTile = selectableGuaranteed[0]
          if (state.debugFlags.debugLogging) {
          console.log(`[AI-DECISION] Selected guaranteed rival at (${nextTile.position.x},${nextTile.position.y})`)
          }
        }
      }

      if (!nextTile) {
        // Phase 3: Extract adjacency information
        const adjacencyInfo = extractAdjacencyInfo(simulatedState)

        // Phase 4: Run Monte Carlo simulation
        if (state.debugFlags.debugLogging) {
        console.log(`[AI-DECISION] Running Monte Carlo simulation...`)
        }
        const monteCarloResults = runMonteCarloSimulation(simulatedState, analysis, adjacencyInfo)
        if (state.debugFlags.debugLogging) {
        console.log(`[AI-DECISION] Monte Carlo results: ${monteCarloResults.ownerCounts.size} tiles evaluated`)
        }

        // Phase 5: Calculate priorities (using pre-calculated base priorities)
        const priorities = calculatePriorities(simulatedState, monteCarloResults, analysis, basePriorities)

        if (state.debugFlags.debugLogging) {
          console.log(`[AI-DECISION] calculatePriorities returned ${priorities.length} tiles`)
        }

        if (priorities.length === 0) {
          if (state.debugFlags.debugLogging) {
          console.log(`[AI-DECISION] No priorities calculated - ending turn`)
          }
          break
        }

        // Log top 5 priorities
        const top5 = priorities.slice(0, 5)
        if (state.debugFlags.debugLogging) {
        console.log(`[AI-DECISION] Top 5 priorities:`)
        }
        top5.forEach((tp, i) => {
          if (state.debugFlags.debugLogging) {
          console.log(`  ${i + 1}. (${tp.tile.position.x},${tp.tile.position.y})[${tp.tile.owner}]: priority=${tp.priority.toFixed(2)}`)
          }
        })

        // Phase 6: Select highest priority tile (filter surface mines and mines if needed)
        const selectablePriorities = priorities.filter(tp => {
          if (hasSpecialTile(tp.tile, 'surfaceMine')) return false
          if (context.specialBehaviors.rivalNeverMines && tp.tile.owner === 'mine') return false
          return true
        })

        if (selectablePriorities.length === 0) {
          if (state.debugFlags.debugLogging) {
          console.log(`[AI-DECISION] No selectable priorities - ending turn`)
          }
          break
        }

        nextTile = selectablePriorities[0].tile
        if (state.debugFlags.debugLogging) {
        console.log(`[AI-DECISION] Selected priority-based tile at (${nextTile.position.x},${nextTile.position.y})[${nextTile.owner}]`)
        }
      }

      if (!nextTile) break

      tilesToReveal.push(nextTile)

      // Stop if this is not a rival tile (would end turn)
      if (nextTile.owner !== 'rival') {
        if (state.debugFlags.debugLogging) {
          console.log(`[AI-DECISION] Stopping: revealed tile is ${nextTile.owner}, not rival`)
        }
        break
      }

      if (state.debugFlags.debugLogging) {
        console.log(`[AI-DECISION] Continuing: revealed tile is rival, simulating reveal and selecting next tile`)
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
