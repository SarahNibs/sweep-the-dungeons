import { CounterfactualAssignment, AdjacencyInfo } from './types'
import { calculateTension } from './tensionCalculator'
import { keyToPosition } from './utils' // Used in printAssignmentWithTension

/**
 * Perform hill climbing optimization on a counterfactual assignment
 *
 * Strategy:
 * 1. Calculate tension for current assignment
 * 2. If tension is 0, stop (perfect assignment found)
 * 3. Perform a swap to reduce tension
 * 4. Repeat up to 100 times
 *
 * @param initialAssignment Starting counterfactual assignment
 * @param adjacencyInfo List of adjacency constraints
 * @param debug If true, print detailed debug info
 * @returns Optimized assignment with reduced tension
 */
export function hillClimb(
  initialAssignment: CounterfactualAssignment,
  adjacencyInfo: AdjacencyInfo[],
  debug: boolean = false
): CounterfactualAssignment {
  let currentAssignment = initialAssignment
  let iteration = 0
  const maxIterations = 100

  if (debug) {
    console.log('\n  🔬 HILL CLIMBING DEBUG (First Monte Carlo Iteration)')
    console.log('  ' + '='.repeat(100))
  }

  while (iteration < maxIterations) {
    iteration++

    // Calculate tension for current assignment (used for display and stopping condition)
    const tensionInfo = calculateTension(currentAssignment, adjacencyInfo)

    if (debug) {
      console.log(`\n  📍 STEP ${iteration}:`)
      printAssignmentWithTension(currentAssignment, tensionInfo)
      console.log(`  📊 Total Tension: ${tensionInfo.totalTension.toFixed(4)}`)
    }

    // Stop if we've reached 0 tension (perfect assignment)
    if (tensionInfo.totalTension === 0) {
      if (debug) {
        console.log('  ✅ Reached 0 tension, stopping')
      }
      break
    }

    // Perform one swap step using violation-based selection
    const swapInfo = findBestSwap(currentAssignment, tensionInfo, adjacencyInfo, debug)

    // If no swap was possible, stop
    if (!swapInfo) {
      if (debug) {
        console.log('  ⚠️  No violation-reducing swap found, stopping')
      }
      break
    }

    if (debug && swapInfo.swapDetails) {
      console.log(`  🔄 Swapping ${swapInfo.swapDetails.pos1} [${swapInfo.swapDetails.owner1}] ↔️ ${swapInfo.swapDetails.pos2} [${swapInfo.swapDetails.owner2}]`)
      console.log(`     Violations: ${swapInfo.swapDetails.violationsBefore} → ${swapInfo.swapDetails.violationsAfter} (reduction: ${swapInfo.swapDetails.violationsBefore - swapInfo.swapDetails.violationsAfter})`)
    }

    currentAssignment = swapInfo.newAssignment
  }

  if (debug) {
    console.log('\n  ' + '='.repeat(100))
    console.log(`  🏁 Hill climbing complete after ${iteration} steps`)
    console.log('  ' + '='.repeat(100))
  }

  return currentAssignment
}

/**
 * Find the best swap using violation-based selection
 *
 * Strategy:
 * 1. Sort counterfactual tiles by tension (highest first)
 * 2. For each tile in order:
 *    - Try swapping with each other tile with different owner
 *    - Calculate violations before and after swap
 *    - If swap reduces violations, perform it and return
 * 3. If no violation-reducing swap found, return null
 *
 * @param assignment Current assignment
 * @param tensionInfo Tension information for all tiles
 * @param adjacencyInfo List of adjacency constraints
 * @param debug If true, include swap details in return
 * @returns New assignment with one swap performed, or null if no swap possible
 */
