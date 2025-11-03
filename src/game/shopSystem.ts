import { ShopOption, GameState } from '../types'
import { createCard, getRewardCardPool, getAllRelics, addCardToPersistentDeck } from './gameRepository'
import { advanceToNextLevel } from './cardSystem'
import { applyEstrogenEffect, applyProgesteroneEffect, applyBootsEffect, transformCardForBoots, applyCrystalEffect, applyBroomClosetEffect, applyNovelEffect, transformInstructionsIfNovel, applyCocktailEffect } from './relics'

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
      cost: scaleCost(6), // Base cost 6
      card,
      displayName: card.name,
      description: `Add ${card.name} to your deck`
    })
  })

  // 1x random energy-upgraded card for 12 coppers base
  // Energy-upgraded cards grant +1 energy when played
  const energyReducibleCards = getRewardCardPool().filter(card => card.cost > 0)
  const energyCard = energyReducibleCards.length > 0
    ? createCard(energyReducibleCards[Math.floor(Math.random() * energyReducibleCards.length)].name, { energyReduced: true })
    : createCard('Energized', { energyReduced: true }) // Fallback if no eligible cards
  options.push({
    type: 'add_energy_card',
    cost: scaleCost(12), // Base cost 12
    card: energyCard,
    displayName: `${energyCard.name} (Energy Upgraded)`,
    description: `Add energy-upgraded ${energyCard.name} to your deck`
  })

  // 1x random enhance-upgraded card for 11 coppers base
  const allRewardCards = getRewardCardPool()
  const enhancedCard = allRewardCards.length > 0
    ? createCard(allRewardCards[Math.floor(Math.random() * allRewardCards.length)].name, { enhanced: true })
    : createCard('Energized', { enhanced: true }) // Fallback
  options.push({
    type: 'add_enhanced_card',
    cost: scaleCost(11), // Base cost 11
    card: enhancedCard,
    displayName: `${enhancedCard.name} (Enhanced)`,
    description: `Add enhanced ${enhancedCard.name} to your deck`
  })

  // 2x random relics you don't already own (20 coppers for first slot, 24 for second)
  const allRelics = getAllRelics()

  // Filter out relics player already owns or doesn't have prerequisites for
  const availableRelics = allRelics.filter(relic => {
    // Already own this relic
    if (state.relics.some(ownedRelic => ownedRelic.name === relic.name)) {
      return false
    }

    // Check prerequisites - relic must have all prerequisite relics owned
    if (relic.prerequisites && relic.prerequisites.length > 0) {
      const hasAllPrerequisites = relic.prerequisites.every(prereqName =>
        state.relics.some(ownedRelic => ownedRelic.name === prereqName)
      )
      if (!hasAllPrerequisites) {
        return false
      }
    }

    return true
  })

  // Shuffle using Fisher-Yates algorithm (proper random shuffle)
  const shuffledRelics = [...availableRelics]
  for (let i = shuffledRelics.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledRelics[i], shuffledRelics[j]] = [shuffledRelics[j], shuffledRelics[i]]
  }
  const selectedRelics = shuffledRelics.slice(0, Math.min(2, availableRelics.length))

  selectedRelics.forEach((relic, index) => {
    const baseCost = index === 0 ? 20 : 24 // First slot: 20, second slot: 24
    options.push({
      type: 'add_relic',
      cost: scaleCost(baseCost),
      relic,
      displayName: relic.name,
      description: relic.description
    })
  })

  // 1x opportunity to remove a card from your deck for 15 coppers base
  if (state.persistentDeck.length > 0) {
    options.push({
      type: 'remove_card',
      cost: scaleCost(15), // Base cost 15
      displayName: 'Remove Card',
      description: 'Remove a card from your deck permanently'
    })
  }

  // 1x temporary "a bunny will reveal one of your tiles at random at the beginning of the next level" benefit for 5 copper base
  options.push({
    type: 'temp_bunny',
    cost: scaleCost(5), // Base cost 5
    displayName: 'Temporary Bunny Helper',
    description: 'A bunny will reveal one of your tiles at the start of the next level'
  })

  // 1x random enhance-upgrade for 10 copper base
  options.push({
    type: 'random_enhance',
    cost: scaleCost(10), // Base cost 10
    displayName: 'Random Enhance Upgrade',
    description: 'Randomly enhance a card in your deck that isn\'t already enhanced'
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
    waitingForCardRemoval: false, // Reset card removal state
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
        // Check if Novel relic is owned and transform Instructions if needed
        const hasNovel = newState.relics.some(r => r.name === 'Novel')
        const finalCard = transformInstructionsIfNovel(option.card, hasNovel)

        // Use helper function that respects DIY Gel
        newState = {
          ...newState,
          persistentDeck: addCardToPersistentDeck(newState, finalCard)
        }
      }
      break
      
    case 'add_relic':
      if (option.relic) {
        // Add the relic to the collection first
        newState = {
          ...newState,
          relics: [...newState.relics, option.relic]
        }
        
        // Apply special relic effects for Estrogen, Progesterone, Boots, Crystal, Broom Closet, Novel, and Cocktail
        if (option.relic.name === 'Estrogen') {
          const relicEffectState = applyEstrogenEffect(newState)
          newState = {
            ...relicEffectState,
            // Preserve shop context
            gamePhase: 'shop_selection',
            copper: newState.copper,
            purchasedShopItems: newState.purchasedShopItems,
            shopOptions: newState.shopOptions
          }
        } else if (option.relic.name === 'Progesterone') {
          const relicEffectState = applyProgesteroneEffect(newState)
          newState = {
            ...relicEffectState,
            // Preserve shop context
            gamePhase: 'shop_selection',
            copper: newState.copper,
            purchasedShopItems: newState.purchasedShopItems,
            shopOptions: newState.shopOptions
          }
        } else if (option.relic.name === 'Boots') {
          const relicEffectState = applyBootsEffect(newState)
          newState = {
            ...relicEffectState,
            // Preserve shop context
            gamePhase: 'shop_selection',
            copper: newState.copper,
            purchasedShopItems: newState.purchasedShopItems,
            shopOptions: newState.shopOptions
          }
        } else if (option.relic.name === 'Crystal') {
          const relicEffectState = applyCrystalEffect(newState)
          newState = {
            ...relicEffectState,
            // Preserve shop context
            gamePhase: 'shop_selection',
            copper: newState.copper,
            purchasedShopItems: newState.purchasedShopItems,
            shopOptions: newState.shopOptions
          }
        } else if (option.relic.name === 'Broom Closet') {
          const relicEffectState = applyBroomClosetEffect(newState)
          newState = {
            ...relicEffectState,
            // Preserve shop context
            gamePhase: 'shop_selection',
            copper: newState.copper,
            purchasedShopItems: newState.purchasedShopItems,
            shopOptions: newState.shopOptions
          }
        } else if (option.relic.name === 'Novel') {
          const relicEffectState = applyNovelEffect(newState)
          newState = {
            ...relicEffectState,
            // Preserve shop context
            gamePhase: 'shop_selection',
            copper: newState.copper,
            purchasedShopItems: newState.purchasedShopItems,
            shopOptions: newState.shopOptions
          }
        } else if (option.relic.name === 'Cocktail') {
          const relicEffectState = applyCocktailEffect(newState)
          newState = {
            ...relicEffectState,
            // Preserve shop context
            gamePhase: 'shop_selection',
            copper: newState.copper,
            purchasedShopItems: newState.purchasedShopItems,
            shopOptions: newState.shopOptions
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
        console.warn('No cards available to enhance')
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

      newState = {
        ...newState,
        persistentDeck: updatedDeck,
        gamePhase: 'relic_upgrade_display',
        relicUpgradeResults: [{ before: cardToEnhance, after: enhancedCard }]
      }
      break
  }

  return newState
}

export function removeSelectedCard(state: GameState, cardId: string): GameState {
  // Check if this is Boots transformation mode
  if (state.bootsTransformMode) {
    return transformCardForBoots(state, cardId)
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