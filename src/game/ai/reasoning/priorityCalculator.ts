import { GameState, ClueResult, Position } from '../../../types'
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

    // Log detailed breakdown for first 10 tiles
    if (priorities.length < 10) {
      if (state.debugFlags.debugLogging) {
      console.log(`[PRIORITY] Tile (${tile.position.x},${tile.position.y})[${tile.owner}]: base=${basePriority.toFixed(2)}, rivalBonus=${rivalBonus.toFixed(2)}, minePenalty=${minePenalty.toFixed(2)}, noClueMinePenalty=${noClueMinePenalty.toFixed(2)} => final=${priority.toFixed(2)}`)
      }
    }

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

  if (state.debugFlags.debugLogging) {
  console.log(`[PRIORITY] Calculated ${priorities.length} total priorities, sorted by final score`)
  }

  return priorities
}

/**
 * Calculate base priorities for all unrevealed tiles upfront
 *
 * Base priority includes:
 * - Rival clue pips (current turn: full pips, past turns: max(pips - 1, 0))
 * - Distraction noise (independent random values per tile per stack)
 *
 * IMPORTANT: Distraction noise is generated independently for EACH tile.
 * Each Distraction stack generates a fresh [0, 1.5] random value per tile.
 * This means every tile gets different noise values, ensuring priorities are differentiated.
 *
 * Rival clue decay formula:
 * - Current turn clues (from parameter): full pip count
 * - Past turn clues (from state.rivalHiddenClues[]): max(pips - 1, 0)
 *
 * @param state Current game state
 * @param currentTurnClues Current turn clue pairs (NOT yet in state.rivalHiddenClues[])
 * @returns Map from position key to base priority
 */
export function calculateBasePriorities(
  state: GameState,
  currentTurnClues: { clueResult: ClueResult; targetPosition: Position }[]
): Map<string, number> {
  if (state.debugFlags.debugLogging) {
  console.log(`\n[PRIORITY] ========== calculateBasePriorities ==========`)
  }
  if (state.debugFlags.debugLogging) {
  console.log(`[PRIORITY] Processing ${currentTurnClues.length} current turn clues, ${state.rivalHiddenClues.length} historical clues, ${state.distractionStackCount} distraction stacks`)
  }

  const basePriorities = new Map<string, number>()

  // Process all unrevealed tiles
  for (const tile of state.board.tiles.values()) {
    if (tile.owner === 'empty' || tile.revealed) continue

    const key = positionToKey(tile.position)
    let basePriority = 0
    let currentTurnPips = 0
    let historicalPips = 0
    let distractionNoise = 0

    // Step 1: Process CURRENT turn clues (from parameter) - use full pip count
    // These clues are NOT in state.rivalHiddenClues[] yet
    for (const { clueResult, targetPosition } of currentTurnClues) {
      if (positionToKey(targetPosition) === key) {
        currentTurnPips += clueResult.strengthForThisTile
      }
    }
    basePriority += currentTurnPips

    // Step 2: Process PAST turn clues (from state) - use max(pips - 1, 0)
    // These are all previous turns' clues (stored as pairs with targetPosition)
    for (const { clueResult, targetPosition } of state.rivalHiddenClues) {
      if (positionToKey(targetPosition) === key) {
        // This clue affects our tile - apply decay
        const pips = clueResult.strengthForThisTile
        historicalPips += Math.max(pips - 1, 0)
      }
    }
    basePriority += historicalPips

    // Generate independent Distraction noise for THIS tile
    // Each stack generates a fresh random [0, 1.5] value
    for (let i = 0; i < state.distractionStackCount; i++) {
      distractionNoise += Math.random() * 1.5
    }
    basePriority += distractionNoise

    // Log first 10 tiles with non-zero base priority
    if (basePriority > 0 && basePriorities.size < 10) {
      if (state.debugFlags.debugLogging) {
      console.log(`[PRIORITY] Tile (${tile.position.x},${tile.position.y}): currentPips=${currentTurnPips.toFixed(2)}, historicalPips=${historicalPips.toFixed(2)}, distraction=${distractionNoise.toFixed(2)} => base=${basePriority.toFixed(2)}`)
      }
    }

    basePriorities.set(key, basePriority)
  }

  if (state.debugFlags.debugLogging) {
  console.log(`[PRIORITY] Calculated base priorities for ${basePriorities.size} tiles`)
  }

  return basePriorities
}
