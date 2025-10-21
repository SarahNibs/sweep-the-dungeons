import { GameState, Tile, Position } from '../../../types'
import { getNeighbors, positionToKey as boardPositionToKey } from '../../boardSystem'
import { TileOwnershipFlags, ExclusionAnalysis } from './types'

/**
 * Analyze board state using constraint propagation to find guaranteed rivals and ruled-out rivals
 *
 * This uses iterative logic to deduce tile ownership based on adjacency information.
 * Works for both player and rival revealed tiles.
 */
export function analyzeExclusionsAndGuarantees(state: GameState): ExclusionAnalysis {
  // Step 1: Initialize flags for all tiles
  const flags = initializeFlaggedState(state)

  // Step 2: Propagate constraints until convergence
  propagateConstraintsUntilConvergence(state, flags)

  // Step 3: Analyze final flags to extract results
  const { guaranteedRivals, ruledOutRivals } = analyzeFinalFlags(state, flags)

  return {
    guaranteedRivals,
    ruledOutRivals,
    flags
  }
}

/**
 * Initialize flagged board state
 * - Revealed tiles: flags set to their actual owner only
 * - Unrevealed tiles: all flags true (any owner possible)
 */
function initializeFlaggedState(state: GameState): Map<string, TileOwnershipFlags> {
  const flags = new Map<string, TileOwnershipFlags>()

  for (const tile of state.board.tiles.values()) {
    if (tile.owner === 'empty') continue

    const key = boardPositionToKey(tile.position)

    if (tile.revealed) {
      // Revealed tile - we know the owner for certain
      flags.set(key, {
        player: tile.owner === 'player',
        rival: tile.owner === 'rival',
        neutral: tile.owner === 'neutral',
        mine: tile.owner === 'mine'
      })
    } else {
      // Unrevealed tile - all owners possible initially
      flags.set(key, {
        player: true,
        rival: true,
        neutral: true,
        mine: true
      })
    }
  }

  return flags
}

/**
 * Propagate constraints until convergence (no flags change)
 */
function propagateConstraintsUntilConvergence(
  state: GameState,
  flags: Map<string, TileOwnershipFlags>
): void {
  let iteration = 0
  const maxIterations = 100 // Safety limit
  let changed = true

  while (changed && iteration < maxIterations) {
    iteration++
    changed = propagateConstraintsOnce(state, flags)
  }
}

/**
 * One pass through all revealed tiles, propagating constraints
 * Returns true if any flags changed
 */
function propagateConstraintsOnce(
  state: GameState,
  flags: Map<string, TileOwnershipFlags>
): boolean {
  let anyChanged = false

  // Process each revealed tile (both player and rival revealed)
  for (const tile of state.board.tiles.values()) {
    if (!tile.revealed || !tile.revealedBy || tile.adjacencyCount === null) {
      continue
    }

    const adjacentTiles = getAdjacentTiles(state, tile)
    const revealer = tile.revealedBy // 'player' or 'rival'
    const requiredCount = tile.adjacencyCount // Number of adjacent tiles of revealer's team

    // Count how many adjacent tiles are revealed as revealer's team
    const revealedAsRevealerTeam = adjacentTiles.filter(
      t => t.revealed && t.owner === revealer
    ).length

    // Get unrevealed adjacent tiles
    const unrevealedAdjacent = adjacentTiles.filter(t => !t.revealed)

    // Count how many unrevealed tiles could still be the revealer's team
    const couldBeRevealerTeam = unrevealedAdjacent.filter(t => {
      const key = boardPositionToKey(t.position)
      const tileFlags = flags.get(key)
      return tileFlags && tileFlags[revealer]
    }).length

    // Deduction 1: If we've already revealed enough, rule out revealer from all unrevealed adjacent
    if (revealedAsRevealerTeam >= requiredCount) {
      for (const adj of unrevealedAdjacent) {
        const key = boardPositionToKey(adj.position)
        const tileFlags = flags.get(key)
        if (tileFlags && tileFlags[revealer]) {
          tileFlags[revealer] = false
          anyChanged = true
        }
      }
    }

    // Deduction 2: If revealed + could-be = required, then all could-be must be revealer
    if (revealedAsRevealerTeam + couldBeRevealerTeam === requiredCount && couldBeRevealerTeam > 0) {
      for (const adj of unrevealedAdjacent) {
        const key = boardPositionToKey(adj.position)
        const tileFlags = flags.get(key)
        if (tileFlags && tileFlags[revealer]) {
          // This tile must be revealer - rule out all other owners
          const otherOwners: Array<keyof TileOwnershipFlags> = ['player', 'rival', 'neutral', 'mine']
          for (const owner of otherOwners) {
            if (owner !== revealer && tileFlags[owner]) {
              tileFlags[owner] = false
              anyChanged = true
            }
          }
        }
      }
    }
  }

  return anyChanged
}

/**
 * Analyze final flags to extract guaranteed rivals and ruled-out rivals
 */
function analyzeFinalFlags(
  state: GameState,
  flags: Map<string, TileOwnershipFlags>
): {
  guaranteedRivals: Tile[]
  ruledOutRivals: Set<string>
} {
  const guaranteedRivals: Tile[] = []
  const ruledOutRivals = new Set<string>()

  for (const tile of state.board.tiles.values()) {
    if (tile.revealed || tile.owner === 'empty') continue

    const key = boardPositionToKey(tile.position)
    const tileFlags = flags.get(key)
    if (!tileFlags) continue

    // Guaranteed rival: only rival flag is true
    if (tileFlags.rival && !tileFlags.player && !tileFlags.neutral && !tileFlags.mine) {
      guaranteedRivals.push(tile)
    }

    // Ruled out as rival: rival flag is false
    if (!tileFlags.rival) {
      ruledOutRivals.add(key)
    }
  }

  return { guaranteedRivals, ruledOutRivals }
}

/**
 * Get all adjacent tiles according to the board's adjacency rule
 */
function getAdjacentTiles(state: GameState, tile: Tile): Tile[] {
  const adjacentPositions = getNeighbors(state.board, tile.position)
  return adjacentPositions
    .map((pos: Position) => state.board.tiles.get(boardPositionToKey(pos)))
    .filter((t: Tile | undefined): t is Tile => t !== undefined && t.owner !== 'empty')
}
