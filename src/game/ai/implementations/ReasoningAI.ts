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

    // Calculate base priorities ONCE upfront (includes Ramble, Eyeshadow, etc.)
    // These remain constant throughout the rival's turn
    const rivalCluePipsThisTurn = extractRivalCluePips(hiddenClues)
    const basePriorities = calculateBasePriorities(state, rivalCluePipsThisTurn)

    const tilesToReveal: Tile[] = []
    let simulatedState = state
    let revealIterationCount = 0
    const maxRevealIterations = 50 // Safety limit

    while (revealIterationCount < maxRevealIterations) {
      revealIterationCount++

      // Phase 1: Exclusion analysis
      const analysis = analyzeExclusionsAndGuarantees(simulatedState)

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
        }
      }

      if (!nextTile) {
        // Phase 3: Extract adjacency information
        const adjacencyInfo = extractAdjacencyInfo(simulatedState)

        // Phase 4: Run Monte Carlo simulation
        const monteCarloResults = runMonteCarloSimulation(simulatedState, analysis, adjacencyInfo)

        // Phase 5: Calculate priorities (using pre-calculated base priorities)
        const priorities = calculatePriorities(simulatedState, monteCarloResults, analysis, basePriorities, rivalCluePipsThisTurn)

        if (priorities.length === 0) {
          break
        }

        // DEBUG: Print detailed priority breakdown for all tiles
        // (removed for production)

        // Phase 6: Select highest priority tile (filter surface mines and mines if needed)
        const selectablePriorities = priorities.filter(tp => {
          if (hasSpecialTile(tp.tile, 'surfaceMine')) return false
          if (context.specialBehaviors.rivalNeverMines && tp.tile.owner === 'mine') return false
          return true
        })

        if (selectablePriorities.length === 0) {
          break
        }

        nextTile = selectablePriorities[0].tile
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
