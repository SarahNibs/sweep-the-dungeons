import { GameState, Position } from '../../types'
import { getTile, hasSpecialTile } from '../boardSystem'
import { destroyTile } from '../destroyTileSystem'
import { checkGameStatus, updateNeighborAdjacencyInfo } from '../cardEffects'

export function executeEmanationEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const targetTile = getTile(state.board, target)

  if (!targetTile) {
    // Can't emanate on empty spaces
    return state
  }

  let currentState = state
  const destroyedPositions: Position[] = []

  // Check if target is a surface mine
  if (hasSpecialTile(targetTile, 'surfaceMine')) {
    console.log('💣 EMANATION HIT SURFACE MINE - Triggering chain explosion')

    // Explode the target surface mine
    currentState = {
      ...currentState,
      board: destroyTile(currentState.board, target)
    }
    destroyedPositions.push(target)

    // Get N/S/E/W tiles and explode them too
    const cardinalDirections: Position[] = [
      { x: target.x, y: target.y - 1 }, // North
      { x: target.x, y: target.y + 1 }, // South
      { x: target.x + 1, y: target.y }, // East
      { x: target.x - 1, y: target.y }  // West
    ]

    for (const pos of cardinalDirections) {
      const tile = getTile(currentState.board, pos)
      if (tile && tile.owner !== 'empty') {
        console.log(`  - Exploding cardinal tile at (${pos.x}, ${pos.y})`)
        currentState = {
          ...currentState,
          board: destroyTile(currentState.board, pos)
        }
        destroyedPositions.push(pos)
      }
    }
  } else {
    // Normal Emanation: just destroy the target tile
    currentState = {
      ...currentState,
      board: destroyTile(currentState.board, target)
    }
    destroyedPositions.push(target)
  }

  // Update adjacency_info annotations for neighbors of all destroyed tiles
  if (destroyedPositions.length > 0) {
    console.log('💥 EMANATION: Updating neighbor adjacency info after tile destruction')
    for (const pos of destroyedPositions) {
      currentState = updateNeighborAdjacencyInfo(currentState, pos)
    }
  }

  // Deduct copper unless enhanced
  const copperLoss = card?.enhanced ? 0 : 1
  const newCopper = Math.max(0, currentState.copper - copperLoss)

  const stateAfterDestroy = {
    ...currentState,
    copper: newCopper
  }

  // Check game status after destruction (destroying last player tile should end the level)
  const gameStatus = checkGameStatus(stateAfterDestroy)

  return {
    ...stateAfterDestroy,
    gameStatus
  }
}
