import { GameState } from '../../types'
import { createCard, applyDIYGel } from '../gameRepository'

/**
 * Broom Closet relic: when gained, remove all Spritz cards and add 3 Brush cards
 * (one regular, one energy-upgraded, one enhance-upgraded)
 */
export function applyBroomClosetEffect(state: GameState): GameState {
  console.log('🚪 BROOM CLOSET EFFECT: Removing all Spritz, adding 3 Brush cards')

  // Filter out all Spritz cards from persistent deck
  const spritzCards = state.persistentDeck.filter(card => card.name === 'Spritz')
  const deckWithoutSpritz = state.persistentDeck.filter(card => card.name !== 'Spritz')

  console.log(`  - Removed ${spritzCards.length} Spritz cards`)

  // Create 3 Broom cards with different upgrade states
  const regularBroom = applyDIYGel(state.relics, createCard('Broom', {}))
  const energyBroom = applyDIYGel(state.relics, createCard('Broom', { energyReduced: true }))
  const enhancedBroom = applyDIYGel(state.relics, createCard('Broom', { enhanced: true }))

  const newDeck = [...deckWithoutSpritz, regularBroom, energyBroom, enhancedBroom]

  // Create upgrade results showing the transformations (use Spritz as "before" state)
  const spritzBefore = createCard('Spritz', {})
  const relicUpgradeResults = [
    { before: spritzBefore, after: regularBroom },
    { before: spritzBefore, after: energyBroom },
    { before: spritzBefore, after: enhancedBroom }
  ]

  return {
    ...state,
    persistentDeck: newDeck,
    gamePhase: 'relic_upgrade_display',
    relicUpgradeResults
  }
}
