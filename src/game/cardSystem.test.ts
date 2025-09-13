import { describe, it, expect, beforeEach } from 'vitest'
import { 
  createCard, 
  createStartingDeck, 
  shuffleDeck, 
  drawCards, 
  playCard, 
  discardHand, 
  createInitialState,
  canPlayCard,
  startNewTurn
} from './cardSystem'
import { GameState } from '../types'

describe('Card System', () => {
  describe('createCard', () => {
    it('creates a card with correct properties', () => {
      const card = createCard('Test Card', 2)
      expect(card.name).toBe('Test Card')
      expect(card.cost).toBe(2)
      expect(card.id).toBeDefined()
      expect(typeof card.id).toBe('string')
    })

    it('creates cards with unique IDs', () => {
      const card1 = createCard('Card 1', 1)
      const card2 = createCard('Card 2', 1)
      expect(card1.id).not.toBe(card2.id)
    })
  })

  describe('createStartingDeck', () => {
    it('creates a deck with 10 cards', () => {
      const deck = createStartingDeck()
      expect(deck).toHaveLength(10)
    })

    it('contains expected card types', () => {
      const deck = createStartingDeck()
      const cardNames = deck.map(card => card.name)
      
      expect(cardNames.filter(name => name === 'Scout')).toHaveLength(2)
      expect(cardNames.filter(name => name === 'Major Clue')).toHaveLength(2)
      expect(cardNames.filter(name => name === 'Elimination')).toHaveLength(2)
      expect(cardNames.filter(name => name === 'Quantum Choice')).toHaveLength(2)
      expect(cardNames.filter(name => name === 'Insight')).toHaveLength(1)
      expect(cardNames.filter(name => name === 'Focus')).toHaveLength(1)
    })
  })

  describe('shuffleDeck', () => {
    it('returns a deck with same length', () => {
      const originalDeck = createStartingDeck()
      const shuffledDeck = shuffleDeck(originalDeck)
      expect(shuffledDeck).toHaveLength(originalDeck.length)
    })

    it('contains same cards', () => {
      const originalDeck = createStartingDeck()
      const shuffledDeck = shuffleDeck(originalDeck)
      
      originalDeck.forEach(card => {
        expect(shuffledDeck.find(c => c.id === card.id)).toBeDefined()
      })
    })

    it('does not modify original deck', () => {
      const originalDeck = createStartingDeck()
      const originalOrder = [...originalDeck]
      shuffleDeck(originalDeck)
      expect(originalDeck).toEqual(originalOrder)
    })
  })

  describe('drawCards', () => {
    let gameState: GameState

    beforeEach(() => {
      const deck = [
        createCard('Card 1', 1),
        createCard('Card 2', 1),
        createCard('Card 3', 1)
      ]
      gameState = {
        deck,
        hand: [],
        discard: [],
        selectedCardName: null,
        energy: 3,
        maxEnergy: 3
      }
    })

    it('draws cards from deck to hand', () => {
      const newState = drawCards(gameState, 2)
      expect(newState.hand).toHaveLength(2)
      expect(newState.deck).toHaveLength(1)
    })

    it('does not draw more cards than available', () => {
      const newState = drawCards(gameState, 5)
      expect(newState.hand).toHaveLength(3)
      expect(newState.deck).toHaveLength(0)
    })

    it('reshuffles discard when deck is empty', () => {
      const stateWithEmptyDeck: GameState = {
        deck: [],
        hand: [],
        discard: [createCard('Discard 1', 1), createCard('Discard 2', 1)],
        selectedCardName: null,
        energy: 3,
        maxEnergy: 3
      }

      const newState = drawCards(stateWithEmptyDeck, 1)
      expect(newState.hand).toHaveLength(1)
      expect(newState.discard).toHaveLength(0)
      expect(newState.deck).toHaveLength(1)
    })
  })

  describe('playCard', () => {
    let gameState: GameState

    beforeEach(() => {
      const handCards = [
        createCard('Hand Card 1', 1),
        createCard('Hand Card 2', 2)
      ]
      gameState = {
        deck: [],
        hand: handCards,
        discard: [],
        selectedCardName: null,
        energy: 3,
        maxEnergy: 3
      }
    })

    it('moves card from hand to discard', () => {
      const cardToPlay = gameState.hand[0]
      const newState = playCard(gameState, cardToPlay.id)
      
      expect(newState.hand).toHaveLength(1)
      expect(newState.discard).toHaveLength(1)
      expect(newState.discard[0]).toBe(cardToPlay)
    })

    it('sets selected card name', () => {
      const cardToPlay = gameState.hand[0]
      const newState = playCard(gameState, cardToPlay.id)
      
      expect(newState.selectedCardName).toBe(cardToPlay.name)
    })

    it('does nothing for invalid card ID', () => {
      const newState = playCard(gameState, 'invalid-id')
      expect(newState).toBe(gameState)
    })
  })

  describe('discardHand', () => {
    it('moves all hand cards to discard', () => {
      const handCards = [
        createCard('Hand Card 1', 1),
        createCard('Hand Card 2', 2)
      ]
      const gameState: GameState = {
        deck: [],
        hand: handCards,
        discard: [],
        selectedCardName: 'Some Card',
        energy: 3,
        maxEnergy: 3
      }

      const newState = discardHand(gameState)
      expect(newState.hand).toHaveLength(0)
      expect(newState.discard).toHaveLength(2)
      expect(newState.selectedCardName).toBeNull()
    })
  })

  describe('canPlayCard', () => {
    let gameState: GameState

    beforeEach(() => {
      const handCards = [
        createCard('Cheap Card', 1),
        createCard('Expensive Card', 3)
      ]
      gameState = {
        deck: [],
        hand: handCards,
        discard: [],
        selectedCardName: null,
        energy: 2,
        maxEnergy: 3
      }
    })

    it('returns true when enough energy', () => {
      const cheapCard = gameState.hand[0]
      expect(canPlayCard(gameState, cheapCard.id)).toBe(true)
    })

    it('returns false when not enough energy', () => {
      const expensiveCard = gameState.hand[1]
      expect(canPlayCard(gameState, expensiveCard.id)).toBe(false)
    })

    it('returns false for non-existent card', () => {
      expect(canPlayCard(gameState, 'invalid-id')).toBe(false)
    })
  })

  describe('playCard with energy', () => {
    let gameState: GameState

    beforeEach(() => {
      const handCards = [
        createCard('Card 1', 1),
        createCard('Card 2', 2)
      ]
      gameState = {
        deck: [],
        hand: handCards,
        discard: [],
        selectedCardName: null,
        energy: 2,
        maxEnergy: 3
      }
    })

    it('deducts energy when playing card', () => {
      const cardToPlay = gameState.hand[0] // Cost 1
      const newState = playCard(gameState, cardToPlay.id)
      
      expect(newState.energy).toBe(1) // 2 - 1 = 1
      expect(newState.hand).toHaveLength(1)
      expect(newState.discard).toHaveLength(1)
    })

    it('does not play card when insufficient energy', () => {
      const costlyCard = createCard('Very Expensive', 3)
      gameState.hand.push(costlyCard)

      const newState = playCard(gameState, costlyCard.id)
      
      // State should be unchanged
      expect(newState).toBe(gameState)
      expect(newState.energy).toBe(2)
      expect(newState.hand).toHaveLength(3)
    })

    it('can play card with exact energy cost', () => {
      const exactCostCard = gameState.hand[1] // Cost 2, we have 2 energy
      const newState = playCard(gameState, exactCostCard.id)
      
      expect(newState.energy).toBe(0) // 2 - 2 = 0
      expect(newState.hand).toHaveLength(1)
      expect(newState.discard).toHaveLength(1)
    })
  })

  describe('startNewTurn', () => {
    it('refreshes energy to max', () => {
      const gameState: GameState = {
        deck: [createCard('Deck Card', 1)],
        hand: [createCard('Hand Card', 1)],
        discard: [],
        selectedCardName: 'Some Card',
        energy: 0, // Empty energy
        maxEnergy: 3
      }

      const newState = startNewTurn(gameState)
      
      expect(newState.energy).toBe(3) // Refreshed to max
      expect(newState.hand).toHaveLength(2) // Drew from deck (1) + reshuffled discard (1), total 2
      expect(newState.selectedCardName).toBeNull()
    })

    it('discards current hand and draws new cards', () => {
      const deckCards = Array.from({length: 7}, (_, i) => createCard(`Deck Card ${i}`, 1))
      const handCards = [createCard('Hand Card 1', 1), createCard('Hand Card 2', 2)]
      
      const gameState: GameState = {
        deck: deckCards,
        hand: handCards,
        discard: [],
        selectedCardName: null,
        energy: 1,
        maxEnergy: 3
      }

      const newState = startNewTurn(gameState)
      
      expect(newState.energy).toBe(3)
      expect(newState.hand).toHaveLength(5) // Drew 5 new cards
      expect(newState.discard).toHaveLength(2) // Previous hand discarded
      expect(newState.deck).toHaveLength(2) // 7 - 5 drawn = 2 remaining
    })
  })

  describe('createInitialState', () => {
    it('creates state with 5 cards in hand', () => {
      const state = createInitialState()
      expect(state.hand).toHaveLength(5)
    })

    it('creates state with 5 cards in deck', () => {
      const state = createInitialState()
      expect(state.deck).toHaveLength(5)
    })

    it('starts with empty discard', () => {
      const state = createInitialState()
      expect(state.discard).toHaveLength(0)
    })

    it('starts with no selected card', () => {
      const state = createInitialState()
      expect(state.selectedCardName).toBeNull()
    })

    it('starts with correct energy values', () => {
      const state = createInitialState()
      expect(state.energy).toBe(3)
      expect(state.maxEnergy).toBe(3)
    })
  })
})