import { GameState, Card } from '../../types'
import { createCard } from '../gameRepository'
import { getEligibleCardsForUpgrade, selectRandomCards } from './equipmentUtils'

export function applyEstrogenEffect(state: GameState): GameState {
  console.log('💉 ESTROGEN EFFECT - Applying energy reduction to 3 random cards')

  // Find eligible cards for energy reduction
  const eligibleCards = getEligibleCardsForUpgrade(state.persistentDeck, 'cost_reduction')
  console.log('💉 ESTROGEN - Eligible cards for energy reduction:', eligibleCards.length)

  if (eligibleCards.length === 0) {
    console.log('💉 ESTROGEN - No eligible cards, returning state unchanged')
    return state
  }

  // Select up to 3 random cards
  const selectedCards = selectRandomCards(eligibleCards, 3)
  console.log('💉 ESTROGEN - Selected cards for upgrade:', selectedCards.map(c => c.name))

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

  console.log('💉 ESTROGEN - Applied upgrades to', upgradeResults.length, 'cards')

  return {
    ...state,
    persistentDeck: newPersistentDeck,
    modalStack: [...state.modalStack, 'equipment_upgrade_display'], // Push modal to stack
    equipmentUpgradeResults: upgradeResults
  }
}
