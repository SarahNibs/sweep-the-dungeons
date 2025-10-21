import { positionToKey } from '../../boardSystem'
import { CounterfactualAssignment, TensionInfo, AdjacencyInfo } from './types'

/**
 * Calculate tension for the current counterfactual assignment
 *
 * Tension measures how badly the current assignment violates adjacency constraints.
 * Higher tension = more mismatches with adjacency information.
 *
 * @param assignment Current counterfactual assignment
 * @param adjacencyInfo List of all adjacency constraints
 * @returns Tension information with per-tile tensions and total
 */
export function calculateTension(
  assignment: CounterfactualAssignment,
  adjacencyInfo: AdjacencyInfo[]
): TensionInfo {
  const tensions = new Map<string, number>()

  // Initialize all counterfactual positions with 0 tension
  for (const key of assignment.counterfactualPositions) {
    tensions.set(key, 0)
  }

  // Process each adjacency constraint
  for (const info of adjacencyInfo) {
    const revealerOwner = info.revealedBy // 'player' or 'rival'
    const expectedCount = info.expectedCount

    // Count how many adjacent tiles have the revealer's owner in current assignment
    let actualCount = 0
    const adjacentKeys: string[] = []
    const adjacentCounterfactualKeys: string[] = []

    for (const adjPos of info.adjacentPositions) {
      const adjKey = positionToKey(adjPos)
      adjacentKeys.push(adjKey)

      const assignedOwner = assignment.assignments.get(adjKey)
      if (assignedOwner === revealerOwner) {
        actualCount++
      }

      // Track which adjacent tiles are counterfactual (can receive tension)
      if (assignment.counterfactualPositions.has(adjKey)) {
        adjacentCounterfactualKeys.push(adjKey)
      }
    }

    // Calculate mismatch
    const diff = Math.abs(actualCount - expectedCount)
    if (diff === 0) continue // No tension from this constraint

    if (actualCount > expectedCount) {
      // Over-counting case
      distributeTensionOverCounting(
        tensions,
        assignment,
        revealerOwner,
        diff,
        adjacentCounterfactualKeys
      )
    } else {
      // Under-counting case
      distributeTensionUnderCounting(
        tensions,
        assignment,
        revealerOwner,
        diff,
        adjacentCounterfactualKeys
      )
    }
  }

  // Calculate total tension
  let totalTension = 0
  for (const tension of tensions.values()) {
    totalTension += tension
  }

  return {
    tensions,
    totalTension
  }
}

/**
 * Distribute tension for over-counting case (actual > expected)
 *
 * Distribution:
 * - 3/4 to adjacent tiles of SAME owner (counterfactual only)
 * - 1/8 to adjacent tiles of OTHER owners (counterfactual only)
 * - 1/8 to non-adjacent tiles of DIFFERENT owners (counterfactual only)
 */
function distributeTensionOverCounting(
  tensions: Map<string, number>,
  assignment: CounterfactualAssignment,
  revealerOwner: 'player' | 'rival',
  diff: number,
  adjacentCounterfactualKeys: string[]
): void {
  // Get adjacent counterfactual tiles by owner
  const adjacentSameOwner: string[] = []
  const adjacentOtherOwner: string[] = []

  for (const key of adjacentCounterfactualKeys) {
    const owner = assignment.assignments.get(key)
    if (owner === revealerOwner) {
      adjacentSameOwner.push(key)
    } else {
      adjacentOtherOwner.push(key)
    }
  }

  // Get non-adjacent counterfactual tiles of different owners
  const nonAdjacentDifferentOwner: string[] = []
  const adjacentKeysSet = new Set(adjacentCounterfactualKeys)

  for (const key of assignment.counterfactualPositions) {
    if (adjacentKeysSet.has(key)) continue // Skip adjacent
    const owner = assignment.assignments.get(key)
    if (owner !== revealerOwner) {
      nonAdjacentDifferentOwner.push(key)
    }
  }

  // Distribute tension: 3/4 to same owner adjacent
  const tensionForSame = (diff * 3) / 4
  if (adjacentSameOwner.length > 0) {
    const perTile = tensionForSame / adjacentSameOwner.length
    for (const key of adjacentSameOwner) {
      tensions.set(key, (tensions.get(key) || 0) + perTile)
    }
  }

  // Distribute tension: 1/8 to other owner adjacent
  const tensionForOtherAdjacent = diff / 8
  if (adjacentOtherOwner.length > 0) {
    const perTile = tensionForOtherAdjacent / adjacentOtherOwner.length
    for (const key of adjacentOtherOwner) {
      tensions.set(key, (tensions.get(key) || 0) + perTile)
    }
  }

  // Distribute tension: 1/8 to different owner non-adjacent
  const tensionForNonAdjacent = diff / 8
  if (nonAdjacentDifferentOwner.length > 0) {
    const perTile = tensionForNonAdjacent / nonAdjacentDifferentOwner.length
    for (const key of nonAdjacentDifferentOwner) {
      tensions.set(key, (tensions.get(key) || 0) + perTile)
    }
  }
}

/**
 * Distribute tension for under-counting case (actual < expected)
 *
 * Distribution:
 * - 3/4 to adjacent tiles of DIFFERENT owner (counterfactual only)
 * - 1/8 to adjacent tiles of SAME owner (counterfactual only)
 * - 1/8 to non-adjacent tiles of SAME owner (counterfactual only)
 */
function distributeTensionUnderCounting(
  tensions: Map<string, number>,
  assignment: CounterfactualAssignment,
  revealerOwner: 'player' | 'rival',
  diff: number,
  adjacentCounterfactualKeys: string[]
): void {
  // Get adjacent counterfactual tiles by owner
  const adjacentSameOwner: string[] = []
  const adjacentDifferentOwner: string[] = []

  for (const key of adjacentCounterfactualKeys) {
    const owner = assignment.assignments.get(key)
    if (owner === revealerOwner) {
      adjacentSameOwner.push(key)
    } else {
      adjacentDifferentOwner.push(key)
    }
  }

  // Get non-adjacent counterfactual tiles of same owner
  const nonAdjacentSameOwner: string[] = []
  const adjacentKeysSet = new Set(adjacentCounterfactualKeys)

  for (const key of assignment.counterfactualPositions) {
    if (adjacentKeysSet.has(key)) continue // Skip adjacent
    const owner = assignment.assignments.get(key)
    if (owner === revealerOwner) {
      nonAdjacentSameOwner.push(key)
    }
  }

  // Distribute tension: 3/4 to different owner adjacent
  const tensionForDifferent = (diff * 3) / 4
  if (adjacentDifferentOwner.length > 0) {
    const perTile = tensionForDifferent / adjacentDifferentOwner.length
    for (const key of adjacentDifferentOwner) {
      tensions.set(key, (tensions.get(key) || 0) + perTile)
    }
  }

  // Distribute tension: 1/8 to same owner adjacent
  const tensionForSameAdjacent = diff / 8
  if (adjacentSameOwner.length > 0) {
    const perTile = tensionForSameAdjacent / adjacentSameOwner.length
    for (const key of adjacentSameOwner) {
      tensions.set(key, (tensions.get(key) || 0) + perTile)
    }
  }

  // Distribute tension: 1/8 to same owner non-adjacent
  const tensionForNonAdjacent = diff / 8
  if (nonAdjacentSameOwner.length > 0) {
    const perTile = tensionForNonAdjacent / nonAdjacentSameOwner.length
    for (const key of nonAdjacentSameOwner) {
      tensions.set(key, (tensions.get(key) || 0) + perTile)
    }
  }
}
