import { GameState, Position } from '../../types'
import { getTile, hasSpecialTile } from '../boardSystem'
import { destroyTile } from '../destroyTileSystem'
import { checkGameStatus, updateNeighborAdjacencyInfo } from '../cardEffects'
import { createCard } from '../gameRepository'

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
      if (tile) {
        // Destroy ALL adjacent tiles, including empty tiles (lairs, holes, etc.)
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
    for (const pos of destroyedPositions) {
      currentState = updateNeighborAdjacencyInfo(currentState, pos)
    }
  }

  // Add Evidence card to hand unless enhanced
  let stateAfterDestroy = currentState
  if (!card?.enhanced) {
    const evidenceCard = createCard('Evidence')
    stateAfterDestroy = {
      ...currentState,
      hand: [...currentState.hand, evidenceCard]
    }
  }

  // Check game status after destruction (destroying last player tile should end the level)
  const gameStatus = checkGameStatus(stateAfterDestroy)

  return {
    ...stateAfterDestroy,
    gameStatus
  }
}
