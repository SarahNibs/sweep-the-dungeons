import { GameState } from '../../types'
import { hasEquipment } from './equipmentUtils'

export function checkFrillyDressEffect(state: GameState, revealedTile: { owner: string }): boolean {
  if (!hasEquipment(state, 'Frilly Dress')) {
    return false
  }

  // Check if this is first turn and we haven't revealed 4 neutrals yet
  // Tea removes the 4 neutral limit
  const hasTea = hasEquipment(state, 'Tea')
  const withinLimit = hasTea || state.neutralsRevealedThisTurn < 4

  return state.isFirstTurn &&
         withinLimit &&
         revealedTile.owner === 'neutral'
}
