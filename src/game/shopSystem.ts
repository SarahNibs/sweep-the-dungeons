import { ShopOption, GameState, Card } from '../types'
import { createCard, getRewardCardPool, getAllEquipment, addCardToPersistentDeck } from './gameRepository'
import { advanceToNextLevel } from './cardSystem'
import { applyEstrogenEffect, applyProgesteroneEffect, applyBootsEffect, transformCardForBoots, applyCrystalEffect, applyBroomClosetEffect, applyNovelEffect, transformInstructionsIfNovel, applyCocktailEffect, applyDiscoBallEffect, applyBleachEffect } from './equipment'
import { pushEquipmentUpgradeModal } from './modalManager'
import { clearRewardScreenState } from './rewardStateManager'

export function createShopOptions(state: GameState): ShopOption[] {
  const options: ShopOption[] = []

  // Progressive price scaling: Nth store costs +10*(N-1)% of base (round up)
  // 1st shop: +0%, 2nd shop: +10%, 3rd shop: +20%, etc.
  const priceMultiplier = 1 + 0.1 * (state.shopVisitCount - 1)
  const scaleCost = (baseCost: number) => Math.ceil(baseCost * priceMultiplier)

  // 2x random cards you can choose to add to your deck for 4 coppers apiece
  const availableCards = getRewardCardPool()

  // Group cards by base name (treating all Gaze and Fetch variants as one group)
  const cardGroups: Map<string, typeof availableCards> = new Map()
  for (const card of availableCards) {
    let baseName = card.name
    if (card.name.startsWith('Gaze')) baseName = 'Gaze'
    if (card.name.startsWith('Fetch')) baseName = 'Fetch'

    if (!cardGroups.has(baseName)) {
      cardGroups.set(baseName, [])
    }
    cardGroups.get(baseName)!.push(card)
  }

  // Shuffle the groups
  const groupNames = Array.from(cardGroups.keys()).sort(() => Math.random() - 0.5)

  // Select 2 groups and pick random card from each
  const selectedCards = []
  for (let i = 0; i < Math.min(2, groupNames.length); i++) {
    const group = cardGroups.get(groupNames[i])!
    const randomCard = group[Math.floor(Math.random() * group.length)]
    selectedCards.push(randomCard)
  }
  
  selectedCards.forEach(card => {
    options.push({
      type: 'add_card',
      cost: scaleCost(5), // Base cost 5
      card,
      displayName: card.name,
      description: `Add ${card.name} to your deck`
    })
  })

  // 1x random energy-upgraded card for 11 coppers base
  // Energy-upgraded cards grant +1 energy when played
  const energyReducibleCards = getRewardCardPool().filter(card => card.cost > 0)
  const energyCard = energyReducibleCards.length > 0
    ? createCard(energyReducibleCards[Math.floor(Math.random() * energyReducibleCards.length)].name, { energyReduced: true })
    : createCard('Energized', { energyReduced: true }) // Fallback if no eligible cards
  options.push({
    type: 'add_energy_card',
    cost: scaleCost(11), // Base cost 11
    card: energyCard,
    displayName: `${energyCard.name} (Energy Upgraded)`,
    description: `Add energy-upgraded ${energyCard.name} to your deck`
  })

  // 1x random enhance-upgraded card for 10 coppers base
  const allRewardCards = getRewardCardPool()
  const enhancedCard = allRewardCards.length > 0
    ? createCard(allRewardCards[Math.floor(Math.random() * allRewardCards.length)].name, { enhanced: true })
    : createCard('Energized', { enhanced: true }) // Fallback
  options.push({
    type: 'add_enhanced_card',
    cost: scaleCost(10), // Base cost 10
    card: enhancedCard,
    displayName: `${enhancedCard.name} (Enhanced)`,
    description: `Add enhanced ${enhancedCard.name} to your deck`
  })

  // 2x random equipment you don't already own (19 coppers for first slot, 23 for second)
  const allEquipment = getAllEquipment()

  // Filter out equipment player already owns or doesn't have prerequisites for
  const availableEquipment = allEquipment.filter(equipment => {
    // Already own this equipment
    if (state.equipment.some(ownedEquipment => ownedEquipment.name === equipment.name)) {
      return false
    }

    // Check prerequisites - equipment must have all prerequisite equipment owned
    if (equipment.prerequisites && equipment.prerequisites.length > 0) {
      const hasAllPrerequisites = equipment.prerequisites.every(prereqName =>
        state.equipment.some(ownedEquipment => ownedEquipment.name === prereqName)
      )
      if (!hasAllPrerequisites) {
        return false
      }
    }

    return true
  })

  // Shuffle using Fisher-Yates algorithm (proper random shuffle)
  const shuffledEquipment = [...availableEquipment]
  for (let i = shuffledEquipment.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledEquipment[i], shuffledEquipment[j]] = [shuffledEquipment[j], shuffledEquipment[i]]
  }
  const selectedEquipment = shuffledEquipment.slice(0, Math.min(2, availableEquipment.length))

  selectedEquipment.forEach((equipment, index) => {
    const baseCost = index === 0 ? 19 : 23 // First slot: 19, second slot: 23
    options.push({
      type: 'add_equipment',
      cost: scaleCost(baseCost),
      equipment,
      displayName: equipment.name,
      description: equipment.description
    })
  })

  // 1x opportunity to remove a card from your deck for 14 coppers base
  if (state.persistentDeck.length > 0) {
    options.push({
      type: 'remove_card',
      cost: scaleCost(14), // Base cost 14
      displayName: 'Remove Card',
      description: 'Remove a card from your deck'
    })
  }

  // 1x temporary "a bunny will reveal one of your tiles at random at the beginning of the next level" benefit for 4 copper base
  options.push({
    type: 'temp_bunny',
    cost: scaleCost(4), // Base cost 4
    displayName: 'Visiting Bunny',
    description: 'A bunny will reveal one of your tiles at the start of the next level'
  })

  // 1x random enhance-upgrade for 9 copper base
  options.push({
    type: 'random_enhance',
    cost: scaleCost(9), // Base cost 9
    displayName: 'Enhance!',
    description: 'Randomly enhance a card in your deck that isn\'t already enhanced'
  })
  
  return options
}

