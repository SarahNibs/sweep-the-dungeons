import { GameState } from '../../../types'
import { ExclusionAnalysis, MonteCarloResults, AdjacencyInfo } from './types'
import { createRandomAssignment } from './randomAssignment'
import { hillClimb } from './hillClimber'
import { determinePossibilities } from './possibilityChecker'

/**
 * Run Monte Carlo simulation with hill climbing
 *
 * Strategy:
 * 1. Run 20 independent iterations
 * 2. Each iteration:
 *    a. Create random valid assignment
 *    b. Run hill climbing to optimize it
 *    c. Record final owner assignments
 * 3. Aggregate results across all iterations
 *
 * @param state Current game state
 * @param analysis Exclusion analysis with flags and guarantees
 * @param adjacencyInfo List of adjacency constraints
 * @returns Aggregated results showing how many times each tile was assigned each owner
 */
export function runMonteCarloSimulation(
  state: GameState,
  analysis: ExclusionAnalysis,
  adjacencyInfo: AdjacencyInfo[]
): MonteCarloResults {
  const iterations = 20

  // Initialize owner counts for all tiles
  const ownerCounts = new Map<string, {
    player: number
    rival: number
    neutral: number
    mine: number
  }>()

  // Get possibilities once (same for all iterations)
  const possibilities = determinePossibilities(state, analysis)

  // Initialize counts for all unrevealed tiles
  for (const key of possibilities.keys()) {
    ownerCounts.set(key, {
      player: 0,
      rival: 0,
      neutral: 0,
      mine: 0
    })
  }

  // Run 20 independent iterations
  for (let i = 0; i < iterations; i++) {
    // Create random assignment
    const randomAssignment = createRandomAssignment(state, analysis, possibilities)

    // Run hill climbing to optimize (debug mode only for first iteration)
    const debug = i === 0
    const optimizedAssignment = hillClimb(randomAssignment, adjacencyInfo, debug)

    // Record final assignments
    for (const [key, owner] of optimizedAssignment.assignments) {
      const counts = ownerCounts.get(key)
      if (counts) {
        counts[owner]++
      }
    }
  }

  return {
    ownerCounts
  }
}
