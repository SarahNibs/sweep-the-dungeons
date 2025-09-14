import { Card, GameState } from '../types'
import { createBoard } from './boardSystem'
import { executeCardEffect, requiresTargeting } from './cardEffects'

export function createCard(name: string, cost: number): Card {
  return {
    id: crypto.randomUUID(),
    name,
    cost
  }
}

export function createStartingDeck(): Card[] {
  return [
    createCard('Solid Clue', 2),
    createCard('Solid Clue', 2),
    createCard('Stretch Clue', 2),
    createCard('Scout', 1),
    createCard('Scout', 1),
    createCard('Scout', 1),
    createCard('Scout', 1),
    createCard('Report', 1),
    createCard('Report', 1),
    createCard('Quantum', 1)
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
    return {
      ...state,
      selectedCardName: card.name,
      pendingCardEffect: { type: card.name.toLowerCase().replace(' ', '_') as any }
    }
  }

  // Execute immediate effect cards
  let newState = state
  switch (card.name) {
    case 'Report':
      newState = executeCardEffect(state, { type: 'report' })
      break
    case 'Solid Clue':
      newState = executeCardEffect(state, { type: 'solid_clue' })
      break
    case 'Stretch Clue':
      newState = executeCardEffect(state, { type: 'stretch_clue' })
      break
  }

  const newHand = newState.hand.filter((_, index) => index !== cardIndex)
  const newDiscard = [...newState.discard, card]

  return {
    ...newState,
    hand: newHand,
    discard: newDiscard,
    selectedCardName: card.name,
    energy: newState.energy - card.cost
  }
}

export function discardHand(state: GameState): GameState {
  return {
    ...state,
    hand: [],
    discard: [...state.discard, ...state.hand],
    selectedCardName: null
  }
}

export function startNewTurn(state: GameState): GameState {
  const discardedState = discardHand(state)
  const drawnState = drawCards(discardedState, 5)
  
  return {
    ...drawnState,
    energy: drawnState.maxEnergy
  }
}

export function createInitialState(): GameState {
  const deck = shuffleDeck(createStartingDeck())
  const initialState: GameState = {
    deck,
    hand: [],
    discard: [],
    selectedCardName: null,
    energy: 3,
    maxEnergy: 3,
    board: createBoard(),
    currentPlayer: 'player',
    pendingCardEffect: null,
    eventQueue: [],
    hoveredClueId: null,
    clueCounter: 0
  }
  
  return drawCards(initialState, 5)
}