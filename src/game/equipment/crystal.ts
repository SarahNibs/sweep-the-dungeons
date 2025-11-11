import { GameState, Card } from '../../types'
import { createCard, applyDIYGel } from '../gameRepository'

/**
 * Crystal equipment: when gained, add 3 doubly-enhanced Tingles to your permanent deck
 */
export function applyCrystalEffect(state: GameState): { state: GameState; results?: { before: Card; after: Card }[] } {

  // Create 3 doubly-enhanced Tingles (already enhanced, so DIY Gel won't affect them)
  const tingle1 = applyDIYGel(state.equipment, createCard('Tingle', { energyReduced: true, enhanced: true }))
  const tingle2 = applyDIYGel(state.equipment, createCard('Tingle', { energyReduced: true, enhanced: true }))
  const tingle3 = applyDIYGel(state.equipment, createCard('Tingle', { energyReduced: true, enhanced: true }))

  // Create a dummy "before" card (a basic Tingle) to show transformation from nothing
  const dummyBefore = createCard('Tingle', {})

  const newState = {
    ...state,
    persistentDeck: [...state.persistentDeck, tingle1, tingle2, tingle3]
  }

  const results = [
    { before: dummyBefore, after: tingle1 },
    { before: dummyBefore, after: tingle2 },
    { before: dummyBefore, after: tingle3 }
  ]

  return { state: newState, results }
}
