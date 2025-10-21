import { GameState } from '../../../types'
import { positionToKey } from '../../boardSystem'
import { CounterfactualAssignment, ExclusionAnalysis } from './types'
import { shuffle, countRemainingTiles } from './utils'

/**
 * Create a random valid assignment of all unrevealed tiles
 *
 * Strategy:
 * 1. Start with revealed/guaranteed tiles (already assigned)
 * 2. Randomly assign remaining tiles to match remaining counts
 * 3. Respect possibility constraints from exclusion analysis
 *
 * @param state Current game state
 * @param analysis Exclusion analysis with flags and guarantees
 * @param possibilities Map of possible owners per tile
 * @returns A valid random assignment with counterfactual tracking
 */
export function createRandomAssignment(
  state: GameState,
  analysis: ExclusionAnalysis,
  possibilities: Map<string, Set<'player' | 'rival' | 'neutral' | 'mine'>>
): CounterfactualAssignment {
  const assignments = new Map<string, 'player' | 'rival' | 'neutral' | 'mine'>()
  const counterfactualPositions = new Set<string>()

  // Step 1: Assign all revealed tiles to their known owners
  for (const tile of state.board.tiles.values()) {
    if (tile.owner === 'empty') continue
    if (!tile.revealed) continue

    const key = positionToKey(tile.position)
    assignments.set(key, tile.owner)
  }

  // Step 2: Assign all guaranteed rivals (from exclusion analysis)
  const guaranteedRivalKeys = new Set<string>()
  for (const tile of analysis.guaranteedRivals) {
    const key = positionToKey(tile.position)
    if (!assignments.has(key)) {
      assignments.set(key, 'rival')
      guaranteedRivalKeys.add(key)
    }
  }

  // Step 3: Count remaining tiles to assign
  const remaining = countRemainingTiles(state.board.tiles)

  // Subtract guaranteed rivals from remaining rival count
  const remainingRival = remaining.rival - analysis.guaranteedRivals.length

  // Step 4: Collect all unassigned positions
  const unassignedPositions: string[] = []
  for (const tile of state.board.tiles.values()) {
    if (tile.owner === 'empty') continue
    const key = positionToKey(tile.position)
    if (!assignments.has(key)) {
      unassignedPositions.push(key)
    }
  }

  // Shuffle to randomize assignment order
  shuffle(unassignedPositions)

  // Step 5: Assign tiles by owner type
  // We'll track which positions have been assigned
  const assignedKeys = new Set<string>()

  // Helper to assign N tiles of a specific owner type
  const assignOwnerType = (
    ownerType: 'player' | 'rival' | 'neutral' | 'mine',
    count: number
  ) => {
    let assigned = 0

    for (const key of unassignedPositions) {
      if (assigned >= count) break
      if (assignedKeys.has(key)) continue

      // Check if this owner type is possible for this tile
      const possibleOwners = possibilities.get(key)
      if (!possibleOwners || !possibleOwners.has(ownerType)) continue

      // Assign this tile
      assignments.set(key, ownerType)
      assignedKeys.add(key)
      counterfactualPositions.add(key)
      assigned++
    }

    if (assigned < count) {
      console.warn(`⚠️ Could only assign ${assigned}/${count} ${ownerType} tiles (constraint violation)`)
    }
  }

  // Assign in order: rival, player, mine, neutral
  // This order prioritizes the most constrained types first
  assignOwnerType('rival', remainingRival)
  assignOwnerType('player', remaining.player)
  assignOwnerType('mine', remaining.mine)
  assignOwnerType('neutral', remaining.neutral)

  // Step 6: Handle any unassigned tiles (should be rare - only if constraints are impossible)
  for (const key of unassignedPositions) {
    if (assignedKeys.has(key)) continue

    const possibleOwners = possibilities.get(key)
    if (!possibleOwners || possibleOwners.size === 0) {
      console.warn(`⚠️ Tile at ${key} has no possible owners, defaulting to neutral`)
      assignments.set(key, 'neutral')
      counterfactualPositions.add(key)
      continue
    }

    // Pick first possible owner
    const firstPossible = Array.from(possibleOwners)[0]
    assignments.set(key, firstPossible)
    counterfactualPositions.add(key)
  }

  return {
    assignments,
    counterfactualPositions
  }
}
