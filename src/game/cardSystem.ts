import { Card, GameState, LevelConfig } from '../types'
import { createBoard, revealTile } from './boardSystem'
import { executeCardEffect, requiresTargeting } from './cardeffects'

export function getLevelConfig(level: number): LevelConfig {
  switch (level) {
    case 1:
      return {
        level: 1,
        revealEnemyTileAtStart: false
      }
    case 2:
      return {
        level: 2,
        revealEnemyTileAtStart: true
      }
    default:
      // For levels 3+, we'll apply level 2 rules for now
      return {
        level,
        revealEnemyTileAtStart: true
      }
  }
}

export function createCard(name: string, cost: number, exhaust?: boolean): Card {
  return {
    id: crypto.randomUUID(),
    name,
    cost,
    exhaust
  }
}

export function createNewLevelCards(): Card[] {
  return [
    createCard('Energized', 1, true), // Exhaust card - gain 2 energy
    createCard('Options', 1),         // Draw 3 cards
    createCard('Brush', 1)            // 3x3 area exclusion effect
  ]
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
    return {
      ...state,
      selectedCardName: card.name,
      pendingCardEffect: { type: card.name.toLowerCase().replace(' ', '_') as any }
    }
  }

  // Execute immediate effect cards
  let newState = state
  switch (card.name) {
    case 'Tingle':
      newState = executeCardEffect(state, { type: 'report' })
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
  }

  const newHand = newState.hand.filter((_, index) => index !== cardIndex)
  // If card has exhaust, don't put it in discard (it's removed from game)
  const newDiscard = card.exhaust ? newState.discard : [...newState.discard, card]

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
    selectedCardName: null,
    pendingCardEffect: null
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

export function createInitialState(level: number = 1): GameState {
  const deck = shuffleDeck(createStartingDeck())
  const levelConfig = getLevelConfig(level)
  
  let board = createBoard()
  
  // Apply level-specific modifications
  if (levelConfig.revealEnemyTileAtStart) {
    // Find all enemy tiles and reveal one at random
    const enemyTiles = Array.from(board.tiles.values()).filter(tile => tile.owner === 'enemy')
    if (enemyTiles.length > 0) {
      const randomEnemyTile = enemyTiles[Math.floor(Math.random() * enemyTiles.length)]
      board = revealTile(board, randomEnemyTile.position, 'enemy')
    }
  }
  
  const initialState: GameState = {
    deck,
    hand: [],
    discard: [],
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
    currentLevel: level,
    gamePhase: 'playing',
    enemyAnimation: null
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
  const nextLevel = state.currentLevel + 1
  const newLevelState = createInitialState(nextLevel)
  
  // Add the selected card to the new deck
  return {
    ...newLevelState,
    deck: [...newLevelState.deck, selectedCard]
  }
}