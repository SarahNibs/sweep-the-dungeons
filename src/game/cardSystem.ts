import { Card, GameState, StatusEffect } from '../types'
import { createBoard, revealTileWithResult } from './boardSystem'
import { executeCardEffect, requiresTargeting } from './cardEffects'
import { getLevelConfig as getLevelConfigFromSystem, getNextLevelId } from './levelSystem'
import { triggerDustBunnyEffect, triggerTemporaryBunnyBuffs, triggerMatedPairEffect, triggerBabyBunnyEffect, triggerBusyCanaryEffect, triggerInterceptedNoteEffect, triggerHyperfocusEffect, prepareGlassesEffect, hasRelic } from './relics'
import { AIController } from './ai/AIController'
import { decrementBurgerStacks } from './cards/burger'
import { decrementIceCreamStacks } from './cards/iceCream'
import { decrementCarrotsStacks } from './cards/carrots'
import { revealTileWithRelicEffects } from './cardEffects'

/**
 * Maps card names to their effect types for non-targeting cards
 */
function getCardEffectType(cardName: string): string {
  switch (cardName) {
    case 'Imperious Instructions':
      return 'solid_clue'
    case 'Vague Instructions':
      return 'stretch_clue'
    case 'Sarcastic Instructions':
      return 'sarcastic_orders'
    case 'Energized':
      return 'energized'
    case 'Options':
      return 'options'
    case 'Ramble':
      return 'ramble'
    case 'Underwire':
      return 'underwire'
    case 'Monster':
      return 'monster'
    case 'Tryst':
      return 'tryst'
    case 'Burger':
      return 'burger'
    case 'Ice Cream':
      return 'ice_cream'
    case 'Carrots':
      return 'carrots'
    case 'Twirl':
      return 'twirl'
    default:
      // Fallback for unknown cards
      return cardName.toLowerCase().replace(/[^a-z_]/g, '_')
  }
}

import { createCard as createCardFromRepository, getRewardCardPool, getStarterCards, removeStatusEffect, addStatusEffect, addCardToPersistentDeck } from './gameRepository'

export function createCard(name: string, upgrades?: { energyReduced?: boolean; enhanced?: boolean }): Card {
  return createCardFromRepository(name, upgrades)
}

export function getEffectiveCardCost(card: Card, activeStatusEffects: any[]): number {
  let finalCost = card.cost

  // Horse discount: Horse cards cost 0
  const hasHorseDiscount = activeStatusEffects.some(effect => effect.type === 'horse_discount')
  if (hasHorseDiscount && card.name === 'Horse') {
    finalCost = 0
  }

  return finalCost
}

/**
 * Safely deduct energy from state with validation
 * Prevents negative energy and logs warnings if something goes wrong
 *
 * @param state - State to deduct energy from
 * @param card - Card being played
 * @param statusEffectsForCost - Status effects to use for cost calculation (usually from BEFORE card executed)
 * @param context - Debug context string
 */
export function deductEnergy(
  state: GameState,
  card: Card,
  statusEffectsForCost: any[],
  context: string
): GameState {
  const cost = getEffectiveCardCost(card, statusEffectsForCost)
  let newEnergy = state.energy - cost

  // Energy-reduced cards grant +1 energy when played
  if (card.energyReduced) {
    newEnergy += 1
  }

  if (newEnergy < 0) {
    console.error(`❌ ENERGY BUG DETECTED in ${context}:`)
    console.error(`  - Current energy: ${state.energy}`)
    console.error(`  - Card cost: ${cost}`)
    console.error(`  - Card name: ${card.name}`)
    console.error(`  - Energy-reduced: ${card.energyReduced}`)
    console.error(`  - Would result in: ${newEnergy} energy`)
    console.error(`  - This should have been caught by canPlayCard check!`)

    // Return state unchanged to prevent negative energy
    return state
  }

  return {
    ...state,
    energy: newEnergy
  }
}

export function createNewLevelCards(levelNumber: number): Card[] {
  const availableCards = getRewardCardPool()

  // Group cards by base name (treating all Gaze and Fetch variants as one group)
  const cardGroups: Map<string, Card[]> = new Map()
  for (const card of availableCards) {
    let baseName = card.name
    if (card.name.startsWith('Gaze')) baseName = 'Gaze'
    if (card.name.startsWith('Fetch')) baseName = 'Fetch'

    if (!cardGroups.has(baseName)) {
      cardGroups.set(baseName, [])
    }
    cardGroups.get(baseName)!.push(card)
  }

  // Shuffle the groups (each group has equal probability)
  const groupNames = Array.from(cardGroups.keys())
  for (let i = groupNames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[groupNames[i], groupNames[j]] = [groupNames[j], groupNames[i]]
  }

  // Select 3 groups and pick random card from each
  const selectedCards: Card[] = []
  for (let i = 0; i < Math.min(3, groupNames.length); i++) {
    const group = cardGroups.get(groupNames[i])!
    const randomCard = group[Math.floor(Math.random() * group.length)]
    selectedCards.push(randomCard)
  }

  // Apply random upgrades based on level (level 11+: 1 upgrade, level 16+: 2 upgrades)
  const numUpgrades = levelNumber >= 16 ? 2 : levelNumber >= 11 ? 1 : 0

  if (numUpgrades > 0) {
    // Randomly select which cards to upgrade (without replacement)
    const upgradeIndices = new Set<number>()
    while (upgradeIndices.size < numUpgrades) {
      upgradeIndices.add(Math.floor(Math.random() * 3))
    }

    // Apply random upgrades to selected cards
    for (const index of upgradeIndices) {
      const card = selectedCards[index]

      // Determine which upgrades are applicable
      const possibleUpgrades: Array<'enhanced' | 'energyReduced'> = []
      possibleUpgrades.push('enhanced') // Enhanced is always possible
      if (card.cost > 0) {
        possibleUpgrades.push('energyReduced') // Energy reduction only for cost > 0
      }

      // Pick random upgrade
      const upgradeType = possibleUpgrades[Math.floor(Math.random() * possibleUpgrades.length)]

      console.log(`🎁 CARD REWARD UPGRADE (Level ${levelNumber}): Upgrading ${card.name} with ${upgradeType}`)

      // Apply the upgrade
      selectedCards[index] = createCard(card.name, {
        [upgradeType]: true
      })
    }
  }

  return selectedCards
}

