import { Card, GameState } from '../types'
import { createBoard } from './boardSystem'
import { executeCardEffect, requiresTargeting } from './cardeffects'
import { getLevelConfig as getLevelConfigFromSystem, getNextLevelId } from './levelSystem'

export function createCard(name: string, cost: number, exhaust?: boolean): Card {
  return {
    id: crypto.randomUUID(),
    name,
    cost,
    exhaust
  }
}

export function createNewLevelCards(): Card[] {
  const availableCards = [
    createCard('Energized', 1, true), // Exhaust card - gain 2 energy
    createCard('Options', 1),         // Draw 3 cards
    createCard('Brush', 1),           // 3x3 area exclusion effect
    createCard('Ramble', 1)           // Disrupts enemy guaranteed pulls
  ]
  
  // Randomly select 3 different cards
  const shuffled = [...availableCards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled.slice(0, 3)
}

export function createStartingDeck(): Card[] {
  return [
    createCard('Imperious Orders', 2),
    createCard('Imperious Orders', 2),
    createCard('Vague Orders', 2),
    createCard('Spritz', 1),
    createCard('Spritz', 1),
    createCard('Spritz', 1),
    createCard('Spritz', 1),
    createCard('Tingle', 1),
    createCard('Tingle', 1),
    createCard('Easiest', 1)
  ]
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
  let { deck, hand, discard } = state
  const newHand = [...hand]
  let newDeck = [...deck]
  let newDiscard = [...discard]

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) {
      if (newDiscard.length === 0) break
      newDeck = shuffleDeck(newDiscard)
      newDiscard = []
    }
    
    if (newDeck.length > 0) {
      const drawnCard = newDeck.pop()!
      newHand.push(drawnCard)
    }
  }

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
  return state.energy >= card.cost
}

export function playCard(state: GameState, cardId: string): GameState {
  const cardIndex = state.hand.findIndex(card => card.id === cardId)
  if (cardIndex === -1) return state

  const card = state.hand[cardIndex]
  
  // Check if we have enough energy
  if (state.energy < card.cost) return state

  // If card requires targeting, set up pending effect
  if (requiresTargeting(card.name)) {
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
      default:
        effectType = card.name.toLowerCase().replace(' ', '_')
    }
    
    return {
      ...state,
      selectedCardName: card.name,
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
      newState = executeCardEffect(state, { type: 'solid_clue' })
      break
    case 'Vague Orders':
      newState = executeCardEffect(state, { type: 'stretch_clue' })
      break
    case 'Energized':
      newState = executeCardEffect(state, { type: 'energized' })
      break
    case 'Options':
      newState = executeCardEffect(state, { type: 'options' })
      break
    case 'Ramble':
      newState = executeCardEffect(state, { type: 'ramble' })
      break
  }

  const newHand = newState.hand.filter((_, index) => index !== cardIndex)
  // If card has exhaust, put it in exhaust pile; otherwise put in discard
  const newDiscard = card.exhaust ? newState.discard : [...newState.discard, card]
  const newExhaust = card.exhaust ? [...newState.exhaust, card] : newState.exhaust

  return {
    ...newState,
    hand: newHand,
    discard: newDiscard,
    exhaust: newExhaust,
    selectedCardName: card.name,
    energy: newState.energy - card.cost
  }
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
  const discardedState = discardHand(state)
  const drawnState = drawCards(discardedState, 5)
  
  return {
    ...drawnState,
    energy: drawnState.maxEnergy,
    rambleActive: false // Clear ramble effect at start of new turn
  }
}

export function createInitialState(levelId: string = 'intro', persistentDeck?: Card[]): GameState {
  const startingPersistentDeck = persistentDeck || createStartingDeck()
  const deck = shuffleDeck([...startingPersistentDeck]) // Copy and shuffle persistent deck for in-play use
  const levelConfig = getLevelConfigFromSystem(levelId)
  
  let board
  
  if (levelConfig) {
    // Use level configuration
    board = createBoard(
      levelConfig.dimensions.columns,
      levelConfig.dimensions.rows,
      levelConfig.tileCounts,
      levelConfig.unusedLocations
    )
  } else {
    // Fallback to default board
    board = createBoard()
  }
  
  const initialState: GameState = {
    persistentDeck: startingPersistentDeck,
    deck,
    hand: [],
    discard: [],
    exhaust: [],
    selectedCardName: null,
    energy: 3,
    maxEnergy: 3,
    board,
    currentPlayer: 'player',
    gameStatus: { status: 'playing' },
    pendingCardEffect: null,
    eventQueue: [],
    hoveredClueId: null,
    clueCounter: 0,
    playerClueCounter: 0,
    enemyClueCounter: 0,
    currentLevelId: levelId,
    gamePhase: 'playing',
    enemyHiddenClues: [],
    tingleAnimation: null,
    enemyAnimation: null,
    rambleActive: false
  }
  
  return drawCards(initialState, 5)
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
  const newLevelState = createInitialState(nextLevelId, newPersistentDeck)
  
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
  
  // Keep the persistent deck without adding any cards
  const newLevelState = createInitialState(nextLevelId, state.persistentDeck)
  
  return newLevelState
}

export function getAllCardsInCollection(state: GameState): Card[] {
  // Return all cards the player owns (persistent deck)
  return [...state.persistentDeck]
}