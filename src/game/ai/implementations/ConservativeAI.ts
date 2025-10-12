import { RivalAI, AIContext } from '../AITypes'
import { GameState, Tile, ClueResult, Position } from '../../../types'
import { calculateTilePriorities } from '../utils/priorityScoring'
import { revealTile, getNeighbors, positionToKey } from '../../boardSystem'

/**
 * Ownership possibility flags for each tile
 */
interface TileOwnershipFlags {
  player: boolean
  rival: boolean
  neutral: boolean
  mine: boolean
}

/**
 * Board state with ownership flags for constraint propagation
 */
interface FlaggedBoardState {
  flags: Map<string, TileOwnershipFlags>
}

/**
 * ConservativeAI - Uses iterative constraint propagation for logical deduction
 *
 * Key features:
 * 1. Builds ownership possibility flags for each tile (player/rival/neutral/mine)
 * 2. Iteratively propagates constraints using adjacency information until convergence
 * 3. After stabilization, uses flags to:
 *    - Skip tiles that can't be rival (ruled out)
 *    - Prioritize tiles that must be rival (guaranteed)
 *    - Fall back to clue-based selection for ambiguous tiles
 * 4. Re-applies full logic after each reveal to use new information
 */
export class ConservativeAI implements RivalAI {
  readonly name = 'Conservative Rival'
  readonly description = 'Uses iterative logic to deduce tile ownership and make safe choices'
  readonly icon = '🧠'

  selectTilesToReveal(
    state: GameState,
    hiddenClues: { clueResult: ClueResult; targetPosition: Position }[],
    context: AIContext
  ): Tile[] {
    console.log('=== CONSERVATIVE AI SELECTION (CONSTRAINT PROPAGATION) ===')

    const tilesToReveal: Tile[] = []
    let simulatedState = state
    let revealIterationCount = 0
    const maxRevealIterations = 50 // Safety limit

    while (revealIterationCount < maxRevealIterations) {
      revealIterationCount++
      console.log(`\n🧠 Reveal Iteration ${revealIterationCount}:`)

      // Step 1: Initialize flagged board state
      const flaggedState = this.initializeFlaggedState(simulatedState)

      // Step 2: Propagate constraints until convergence
      const stabilizedState = this.propagateConstraintsUntilConvergence(simulatedState, flaggedState, context)

      // Step 3: Analyze flags to find guaranteed rivals and ruled-out tiles
      const { guaranteedRivals, ruledOutRivals } = this.analyzeFinalFlags(simulatedState, stabilizedState)

      console.log(`  - Guaranteed rivals: ${guaranteedRivals.length} tiles`)
      console.log(`  - Ruled out as rival: ${ruledOutRivals.size} tiles`)

      let nextTile: Tile | null = null

      // Step 4: Prefer guaranteed rivals (but skip mines if rivalNeverMines)
      if (guaranteedRivals.length > 0) {
        // Filter out mines if rivalNeverMines behavior is enabled
        const selectableGuaranteed = context.specialBehaviors.rivalNeverMines
          ? guaranteedRivals.filter(tile => tile.owner !== 'mine')
          : guaranteedRivals

        if (selectableGuaranteed.length > 0) {
          nextTile = selectableGuaranteed[0]
          console.log(`  ✓ Selected guaranteed rival at (${nextTile.position.x},${nextTile.position.y})`)
        }
      }

      if (!nextTile) {
        // Step 5: Fall back to priority-based selection, skipping ruled-out tiles and mines
        const availableTiles = Array.from(simulatedState.board.tiles.values())
          .filter(tile =>
            !tile.revealed &&
            tile.owner !== 'empty' &&
            !ruledOutRivals.has(positionToKey(tile.position)) &&
            // Skip mines if rivalNeverMines is enabled (only affects tile selection, not deduction)
            !(context.specialBehaviors.rivalNeverMines && tile.owner === 'mine')
          )

        if (availableTiles.length === 0) {
          console.log('  ⚠ No available tiles left')
          break
        }

        // Use priority scoring with available tiles
        const tilesWithPriority = calculateTilePriorities(simulatedState, hiddenClues)
        const filteredPriorities = tilesWithPriority.filter(tp =>
          availableTiles.some(t => positionToKey(t.position) === positionToKey(tp.tile.position))
        )

        if (filteredPriorities.length === 0) {
          console.log('  ⚠ No tiles with priority available')
          break
        }

        // Sort by priority and pick highest
        filteredPriorities.sort((a, b) => b.priority - a.priority)
        nextTile = filteredPriorities[0].tile
        console.log(`  → Selected by priority: (${nextTile.position.x},${nextTile.position.y}) with priority ${filteredPriorities[0].priority}`)
      }

      if (!nextTile) break

      tilesToReveal.push(nextTile)

      // Stop if this is not a rival tile (would end turn)
      if (nextTile.owner !== 'rival') {
        console.log(`  ⚠ Selected non-rival tile [${nextTile.owner}], stopping`)
        break
      }

      // Simulate revealing this tile to use new info in next iteration
      console.log(`  ⟳ Simulating reveal to continue with updated info`)
      simulatedState = this.simulateReveal(simulatedState, nextTile)
    }

    console.log(`\n🧠 CONSERVATIVE AI: Selected ${tilesToReveal.length} tiles total`)
    console.log('=======================================================\n')

    return tilesToReveal
  }