export function startShopSelection(state: GameState): GameState {
  // Clear reward screen state to prevent leakage from previous screens
  const cleanState = clearRewardScreenState(state)

  const shopOptions = createShopOptions(state)
  return {
    ...cleanState,
    gamePhase: 'shop_selection',
    shopOptions,
    purchasedShopItems: new Set<number>(), // Initialize purchased items tracker
    shopVisitCount: state.shopVisitCount + 1 // Increment shop visit counter for progressive pricing
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
        // Check if Novel equipment is owned and transform Instructions if needed
        const hasNovel = newState.equipment.some(r => r.name === 'Novel')
        const finalCard = transformInstructionsIfNovel(option.card, hasNovel)

        // Use helper function that respects DIY Gel
        newState = {
          ...newState,
          persistentDeck: addCardToPersistentDeck(newState, finalCard)
        }
      }
      break
      
    case 'add_equipment':
      if (option.equipment) {
        // Add the equipment to the collection first
        newState = {
          ...newState,
          equipment: [...newState.equipment, option.equipment]
        }
        
        // Apply special equipment effects for Estrogen, Progesterone, Boots, Crystal, Broom Closet, Novel, Cocktail, and Disco Ball
        // Apply equipment effects and show modal with shop continuation
        let effectResult: { state: GameState; results?: { before: Card; after: Card }[] } | null = null

        if (option.equipment.name === 'Estrogen') {
          effectResult = applyEstrogenEffect(newState)
        } else if (option.equipment.name === 'Progesterone') {
          effectResult = applyProgesteroneEffect(newState)
        } else if (option.equipment.name === 'Boots') {
          effectResult = applyBootsEffect(newState)
        } else if (option.equipment.name === 'Crystal') {
          effectResult = applyCrystalEffect(newState)
        } else if (option.equipment.name === 'Broom Closet') {
          effectResult = applyBroomClosetEffect(newState)
        } else if (option.equipment.name === 'Novel') {
          effectResult = applyNovelEffect(newState)
        } else if (option.equipment.name === 'Cocktail') {
          effectResult = applyCocktailEffect(newState)
        } else if (option.equipment.name === 'Disco Ball') {
          effectResult = applyDiscoBallEffect(newState)
        } else if (option.equipment.name === 'Bleach') {
          effectResult = applyBleachEffect(newState)
        }

        if (effectResult) {
          const { state: equipmentState, results } = effectResult

          // Ensure shop state is preserved in equipment state
          const stateWithShopData = {
            ...equipmentState,
            shopOptions: newState.shopOptions,
            purchasedShopItems: newState.purchasedShopItems,
            copper: newState.copper
          }

          // If equipment has upgrade results, show modal with shop continuation
          if (results && results.length > 0) {
            newState = pushEquipmentUpgradeModal(stateWithShopData, results, {
              returnTo: 'shop',
              preservedState: {
                shopOptions: newState.shopOptions,
                purchasedShopItems: newState.purchasedShopItems,
                copper: newState.copper
              }
            }) as typeof newState
          } else {
            // Boots: no results yet, will show modal after card selection
            newState = stateWithShopData
          }
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

    case 'random_enhance':
      // Find all cards in persistent deck that don't already have enhanced
      const upgradableCards = newState.persistentDeck.filter(card => !card.enhanced)

      if (upgradableCards.length === 0) {
        // No cards to upgrade - just return state
        break
      }

      // Pick random card to enhance
      const cardToEnhance = upgradableCards[Math.floor(Math.random() * upgradableCards.length)]

      // Create the enhanced version
      const enhancedCard = createCard(cardToEnhance.name, {
        enhanced: true,
        energyReduced: cardToEnhance.energyReduced
      })

      // Update persistent deck with enhanced version
      const updatedDeck = newState.persistentDeck.map(card =>
        card.id === cardToEnhance.id ? enhancedCard : card
      )

      // Use modal manager with explicit continuation
      newState = pushEquipmentUpgradeModal(
        { ...newState, persistentDeck: updatedDeck },
        [{ before: cardToEnhance, after: enhancedCard }],
        {
          returnTo: 'shop',
          preservedState: {
            shopOptions: newState.shopOptions,
            purchasedShopItems: newState.purchasedShopItems,
            copper: newState.copper
          }
        }
      ) as typeof newState
      break
  }

  return newState
}

export function removeSelectedCard(state: GameState, cardId: string): GameState {
  // Check if this is Boots transformation mode
  if (state.bootsTransformMode) {
    const { state: newState, results } = transformCardForBoots(state, cardId)

    // If Boots transformation has results, show modal with shop continuation
    if (results && results.length > 0) {
      return pushEquipmentUpgradeModal(newState, results, {
        returnTo: 'shop',
        preservedState: {
          shopOptions: state.shopOptions,
          purchasedShopItems: state.purchasedShopItems,
          copper: state.copper
        }
      })
    }

    return newState
  }

  // Normal shop card removal
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