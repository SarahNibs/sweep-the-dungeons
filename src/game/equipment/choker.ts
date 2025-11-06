import { GameState } from '../../types'

/**
 * Choker equipment: when your rival reaches 5 tiles left unrevealed, the rival's turn ends
 */
export function checkChokerEffect(state: GameState): { shouldEndTurn: boolean; reason?: string } {
  // Check if player has Choker equipment
  const hasChoker = state.equipment.some(equipment => equipment.name === 'Choker')
  if (!hasChoker) {
    return { shouldEndTurn: false }
  }

  // Count unrevealed rival tiles
  const tiles = Array.from(state.board.tiles.values())
  const unrevealedRivalTiles = tiles.filter(t => t.owner === 'rival' && !t.revealed).length

  if (unrevealedRivalTiles === 5) {
    console.log('📿 CHOKER TRIGGERED: 5 rival tiles remaining - ending rival turn')
    return { shouldEndTurn: true, reason: 'choker_rival' }
  }

  return { shouldEndTurn: false }
}
