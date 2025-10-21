import { GameState } from '../../../types'
import { positionToKey } from '../../boardSystem'
import { MonteCarloResults, TilePriority, ExclusionAnalysis } from './types'
import { countRemainingTiles } from './utils'

/**
 * Calculate final priorities for all unrevealed, not-excluded, not-guaranteed tiles
 *
 * Priority formula:
 * final = base + rivalBonus - minePenalty + noClueMinePenalty
 *
 * Where:
 * - base = rival clue pips + Ramble bonus + Eyeshadow bonus + other effects (pre-calculated)
 * - rivalBonus = log₂((rival_count + bias) / (20 + denom_bias))
 * - minePenalty = (1/3) * log₂((mine_count + bias) / (20 + denom_bias))
 * - noClueMinePenalty = -0.3 if tile is mine AND received no rival pips this turn
 *
 * @param state Current game state
 * @param monteCarloResults Results from Monte Carlo simulation
 * @param analysis Exclusion analysis
 * @param basePriorities Pre-calculated base priorities (includes Ramble, Eyeshadow, etc.)
 * @param rivalCluePipsThisTurn Map of rival clue pips added this turn
 * @returns Array of tile priorities, sorted highest first
 */
export function calculatePriorities(
  state: GameState,
  monteCarloResults: MonteCarloResults,
  analysis: ExclusionAnalysis,
  basePriorities: Map<string, number>,
  rivalCluePipsThisTurn: Map<string, number>
): TilePriority[] {
  const priorities: TilePriority[] = []

  // Count remaining tiles for bias calculations
  const remaining = countRemainingTiles(state.board.tiles)

  // Bias terms for numerical stability
  const rivalBias = (remaining.rival / 100) + 0.001
  const mineBias = (remaining.mine / 100) + 0.001
  const denomBias = (remaining.unrevealed / 100) + 0.001

  // Get guaranteed rival position keys (to exclude from priority calculation)
  const guaranteedKeys = new Set<string>()
  for (const tile of analysis.guaranteedRivals) {
    guaranteedKeys.add(positionToKey(tile.position))
  }

  // Process each tile in Monte Carlo results
  for (const [key, counts] of monteCarloResults.ownerCounts) {
    // Skip if this is a guaranteed rival (should be revealed immediately, not ranked)
    if (guaranteedKeys.has(key)) continue

    // Skip if ruled out as rival
    if (analysis.ruledOutRivals.has(key)) continue

    // Get the actual tile
    const tile = state.board.tiles.get(key)
    if (!tile || tile.revealed || tile.owner === 'empty') continue

    // Get pre-calculated base priority (includes Ramble, Eyeshadow, etc.)
    const basePriority = basePriorities.get(key) || 0

    // Calculate rival bonus: log₂((rival_count + bias) / (20 + denom_bias))
    const rivalBonus = Math.log2((counts.rival + rivalBias) / (20 + denomBias))

    // Calculate mine penalty: (1/3) * log₂((mine_count + bias) / (20 + denom_bias))
    const minePenalty = (1 / 3) * Math.log2((counts.mine + mineBias) / (20 + denomBias))

    // Calculate no-clue mine penalty: -0.3 if mine with no rival pips this turn
    let noClueMinePenalty = 0
    if (tile.owner === 'mine') {
      const pipsThisTurn = rivalCluePipsThisTurn.get(key) || 0
      if (pipsThisTurn === 0) {
        noClueMinePenalty = -0.3
      }
    }

    // Calculate final priority
    const priority = basePriority + rivalBonus - minePenalty + noClueMinePenalty

    priorities.push({
      tile,
      priority,
      breakdown: {
        basePriority,
        rivalBonus,
        minePenalty,
        noClueMinePenalty
      }
    })
  }

  // Sort by priority (highest first)
  priorities.sort((a, b) => b.priority - a.priority)

  return priorities
}

/**
 * Calculate base priorities for all unrevealed tiles upfront
 *
 * Base priority includes:
 * - Rival clue pips (from hidden clues)
 * - Ramble bonus (applied to ALL tiles)
 * - Eyeshadow bonus (applied to ALL tiles)
 * - Any other future effects (applied to ALL tiles)
 *
 * These priorities remain constant throughout the rival's turn, even if multiple
 * tiles are revealed. They are calculated once at the start of the turn.
 *
 * @param state Current game state
 * @param rivalCluePipsThisTurn Map of pips added this turn
 * @returns Map from position key to base priority
 */
export function calculateBasePriorities(
  state: GameState,
  rivalCluePipsThisTurn: Map<string, number>
): Map<string, number> {
  const basePriorities = new Map<string, number>()

  // Process all unrevealed tiles
  for (const tile of state.board.tiles.values()) {
    if (tile.owner === 'empty' || tile.revealed) continue

    const key = positionToKey(tile.position)

    // Start with rival clue pips from this turn
    let basePriority = rivalCluePipsThisTurn.get(key) || 0

    // Add Ramble bonuses (applied to ALL tiles, not just those with pips)
    // Ramble provides priority boost based on ramblePriorityBoosts array
    for (const rambleBoost of state.ramblePriorityBoosts) {
      basePriority += rambleBoost
    }

    // Add Eyeshadow bonus if applicable (applied to ALL tiles)
    // TODO: Implement Eyeshadow bonus when that relic is added
    // Note: According to spec, these bonuses apply to ALL tiles, not just those with clue pips

    basePriorities.set(key, basePriority)
  }

  return basePriorities
}