export function createStartingDeck(): Card[] {
  return getStarterCards()
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function drawCards(state: GameState, count: number): GameState {
  console.log(`🃏 DRAW CARDS DEBUG - Attempting to draw ${count} cards`)
  console.log('Before drawing:')
  console.log('  - deck size:', state.deck.length)
  console.log('  - hand size:', state.hand.length)
  console.log('  - discard size:', state.discard.length)
  
  let { deck, hand, discard } = state
  const newHand = [...hand]
  let newDeck = [...deck]
  let newDiscard = [...discard]

  for (let i = 0; i < count; i++) {
    console.log(`  Drawing card ${i + 1}/${count}:`)
    console.log(`    - deck size: ${newDeck.length}`)
    console.log(`    - discard size: ${newDiscard.length}`)
    
    if (newDeck.length === 0) {
      console.log('    - Deck empty, shuffling discard...')
      if (newDiscard.length === 0) {
        console.log('    - No cards to shuffle, breaking')
        break
      }
      newDeck = shuffleDeck(newDiscard)
      newDiscard = []
      console.log(`    - Shuffled ${newDeck.length} cards from discard`)
    }
    
    if (newDeck.length > 0) {
      const drawnCard = newDeck.pop()!
      newHand.push(drawnCard)
      console.log(`    - Drew card: ${drawnCard.name}`)
    } else {
      console.log('    - No cards available to draw!')
    }
  }

  console.log('After drawing:')
  console.log('  - deck size:', newDeck.length)
  console.log('  - hand size:', newHand.length)
  console.log('  - discard size:', newDiscard.length)

  return {
    ...state,
    deck: newDeck,
    hand: newHand,
    discard: newDiscard
  }
}

export function canPlayCard(state: GameState, cardId: string): boolean {
  const card = state.hand.find(card => card.id === cardId)
  if (!card) return false
  
  // Apply cost reductions from status effects
  const finalCost = getEffectiveCardCost(card, state.activeStatusEffects)
  
  return state.energy >= finalCost
}

export function selectCardForMasking(state: GameState, targetCardId: string): GameState {
  if (!state.maskingState) {
    // Not in masking mode
    return state
  }

  // Find the target card in hand
  const targetCard = state.hand.find(card => card.id === targetCardId)
  if (!targetCard) {
    // Target card not found
    return state
  }

  if (targetCard.name === 'Masking') {
    // Can't mask another Masking
    return state
  }

  // Check if target card needs animation (Tingle)
  // These cards need special handling - keep card in hand and let store handle animation
  if (targetCard.name === 'Tingle') {
    // Set up state for animation handling, similar to targeting cards
    return {
      ...state,
      selectedCardName: targetCard.name,
      selectedCardId: targetCard.id,
      shouldExhaustLastCard: true // Force the masked card to exhaust
      // maskingState stays active - we'll clear it after execution
      // hand stays - animation flow needs the card
    }
  }

  // Check if the target card requires targeting
  if (requiresTargeting(targetCard.name, targetCard.enhanced)) {
    // Set up pending effect for the masked card
    let effectType: string
    switch (targetCard.name) {
      case 'Spritz':
        effectType = 'scout'
        break
      case 'Scurry':
        effectType = 'quantum'
        break
      case 'Brush':
        effectType = 'brush'
        break
      case 'Sweep':
        effectType = 'sweep'
        break
      case 'Tryst':
        effectType = 'tryst'
        break
      case 'Canary':
        effectType = 'canary'
        break
      case 'Argument':
        effectType = 'argument'
        break
      case 'Horse':
        effectType = 'horse'
        break
      case 'Eavesdropping':
        effectType = 'eavesdropping'
        break
      case 'Emanation':
        effectType = 'emanation'
        break
      case 'Brat':
        effectType = 'brat'
        break
      case 'Snip, Snip':
        effectType = 'snip_snip'
        break
      case 'Fan':
        effectType = 'fan'
        break
      default:
        // Gaze cards and other cards
        if (targetCard.name.startsWith('Gaze')) {
          effectType = 'gaze'
        } else {
          effectType = targetCard.name.toLowerCase().replace(' ', '_')
        }
    }

    // Keep maskingState and DON'T remove card from hand yet
    // The targeting flow will handle removing it after execution
    // IMPORTANT: Set shouldExhaustLastCard to force exhaustion when played via Masking
    return {
      ...state,
      selectedCardName: targetCard.name,
      selectedCardId: targetCard.id,
      pendingCardEffect: { type: effectType as any },
      shouldExhaustLastCard: true // Force the masked card to exhaust
      // maskingState stays - we'll clear it after execution
      // hand stays - targeting flow needs the card
    }
  }

  // Remove the target card from hand for immediate effect cards
  const newHand = state.hand.filter(card => card.id !== targetCardId)

  // Execute immediate effect
  let newState = { ...state, hand: newHand }

  switch (targetCard.name) {
    case 'Tingle':
      // Tingle needs animation - store will handle it
      break
    case 'Imperious Instructions':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'solid_clue' }, targetCard) }
      break
    case 'Vague Instructions':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'stretch_clue' }, targetCard) }
      break
    case 'Sarcastic Instructions':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'sarcastic_orders' }, targetCard) }
      break
    case 'Energized':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'energized' }, targetCard) }
      break
    case 'Options':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'options' }, targetCard) }
      break
    case 'Ramble':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'ramble' }, targetCard) }
      break
    case 'Underwire':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'underwire' }, targetCard) }
      break
    case 'Monster':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'monster' }, targetCard) }
      break
    case 'Tryst':
      // Basic Tryst (not enhanced) - no targeting needed
      newState = { ...newState, ...executeCardEffect(newState, { type: 'tryst', target: undefined }, targetCard) }
      break
    case 'Burger':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'burger' }, targetCard) }
      break
    case 'Ice Cream':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'ice_cream' }, targetCard) }
      break
    case 'Carrots':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'carrots' }, targetCard) }
      break
    case 'Twirl':
      newState = { ...newState, ...executeCardEffect(newState, { type: 'twirl' }, targetCard) }
      break
  }

  // Grant +1 energy if the masked card is energy-reduced
  if (targetCard.energyReduced) {
    newState = {
      ...newState,
      energy: newState.energy + 1
    }
  }

  // Exhaust the target card (always exhausts when played via Masking)
  newState = {
    ...newState,
    exhaust: [...newState.exhaust, targetCard]
  }

  // Handle Masking card exhausting
  if (!state.maskingState.enhanced) {
    // Move Masking from discard to exhaust
    const maskingCard = newState.discard.find(card => card.id === state.maskingState!.maskingCardId)
    if (maskingCard) {
      newState = {
        ...newState,
        discard: newState.discard.filter(card => card.id !== state.maskingState!.maskingCardId),
        exhaust: [...newState.exhaust, maskingCard]
      }
    }
  }

  // Clear masking state
  return {
    ...newState,
    maskingState: null
  }
}

