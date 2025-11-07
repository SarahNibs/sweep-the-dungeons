import { GameState, Card } from '../../types'

/**
 * Twirl card effect: gain copper
 */
export function executeTwirlEffect(state: GameState, card?: Card): GameState {
  const copperGain = card?.enhanced ? 5 : 3


  return {
    ...state,
    copper: state.copper + copperGain
  }
}
