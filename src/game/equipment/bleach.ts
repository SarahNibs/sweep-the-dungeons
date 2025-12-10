import { GameState, Card } from '../../types'

/**
 * Bleach equipment: when gained, apply enhance-upgrade to all Spritz, Sweep, and Brush cards (that aren't already enhanced)
 */
export function applyBleachEffect(state: GameState): { state: GameState; results?: { before: Card; after: Card }[] } {

  // Find all Spritz, Sweep, and Brush cards in persistent deck that aren't already enhanced
  const targetCards = state.persistentDeck.filter(card =>
    (card.name === 'Spritz' || card.name === 'Sweep' || card.name === 'Brush') && !card.enhanced
  )
  const otherCards = state.persistentDeck.filter(card =>
    !(card.name === 'Spritz' || card.name === 'Sweep' || card.name === 'Brush') || card.enhanced
  )


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
    const exampleBrush: Card = {
      id: 'example-brush',
      name: 'Brush',
      cost: 2,
      energyReduced: false,
      enhanced: false
    }
    equipmentUpgradeResults.push({
      before: exampleBrush,
      after: { ...exampleBrush, enhanced: true }
    })
  }

  const newState = {
    ...state,
    persistentDeck: newDeck
  }

  return { state: newState, results: equipmentUpgradeResults }
}