export function selectCardForNap(state: GameState, targetCardId: string): GameState {
  if (!state.napState) {
    // Not in nap mode
    return state
  }

  // Find the target card in exhaust pile
  const targetCard = state.exhaust.find(card => card.id === targetCardId)
  if (!targetCard) {
    // Target card not found in exhaust
    return state
  }

  if (targetCard.name === 'Nap') {
    // Can't nap another Nap
    return state
  }

  // Move target card from exhaust to hand
  const newExhaust = state.exhaust.filter(card => card.id !== targetCardId)
  const newHand = [...state.hand, targetCard]

  // Check if this is a Horse and if Horse discount is active
  const horseDiscountActive = state.activeStatusEffects.some(e => e.type === 'horse_discount')
  const effectiveCost = (targetCard.name === 'Horse' && horseDiscountActive) ? 0 : targetCard.cost

  // If enhanced, gain energy equal to the card's effective cost
  const energyGain = state.napState.enhanced ? effectiveCost : 0
  const newEnergy = state.energy + energyGain

  // Move Nap from discard to exhaust (always exhausts)
  const napCard = state.discard.find(card => card.id === state.napState!.napCardId)
  let newDiscard = state.discard
  let finalExhaust = newExhaust

  if (napCard) {
    newDiscard = state.discard.filter(card => card.id !== state.napState!.napCardId)
    finalExhaust = [...newExhaust, napCard]
  }

  // Clear nap state
  return {
    ...state,
    hand: newHand,
    exhaust: finalExhaust,
    discard: newDiscard,
    energy: newEnergy,
    napState: null,
    selectedCardName: null
  }
}

