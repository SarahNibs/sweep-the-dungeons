import { GameState } from '../../types'
import { createCard, applyDIYGel } from '../gameRepository'

/**
 * Broom Closet equipment: when gained, remove all Spritz cards and add 3 Sweep cards
 * (one regular, one energy-upgraded, one enhance-upgraded)
 */
export function applyBroomClosetEffect(state: GameState): GameState {
  console.log('🚪 BROOM CLOSET EFFECT: Removing all Spritz, adding 3 Sweep cards')

  // Filter out all Spritz cards from persistent deck
  const spritzCards = state.persistentDeck.filter(card => card.name === 'Spritz')
  const deckWithoutSpritz = state.persistentDeck.filter(card => card.name !== 'Spritz')

  console.log(`  - Removed ${spritzCards.length} Spritz cards`)

  // Create 3 Sweep cards with different upgrade states
  const regularSweep = applyDIYGel(state.equipment, createCard('Sweep', {}))
  const energySweep = applyDIYGel(state.equipment, createCard('Sweep', { energyReduced: true }))
  const enhancedSweep = applyDIYGel(state.equipment, createCard('Sweep', { enhanced: true }))

  const newDeck = [...deckWithoutSpritz, regularSweep, energySweep, enhancedSweep]

  // Create upgrade results showing the transformations (use Spritz as "before" state)
  const spritzBefore = createCard('Spritz', {})
  const equipmentUpgradeResults = [
    { before: spritzBefore, after: regularSweep },
    { before: spritzBefore, after: energySweep },
    { before: spritzBefore, after: enhancedSweep }
  ]

  return {
    ...state,
    persistentDeck: newDeck,
    gamePhase: 'equipment_upgrade_display',
    equipmentUpgradeResults
  }
}
