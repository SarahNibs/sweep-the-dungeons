import { GameState, Card } from '../../types'
import { createCard } from '../gameRepository'
import { getEligibleCardsForUpgrade, selectRandomCards } from './equipmentUtils'

export function applyProgesteroneEffect(state: GameState): GameState {

  // Find eligible cards for enhancement
  const eligibleCards = getEligibleCardsForUpgrade(state.persistentDeck, 'enhance_effect')

  if (eligibleCards.length === 0) {
    return state
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


  return {
    ...state,
    persistentDeck: newPersistentDeck,
    modalStack: [...state.modalStack, 'equipment_upgrade_display'], // Push modal to stack
    equipmentUpgradeResults: upgradeResults
  }
}