export function playCard(state: GameState, cardId: string): GameState {
  const cardIndex = state.hand.findIndex(card => card.id === cardId)
  if (cardIndex === -1) return state

  const card = state.hand[cardIndex]
  
  // Apply cost reductions from status effects
  const finalCost = getEffectiveCardCost(card, state.activeStatusEffects)
  
  // Check if we have enough energy
  if (state.energy < finalCost) return state

  // If card requires targeting, set up pending effect
  if (requiresTargeting(card.name, card.enhanced)) {
    // Map card names to their effect types
    let effectType: string
    switch (card.name) {
      case 'Spritz':
        effectType = 'scout'
        break
      case 'Scurry':
        effectType = 'quantum'
        break
      case 'Brush':
        effectType = 'brush'
        break
      case 'Sweep':
        effectType = 'sweep'
        break
      case 'Tryst':
        effectType = 'tryst'
        break
      case 'Canary':
        effectType = 'canary'
        break
      case 'Argument':
        effectType = 'argument'
        break
      case 'Horse':
        effectType = 'horse'
        break
      case 'Eavesdropping':
        effectType = 'eavesdropping'
        break
      case 'Emanation':
        effectType = 'emanation'
        break
      case 'Brat':
        effectType = 'brat'
        break
      case 'Snip, Snip':
        effectType = 'snip_snip'
        break
      case 'Masking':
        effectType = 'masking'
        break
      case 'Fan':
        effectType = 'fan'
        break
      default:
        // Gaze and Fetch cards and other cards
        if (card.name.startsWith('Gaze')) {
          effectType = 'gaze'
        } else if (card.name.startsWith('Fetch')) {
          effectType = 'fetch'
        } else {
          effectType = card.name.toLowerCase().replace(' ', '_')
        }
    }
    
    return {
      ...state,
      selectedCardName: card.name,
      selectedCardId: card.id, // Store ID to find exact card later
      pendingCardEffect: { type: effectType as any }
    }
  }

  // Execute immediate effect cards (except Tingle which needs animation)
  let newState = state
  switch (card.name) {
    case 'Masking':
      // Masking enters card selection mode - don't execute immediately
      // But first check if there are any valid cards in hand to use with Masking
      const handWithoutMasking = state.hand.filter((_, index) => index !== cardIndex)

      // Check if there are any valid cards that can be used with Masking
      // The only invalid card is another Masking
      const hasValidCards = handWithoutMasking.some(c => c.name !== 'Masking')

      // If no valid cards, just exhaust Masking without entering masking mode
      if (!hasValidCards) {
        console.log('🎭 MASKING: No valid cards in hand - exhausting without effect')
        const stateWithoutCard = {
          ...state,
          hand: handWithoutMasking
        }
        const stateAfterEnergy = deductEnergy(stateWithoutCard, card, state.activeStatusEffects, 'playCard (Masking - no targets)')

        // Exhaust Masking immediately
        return {
          ...stateAfterEnergy,
          exhaust: [...stateAfterEnergy.exhaust, card],
          selectedCardName: null,
          isProcessingCard: false
        }
      }

      // Deduct energy for Masking (cost 0 but follow normal flow)
      const stateAfterMasking = deductEnergy(
        {
          ...state,
          hand: handWithoutMasking,
          maskingState: {
            maskingCardId: card.id,
            enhanced: card.enhanced || false
          },
          selectedCardName: card.name
        },
        card,
        state.activeStatusEffects,
        'playCard (Masking)'
      )
      // Put Masking in discard for now (will be moved to exhaust later if not enhanced)
      return {
        ...stateAfterMasking,
        discard: [...stateAfterMasking.discard, card]
      }
    case 'Nap':
      // Nap enters exhaust pile selection mode - don't execute immediately
      // Remove card from hand first
      const handWithoutNap = state.hand.filter((_, index) => index !== cardIndex)
      // Deduct energy for Nap
      const stateAfterNap = deductEnergy(
        {
          ...state,
          hand: handWithoutNap,
          napState: {
            napCardId: card.id,
            enhanced: card.enhanced || false
          },
          selectedCardName: card.name,
          gamePhase: 'viewing_pile',
          pileViewingType: 'exhaust'
        },
        card,
        state.activeStatusEffects,
        'playCard (Nap)'
      )
      // Put Nap in discard for now (will be moved to exhaust later)
      return {
        ...stateAfterNap,
        discard: [...stateAfterNap.discard, card]
      }
    case 'Tingle':
      // Don't execute immediately - let the store handle the animation
      newState = state
      break
    case 'Imperious Instructions':
      newState = executeCardEffect(state, { type: 'solid_clue' }, card)
      break
    case 'Vague Instructions':
      newState = executeCardEffect(state, { type: 'stretch_clue' }, card)
      break
    case 'Sarcastic Instructions':
      newState = executeCardEffect(state, { type: 'sarcastic_orders' }, card)
      break
    case 'Energized':
      newState = executeCardEffect(state, { type: 'energized' }, card)
      break
    case 'Options':
      newState = executeCardEffect(state, { type: 'options' }, card)
      break
    case 'Ramble':
      newState = executeCardEffect(state, { type: 'ramble' }, card)
      break
    case 'Underwire':
      newState = executeCardEffect(state, { type: 'underwire' }, card)
      break
    case 'Monster':
      newState = executeCardEffect(state, { type: 'monster' }, card)
      break
    case 'Tryst':
      // Tryst needs animation - don't execute immediately
      newState = state
      break
    case 'Burger':
      newState = executeCardEffect(state, { type: 'burger' }, card)
      break
    case 'Ice Cream':
      newState = executeCardEffect(state, { type: 'ice_cream' }, card)
      break
    case 'Carrots':
      newState = executeCardEffect(state, { type: 'carrots' }, card)
      break
    case 'Twirl':
      newState = executeCardEffect(state, { type: 'twirl' }, card)
      break
    case 'Donut':
      newState = executeCardEffect(state, { type: 'donut' }, card)
      break
  }

  const newHand = newState.hand.filter((_, index) => index !== cardIndex)
  // Enhanced Energized and enhanced Underwire cards no longer exhaust
  const shouldExhaust = card.exhaust && !(card.name === 'Energized' && card.enhanced) && !(card.name === 'Underwire' && card.enhanced)
  // If card has exhaust, put it in exhaust pile; otherwise put in discard
  const newDiscard = shouldExhaust ? newState.discard : [...newState.discard, card]
  const newExhaust = shouldExhaust ? [...newState.exhaust, card] : newState.exhaust

  // Apply relic-based effects after playing the card
  let finalState = {
    ...newState,
    hand: newHand,
    discard: newDiscard,
    exhaust: newExhaust,
    selectedCardName: card.name
  }

  // Fanfic effect: Draw a card and lose 1 copper when playing Sarcastic Instructions
  if (card.name === 'Sarcastic Instructions' && finalState.relics.some(r => r.name === 'Fanfic')) {
    const stateAfterDraw = drawCards(finalState, 1)
    finalState = {
      ...stateAfterDraw,
      copper: Math.max(0, stateAfterDraw.copper - 1),
      selectedCardName: card.name // Preserve selectedCardName
    }
  }

  // Use current status effects for cost (effects haven't changed yet for immediate cards)
  return deductEnergy(finalState, card, finalState.activeStatusEffects, 'playCard (immediate effect)')
}

export function discardHand(state: GameState): GameState {
  return {
    ...state,
    hand: [],
    discard: [...state.discard, ...state.hand],
    selectedCardName: null,
    pendingCardEffect: null
  }
}

/**
 * Trigger Espresso relic effect: draw 1 card and immediately play it
 * For targeting cards, enters forced targeting mode
 * For special cards (Tingle, Masking, non-enhanced Tryst), leaves in hand for manual play
 */
