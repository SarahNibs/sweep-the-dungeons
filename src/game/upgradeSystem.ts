import { GameState, UpgradeOption } from '../types'
import { advanceToNextLevel } from './cardSystem'
import { shouldShowEquipmentReward, shouldShowShopReward } from './levelSystem'
import { startEquipmentSelection } from './equipment'
import { startShopSelection } from './shopSystem'
import { clearRewardScreenState } from './rewardStateManager'

import { createCard } from './gameRepository'

export function createUpgradeOptions(state: GameState): UpgradeOption[] {
  const upgradeableCards = state.persistentDeck.filter(card =>
    !card.energyReduced && !card.enhanced && card.cost > 0 // Exclude 0-cost cards from upgrades
  )

  const options: UpgradeOption[] = []

  // Option 1: Always remove a card
  options.push({
    type: 'remove_card'
  })

  // Option 2: Energy reduction - random eligible card (grants +1 energy when played)
  if (upgradeableCards.length > 0) {
    const randomCard = upgradeableCards[Math.floor(Math.random() * upgradeableCards.length)]
    const energyReducedCard = createCard(randomCard.name, { energyReduced: true })
    // Preserve the original card ID for upgrade tracking
    energyReducedCard.id = randomCard.id

    options.push({
      type: 'cost_reduction',
      card: randomCard,
      displayCard: energyReducedCard
    })
  }
  
  // Option 3: Enhanced effect - random eligible card (different from cost reduction if possible)
  if (upgradeableCards.length > 0) {
    const eligibleForEnhancement = upgradeableCards.filter(card => 
      options.length < 2 || card.id !== options[1].card?.id
    )
    
    if (eligibleForEnhancement.length === 0) {
      // If no different card available, use any upgradeable card
      eligibleForEnhancement.push(...upgradeableCards)
    }
    
    const randomCard = eligibleForEnhancement[Math.floor(Math.random() * eligibleForEnhancement.length)]
    const enhancedCard = createCard(randomCard.name, { enhanced: true })
    // Preserve the original card ID for upgrade tracking
    enhancedCard.id = randomCard.id
    
    options.push({
      type: 'enhance_effect',
      card: randomCard,
      displayCard: enhancedCard
    })
  }
  
  return options
}

export function applyUpgrade(state: GameState, option: UpgradeOption, selectedCardId?: string): GameState {
  let newPersistentDeck = [...state.persistentDeck]
  
  switch (option.type) {
    case 'remove_card':
      if (selectedCardId) {
        newPersistentDeck = newPersistentDeck.filter(card => card.id !== selectedCardId)
      }
      break
      
    case 'cost_reduction':
      if (option.card && option.displayCard) {
        const cardIndex = newPersistentDeck.findIndex(card => card.id === option.card!.id)
        if (cardIndex !== -1) {
          newPersistentDeck[cardIndex] = option.displayCard
        }
      }
      break
      
    case 'enhance_effect':
      if (option.card && option.displayCard) {
        const cardIndex = newPersistentDeck.findIndex(card => card.id === option.card!.id)
        if (cardIndex !== -1) {
          newPersistentDeck[cardIndex] = option.displayCard
        }
      }
      break
  }
  
  const updatedState = {
    ...state,
    persistentDeck: newPersistentDeck,
    gamePhase: 'playing' as const,
    upgradeOptions: undefined,
    waitingForCardRemoval: false,
    pendingUpgradeOption: undefined
  }
  
  // Check if this level should show equipment rewards after upgrade
  if (shouldShowEquipmentReward(state.currentLevelId)) {
    return startEquipmentSelection(updatedState)
  } else if (shouldShowShopReward(state.currentLevelId)) {
    // No equipment rewards but has shop reward - go to shop
    return startShopSelection(updatedState)
  } else {
    // No equipment/shop rewards - advance to next level immediately
    return advanceToNextLevel(updatedState)
  }
}

export function startUpgradeSelection(state: GameState): GameState {
  // Clear reward screen state to prevent leakage from previous screens
  const cleanState = clearRewardScreenState(state)

  const upgradeOptions = createUpgradeOptions(state)
  return {
    ...cleanState,
    gamePhase: 'upgrade_selection',
    upgradeOptions
  }
}

