import { GameState, Card } from '../../types'

/**
 * Bleach equipment: when gained, apply enhance-upgrade to all Spritz and Sweep cards (that aren't already enhanced)
 */
export function applyBleachEffect(state: GameState): GameState {
  console.log('🧴 BLEACH EFFECT: Enhancing all non-enhanced Spritz and Sweep cards')

  // Find all Spritz and Sweep cards in persistent deck that aren't already enhanced
  const targetCards = state.persistentDeck.filter(card =>
    (card.name === 'Spritz' || card.name === 'Sweep') && !card.enhanced
  )
  const otherCards = state.persistentDeck.filter(card =>
    !(card.name === 'Spritz' || card.name === 'Sweep') || card.enhanced
  )

  console.log(`  - Found ${targetCards.length} Spritz/Sweep cards to enhance`)

  // Enhance the target cards
  const enhancedCards: Card[] = targetCards.map(card => ({
    ...card,
    enhanced: true
  }))

  const newDeck = [...otherCards, ...enhancedCards]

  // Create upgrade results showing the transformations
  const equipmentUpgradeResults = targetCards.map(card => ({
    before: card,
    after: { ...card, enhanced: true }
  }))

  // If no cards to enhance, show example
  if (equipmentUpgradeResults.length === 0) {
    const exampleSpritz: Card = {
      id: 'example-spritz',
      name: 'Spritz',
      cost: 1,
      energyReduced: false,
      enhanced: false
    }
    equipmentUpgradeResults.push({
      before: exampleSpritz,
      after: { ...exampleSpritz, enhanced: true }
    })
  }

  return {
    ...state,
    persistentDeck: newDeck,
    modalStack: [...state.modalStack, 'equipment_upgrade_display'], // Push modal to stack
    equipmentUpgradeResults
  }
}
