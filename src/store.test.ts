import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './store'
import { act, renderHook } from '@testing-library/react'

describe('Game Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useGameStore())
    act(() => {
      result.current.resetGame()
    })
  })

  it('initializes with correct starting state', () => {
    const { result } = renderHook(() => useGameStore())
    
    expect(result.current.hand).toHaveLength(5)
    expect(result.current.deck).toHaveLength(5)
    expect(result.current.discard).toHaveLength(0)
    expect(result.current.selectedCardName).toBeNull()
    expect(result.current.energy).toBe(3)
    expect(result.current.maxEnergy).toBe(3)
  })

  it('plays a card correctly', () => {
    const { result } = renderHook(() => useGameStore())
    
    // Find a non-targeting card (Report, Solid Clue, or Stretch Clue)
    const cardToPlay = result.current.hand.find(card => 
      ['Report', 'Solid Clue', 'Stretch Clue'].includes(card.name)
    ) || result.current.hand[0] // Fallback to first card
    
    const originalEnergy = result.current.energy
    
    act(() => {
      result.current.playCard(cardToPlay.id)
    })
    
    // If it's a targeting card, it won't be discarded immediately
    if (['Scout', 'Quantum'].includes(cardToPlay.name)) {
      expect(result.current.hand).toHaveLength(5) // Still in hand
      expect(result.current.discard).toHaveLength(0)
      expect(result.current.pendingCardEffect).toBeTruthy()
    } else {
      expect(result.current.hand).toHaveLength(4)
      expect(result.current.discard).toHaveLength(1)
      expect(result.current.energy).toBe(originalEnergy - cardToPlay.cost)
    }
    
    expect(result.current.selectedCardName).toBe(cardToPlay.name)
  })

  it('ends turn correctly', () => {
    const { result } = renderHook(() => useGameStore())
    
    // Play a card first
    const cardToPlay = result.current.hand[0]
    act(() => {
      result.current.playCard(cardToPlay.id)
    })
    
    // End turn
    act(() => {
      result.current.endTurn()
    })
    
    expect(result.current.hand).toHaveLength(5)
    expect(result.current.selectedCardName).toBeNull()
    expect(result.current.discard).toHaveLength(5) // 1 played + 4 remaining hand cards
    expect(result.current.energy).toBe(result.current.maxEnergy) // Energy refreshed
  })

  it('reshuffles when deck is empty', () => {
    const { result } = renderHook(() => useGameStore())
    
    // Play all cards in hand
    act(() => {
      result.current.hand.forEach(card => {
        result.current.playCard(card.id)
      })
    })
    
    // End turn - should discard remaining hand and draw 5
    act(() => {
      result.current.endTurn()
    })
    
    // End turn again - deck should be empty, discard should reshuffle
    act(() => {
      result.current.endTurn()
    })
    
    expect(result.current.hand).toHaveLength(5)
    expect(result.current.deck.length + result.current.discard.length).toBe(5)
  })

  it('resets game to initial state', () => {
    const { result } = renderHook(() => useGameStore())
    
    // Make some changes
    act(() => {
      result.current.playCard(result.current.hand[0].id)
    })
    
    // Reset
    act(() => {
      result.current.resetGame()
    })
    
    expect(result.current.hand).toHaveLength(5)
    expect(result.current.deck).toHaveLength(5)
    expect(result.current.discard).toHaveLength(0)
    expect(result.current.selectedCardName).toBeNull()
    expect(result.current.energy).toBe(3)
    expect(result.current.maxEnergy).toBe(3)
  })

  it('validates card playability with energy', () => {
    const { result } = renderHook(() => useGameStore())
    
    // Find a card we can play
    const playableCard = result.current.hand.find(card => 
      result.current.canPlayCard(card.id)
    )
    expect(playableCard).toBeDefined()
    
    // Record initial state
    const initialEnergy = result.current.energy
    
    // Spend all energy efficiently
    act(() => {
      result.current.hand.forEach(card => {
        if (result.current.canPlayCard(card.id)) {
          result.current.playCard(card.id)
        }
      })
    })
    
    // Should have spent some energy
    expect(result.current.energy).toBeLessThan(initialEnergy)
    
    // No remaining cards should exceed current energy
    const remainingPlayableCards = result.current.hand.filter(card => 
      result.current.canPlayCard(card.id)
    )
    remainingPlayableCards.forEach(card => {
      expect(card.cost).toBeLessThanOrEqual(result.current.energy)
    })
  })

  it('prevents playing cards without enough energy', () => {
    const { result } = renderHook(() => useGameStore())
    
    // Find the most expensive card
    const expensiveCard = result.current.hand.reduce((prev, current) => 
      current.cost > prev.cost ? current : prev
    )
    
    // Spend energy to below the card's cost
    act(() => {
      result.current.hand.forEach(card => {
        if (result.current.canPlayCard(card.id) && card.id !== expensiveCard.id) {
          result.current.playCard(card.id)
        }
      })
    })
    
    // Try to play the expensive card when we don't have enough energy
    const energyBefore = result.current.energy
    const handSizeBefore = result.current.hand.length
    
    act(() => {
      result.current.playCard(expensiveCard.id)
    })
    
    // If we don't have enough energy, nothing should change
    if (energyBefore < expensiveCard.cost) {
      expect(result.current.energy).toBe(energyBefore)
      expect(result.current.hand).toHaveLength(handSizeBefore)
    }
  })
})