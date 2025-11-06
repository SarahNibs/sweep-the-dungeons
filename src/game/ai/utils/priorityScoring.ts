import { Tile, ClueResult, Position, GameState } from '../../../types'

/**
 * Calculate the priority score for a tile based on AI clues
 * Higher score = more likely to be a rival tile = AI should reveal it
 */
export function calculateTilePriority(
  tile: Tile,
  hiddenRivalCluesPairs: { clueResult: ClueResult, targetPosition: Position }[]
): number {
  // Only use player clues and hidden rival clues for AI decisions
  // Completely ignore visible rival clues (X marks)

  let playerScore = 0
  let rivalScore = 0

  // Get player clue strength for this tile
  const playerClueAnnotations = tile.annotations.find(a => a.type === 'clue_results')
  if (playerClueAnnotations?.clueResults) {
    playerClueAnnotations.clueResults.forEach(result => {
      if (result.cardType !== 'rival_clue') {
        playerScore += result.strengthForThisTile
      }
    })
  }

  // Get hidden rival clue strength for this tile using proper mapping
  hiddenRivalCluesPairs.forEach(({ clueResult, targetPosition }) => {
    if (targetPosition.x === tile.position.x && targetPosition.y === tile.position.y) {
      rivalScore += clueResult.strengthForThisTile
    }
  })

  // Apply mine penalty: -0.002 if tile is a mine
  const minePenalty = tile.owner === 'mine' ? -0.002 : 0

  // Prefer tiles that are likely to be rival tiles based on AI's knowledge
  const priorityScore = rivalScore - Math.max(0, playerScore - 1) + minePenalty

  return priorityScore
}

/**
 * Apply random boost to priority based on Ramble effects, Eyeshadow equipment, and Mascara equipment
 */
export function applyRandomBoost(
  basePriority: number,
  ramblePriorityBoosts: number[],
  hasEyeshadow: boolean,
  hasMascara: boolean
): number {
  let randomBoost = 0

  // Apply Ramble boosts if active
  if (ramblePriorityBoosts.length > 0) {
    // For each Ramble boost, generate a separate random draw for this tile and sum them
    randomBoost = ramblePriorityBoosts.reduce((sum, maxBoost) => sum + Math.random() * maxBoost, 0)
  } else {
    randomBoost = Math.random() * 0.01 // Small random tiebreaker
  }

  // Apply Eyeshadow boost if equipment is present (permanent half-Ramble: random [0-1.2])
  if (hasEyeshadow) {
    randomBoost += Math.random() * 1.2
  }

  // Apply Mascara boost if equipment is present (additional random [0-0.5])
  if (hasMascara) {
    randomBoost += Math.random() * 0.5
  }

  return basePriority + randomBoost
}

/**
 * Calculate priorities for all unrevealed tiles
 */
export function calculateTilePriorities(
  state: GameState,
  hiddenRivalCluesPairs: { clueResult: ClueResult, targetPosition: Position }[]
): Array<{ tile: Tile; priority: number }> {
  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')

  if (unrevealedTiles.length === 0) return []

  // Check if player has Eyeshadow and Mascara equipment
  const hasEyeshadow = state.equipment.some(equipment => equipment.name === 'Eyeshadow')
  const hasMascara = state.equipment.some(equipment => equipment.name === 'Mascara')

  // Calculate priorities using only player clues and hidden rival clues
  // Add ramble priority boost if active (each tile gets sum of separate random draws per boost), otherwise small random tiebreaker
  // Add Eyeshadow boost if equipment present (permanent half-Ramble effect)
  // Add Mascara boost if equipment present (additional random [0-0.5])
  const tilesWithPriority = unrevealedTiles.map(tile => {
    const basePriority = calculateTilePriority(tile, hiddenRivalCluesPairs)
    const finalPriority = applyRandomBoost(basePriority, state.ramblePriorityBoosts, hasEyeshadow, hasMascara)
    return {
      tile,
      priority: finalPriority
    }
  })

  // Sort by priority (highest first - most likely to be rival)
  tilesWithPriority.sort((a, b) => b.priority - a.priority)

  return tilesWithPriority
}