function findBestSwap(
  assignment: CounterfactualAssignment,
  tensionInfo: { tensions: Map<string, number>; totalTension: number },
  adjacencyInfo: AdjacencyInfo[],
  debug: boolean
): {
  newAssignment: CounterfactualAssignment;
  swapDetails?: {
    pos1: string;
    pos2: string;
    owner1: string;
    owner2: string;
    violationsBefore: number;
    violationsAfter: number;
  }
} | null {
  // Get all counterfactual tiles sorted by tension
  const tilesByTension: Array<{ key: string; tension: number }> = []

  for (const key of assignment.counterfactualPositions) {
    const tension = tensionInfo.tensions.get(key) || 0
    tilesByTension.push({ key, tension })
  }

  // Sort by tension (highest first)
  tilesByTension.sort((a, b) => b.tension - a.tension)

  if (tilesByTension.length < 2) {
    return null // Need at least 2 tiles to swap
  }

  // Try each tile in order by tension
  for (let i = 0; i < tilesByTension.length; i++) {
    const tile1 = tilesByTension[i]
    const owner1 = assignment.assignments.get(tile1.key)
    if (!owner1) continue

    // Try swapping with each subsequent tile with different owner
    for (let j = i + 1; j < tilesByTension.length; j++) {
      const tile2 = tilesByTension[j]
      const owner2 = assignment.assignments.get(tile2.key)
      if (!owner2) continue

      // Only consider swaps between different owners
      if (owner1 === owner2) continue

      // Calculate violations before swap
      const violationsBefore = calculateViolations(assignment, adjacencyInfo, tile1.key, tile2.key)

      // Create hypothetical assignment with swap
      const swappedAssignments = new Map(assignment.assignments)
      swappedAssignments.set(tile1.key, owner2)
      swappedAssignments.set(tile2.key, owner1)
      const hypotheticalAssignment = {
        assignments: swappedAssignments,
        counterfactualPositions: assignment.counterfactualPositions
      }

      // Calculate violations after swap
      const violationsAfter = calculateViolations(hypotheticalAssignment, adjacencyInfo, tile1.key, tile2.key)

      // If swap reduces violations, perform it
      if (violationsAfter < violationsBefore) {
        const newAssignment = hypotheticalAssignment

        if (debug) {
          return {
            newAssignment,
            swapDetails: {
              pos1: tile1.key,
              pos2: tile2.key,
              owner1,
              owner2,
              violationsBefore,
              violationsAfter
            }
          }
        }

        return { newAssignment }
      }
    }
  }

  // No violation-reducing swap found
  return null
}

/**
 * Calculate total violations for two tiles being considered for swap
 *
 * A violation is the absolute difference between expected and actual adjacency counts
 * for revealed tiles adjacent to either of the two tiles.
 *
 * @param assignment Current assignment
 * @param adjacencyInfo All adjacency information
 * @param tile1Key Position key of first tile
 * @param tile2Key Position key of second tile
 * @returns Total violation count
 */
function calculateViolations(
  assignment: CounterfactualAssignment,
  adjacencyInfo: AdjacencyInfo[],
  tile1Key: string,
  tile2Key: string
): number {
  // Create a set of position keys for the two tiles
  const swapTileKeys = new Set([tile1Key, tile2Key])

  // Find all adjacency info that involves either of these two tiles
  // (i.e., revealed tiles adjacent to either tile1 or tile2)
  const relevantAdjacencyInfo: AdjacencyInfo[] = []

  for (const info of adjacencyInfo) {
    // Check if any of the adjacent positions of this revealed tile match either swap tile
    const isRelevant = info.adjacentPositions.some(adjPos => {
      const adjKey = `${adjPos.x},${adjPos.y}`
      return swapTileKeys.has(adjKey)
    })

    if (isRelevant) {
      relevantAdjacencyInfo.push(info)
    }
  }

  // Calculate violations for each relevant adjacency info
  let totalViolations = 0

  for (const info of relevantAdjacencyInfo) {
    const revealerOwner = info.revealedBy // 'player' or 'rival'
    const expectedCount = info.expectedCount

    // Count how many adjacent tiles have the revealer's owner in current assignment
    let actualCount = 0
    for (const adjPos of info.adjacentPositions) {
      const adjKey = `${adjPos.x},${adjPos.y}`
      const owner = assignment.assignments.get(adjKey)
      if (owner === revealerOwner) {
        actualCount++
      }
    }

    // Violation is absolute difference
    const violation = Math.abs(actualCount - expectedCount)
    totalViolations += violation
  }

  return totalViolations
}

/**
 * Print the current assignment state with tension values for debugging
 */
function printAssignmentWithTension(
  assignment: CounterfactualAssignment,
  tensionInfo: { tensions: Map<string, number>; totalTension: number }
): void {
  // Group tiles by position for organized display
  const sortedKeys = Array.from(assignment.assignments.keys()).sort((a, b) => {
    const posA = keyToPosition(a)
    const posB = keyToPosition(b)
    if (posA.y !== posB.y) return posA.y - posB.y
    return posA.x - posB.x
  })

  // Print board assignment with tensions
  console.log('  Board assignment with tensions:')
  for (const key of sortedKeys) {
    const owner = assignment.assignments.get(key)
    const isCounterfactual = assignment.counterfactualPositions.has(key)
    const marker = isCounterfactual ? '?' : '✓'
    const ownerStr = owner ? owner.charAt(0).toUpperCase() : '?'

    // Get tension for this tile (only counterfactual tiles have tension)
    const tension = isCounterfactual ? (tensionInfo.tensions.get(key) || 0) : 0
    const tensionStr = tension > 0 ? `T=${tension.toFixed(4)}` : 'T=0.0000'

    console.log(`    ${key.padEnd(8)} = ${ownerStr} ${marker}  ${tensionStr}`)
  }
}