  /**
   * Initialize flagged board state
   * - Revealed tiles: flags set to their actual owner only
   * - Unrevealed tiles: all flags true (any owner possible)
   */
  private initializeFlaggedState(state: GameState): FlaggedBoardState {
    const flags = new Map<string, TileOwnershipFlags>()

    for (const tile of state.board.tiles.values()) {
      if (tile.owner === 'empty') continue

      const key = positionToKey(tile.position)

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

    return { flags }
  }

  /**
   * Propagate constraints until convergence (no flags change)
   *
   * IMPORTANT: rivalNeverMines is NOT applied here to avoid giving the AI
   * unfair knowledge of mine locations during logical deduction. It only
   * applies during final tile selection to prevent accidental mine reveals.
   */
  private propagateConstraintsUntilConvergence(
    state: GameState,
    flaggedState: FlaggedBoardState,
    context: AIContext
  ): FlaggedBoardState {
    let iteration = 0
    const maxIterations = 100 // Safety limit
    let changed = true

    console.log('  🔄 Starting constraint propagation...')

    while (changed && iteration < maxIterations) {
      iteration++
      changed = this.propagateConstraintsOnce(state, flaggedState)
      if (changed) {
        console.log(`    🔁 Iteration ${iteration}: flags changed, continuing...`)
      }
    }

    if (iteration >= maxIterations) {
      console.warn('  ⚠ Constraint propagation hit iteration limit!')
    } else {
      console.log(`  ✓ Converged after ${iteration} iteration(s)`)
    }

    return flaggedState
  }

  /**
   * One pass through all revealed tiles, propagating constraints
   * Returns true if any flags changed
   *
   * Processes both rival-revealed and player-revealed tiles to maximize deductions
   */
  private propagateConstraintsOnce(state: GameState, flaggedState: FlaggedBoardState): boolean {
    let anyChanged = false

    // Process each revealed tile (both player and rival revealed)
    for (const tile of state.board.tiles.values()) {
      if (!tile.revealed || !tile.revealedBy || tile.adjacencyCount === null) {
        continue
      }

      const adjacentTiles = this.getAdjacentTiles(state, tile)
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
        const key = positionToKey(t.position)
        const flags = flaggedState.flags.get(key)
        return flags && flags[revealer]
      }).length

      // Deduction 1: If we've already revealed enough, rule out revealer from all unrevealed adjacent
      if (revealedAsRevealerTeam >= requiredCount) {
        for (const adj of unrevealedAdjacent) {
          const key = positionToKey(adj.position)
          const flags = flaggedState.flags.get(key)
          if (flags && flags[revealer]) {
            flags[revealer] = false
            anyChanged = true

            // Special case: if we ruled out "player", we now know this tile is rival/neutral/mine
            // Similarly, if we ruled out "rival", we know it's player/neutral/mine
            // This is particularly valuable for ruling out rival tiles!
          }
        }
      }

      // Deduction 2: If revealed + could-be = required, then all could-be must be revealer
      if (revealedAsRevealerTeam + couldBeRevealerTeam === requiredCount && couldBeRevealerTeam > 0) {
        for (const adj of unrevealedAdjacent) {
          const key = positionToKey(adj.position)
          const flags = flaggedState.flags.get(key)
          if (flags && flags[revealer]) {
            // This tile must be revealer - rule out all other owners
            const otherOwners: Array<keyof TileOwnershipFlags> = ['player', 'rival', 'neutral', 'mine']
            for (const owner of otherOwners) {
              if (owner !== revealer && flags[owner]) {
                flags[owner] = false
                anyChanged = true

                // Key insight: If we deduce a tile must be "player", we can rule out "rival"!
                // This gives us indirect information about which tiles the rival should avoid
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
  private analyzeFinalFlags(state: GameState, flaggedState: FlaggedBoardState): {
    guaranteedRivals: Tile[]
    ruledOutRivals: Set<string>
  } {
    const guaranteedRivals: Tile[] = []
    const ruledOutRivals = new Set<string>()

    for (const tile of state.board.tiles.values()) {
      if (tile.revealed || tile.owner === 'empty') continue

      const key = positionToKey(tile.position)
      const flags = flaggedState.flags.get(key)
      if (!flags) continue

      // Guaranteed rival: only rival flag is true
      if (flags.rival && !flags.player && !flags.neutral && !flags.mine) {
        guaranteedRivals.push(tile)
        console.log(`    ✓ (${tile.position.x},${tile.position.y}) is guaranteed rival`)
      }

      // Ruled out as rival: rival flag is false
      if (!flags.rival) {
        ruledOutRivals.add(key)
      }
    }

    return { guaranteedRivals, ruledOutRivals }
  }

  /**
   * Get all adjacent tiles according to the board's adjacency rule
   */
  private getAdjacentTiles(state: GameState, tile: Tile): Tile[] {
    const adjacentPositions = getNeighbors(state.board, tile.position)
    return adjacentPositions
      .map((pos: Position) => state.board.tiles.get(positionToKey(pos)))
      .filter((t: Tile | undefined): t is Tile => t !== undefined && t.owner !== 'empty')
  }

  /**
   * Simulate revealing a tile to see what information it would provide
   */
  private simulateReveal(state: GameState, tile: Tile): GameState {
    const newBoard = revealTile(state.board, tile.position, 'rival')
    return {
      ...state,
      board: newBoard
    }
  }
}
