import { create } from 'zustand'
import { GameState, Tile } from './types'
import { createInitialState, playCard, startNewTurn, canPlayCard } from './game/cardSystem'
import { revealTile } from './game/boardSystem'

interface GameStore extends GameState {
  playCard: (cardId: string) => void
  endTurn: () => void
  resetGame: () => void
  canPlayCard: (cardId: string) => boolean
  revealTile: (tile: Tile) => void
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
  },

  revealTile: (tile: Tile) => {
    const currentState = get()
    const newBoard = revealTile(currentState.board, tile.position, 'player')
    
    set({
      ...currentState,
      board: newBoard
    })
  }
}))