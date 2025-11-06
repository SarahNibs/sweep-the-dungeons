import { GameState, Card } from '../../types'
import { createCard } from '../gameRepository'
import { getEligibleCardsForUpgrade, selectRandomCards } from './equipmentUtils'

export function applyProgesteroneEffect(state: GameState): GameState {
  console.log('💊 PROGESTERONE EFFECT - Applying enhanced effects to 3 random cards')

  // Find eligible cards for enhancement
  const eligibleCards = getEligibleCardsForUpgrade(state.persistentDeck, 'enhance_effect')
  console.log('💊 PROGESTERONE - Eligible cards for enhancement:', eligibleCards.length)

  if (eligibleCards.length === 0) {
    console.log('💊 PROGESTERONE - No eligible cards, returning state unchanged')
    return state
  }

  // Select up to 3 random cards
  const selectedCards = selectRandomCards(eligibleCards, 3)
  console.log('💊 PROGESTERONE - Selected cards for upgrade:', selectedCards.map(c => c.name))

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

  console.log('💊 PROGESTERONE - Applied upgrades to', upgradeResults.length, 'cards')

  return {
    ...state,
    persistentDeck: newPersistentDeck,
    gamePhase: 'equipment_upgrade_display',
    equipmentUpgradeResults: upgradeResults
  }
}
