import { GameState, Position } from '../../types'
import { getTile } from '../boardSystem'
import { destroyTile } from '../destroyTileSystem'
import { checkGameStatus } from '../cardEffects'

export function executeEmanationEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const targetTile = getTile(state.board, target)

  if (!targetTile) {
    // Can't emanate on empty spaces
    return state
  }

  // Destroy the tile (converts to empty, recalculates adjacencies, removes from clues)
  const boardWithDestroyedTile = destroyTile(state.board, target)

  // Deduct copper unless enhanced
  const copperLoss = card?.enhanced ? 0 : 1
  const newCopper = Math.max(0, state.copper - copperLoss)

  const stateAfterDestroy = {
    ...state,
    board: boardWithDestroyedTile,
    copper: newCopper
  }

  // Check game status after destruction (destroying last player tile should end the level)
  const gameStatus = checkGameStatus(stateAfterDestroy)

  return {
    ...stateAfterDestroy,
    gameStatus
  }
}
