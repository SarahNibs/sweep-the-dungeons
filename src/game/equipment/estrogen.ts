import { GameState, Card } from '../../types'
import { createCard } from '../gameRepository'
import { getEligibleCardsForUpgrade, selectRandomCards } from './equipmentUtils'

export function applyEstrogenEffect(state: GameState): GameState {

  // Find eligible cards for energy reduction
  const eligibleCards = getEligibleCardsForUpgrade(state.persistentDeck, 'cost_reduction')

  if (eligibleCards.length === 0) {
    return state
  }

  // Select up to 3 random cards
  const selectedCards = selectRandomCards(eligibleCards, 3)

  // Apply energy reduction upgrades
  const upgradeResults: { before: Card; after: Card }[] = []
  let newPersistentDeck = [...state.persistentDeck]

  selectedCards.forEach(card => {
    const upgradedCard = createCard(card.name, { energyReduced: true, enhanced: card.enhanced })
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
