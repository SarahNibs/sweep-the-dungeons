import { GameState, Card } from '../../types'
import { createCard } from '../gameRepository'

/**
 * Novel equipment: when gained, replace all Instructions-like cards with doubly-upgraded Sarcastic Instructions
 * (Imperious Instructions, Vague Instructions, Sarcastic Instructions)
 * Also transforms future Instructions additions
 */
export function applyNovelEffect(state: GameState): { state: GameState; results?: { before: Card; after: Card }[] } {

  // Find all Instructions-like cards in persistent deck
  const instructionsLikeCards = state.persistentDeck.filter(card =>
    card.name === 'Imperious Instructions' ||
    card.name === 'Vague Instructions' ||
    card.name === 'Sarcastic Instructions'
  )
  const deckWithoutInstructions = state.persistentDeck.filter(card =>
    card.name !== 'Imperious Instructions' &&
    card.name !== 'Vague Instructions' &&
    card.name !== 'Sarcastic Instructions'
  )


  // Create doubly-upgraded Sarcastic Instructions for each removed card
  const sarcasticCards: Card[] = instructionsLikeCards.map(() =>
    createCard('Sarcastic Instructions', { energyReduced: true, enhanced: true })
  )

  const newDeck = [...deckWithoutInstructions, ...sarcasticCards]

  // Create upgrade results showing the transformations
  const sarcasticAfter = createCard('Sarcastic Instructions', { energyReduced: true, enhanced: true })

  // Show one transformation for each card replaced, using the actual card type as "before"
  const equipmentUpgradeResults = instructionsLikeCards.map(card => ({
    before: card,
    after: sarcasticAfter
  }))

  const newState = {
    ...state,
    persistentDeck: newDeck
  }

  const results = equipmentUpgradeResults.length > 0 ? equipmentUpgradeResults : [
    // If no Instructions to replace, show what would happen with Imperious Instructions as example
    { before: createCard('Imperious Instructions', {}), after: sarcasticAfter }
  ]

  return { state: newState, results }
}

/**
 * Utility function to transform Instructions-like cards when Novel equipment is owned
 * Call this when adding cards to the deck
 */
export function transformInstructionsIfNovel(card: Card, hasNovel: boolean): Card {
  if (hasNovel && (
    card.name === 'Imperious Instructions' ||
    card.name === 'Vague Instructions' ||
    card.name === 'Sarcastic Instructions'
  )) {
    return createCard('Sarcastic Instructions', { energyReduced: true, enhanced: true })
  }
  return card
}
