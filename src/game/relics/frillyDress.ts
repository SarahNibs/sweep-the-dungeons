import { GameState } from '../../types'
import { hasRelic } from './relicUtils'

export function checkFrillyDressEffect(state: GameState, revealedTile: { owner: string }): boolean {
  if (!hasRelic(state, 'Frilly Dress')) {
    return false
  }

  // Check if this is first turn and first neutral reveal
  return state.isFirstTurn &&
         !state.hasRevealedNeutralThisTurn &&
         revealedTile.owner === 'neutral'
}
