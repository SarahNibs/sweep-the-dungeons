import { Card, GameState, UpgradeOption } from '../types'
import { advanceToNextLevel } from './cardSystem'
import { shouldShowRelicReward, shouldShowShopReward } from './levelSystem'
import { startRelicSelection } from './relicSystem'
import { startShopSelection } from './shopSystem'

export function createCard(name: string, cost: number, exhaust?: boolean, costReduced?: boolean, enhanced?: boolean): Card {
  return {
    id: crypto.randomUUID(),
    name,
    cost,
    exhaust,
    costReduced,
    enhanced
  }
}

export function createUpgradeOptions(state: GameState): UpgradeOption[] {
  const upgradeableCards = state.persistentDeck.filter(card => 
    !card.costReduced && !card.enhanced
  )
  
  const options: UpgradeOption[] = []
  
  // Option 1: Always remove a card
  options.push({
    type: 'remove_card'
  })
  
  // Option 2: Cost reduction - random eligible card
  if (upgradeableCards.length > 0) {
    const randomCard = upgradeableCards[Math.floor(Math.random() * upgradeableCards.length)]
    const costReducedCard = {
      ...randomCard,
      cost: Math.max(0, randomCard.cost - 1),
      costReduced: true
    }
    
    options.push({
      type: 'cost_reduction',
      card: randomCard,
      displayCard: costReducedCard
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
    const enhancedCard = {
      ...randomCard,
      enhanced: true
    }
    
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
  
  // Check if this level should show relic rewards after upgrade
  if (shouldShowRelicReward(state.currentLevelId)) {
    return startRelicSelection(updatedState)
  } else if (shouldShowShopReward(state.currentLevelId)) {
    // No relic rewards but has shop reward - go to shop
    return startShopSelection(updatedState)
  } else {
    // No relic/shop rewards - advance to next level immediately
    return advanceToNextLevel(updatedState)
  }
}

export function startUpgradeSelection(state: GameState): GameState {
  const upgradeOptions = createUpgradeOptions(state)
  return {
    ...state,
    gamePhase: 'upgrade_selection',
    upgradeOptions,
    waitingForCardRemoval: false,
    pendingUpgradeOption: undefined
  }
}

export function getCardDescription(card: Card): string {
  const baseName = card.name
  const isEnhanced = card.enhanced
  
  switch (baseName) {
    case 'Imperious Orders':
      return isEnhanced ? 'Solid clue that will never clue a mine tile' : 'Solid clue for revealing player tiles'
    case 'Vague Orders':
      return isEnhanced ? 'Stretch clue with 5 guaranteed bag pulls from player tiles' : 'Stretch clue for revealing player tiles'
    case 'Spritz':
      return isEnhanced ? 'Scout effect plus random adjacent tile scouting' : 'Scout to check if tile is safe or dangerous'
    case 'Tingle':
      return isEnhanced ? 'Annotate 2 random enemy tiles' : 'Annotate 1 random enemy tile'
    case 'Easiest':
      return isEnhanced ? 'Select 3 tiles, reveals the safest' : 'Select 2 tiles, reveals the safer'
    case 'Sweep':
      return isEnhanced ? 'Clears dirt in a 7x7 area' : 'Clears dirt in a 5x5 area'
    case 'Ramble':
      return isEnhanced ? 'Disrupts enemy pulls, adds 0-4 random priority boost' : 'Disrupts enemy pulls, adds 0-2 random priority boost'
    case 'Brush':
      return isEnhanced ? 'Applies 3x3 exclusion effect twice' : 'Applies 3x3 exclusion effect'
    case 'Options':
      return isEnhanced ? 'Draw 5 cards' : 'Draw 3 cards'
    case 'Energized':
      return isEnhanced ? 'Gain 2 energy (no longer exhausts)' : 'Gain 2 energy (exhausts after use)'
    default:
      return 'Unknown card'
  }
}