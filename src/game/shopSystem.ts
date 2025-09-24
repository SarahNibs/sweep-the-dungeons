import { ShopOption, GameState } from '../types'
import { createCard } from './cardSystem'
import { createRelic } from './relicSystem'
import { advanceToNextLevel } from './cardSystem'

export function createShopOptions(state: GameState): ShopOption[] {
  const options: ShopOption[] = []
  
  // 2x random cards you can choose to add to your deck for 4 coppers apiece
  const availableCards = [
    createCard('Energized', 1, true), // Exhaust card - gain 2 energy
    createCard('Options', 1),         // Draw 3 cards
    createCard('Brush', 1),           // 3x3 area exclusion effect
    createCard('Ramble', 1),          // Disrupts enemy guaranteed pulls
    createCard('Sweep', 1)           // Clears dirty tiles
  ]
  
  // Shuffle and pick 2 random cards
  const shuffledCards = [...availableCards].sort(() => Math.random() - 0.5)
  const selectedCards = shuffledCards.slice(0, 2)
  
  selectedCards.forEach(card => {
    options.push({
      type: 'add_card',
      cost: 4,
      card,
      displayName: card.name,
      description: `Add ${card.name} to your deck`
    })
  })
  
  // 1x random energy-upgraded card for 8 coppers
  const energyCard = { ...availableCards[Math.floor(Math.random() * availableCards.length)] }
  energyCard.costReduced = true
  energyCard.cost = Math.max(0, energyCard.cost - 1)
  options.push({
    type: 'add_energy_card',
    cost: 8,
    card: energyCard,
    displayName: `${energyCard.name} (Energy Upgraded)`,
    description: `Add energy-upgraded ${energyCard.name} to your deck`
  })
  
  // 1x random enhance-upgraded card for 8 coppers
  const enhancedCard = { ...availableCards[Math.floor(Math.random() * availableCards.length)] }
  enhancedCard.enhanced = true
  options.push({
    type: 'add_enhanced_card',
    cost: 8,
    card: enhancedCard,
    displayName: `${enhancedCard.name} (Enhanced)`,
    description: `Add enhanced ${enhancedCard.name} to your deck`
  })
  
  // 2x random relics you don't already own for 15 coppers apiece
  const allRelics = [
    createRelic(
      'Double Broom', 
      'brush some nearby tiles when cleaning',
      'Double Broom: whenever you reveal a tile, apply the Brush effect to two random unrevealed adjacent tiles'
    ),
    createRelic(
      'Dust Bunny',
      'animal companion who helps you clean', 
      'Dust Bunny: when you start a new level, you immediately reveal one of your non-dirty tiles at random, getting adjacency info just as if you revealed it normally'
    ),
    createRelic(
      'Frilly Dress',
      'your counterpart sometimes watches you clean rather than cleaning themselves',
      'Frilly Dress: revealing neutral tiles on your first turn of any level does not end your turn'
    )
  ]
  
  // Filter out relics player already owns
  const availableRelics = allRelics.filter(relic => 
    !state.relics.some(ownedRelic => ownedRelic.name === relic.name)
  )
  
  // Shuffle and pick up to 2 relics
  const shuffledRelics = [...availableRelics].sort(() => Math.random() - 0.5)
  const selectedRelics = shuffledRelics.slice(0, Math.min(2, availableRelics.length))
  
  selectedRelics.forEach(relic => {
    options.push({
      type: 'add_relic',
      cost: 15,
      relic,
      displayName: relic.name,
      description: relic.description
    })
  })
  
  // 1x opportunity to remove a card from your deck for 10 coppers
  if (state.persistentDeck.length > 0) {
    options.push({
      type: 'remove_card',
      cost: 10,
      displayName: 'Remove Card',
      description: 'Remove a card from your deck permanently'
    })
  }
  
  // 2x temporary "a bunny will reveal one of your tiles at random at the beginning of the next level" benefits
  // for 7 and 14 coppers respectively
  options.push({
    type: 'temp_bunny',
    cost: 7,
    displayName: 'Temporary Bunny Helper',
    description: 'A bunny will reveal one of your tiles at the start of the next level'
  })
  
  options.push({
    type: 'temp_bunny',
    cost: 14,
    displayName: 'Temporary Bunny Helper',
    description: 'A bunny will reveal one of your tiles at the start of the next level'
  })
  
  return options
}

export function startShopSelection(state: GameState): GameState {
  const shopOptions = createShopOptions(state)
  return {
    ...state,
    gamePhase: 'shop_selection',
    shopOptions,
    purchasedShopItems: new Set<number>(), // Initialize purchased items tracker
    waitingForCardRemoval: false // Reset card removal state
  }
}

export function purchaseShopItem(state: GameState, optionIndex: number): GameState {
  if (!state.shopOptions || optionIndex >= state.shopOptions.length) {
    return state
  }
  
  // Check if item has already been purchased
  if (state.purchasedShopItems?.has(optionIndex)) {
    return state
  }
  
  const option = state.shopOptions[optionIndex]
  
  if (state.copper < option.cost) {
    // Not enough copper
    return state
  }
  
  // Create new purchased items set with this item added
  const newPurchasedItems = new Set(state.purchasedShopItems)
  newPurchasedItems.add(optionIndex)
  
  let newState = {
    ...state,
    copper: state.copper - option.cost,
    purchasedShopItems: newPurchasedItems
  }
  
  switch (option.type) {
    case 'add_card':
    case 'add_energy_card':
    case 'add_enhanced_card':
      if (option.card) {
        newState = {
          ...newState,
          persistentDeck: [...newState.persistentDeck, option.card]
        }
      }
      break
      
    case 'add_relic':
      if (option.relic) {
        newState = {
          ...newState,
          relics: [...newState.relics, option.relic]
        }
      }
      break
      
    case 'remove_card':
      // For card removal, we need to show the player's deck to choose from
      // This will be handled in the UI - here we just set waiting state
      newState = {
        ...newState,
        waitingForCardRemoval: true
      }
      break
      
    case 'temp_bunny':
      newState = {
        ...newState,
        temporaryBunnyBuffs: newState.temporaryBunnyBuffs + 1
      }
      break
  }
  
  return newState
}

export function removeSelectedCard(state: GameState, cardId: string): GameState {
  const newPersistentDeck = state.persistentDeck.filter(card => card.id !== cardId)
  return {
    ...state,
    persistentDeck: newPersistentDeck,
    waitingForCardRemoval: false
  }
}

export function exitShop(state: GameState): GameState {
  const updatedState = {
    ...state,
    gamePhase: 'playing' as const,
    shopOptions: undefined,
    purchasedShopItems: undefined,
    waitingForCardRemoval: false
  }
  
  // Advance to next level
  return advanceToNextLevel(updatedState)
}