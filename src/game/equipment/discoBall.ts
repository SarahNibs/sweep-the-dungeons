import { GameState, Card } from '../../types'
import { createCard, applyDIYGel } from '../gameRepository'

/**
 * Disco Ball equipment: when gained, add 2 doubly-upgraded Tingles to your permanent deck
 */
export function applyDiscoBallEffect(state: GameState): { state: GameState; results?: { before: Card; after: Card }[] } {

  // Create 2 doubly-upgraded Tingles (already enhanced, so DIY Gel won't affect them)
  const tingle1 = applyDIYGel(state.equipment, createCard('Tingle', { energyReduced: true, enhanced: true }))
  const tingle2 = applyDIYGel(state.equipment, createCard('Tingle', { energyReduced: true, enhanced: true }))

  // Create a dummy "before" card (a basic Tingle) to show transformation from nothing
  const dummyBefore = createCard('Tingle', {})

  const newState = {
    ...state,
    persistentDeck: [...state.persistentDeck, tingle1, tingle2]
  }

  const results = [
    { before: dummyBefore, after: tingle1 },
    { before: dummyBefore, after: tingle2 }
  ]

  return { state: newState, results }
}