function triggerEspressoEffect(state: GameState): GameState {
  console.log('☕ ESPRESSO: Drawing and immediately playing a card')
  let finalState = drawCards(state, 1)

  // Get the last card drawn (the one that was just added to hand)
  if (finalState.hand.length > 0) {
    const drawnCard = finalState.hand[finalState.hand.length - 1]
    console.log(`☕ ESPRESSO: Auto-playing ${drawnCard.name}`)

    // Calculate effective cost
    const baseCost = drawnCard.cost
    const energyBonus = drawnCard.energyReduced ? 1 : 0
    const effectiveCost = Math.max(0, baseCost - energyBonus)

    // Check if we have enough energy
    if (finalState.energy >= effectiveCost) {
      // Cards that require special handling (animation or card selection)
      if (drawnCard.name === 'Tingle') {
        console.log(`☕ ESPRESSO: Tingle requires animation - setting up special handling`)
        return {
          ...finalState,
          espressoSpecialCard: {
            cardId: drawnCard.id,
            cardName: drawnCard.name,
            type: 'tingle',
            enhanced: drawnCard.enhanced || false
          }
        }
      }

      if (drawnCard.name === 'Masking') {
        console.log(`☕ ESPRESSO: Masking requires card selection - setting up special handling`)
        return {
          ...finalState,
          espressoSpecialCard: {
            cardId: drawnCard.id,
            cardName: drawnCard.name,
            type: 'masking',
            enhanced: drawnCard.enhanced || false
          }
        }
      }

      if (drawnCard.name === 'Nap') {
        console.log(`☕ ESPRESSO: Nap requires card selection from exhaust - setting up special handling`)
        return {
          ...finalState,
          espressoSpecialCard: {
            cardId: drawnCard.id,
            cardName: drawnCard.name,
            type: 'nap',
            enhanced: drawnCard.enhanced || false
          }
        }
      }

      if (drawnCard.name === 'Tryst' && !drawnCard.enhanced) {
        console.log(`☕ ESPRESSO: Non-enhanced Tryst requires animation - setting up special handling`)
        return {
          ...finalState,
          espressoSpecialCard: {
            cardId: drawnCard.id,
            cardName: drawnCard.name,
            type: 'tryst',
            enhanced: false
          }
        }
      }

      // Check if card requires targeting
      const needsTargeting = requiresTargeting(drawnCard.name, drawnCard.enhanced)

      if (needsTargeting) {
        // For targeting cards, set up special handling to play with forced targeting
        console.log(`☕ ESPRESSO: ${drawnCard.name} requires targeting - setting up forced targeting mode`)
        return {
          ...finalState,
          espressoSpecialCard: {
            cardId: drawnCard.id,
            cardName: drawnCard.name,
            type: 'targeting',
            enhanced: drawnCard.enhanced || false
          },
          espressoForcedPlay: {
            cardId: drawnCard.id,
            energyCost: effectiveCost,
            shouldExhaust: drawnCard.exhaust || false
          }
        }
      } else {
        // For non-targeting cards, play immediately
        // Remove card from hand
        const newHand = finalState.hand.filter(c => c.id !== drawnCard.id)

        // Execute card effect using proper effect type mapping
        const cardEffect = { type: getCardEffectType(drawnCard.name) } as any
        finalState = executeCardEffect(finalState, cardEffect, drawnCard)

        // Deduct energy and update hand
        finalState = {
          ...finalState,
          hand: newHand,
          energy: finalState.energy - effectiveCost
        }

        // Handle exhaust
        if (drawnCard.exhaust) {
          finalState = {
            ...finalState,
            exhaust: [...finalState.exhaust, drawnCard]
          }
        } else {
          finalState = {
            ...finalState,
            discard: [...finalState.discard, drawnCard]
          }
        }

        console.log(`☕ ESPRESSO: Played ${drawnCard.name}, cost ${effectiveCost} energy`)
      }
    } else {
      console.log(`☕ ESPRESSO: Not enough energy to play ${drawnCard.name} (need ${effectiveCost}, have ${finalState.energy})`)
    }
  }

  return finalState
}

export function startNewTurn(state: GameState): GameState {
  console.log('🔄 START NEW TURN DEBUG')
  console.log('  - Current queued card draws:', state.queuedCardDraws)
  console.log('  - Has Caffeinated relic:', hasRelic(state, 'Caffeinated'))

  let currentState = state
  let hasGlasses = false

  // Prepare Glasses relic effect (add Tingle to discard, animation will be triggered by store)
  if (hasRelic(currentState, 'Glasses')) {
    hasGlasses = true
    currentState = prepareGlassesEffect(currentState)
  }

  const discardedState = discardHand(currentState)

  // Draw regular 5 cards (or 4 with Caffeinated relic) plus any queued card draws plus burger bonus
  const baseCardDraw = hasRelic(state, 'Caffeinated') ? 4 : 5
  const burgerEffect = state.activeStatusEffects.find(e => e.type === 'burger')
  const burgerBonus = burgerEffect ? 1 : 0 // Always +1 if Burger effect is active, regardless of stack count
  const totalCardsToDraw = baseCardDraw + state.queuedCardDraws + burgerBonus

  console.log('  - Base card draw:', baseCardDraw)
  console.log('  - Queued card draws:', state.queuedCardDraws)
  console.log('  - Burger bonus:', burgerBonus)
  console.log('  - Total cards to draw:', totalCardsToDraw)

  const drawnState = drawCards(discardedState, totalCardsToDraw)
  
  // Remove ramble status effect at start of new turn
  const stateWithoutRamble = removeStatusEffect(drawnState, 'ramble_active')

  let finalState = {
    ...stateWithoutRamble,
    energy: stateWithoutRamble.maxEnergy,
    rambleActive: false, // Clear ramble effect at start of new turn
    ramblePriorityBoosts: [], // Clear ramble priority boosts
    isFirstTurn: false, // No longer first turn after first turn
    neutralsRevealedThisTurn: 0, // Reset neutral reveal counter
    underwireUsedThisTurn: false, // Reset underwire usage tracking
    horseRevealedNonPlayer: false, // Reset horse turn ending tracking
    fetchRevealedNonPlayer: false, // Reset fetch turn ending tracking
    shouldExhaustLastCard: false, // Reset dynamic exhaust tracking
    queuedCardDraws: 0, // Clear queued card draws
    glassesNeedsTingleAnimation: hasGlasses // Set flag if Glasses relic is active
  }

  // Trigger Espresso effect if present (draw and immediately play a card)
  if (hasRelic(state, 'Espresso')) {
    const espressoState = triggerEspressoEffect(finalState)
    return {
      ...finalState,
      ...espressoState
    }
  }

  return finalState
}

