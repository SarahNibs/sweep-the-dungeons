import { GameState, Card } from '../../types'
import { createCard } from '../gameRepository'
import { getEligibleCardsForUpgrade, selectRandomCards } from './equipmentUtils'

/**
 * Apply Progesterone effect: enhance up to 3 random cards
 * Returns state with updated deck AND the upgrade results so caller can push modal with continuation
 */
export function applyProgesteroneEffect(state: GameState): { state: GameState; results?: { before: Card; after: Card }[] } {

  // Find eligible cards for enhancement
  const eligibleCards = getEligibleCardsForUpgrade(state.persistentDeck, 'enhance_effect')

  if (eligibleCards.length === 0) {
    return { state }
  }

  // Select up to 3 random cards
  const selectedCards = selectRandomCards(eligibleCards, 3)

  // Apply enhancement upgrades
  const upgradeResults: { before: Card; after: Card }[] = []
  let newPersistentDeck = [...state.persistentDeck]

  selectedCards.forEach(card => {
    const upgradedCard = createCard(card.name, { energyReduced: card.energyReduced, enhanced: true })
    const cardIndex = newPersistentDeck.findIndex(c => c.id === card.id)

    if (cardIndex !== -1) {
      newPersistentDeck[cardIndex] = upgradedCard
      upgradeResults.push({ before: card, after: upgradedCard })
    }
  })

  const newState = {
    ...state,
    persistentDeck: newPersistentDeck
  }

  return { state: newState, results: upgradeResults }
}
