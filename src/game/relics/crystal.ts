import { GameState } from '../../types'
import { createCard } from '../gameRepository'

/**
 * Crystal relic: when gained, add 3 doubly-enhanced Tingles to your permanent deck
 */
export function applyCrystalEffect(state: GameState): GameState {
  console.log('💎 CRYSTAL EFFECT: Adding 3 doubly-enhanced Tingles to deck')

  // Create 3 doubly-enhanced Tingles
  const tingle1 = createCard('Tingle', { energyReduced: true, enhanced: true })
  const tingle2 = createCard('Tingle', { energyReduced: true, enhanced: true })
  const tingle3 = createCard('Tingle', { energyReduced: true, enhanced: true })

  // Create a dummy "before" card (a basic Tingle) to show transformation from nothing
  const dummyBefore = createCard('Tingle', {})

  return {
    ...state,
    persistentDeck: [...state.persistentDeck, tingle1, tingle2, tingle3],
    gamePhase: 'relic_upgrade_display',
    relicUpgradeResults: [
      { before: dummyBefore, after: tingle1 },
      { before: dummyBefore, after: tingle2 },
      { before: dummyBefore, after: tingle3 }
    ]
  }
}