export function createInitialState(
  levelId: string = 'intro',
  persistentDeck?: Card[],
  relics?: import('../types').Relic[],
  copper: number = 0,
  temporaryBunnyBuffs: number = 0,
  playerAnnotationMode?: 'slash' | 'big_checkmark' | 'small_checkmark',
  useDefaultAnnotations?: boolean,
  enabledOwnerPossibilities?: Set<string>,
  currentOwnerPossibilityIndex?: number,
  preservedStatusEffects?: import('../types').StatusEffect[],
  shopVisitCount: number = 0,
  playerTilesRevealedCount: number = 0
): GameState {
  const startingPersistentDeck = persistentDeck || createStartingDeck()
  const startingRelics = relics || []
  const deck = shuffleDeck([...startingPersistentDeck]) // Copy and shuffle persistent deck for in-play use
  const levelConfig = getLevelConfigFromSystem(levelId)
  
  let board
  
  if (levelConfig) {
    // Use level configuration
    board = createBoard(
      levelConfig.dimensions.columns,
      levelConfig.dimensions.rows,
      levelConfig.tileCounts,
      levelConfig.unusedLocations,
      levelConfig.specialTiles,
      levelConfig.specialBehaviors.adjacencyRule || 'standard'
    )
  } else {
    // Fallback to default board
    board = createBoard()
  }
  
  // Handle initial rival reveals if specified in level config
  if (levelConfig?.specialBehaviors.initialRivalReveal) {
    const rivalTiles = Array.from(board.tiles.values()).filter(tile => 
      tile.owner === 'rival' && !tile.revealed
    )
    
    // Randomly select and reveal the specified number of rival tiles
    const tilesToReveal = Math.min(levelConfig.specialBehaviors.initialRivalReveal, rivalTiles.length)
    const shuffledRivalTiles = [...rivalTiles].sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < tilesToReveal; i++) {
      const tile = shuffledRivalTiles[i]
      const position = tile.position
      const revealResult = revealTileWithResult(board, position, 'rival')
      board = revealResult.board
    }
  }
  
  // Determine max energy based on relics
  const maxEnergy = startingRelics.some(relic => relic.name === 'Caffeinated') ? 4 : 3
  
  const initialState: GameState = {
    persistentDeck: startingPersistentDeck,
    deck,
    hand: [],
    discard: [],
    exhaust: [],
    selectedCardName: null,
    selectedCardId: null,
    energy: maxEnergy,
    maxEnergy,
    board,
    currentPlayer: 'player',
    gameStatus: { status: 'playing' },
    pendingCardEffect: null,
    eventQueue: [],
    hoveredClueId: null,
    clueCounter: 0,
    playerClueCounter: 0,
    rivalClueCounter: 0,
    instructionsPlayedThisFloor: new Set(),
    currentLevelId: levelId,
    gamePhase: 'playing',
    relics: startingRelics,
    relicOptions: undefined,
    isFirstTurn: true,
    neutralsRevealedThisTurn: 0,
    rivalHiddenClues: [],
    tingleAnimation: null,
    rivalAnimation: null,
    trystAnimation: null,
    adjacencyPatternAnimation: null,
    pulsingStatusEffectIds: [],
    seenRivalAITypes: new Set<string>(),
    rambleActive: false,
    ramblePriorityBoosts: [],
    copper,
    playerTilesRevealedCount,
    shopOptions: undefined,
    purchasedShopItems: undefined,
    shopVisitCount,
    temporaryBunnyBuffs,
    underwireProtection: null,
    underwireProtectionCount: 0,
    underwireUsedThisTurn: false,
    horseRevealedNonPlayer: false,
    fetchRevealedNonPlayer: false,
    shouldExhaustLastCard: false,
    playerAnnotationMode: playerAnnotationMode || 'slash',
    useDefaultAnnotations: useDefaultAnnotations !== undefined ? useDefaultAnnotations : true,
    enabledOwnerPossibilities: enabledOwnerPossibilities || new Set(['player', 'rival', 'neutral', 'mine']),
    currentOwnerPossibilityIndex: currentOwnerPossibilityIndex || 0,
    activeStatusEffects: preservedStatusEffects || [],
    annotationButtons: {
      player: false, // Start undepressed (no black slash)
      rival: true,   // Start depressed
      neutral: true, // Start depressed
      mine: true     // Start depressed
    },
    isProcessingCard: false,
    queuedCardDraws: 0,
    glassesNeedsTingleAnimation: false,
    rivalMineProtectionCount: levelConfig?.specialBehaviors.rivalMineProtection || 0,
    maskingState: null,
    napState: null
  }
  
  // Draw initial cards (4 with Caffeinated relic, 5 without) plus Burger bonus
  const initialCardDraw = startingRelics.some(relic => relic.name === 'Caffeinated') ? 4 : 5
  const burgerEffect = preservedStatusEffects?.find(e => e.type === 'burger')
  const burgerBonus = burgerEffect ? 1 : 0
  let finalState = drawCards(initialState, initialCardDraw + burgerBonus)

  // Trigger Handbag effect if present (draw 2 additional cards on first turn)
  if (startingRelics.some(relic => relic.name === 'Handbag')) {
    finalState = drawCards(finalState, 2)
  }

  // Trigger Pockets effect if present (draw 1 additional card on first turn)
  if (startingRelics.some(relic => relic.name === 'Pockets')) {
    finalState = drawCards(finalState, 1)
  }

  // Trigger Hyperfocus effect if present (add random cost-0 card to hand)
  finalState = triggerHyperfocusEffect(finalState)

  // Trigger Dust Bunny effect if present
  finalState = triggerDustBunnyEffect(finalState)

  // Trigger Mated Pair effect if present (reveals second player tile)
  finalState = triggerMatedPairEffect(finalState)

  // Trigger Baby Bunny effect if present (reveals third player tile)
  finalState = triggerBabyBunnyEffect(finalState)

  // Trigger Carrots effect if present (reveals player tiles based on stacks)
  const carrotsEffect = finalState.activeStatusEffects.find(e => e.type === 'carrots')
  if (carrotsEffect && carrotsEffect.count) {
    console.log(`🥕 CARROTS EFFECT - Revealing +1 player tile at floor start`)
    const unrevealedPlayerTiles = Array.from(finalState.board.tiles.values()).filter(
      tile => tile.owner === 'player' && !tile.revealed && !tile.specialTiles.includes('extraDirty')
    )

    if (unrevealedPlayerTiles.length > 0) {
      const randomTile = unrevealedPlayerTiles[Math.floor(Math.random() * unrevealedPlayerTiles.length)]
      finalState = revealTileWithRelicEffects(finalState, randomTile.position, 'player', false)
    }
  }

  // Trigger temporary bunny buffs if present
  finalState = triggerTemporaryBunnyBuffs(finalState)
  
  // Trigger Busy Canary effect if present
  finalState = triggerBusyCanaryEffect(finalState)
  
  // Trigger Intercepted Communications effect if present
  finalState = triggerInterceptedNoteEffect(finalState)

  // Trigger Glasses effect if present (prepare Tingle for turn 1)
  if (startingRelics.some(relic => relic.name === 'Glasses')) {
    finalState = prepareGlassesEffect(finalState)
    finalState = { ...finalState, glassesNeedsTingleAnimation: true }
  }

  // Add manhattan adjacency status effect if board uses it
  if (finalState.board.adjacencyRule === 'manhattan-2') {
    finalState = addStatusEffect(finalState, 'manhattan_adjacency')
  }
  
  // Add rival never mines status effect if special behavior is active
  if (levelConfig?.specialBehaviors.rivalNeverMines) {
    finalState = addStatusEffect(finalState, 'rival_never_mines')
  }

  // Add rival mine protection status effect if special behavior is active
  if (levelConfig?.specialBehaviors.rivalMineProtection && levelConfig.specialBehaviors.rivalMineProtection > 0) {
    const protectionStatusEffect = {
      id: crypto.randomUUID(),
      type: 'rival_mine_protection' as const,
      icon: '🪙',
      name: 'Rival Mine Protection',
      description: `The rival can safely reveal ${levelConfig.specialBehaviors.rivalMineProtection} mine${levelConfig.specialBehaviors.rivalMineProtection > 1 ? 's' : ''} (awards 5 copper each)`,
      count: levelConfig.specialBehaviors.rivalMineProtection
    }

    finalState = {
      ...finalState,
      activeStatusEffects: [...finalState.activeStatusEffects, protectionStatusEffect]
    }
  }

  // Add rival places mines status effect if special behavior is active
  if (levelConfig?.specialBehaviors.rivalPlacesMines && levelConfig.specialBehaviors.rivalPlacesMines > 0) {
    const rivalMiningStatusEffect = {
      id: crypto.randomUUID(),
      type: 'rival_places_mines' as const,
      icon: '💣',
      name: 'Rival Mining Alert',
      description: `Rival places ${levelConfig.specialBehaviors.rivalPlacesMines} surface mine${levelConfig.specialBehaviors.rivalPlacesMines > 1 ? 's' : ''} on your tiles after each turn!`,
      count: levelConfig.specialBehaviors.rivalPlacesMines
    }

    finalState = {
      ...finalState,
      activeStatusEffects: [...finalState.activeStatusEffects, rivalMiningStatusEffect]
    }
  }

  // Add Grace status effect at the start of every level
  finalState = addStatusEffect(finalState, 'grace')

  // Add AI type status effect by getting AI info from controller
  if (levelConfig) {
    const currentAI = AIController.getCurrentAI(finalState)

    // Create a custom status effect for this AI type
    const aiStatusEffect = {
      id: crypto.randomUUID(),
      type: 'rival_ai_type' as const,
      icon: currentAI.icon,
      name: currentAI.name,
      description: currentAI.description
    }

    finalState = {
      ...finalState,
      activeStatusEffects: [...finalState.activeStatusEffects, aiStatusEffect]
    }
  }

  // Mark status effects that should pulse at floor start
  // 1. 'rival_never_mines' - always pulse
  // 2. non-standard adjacency rule - always pulse
  // 3. non-default rival AI - pulse only first time it appears
  const statusEffectsToPulse: string[] = []

  // Check for rival never mines effect
  const rivalNeverMinesEffect = finalState.activeStatusEffects.find(e => e.type === 'rival_never_mines')
  if (rivalNeverMinesEffect) {
    statusEffectsToPulse.push(rivalNeverMinesEffect.id)
  }

  // Check for non-standard adjacency rule
  const adjacencyRule = finalState.board.adjacencyRule || 'standard'
  if (adjacencyRule !== 'standard') {
    const adjacencyEffect = finalState.activeStatusEffects.find(e => e.type === 'manhattan_adjacency')
    if (adjacencyEffect) {
      statusEffectsToPulse.push(adjacencyEffect.id)
    }
  }

  // Check for non-default rival AI (only first floor it appears)
  const rivalAIEffect = finalState.activeStatusEffects.find(e =>
    e.type === 'rival_ai_type' && e.name !== 'NoGuess Rival'
  )
  if (rivalAIEffect) {
    // Check if this AI type has been seen before by looking for a flag in state
    // We'll use a new field: seenRivalAITypes (Set of AI names that have been pulsed)
    const seenAITypes = finalState.seenRivalAITypes || new Set<string>()
    if (!seenAITypes.has(rivalAIEffect.name)) {
      statusEffectsToPulse.push(rivalAIEffect.id)
      // Mark this AI type as seen
      finalState = {
        ...finalState,
        seenRivalAITypes: new Set([...seenAITypes, rivalAIEffect.name])
      }
    }
  }

  finalState = {
    ...finalState,
    pulsingStatusEffectIds: statusEffectsToPulse
  }

  // Trigger Espresso effect if present (draw and immediately play a card)
  if (startingRelics.some(relic => relic.name === 'Espresso')) {
    finalState = triggerEspressoEffect(finalState)
  }

  return finalState
}

