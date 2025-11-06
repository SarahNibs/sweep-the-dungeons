import { GameState } from '../../types'
import { createCard } from '../gameRepository'

/**
 * Glasses equipment: at the beginning of every turn, play a Tingle for free (adds a Tingle to discard)
 * Just adds the Tingle card to discard - the animation will be triggered by the store
 */
export function prepareGlassesEffect(state: GameState): GameState {
  console.log('👓 GLASSES EFFECT: Preparing free Tingle at start of turn')

  // Add a regular Tingle card to discard pile
  const tingleCard = createCard('Tingle')
  return {
    ...state,
    discard: [...state.discard, tingleCard]
  }
}
