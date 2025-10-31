import { GameState, Position } from '../../types'
import { getTile, hasSpecialTile, getNeighbors, positionToKey } from '../boardSystem'
import { updateNeighborAdjacencyInfo } from '../cardEffects'

/**
 * Fan card effect: blows dirt, goblins, and surface mines to adjacent unrevealed tiles
 * Base: single tile
 * Enhanced: burst star area (manhattan distance 1)
 */
export function executeFanEffect(state: GameState, target: Position, enhanced: boolean = false): GameState {
  console.log(`🪭 FAN EFFECT - Target: (${target.x}, ${target.y}), Enhanced: ${enhanced}`)

  const tilesToFan: Position[] = []

  if (enhanced) {
    // Enhanced: burst star area (center + manhattan distance 1)
    tilesToFan.push(target)
    const offsets = [
      { dx: 0, dy: -1 }, // up
      { dx: 0, dy: 1 },  // down
      { dx: -1, dy: 0 }, // left
      { dx: 1, dy: 0 }   // right
    ]
    for (const { dx, dy } of offsets) {
      const pos: Position = { x: target.x + dx, y: target.y + dy }
      const tile = getTile(state.board, pos)
      if (tile) {
        tilesToFan.push(pos)
      }
    }
  } else {
    // Base: single tile
    tilesToFan.push(target)
  }

  // PHASE 1: Collect all blowing operations (snapshot the current state to avoid double-processing)
  interface BlowOperation {
    sourcePos: Position
    destPos: Position
    hasDirt: boolean
    hasGoblin: boolean
    hasMine: boolean
  }

  const operations: BlowOperation[] = []

  for (const pos of tilesToFan) {
    const tile = getTile(state.board, pos) // Read from original state
    if (!tile || tile.revealed) continue

    // Check if tile has anything to blow
    const hasDirt = hasSpecialTile(tile, 'extraDirty')
    const hasGoblin = hasSpecialTile(tile, 'goblin')
    const hasMine = hasSpecialTile(tile, 'surfaceMine')

    if (!hasDirt && !hasGoblin && !hasMine) continue

    // Get adjacent unrevealed tiles
    const neighbors = getNeighbors(state.board, pos)
    const unrevealedNeighbors = neighbors
      .map(nPos => ({ pos: nPos, tile: getTile(state.board, nPos) }))
      .filter(({ tile }) => tile && !tile.revealed)

    if (unrevealedNeighbors.length === 0) continue

    // Pick random neighbor
    const targetNeighbor = unrevealedNeighbors[Math.floor(Math.random() * unrevealedNeighbors.length)]

    console.log(`🪭 Planning to blow from (${pos.x}, ${pos.y}) to (${targetNeighbor.pos.x}, ${targetNeighbor.pos.y})`)

    operations.push({
      sourcePos: pos,
      destPos: targetNeighbor.pos,
      hasDirt,
      hasGoblin,
      hasMine
    })
  }

  // PHASE 2: Execute all operations atomically
  let currentState = state

  for (const op of operations) {
    const newTiles = new Map(currentState.board.tiles)
    const sourceTile = newTiles.get(positionToKey(op.sourcePos))!
    const destTile = newTiles.get(positionToKey(op.destPos))!

    // Build new special tiles arrays
    const newSourceSpecialTiles = sourceTile.specialTiles.filter(
      s => s !== 'extraDirty' && s !== 'goblin' && s !== 'surfaceMine'
    )
    const newDestSpecialTiles = [...destTile.specialTiles]

    // Transfer the special tiles
    if (op.hasDirt) newDestSpecialTiles.push('extraDirty')
    if (op.hasGoblin) newDestSpecialTiles.push('goblin')
    if (op.hasMine) newDestSpecialTiles.push('surfaceMine')

    // Check if goblin and mine end up together
    const destHasGoblin = newDestSpecialTiles.includes('goblin')
    const destHasMine = newDestSpecialTiles.includes('surfaceMine')

    if (destHasGoblin && destHasMine) {
      console.log(`💥 Goblin and mine collided at (${op.destPos.x}, ${op.destPos.y}) - EXPLOSION!`)

      // Remove both goblin and mine, change to empty
      const explodedSpecialTiles = newDestSpecialTiles.filter(
        s => s !== 'goblin' && s !== 'surfaceMine'
      )
      explodedSpecialTiles.push('destroyed')

      const originalOwner = destTile.owner

      newTiles.set(positionToKey(op.destPos), {
        ...destTile,
        owner: 'empty',
        specialTiles: explodedSpecialTiles
      })

      // Update source tile
      newTiles.set(positionToKey(op.sourcePos), {
        ...sourceTile,
        specialTiles: newSourceSpecialTiles
      })

      currentState = {
        ...currentState,
        board: {
          ...currentState.board,
          tiles: newTiles
        }
      }

      // Update adjacency for neighbors if owner changed
      if (originalOwner !== 'empty') {
        currentState = updateNeighborAdjacencyInfo(currentState, op.destPos)
      }
    } else {
      // No explosion - just move the special tiles
      newTiles.set(positionToKey(op.sourcePos), {
        ...sourceTile,
        specialTiles: newSourceSpecialTiles
      })

      newTiles.set(positionToKey(op.destPos), {
        ...destTile,
        specialTiles: newDestSpecialTiles
      })

      currentState = {
        ...currentState,
        board: {
          ...currentState.board,
          tiles: newTiles
        }
      }
    }
  }

  return currentState
}