export function startCardSelection(state: GameState): GameState {
  // Get the current level number for upgrade determination
  const levelConfig = getLevelConfigFromSystem(state.currentLevelId)
  const levelNumber = levelConfig?.levelNumber || 1

  const cardOptions = createNewLevelCards(levelNumber)
  return {
    ...state,
    gamePhase: 'card_selection',
    cardSelectionOptions: cardOptions
  }
}

export function selectNewCard(state: GameState, selectedCard: Card): GameState {
  const nextLevelId = getNextLevelId(state.currentLevelId)
  
  if (!nextLevelId) {
    // No next level - game won!
    return {
      ...state,
      gamePhase: 'playing',
      gameStatus: { status: 'player_won', reason: 'all_player_tiles_revealed' }
    }
  }
  
  // Add the selected card to the persistent deck (respecting DIY Gel)
  const newPersistentDeck = addCardToPersistentDeck(state, selectedCard)

  // Return state with updated persistent deck but don't advance level yet
  // Level advancement will happen after upgrades (if any) are applied
  return {
    ...state,
    persistentDeck: newPersistentDeck,
    gamePhase: 'playing', // This will be overridden if upgrades are pending
    cardSelectionOptions: undefined,
    waitingForCardRemoval: false, // Clear any lingering card removal flags
    bootsTransformMode: false // Clear Boots transformation mode
  }
}

