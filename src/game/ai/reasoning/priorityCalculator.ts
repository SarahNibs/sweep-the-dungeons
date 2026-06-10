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
  basePriorities: Map<string, number>
): TilePriority[] {
  if (state.debugFlags.debugLogging) {
  console.log(`\n[PRIORITY] ========== calculatePriorities ==========`)
  }

  const priorities: TilePriority[] = []

  // Count remaining tiles for bias calculations
  const remaining = countRemainingTiles(state.board.tiles)

  if (state.debugFlags.debugLogging) {
  console.log(`[PRIORITY] Remaining tiles: ${remaining.unrevealed} total, ${remaining.rival} rival, ${remaining.mine} mine`)
  }

  // Bias terms for numerical stability
  const rivalBias = (remaining.rival / 100) + 0.001
  const mineBias = (remaining.mine / 100) + 0.001
  const denomBias = (remaining.unrevealed / 100) + 0.001

  if (state.debugFlags.debugLogging) {
  console.log(`[PRIORITY] Bias terms: rival=${rivalBias.toFixed(4)}, mine=${mineBias.toFixed(4)}, denom=${denomBias.toFixed(4)}`)
  }

  // Get guaranteed rival position keys (to exclude from priority calculation)
  const guaranteedKeys = new Set<string>()
  for (const tile of analysis.guaranteedRivals) {
    guaranteedKeys.add(positionToKey(tile.position))
  }

  if (state.debugFlags.debugLogging) {
  console.log(`[PRIORITY] Excluding ${guaranteedKeys.size} guaranteed rivals from priority calculation`)
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

    // Get pre-calculated base priority (includes rival clue pips and Distraction noise)
    const basePriority = basePriorities.get(key) || 0

    // Calculate rival bonus: log₂((rival_count + bias) / (20 + denom_bias))
    const rivalBonus = Math.log2((counts.rival + rivalBias) / (20 + denomBias))

    // Calculate mine penalty: (1/3) * log₂((mine_count + bias) / (20 + denom_bias))
    const minePenalty = (1 / 3) * Math.log2((counts.mine + mineBias) / (20 + denomBias))

    // Calculate no-points mine penalty: -0.3 if mine with no intent points
    let noPointsMinePenalty = 0
    if (tile.owner === 'mine') {
      if (basePriority === 0) {
        noPointsMinePenalty = -0.3
      }
    }

    // Calculate final priority
    const priority = basePriority + rivalBonus - minePenalty + noPointsMinePenalty

    // Log detailed breakdown for first 10 tiles
    if (priorities.length < 10) {
      if (state.debugFlags.debugLogging) {
      console.log(`[PRIORITY] Tile (${tile.position.x},${tile.position.y})[${tile.owner}]: base=${basePriority.toFixed(2)}, rivalBonus=${rivalBonus.toFixed(2)}, minePenalty=${minePenalty.toFixed(2)}, noPointsMinePenalty=${noPointsMinePenalty.toFixed(2)} => final=${priority.toFixed(2)}`)
      }
    }

    priorities.push({
      tile,
      priority,
      breakdown: {
        basePriority,
        rivalBonus,
        minePenalty,
        noClueMinePenalty: noPointsMinePenalty
      }
    })
  }

  // Sort by priority (highest first)
  priorities.sort((a, b) => b.priority - a.priority)

  if (state.debugFlags.debugLogging) {
  console.log(`[PRIORITY] Calculated ${priorities.length} total priorities, sorted by final score`)
  }

  return priorities
}

/**
 * Calculate base priorities for all unrevealed tiles upfront
 *
 * Base priorities come from rivalIntentPoints which already include:
 * - Initial point allocation (higher for rival tiles)
 * - Distraction effects (random point additions)
 * - Point decay after reveals
 *
 * @param state Current game state
 * @param rivalIntentPoints Intent points for each tile position
 * @returns Map from position key to base priority
 */
export function calculateBasePriorities(
  state: GameState,
  rivalIntentPoints: { [key: string]: number }
): Map<string, number> {
  if (state.debugFlags.debugLogging) {
    console.log(`\n[PRIORITY] ========== calculateBasePriorities ==========`)
    console.log(`[PRIORITY] Using rivalIntentPoints with ${Object.keys(rivalIntentPoints).length} tiles`)
  }

  const basePriorities = new Map<string, number>()

  // Simply use the rivalIntentPoints as base priorities
  for (const [key, points] of Object.entries(rivalIntentPoints)) {
    basePriorities.set(key, points)

    // Log first 10 tiles with non-zero base priority
    if (points > 0 && basePriorities.size <= 10) {
      const tile = state.board.tiles.get(key)
      if (tile && state.debugFlags.debugLogging) {
        console.log(`[PRIORITY] Tile (${tile.position.x},${tile.position.y}): points=${points} => base=${points}`)
      }
    }
  }

  if (state.debugFlags.debugLogging) {
    console.log(`[PRIORITY] Calculated base priorities for ${basePriorities.size} tiles`)
  }

  return basePriorities
}
