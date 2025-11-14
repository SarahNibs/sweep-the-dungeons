import { Tile, ClueResult, Position, GameState } from '../../../types'
import { positionToKey } from '../../boardSystem'

/**
 * Calculate the priority score for a tile based on AI clues
 * Higher score = more likely to be a rival tile = AI should reveal it
 *
 * Rival clue decay formula:
 * - Current turn clues: full pip count
 * - Past turn clues: max(pips - 1, 0)
 */
export function calculateTilePriority(
  tile: Tile,
  currentTurnCluesPairs: { clueResult: ClueResult, targetPosition: Position }[],
  state: GameState,
  logDetails: boolean = false
): number {
  // Only use player clues and hidden rival clues for AI decisions
  // Completely ignore visible rival clues (X marks)

  let playerScore = 0
  let rivalScore = 0
  let currentTurnRivalPips = 0
  let historicalRivalPips = 0

  // Get player clue strength for this tile
  const playerClueAnnotations = tile.annotations.find(a => a.type === 'clue_results')
  if (playerClueAnnotations?.clueResults) {
    playerClueAnnotations.clueResults.forEach(result => {
      if (result.cardType !== 'rival_clue') {
        playerScore += result.strengthForThisTile
      }
    })
  }

  const tileKey = positionToKey(tile.position)

  // Step 1: Process CURRENT turn clues (from parameter) - use full pip count
  // These clues are NOT in state.rivalHiddenClues[] yet
  for (const { clueResult, targetPosition } of currentTurnCluesPairs) {
    if (positionToKey(targetPosition) === tileKey) {
      currentTurnRivalPips += clueResult.strengthForThisTile
    }
  }
  rivalScore += currentTurnRivalPips

  // Step 2: Process PAST turn clues (from state) - use max(pips - 1, 0)
  // These are all previous turns' clues (stored as pairs with targetPosition)
  for (const { clueResult, targetPosition } of state.rivalHiddenClues) {
    if (positionToKey(targetPosition) === tileKey) {
      // This clue affects our tile - apply decay
      const pips = clueResult.strengthForThisTile
      historicalRivalPips += Math.max(pips - 1, 0)
    }
  }
  rivalScore += historicalRivalPips

  // Apply mine penalty: -0.002 if tile is a mine
  const minePenalty = tile.owner === 'mine' ? -0.002 : 0

  // Prefer tiles that are likely to be rival tiles based on AI's knowledge
  const priorityScore = rivalScore - Math.max(0, playerScore - 1) + minePenalty

  if (logDetails) {
    console.log(`[PRIORITY-SCORE] Tile (${tile.position.x},${tile.position.y})[${tile.owner}]: playerPips=${playerScore.toFixed(2)}, currentRivalPips=${currentTurnRivalPips.toFixed(2)}, historicalRivalPips=${historicalRivalPips.toFixed(2)}, minePenalty=${minePenalty.toFixed(3)} => base=${priorityScore.toFixed(2)}`)
  }

  return priorityScore
}

/**
 * Apply Distraction noise to priority (generates independent random values per tile)
 */
export function applyDistractionNoise(
  basePriority: number,
  distractionStackCount: number,
  logDetails: boolean = false
): number {
  let randomBoost = 0

  // Generate independent random noise for each Distraction stack
  // IMPORTANT: Each tile gets its own independent random draws
  if (distractionStackCount > 0) {
    for (let i = 0; i < distractionStackCount; i++) {
      randomBoost += Math.random() * 1.5
    }
  } else {
    randomBoost = Math.random() * 0.01 // Small random tiebreaker
  }

  if (logDetails) {
    console.log(`[PRIORITY-SCORE] Distraction noise: ${distractionStackCount} stacks => +${randomBoost.toFixed(3)}`)
  }

  return basePriority + randomBoost
}

/**
 * Calculate priorities for all unrevealed tiles
 */
export function calculateTilePriorities(
  state: GameState,
  currentTurnCluesPairs: { clueResult: ClueResult, targetPosition: Position }[]
): Array<{ tile: Tile; priority: number }> {
  console.log(`\n[PRIORITY-SCORE] ========== calculateTilePriorities ==========`)
  console.log(`[PRIORITY-SCORE] Current turn clues: ${currentTurnCluesPairs.length}, Historical clues: ${state.rivalHiddenClues.length}, Distraction stacks: ${state.distractionStackCount}`)

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')

  console.log(`[PRIORITY-SCORE] Evaluating ${unrevealedTiles.length} unrevealed tiles`)

  if (unrevealedTiles.length === 0) return []

  // Calculate priorities using player clues + all rival clues (current + past with decay)
  // Add Distraction noise (independent random values generated per tile for each stack)
  const tilesWithPriority = unrevealedTiles.map((tile, index) => {
    const logDetails = index < 1000 // Log all tiles in detail
    const basePriority = calculateTilePriority(tile, currentTurnCluesPairs, state, logDetails)
    const finalPriority = applyDistractionNoise(basePriority, state.distractionStackCount, logDetails)

    if (logDetails) {
      console.log(`[PRIORITY-SCORE] => Final priority: ${finalPriority.toFixed(3)}`)
    }

    return {
      tile,
      priority: finalPriority
    }
  })

  // Sort by priority (highest first - most likely to be rival)
  tilesWithPriority.sort((a, b) => b.priority - a.priority)

  console.log(`[PRIORITY-SCORE] Top 5 priorities after sorting:`)
  tilesWithPriority.slice(0, 5).forEach((tp, i) => {
    console.log(`  ${i + 1}. (${tp.tile.position.x},${tp.tile.position.y})[${tp.tile.owner}]: ${tp.priority.toFixed(3)}`)
  })

  return tilesWithPriority
}