export function advanceToNextLevel(state: GameState): GameState {
  const nextLevelId = getNextLevelId(state.currentLevelId)

  if (!nextLevelId) {
    // No next level - game won!
    return {
      ...state,
      gamePhase: 'playing',
      gameStatus: { status: 'player_won', reason: 'all_player_tiles_revealed' }
    }
  }

  // Check for Evidence cards in deck, hand, and discard (not exhaust) and deduct 2 copper each
  const evidenceCards = [...state.deck, ...state.hand, ...state.discard].filter(card => card.name === 'Evidence')
  const copperPenalty = evidenceCards.length * 2
  const copperAfterPenalty = Math.max(0, state.copper - copperPenalty)

  if (copperPenalty > 0) {
    console.log(`🔍 EVIDENCE PENALTY: Found ${evidenceCards.length} Evidence cards, losing ${copperPenalty} copper (${state.copper} -> ${copperAfterPenalty})`)
  }

  // Decrement Burger stacks when advancing to next floor
  let stateWithDecrementedEffects = decrementBurgerStacks(state)

  // Decrement Ice Cream stacks when advancing to next floor
  stateWithDecrementedEffects = decrementIceCreamStacks(stateWithDecrementedEffects)

  // Decrement Carrots stacks when advancing to next floor
  stateWithDecrementedEffects = decrementCarrotsStacks(stateWithDecrementedEffects)

  // Extract status effects to pass to createInitialState so turn 1 benefits from them
  const burgerEffect = stateWithDecrementedEffects.activeStatusEffects.find(e => e.type === 'burger')
  const iceCreamEffect = stateWithDecrementedEffects.activeStatusEffects.find(e => e.type === 'ice_cream')
  const carrotsEffect = stateWithDecrementedEffects.activeStatusEffects.find(e => e.type === 'carrots')

  // Collect all persistent status effects
  const persistentEffects = [burgerEffect, iceCreamEffect, carrotsEffect].filter((e): e is StatusEffect => e !== undefined)

  const newLevelState = createInitialState(
    nextLevelId,
    state.persistentDeck,
    state.relics,
    copperAfterPenalty,
    state.temporaryBunnyBuffs,
    state.playerAnnotationMode,
    state.useDefaultAnnotations,
    state.enabledOwnerPossibilities,
    state.currentOwnerPossibilityIndex,
    persistentEffects.length > 0 ? persistentEffects : undefined,
    state.shopVisitCount, // Preserve shop visit count across levels
    state.playerTilesRevealedCount // Preserve player tile reveal counter across levels
  )

  return newLevelState
}

export function skipCardSelection(state: GameState): GameState {
  const nextLevelId = getNextLevelId(state.currentLevelId)
  
  if (!nextLevelId) {
    // No next level - game won!
    return {
      ...state,
      gamePhase: 'playing',
      gameStatus: { status: 'player_won', reason: 'all_player_tiles_revealed' }
    }
  }
  
  // Return state without advancing level yet
  // Level advancement will happen after upgrades (if any) are applied
  return {
    ...state,
    gamePhase: 'playing', // This will be overridden if upgrades are pending
    cardSelectionOptions: undefined,
    waitingForCardRemoval: false, // Clear any lingering card removal flags
    bootsTransformMode: false // Clear Boots transformation mode
  }
}

export function getAllCardsInCollection(state: GameState): Card[] {
  // Return all cards the player owns (persistent deck)
  return [...state.persistentDeck]
}

// Queue card draws for dirt cleaning when revealing dirty tiles (for Mop relic)
export function queueCardDrawsFromDirtCleaning(state: GameState, tilesCleanedCount: number): GameState {
  console.log('🧽 QUEUE CARD DRAWS DEBUG')
  console.log('  - Has Mop relic:', hasRelic(state, 'Mop'))
  console.log('  - Tiles cleaned count:', tilesCleanedCount)
  console.log('  - Current queued draws:', state.queuedCardDraws)
  
  if (!hasRelic(state, 'Mop') || tilesCleanedCount <= 0) {
    console.log('  - Not queueing cards (no relic or no tiles cleaned)')
    return state
  }
  
  const newQueuedDraws = state.queuedCardDraws + tilesCleanedCount
  console.log(`  - Queueing ${tilesCleanedCount} additional card draws (total: ${newQueuedDraws})`)
  
  // Queue cards to be drawn at start of next turn
  return {
    ...state,
    queuedCardDraws: newQueuedDraws
  }
}

// Cleanup masking state after a masked card's effect is executed
export function cleanupMaskingAfterExecution(state: GameState): GameState {
  if (!state.maskingState) {
    // Not in masking mode
    return state
  }

  // Find the masked card (should be in exhaust already from selectCardForMasking)
  // But for targeting cards, we need to exhaust it now

  // Find the card that was just executed
  const executedCard = state.hand.find(card => card.id === state.selectedCardId) ||
                       state.discard.find(card => card.id === state.selectedCardId) ||
                       state.exhaust.find(card => card.id === state.selectedCardId)

  let newState = state

  // If the executed card is still in hand or discard, move it to exhaust
  if (executedCard) {
    // Grant +1 energy if the masked card is energy-reduced
    if (executedCard.energyReduced) {
      newState = {
        ...newState,
        energy: newState.energy + 1
      }
    }

    newState = {
      ...newState,
      hand: newState.hand.filter(card => card.id !== state.selectedCardId),
      discard: newState.discard.filter(card => card.id !== state.selectedCardId),
      exhaust: newState.exhaust.some(card => card.id === state.selectedCardId)
        ? newState.exhaust
        : [...newState.exhaust, executedCard]
    }
  }

  // Handle Masking card exhausting if not enhanced
  if (!state.maskingState.enhanced) {
    // Move Masking from discard to exhaust
    const maskingCard = newState.discard.find(card => card.id === state.maskingState!.maskingCardId)
    if (maskingCard) {
      newState = {
        ...newState,
        discard: newState.discard.filter(card => card.id !== state.maskingState!.maskingCardId),
        exhaust: [...newState.exhaust, maskingCard]
      }
    }
  }

  // Clear masking state
  return {
    ...newState,
    maskingState: null
  }
}