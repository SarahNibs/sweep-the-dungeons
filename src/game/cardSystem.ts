import { Card, GameState } from '../types'
import { createBoard, revealTileWithResult } from './boardSystem'
import { executeCardEffect, requiresTargeting } from './cardEffects'
import { getLevelConfig as getLevelConfigFromSystem, getNextLevelId } from './levelSystem'
import { triggerDustBunnyEffect, triggerTemporaryBunnyBuffs, triggerBusyCanaryEffect, triggerInterceptedNoteEffect, hasRelic } from './relicSystem'
import { AIController } from './ai/AIController'

import { createCard as createCardFromRepository, getRewardCardPool, getStarterCards, removeStatusEffect, addStatusEffect } from './gameRepository'

export function createCard(name: string, upgrades?: { costReduced?: boolean; enhanced?: boolean }): Card {
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
  const newEnergy = state.energy - cost

  if (newEnergy < 0) {
    console.error(`❌ ENERGY BUG DETECTED in ${context}:`)
    console.error(`  - Current energy: ${state.energy}`)
    console.error(`  - Card cost: ${cost}`)
    console.error(`  - Card name: ${card.name}`)
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

export function createNewLevelCards(): Card[] {
  const availableCards = getRewardCardPool()
  
  // Randomly select 3 different cards
  const shuffled = [...availableCards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled.slice(0, 3)
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
      case 'Easiest':
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
      default:
        effectType = card.name.toLowerCase().replace(' ', '_')
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
    case 'Tingle':
      // Don't execute immediately - let the store handle the animation
      newState = state
      break
    case 'Imperious Orders':
      newState = executeCardEffect(state, { type: 'solid_clue' }, card)
      break
    case 'Vague Orders':
      newState = executeCardEffect(state, { type: 'stretch_clue' }, card)
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
  }

  const newHand = newState.hand.filter((_, index) => index !== cardIndex)
  // Enhanced Energized cards no longer exhaust
  const shouldExhaust = card.exhaust && !(card.name === 'Energized' && card.enhanced)
  // If card has exhaust, put it in exhaust pile; otherwise put in discard
  const newDiscard = shouldExhaust ? newState.discard : [...newState.discard, card]
  const newExhaust = shouldExhaust ? [...newState.exhaust, card] : newState.exhaust

  // Deduct energy safely
  const stateWithoutEnergy = {
    ...newState,
    hand: newHand,
    discard: newDiscard,
    exhaust: newExhaust,
    selectedCardName: card.name
  }

  // Use current status effects for cost (effects haven't changed yet for immediate cards)
  return deductEnergy(stateWithoutEnergy, card, stateWithoutEnergy.activeStatusEffects, 'playCard (immediate effect)')
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

export function startNewTurn(state: GameState): GameState {
  console.log('🔄 START NEW TURN DEBUG')
  console.log('  - Current queued card draws:', state.queuedCardDraws)
  console.log('  - Has Caffeinated relic:', hasRelic(state, 'Caffeinated'))

  const discardedState = discardHand(state)

  // Draw regular 5 cards (or 4 with Caffeinated relic) plus any queued card draws
  const baseCardDraw = hasRelic(state, 'Caffeinated') ? 4 : 5
  const totalCardsToDraw = baseCardDraw + state.queuedCardDraws
  
  console.log('  - Base card draw:', baseCardDraw)
  console.log('  - Queued card draws:', state.queuedCardDraws)
  console.log('  - Total cards to draw:', totalCardsToDraw)
  
  const drawnState = drawCards(discardedState, totalCardsToDraw)
  
  // Remove ramble status effect at start of new turn
  const stateWithoutRamble = removeStatusEffect(drawnState, 'ramble_active')
  
  return {
    ...stateWithoutRamble,
    energy: stateWithoutRamble.maxEnergy,
    rambleActive: false, // Clear ramble effect at start of new turn
    ramblePriorityBoosts: [], // Clear ramble priority boosts
    isFirstTurn: false, // No longer first turn after first turn
    hasRevealedNeutralThisTurn: false, // Reset neutral reveal tracking
    underwireUsedThisTurn: false, // Reset underwire usage tracking
    horseRevealedNonPlayer: false, // Reset horse turn ending tracking
    shouldExhaustLastCard: false, // Reset dynamic exhaust tracking
    queuedCardDraws: 0 // Clear queued card draws
  }
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
  currentOwnerPossibilityIndex?: number
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
    currentLevelId: levelId,
    gamePhase: 'playing',
    relics: startingRelics,
    relicOptions: undefined,
    isFirstTurn: true,
    hasRevealedNeutralThisTurn: false,
    rivalHiddenClues: [],
    tingleAnimation: null,
    rivalAnimation: null,
    trystAnimation: null,
    rambleActive: false,
    ramblePriorityBoosts: [],
    copper,
    shopOptions: undefined,
    purchasedShopItems: undefined,
    temporaryBunnyBuffs,
    underwireProtection: null,
    underwireUsedThisTurn: false,
    horseRevealedNonPlayer: false,
    shouldExhaustLastCard: false,
    playerAnnotationMode: playerAnnotationMode || 'slash',
    useDefaultAnnotations: useDefaultAnnotations !== undefined ? useDefaultAnnotations : true,
    enabledOwnerPossibilities: enabledOwnerPossibilities || new Set(['player', 'rival', 'neutral', 'mine']),
    currentOwnerPossibilityIndex: currentOwnerPossibilityIndex || 0,
    activeStatusEffects: [],
    annotationButtons: {
      player: false, // Start undepressed (no black slash)
      rival: true,   // Start depressed
      neutral: true, // Start depressed  
      mine: true     // Start depressed
    },
    queuedCardDraws: 0
  }
  
  // Draw initial cards (4 with Caffeinated relic, 5 without)
  const initialCardDraw = startingRelics.some(relic => relic.name === 'Caffeinated') ? 4 : 5
  let finalState = drawCards(initialState, initialCardDraw)
  
  // Trigger Dust Bunny effect if present
  finalState = triggerDustBunnyEffect(finalState)
  
  // Trigger temporary bunny buffs if present
  finalState = triggerTemporaryBunnyBuffs(finalState)
  
  // Trigger Busy Canary effect if present
  finalState = triggerBusyCanaryEffect(finalState)
  
  // Trigger Intercepted Communications effect if present
  finalState = triggerInterceptedNoteEffect(finalState)
  
  // Add manhattan adjacency status effect if board uses it
  if (finalState.board.adjacencyRule === 'manhattan-2') {
    finalState = addStatusEffect(finalState, 'manhattan_adjacency')
  }
  
  // Add rival never mines status effect if special behavior is active
  if (levelConfig?.specialBehaviors.rivalNeverMines) {
    finalState = addStatusEffect(finalState, 'rival_never_mines')
  }

  // Add AI type status effect by getting AI info from controller
  if (levelConfig) {
    const aiController = new AIController()
    const currentAI = aiController.getCurrentAI(finalState)

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

  return finalState
}

export function startCardSelection(state: GameState): GameState {
  const cardOptions = createNewLevelCards()
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
  
  // Add the selected card to the persistent deck
  const newPersistentDeck = [...state.persistentDeck, selectedCard]
  
  // Return state with updated persistent deck but don't advance level yet
  // Level advancement will happen after upgrades (if any) are applied
  return {
    ...state,
    persistentDeck: newPersistentDeck,
    gamePhase: 'playing', // This will be overridden if upgrades are pending
    cardSelectionOptions: undefined
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
  
  const newLevelState = createInitialState(
    nextLevelId, 
    state.persistentDeck, 
    state.relics, 
    state.copper, 
    state.temporaryBunnyBuffs, 
    state.playerAnnotationMode,
    state.useDefaultAnnotations,
    state.enabledOwnerPossibilities,
    state.currentOwnerPossibilityIndex
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
    cardSelectionOptions: undefined
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