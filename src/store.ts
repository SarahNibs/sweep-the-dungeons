import { create } from 'zustand'
import { GameState } from './types'
import { createInitialState, playCard, startNewTurn, canPlayCard } from './game/cardSystem'

interface GameStore extends GameState {
  playCard: (cardId: string) => void
  endTurn: () => void
  resetGame: () => void
  canPlayCard: (cardId: string) => boolean
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),
  
  playCard: (cardId: string) => {
    const currentState = get()
    const newState = playCard(currentState, cardId)
    set(newState)
  },
  
  endTurn: () => {
    const currentState = get()
    const newTurnState = startNewTurn(currentState)
    set(newTurnState)
  },
  
  resetGame: () => {
    set(createInitialState())
  },

  canPlayCard: (cardId: string) => {
    const currentState = get()
    return canPlayCard(currentState, cardId)
  }
}))