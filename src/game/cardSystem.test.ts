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
  startNewTurn,
  startCardSelection,
  selectNewCard,
  createNewLevelCards
} from './cardSystem'
import { GameState } from '../types'
import { createBoard } from './boardSystem'
import { executeSolidClueEffect, executeStretchClueEffect } from './cardeffects'

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
      
      expect(cardNames.filter(name => name === 'Spritz')).toHaveLength(4)
      expect(cardNames.filter(name => name === 'Imperious Orders')).toHaveLength(2)
      expect(cardNames.filter(name => name === 'Vague Orders')).toHaveLength(1)
      expect(cardNames.filter(name => name === 'Tingle')).toHaveLength(2)
      expect(cardNames.filter(name => name === 'Easiest')).toHaveLength(1)
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
        maxEnergy: 3,
        board: createBoard(),
        currentPlayer: 'player',
        pendingCardEffect: null,
        eventQueue: [],
        hoveredClueId: null,
        clueCounter: 0
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
        maxEnergy: 3,
        board: createBoard(),
        currentPlayer: 'player',
        pendingCardEffect: null,
        eventQueue: [],
        hoveredClueId: null,
        clueCounter: 0
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
        maxEnergy: 3,
        board: createBoard(),
        currentPlayer: 'player',
        pendingCardEffect: null,
        eventQueue: [],
        hoveredClueId: null,
        clueCounter: 0
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
        maxEnergy: 3,
        board: createBoard(),
        currentPlayer: 'player',
        pendingCardEffect: null,
        eventQueue: [],
        hoveredClueId: null,
        clueCounter: 0
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
        maxEnergy: 3,
        board: createBoard(),
        currentPlayer: 'player',
        pendingCardEffect: null,
        eventQueue: [],
        hoveredClueId: null,
        clueCounter: 0
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
        maxEnergy: 3,
        board: createBoard(),
        currentPlayer: 'player',
        pendingCardEffect: null,
        eventQueue: [],
        hoveredClueId: null,
        clueCounter: 0
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
        maxEnergy: 3,
        board: createBoard(),
        currentPlayer: 'player',
        pendingCardEffect: null,
        eventQueue: [],
        hoveredClueId: null,
        clueCounter: 0
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
        maxEnergy: 3,
        board: createBoard(),
        currentPlayer: 'player',
        pendingCardEffect: null,
        eventQueue: [],
        hoveredClueId: null,
        clueCounter: 0
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

  describe('Clue Effect Improvements', () => {
    let gameState: GameState

    beforeEach(() => {
      // Create a standard test board
      const board = createBoard(6, 5)
      
      gameState = {
        deck: [],
        hand: [],
        discard: [],
        selectedCardName: null,
        energy: 3,
        maxEnergy: 3,
        board,
        currentPlayer: 'player',
        pendingCardEffect: null,
        eventQueue: [],
        clueCounter: 0,
        hoveredClueId: null
      }
    })

    it('allows random tiles to include any unrevealed tiles (including other player tiles)', () => {
      // Execute clue effect
      const newState = executeSolidClueEffect(gameState)
      
      // Find all tiles with clue annotations
      const tilesWithClues = Array.from(newState.board.tiles.values())
        .filter(tile => tile.annotations.some(a => a.type === 'clue_results'))
      
      expect(tilesWithClues.length).toBeGreaterThan(0)
      
      // Check that some tiles got clue results (verifying the parameterized system works)
      const clueAnnotations = tilesWithClues.map(tile => 
        tile.annotations.find(a => a.type === 'clue_results')
      )
      
      expect(clueAnnotations.every(annotation => annotation !== undefined)).toBe(true)
      expect(newState.clueCounter).toBe(1)
    })

    it('uses parameterized system for both clue types', () => {
      // Test Imperious Orders (formerly Solid Clue)
      const solidState = executeSolidClueEffect(gameState)
      const solidTilesWithClues = Array.from(solidState.board.tiles.values())
        .filter(tile => tile.annotations.some(a => a.type === 'clue_results'))
      
      // Test Vague Orders (formerly Stretch Clue)  
      const stretchState = executeStretchClueEffect(gameState)
      const stretchTilesWithClues = Array.from(stretchState.board.tiles.values())
        .filter(tile => tile.annotations.some(a => a.type === 'clue_results'))
      
      // Both should produce clue results
      expect(solidTilesWithClues.length).toBeGreaterThan(0)
      expect(stretchTilesWithClues.length).toBeGreaterThan(0)
      
      // Both should increment clue counter
      expect(solidState.clueCounter).toBe(1)
      expect(stretchState.clueCounter).toBe(1)
    })

    it('produces different tile selections across multiple runs (tests randomization)', () => {
      // Run solid clue multiple times and collect which tiles get clue results
      const tileSelections: string[][] = []
      
      for (let run = 0; run < 5; run++) {
        const state = executeSolidClueEffect(gameState)
        const tilesWithClues = Array.from(state.board.tiles.values())
          .filter(tile => tile.annotations.some(a => a.type === 'clue_results'))
          .map(tile => `${tile.position.x},${tile.position.y}`)
          .sort()
        tileSelections.push(tilesWithClues)
      }
      
      // Check that we don't get identical selections every time (randomization working)
      const uniqueSelections = new Set(tileSelections.map(selection => JSON.stringify(selection)))
      
      // With proper randomization, we should get at least 2 different selections in 5 runs
      // (This is probabilistic but very likely with random selection)
      expect(uniqueSelections.size).toBeGreaterThan(1)
    })
  })

  describe('Level System', () => {
    it('starts at intro level by default', () => {
      const state = createInitialState()
      expect(state.currentLevelId).toBe('intro')
    })

    it('can create state at specific level', () => {
      const state = createInitialState('firstMine')
      expect(state.currentLevelId).toBe('firstMine')
    })

    it('intro level does not reveal enemy tiles at start', () => {
      const state = createInitialState('intro')
      const revealedTiles = Array.from(state.board.tiles.values()).filter(tile => tile.revealed)
      expect(revealedTiles.length).toBe(0)
    })

    it('intro level has no mines', () => {
      const state = createInitialState('intro')
      const mineTiles = Array.from(state.board.tiles.values()).filter(tile => tile.owner === 'mine')
      expect(mineTiles.length).toBe(0)
    })

    it('advances to card selection correctly', () => {
      const state1 = createInitialState('intro')
      const cardSelectionState = startCardSelection(state1)
      
      expect(cardSelectionState.gamePhase).toBe('card_selection')
      expect(cardSelectionState.cardSelectionOptions).toBeDefined()
      expect(cardSelectionState.cardSelectionOptions?.length).toBe(3)
    })

    it('selects new card and advances level correctly', () => {
      const state1 = createInitialState('intro')
      const cardOptions = createNewLevelCards()
      const selectedCard = cardOptions[0] // Energized
      const state2 = selectNewCard(state1, selectedCard)
      
      expect(state2.currentLevelId).toBe('firstMine')
      expect(state2.energy).toBe(3) // Fresh energy
      expect(state2.hand.length).toBe(5) // Fresh hand
      expect(state2.gameStatus.status).toBe('playing') // Reset game status
      expect(state2.gamePhase).toBe('playing') // Back to playing phase
      
      // FirstMine level should have 1 mine tile
      const mineTiles = Array.from(state2.board.tiles.values()).filter(tile => tile.owner === 'mine')
      expect(mineTiles.length).toBe(1)
      
      // Should have selected card in persistent deck
      expect(state2.persistentDeck.some(card => card.name === selectedCard.name)).toBe(true)
    })

    it('creates new level cards correctly', () => {
      const cards = createNewLevelCards()
      
      expect(cards.length).toBe(3)
      
      // Check that we get 3 different cards from the available pool
      const cardNames = cards.map(c => c.name)
      const uniqueNames = new Set(cardNames)
      expect(uniqueNames.size).toBe(3) // All cards should be different
      
      // Check that all cards come from the expected set
      const validNames = ['Energized', 'Options', 'Brush', 'Ramble']
      cardNames.forEach(name => {
        expect(validNames).toContain(name)
      })
      
      // Check card properties
      cards.forEach(card => {
        expect(card.cost).toBe(1)
        if (card.name === 'Energized') {
          expect(card.exhaust).toBe(true)
        }
      })
    })
  })
})