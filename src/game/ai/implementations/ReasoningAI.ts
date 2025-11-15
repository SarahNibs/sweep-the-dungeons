import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile, ClueResult, Position } from '../../../types'
import { positionToKey, revealTile, hasSpecialTile } from '../../boardSystem'
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
 * 4. Calculate priorities combining clues + Monte Carlo results + penalties
 * 5. Select highest priority tile
 */
export class ReasoningAI implements RivalAI {
  readonly name = AI_METADATA['reasoning'].name
  readonly description = AI_METADATA['reasoning'].description
  readonly icon = AI_METADATA['reasoning'].icon

  selectTilesToReveal(
    state: GameState,
    hiddenClues: { clueResult: ClueResult; targetPosition: Position }[],
    context: AIContext
  ): Tile[] {
    if (state.debugFlags.debugLogging) {
    console.log(`\n[AI-DECISION] ========== ReasoningAI selectTilesToReveal ==========`)
    }

    // Calculate base priorities ONCE upfront (includes rival clues with decay + Distraction noise)
    // These remain constant throughout the rival's turn
    const rivalCluePipsThisTurn = extractRivalCluePips(hiddenClues)
    const basePriorities = calculateBasePriorities(state, hiddenClues)

    if (state.debugFlags.debugLogging) {
    console.log(`[AI-DECISION] Hidden clues: ${hiddenClues.length}, Base priorities calculated for ${basePriorities.size} tiles`)
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
        const priorities = calculatePriorities(simulatedState, monteCarloResults, analysis, basePriorities, rivalCluePipsThisTurn)

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

/**
 * Extract rival clue pips added this turn from hidden clues
 *
 * @param hiddenClues Hidden clues added by rival this turn
 * @returns Map from position key to number of rival pips
 */
function extractRivalCluePips(
  hiddenClues: { clueResult: ClueResult; targetPosition: Position }[]
): Map<string, number> {
  const pipsPerTile = new Map<string, number>()

  for (const { clueResult, targetPosition } of hiddenClues) {
    const key = positionToKey(targetPosition)
    const currentPips = pipsPerTile.get(key) || 0
    pipsPerTile.set(key, currentPips + clueResult.strengthForThisTile)
  }

  return pipsPerTile
}
