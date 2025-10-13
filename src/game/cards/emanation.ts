import { GameState, Position } from '../../types'
import { getTile } from '../boardSystem'

export function executeEmanationEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const targetTile = getTile(state.board, target)

  if (!targetTile) {
    // Can't emanate on empty spaces
    return state
  }

  // Mark tile as destroyed (replaces all other special tiles)
  const newTiles = new Map(state.board.tiles)
  newTiles.set(`${target.x},${target.y}`, {
    ...targetTile,
    specialTiles: ['destroyed'] // Destroyed replaces everything
  })

  // Deduct copper unless enhanced
  const copperLoss = card?.enhanced ? 0 : 1
  const newCopper = Math.max(0, state.copper - copperLoss)

  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    },
    copper: newCopper
  }
}
