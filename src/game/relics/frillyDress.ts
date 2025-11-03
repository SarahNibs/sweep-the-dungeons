import { GameState } from '../../types'
import { hasRelic } from './relicUtils'

export function checkFrillyDressEffect(state: GameState, revealedTile: { owner: string }): boolean {
  if (!hasRelic(state, 'Frilly Dress')) {
    return false
  }

  // Check if this is first turn and we haven't revealed 6 neutrals yet
  // Tea removes the 6 neutral limit
  const hasTea = hasRelic(state, 'Tea')
  const withinLimit = hasTea || state.neutralsRevealedThisTurn < 6

  return state.isFirstTurn &&
         withinLimit &&
         revealedTile.owner === 'neutral'
}
