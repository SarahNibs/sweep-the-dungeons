import { GameState } from '../../types'
import { getWeightedRewardCardPool, selectWeightedCard, createCard, applyDIYGel } from '../gameRepository'

/**
 * Boots relic: when gained, transform one of your cards into a random double-upgraded card
 *
 * This works by:
 * 1. Showing deck selection screen (like card removal)
 * 2. Player picks a card
 * 3. That card is removed from persistent deck
 * 4. A random reward card is chosen and added as double-upgraded (or just enhanced if cost 0)
 */

export function applyBootsEffect(state: GameState): GameState {
  console.log('👢 BOOTS EFFECT: Entering card selection mode')

  // Set state to show deck selection for transformation
  return {
    ...state,
    waitingForCardRemoval: true,
    // We'll use a special flag to indicate this is for Boots transformation, not removal
    bootsTransformMode: true
  }
}

export function transformCardForBoots(state: GameState, cardId: string): GameState {
  // Find the original card for the "before" display
  const originalCard = state.persistentDeck.find(card => card.id === cardId)
  if (!originalCard) {
    console.error(`👢 BOOTS: Card ${cardId} not found in persistentDeck`)
    return state
  }

  // Remove the selected card from persistent deck
  const newPersistentDeck = state.persistentDeck.filter(card => card.id !== cardId)

  // Get random reward card from weighted pool (handles rarity and directional cards correctly)
  const weightedPool = getWeightedRewardCardPool()
  const selectedCardName = selectWeightedCard(weightedPool)

  // Create the double-upgraded card (both enhanced AND energyReduced)
  // This applies to ALL cards, including 0-cost cards (they stay 0-cost but get the flag)
  // Note: DIY Gel won't affect this since it's already enhanced
  const upgradedCard = applyDIYGel(state.relics, createCard(selectedCardName, {
    energyReduced: true,
    enhanced: true
  }))

  console.log(`👢 BOOTS: Transformed ${originalCard.name} into double-upgraded ${upgradedCard.name}`)

  return {
    ...state,
    persistentDeck: [...newPersistentDeck, upgradedCard],
    gamePhase: 'relic_upgrade_display',
    relicUpgradeResults: [{ before: originalCard, after: upgradedCard }],
    waitingForCardRemoval: false,
    bootsTransformMode: false,
    relicOptions: undefined // Clear relic options after transformation
  }
}
