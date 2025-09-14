import { create } from 'zustand'
import { GameState, Tile, Position, CardEffect, Board } from './types'
import { createInitialState, playCard, startNewTurn, canPlayCard as canPlayCardUtil } from './game/cardSystem'
import { revealTile, performEnemyTurn, shouldEndPlayerTurn, positionToKey } from './game/boardSystem'
import { executeCardEffect, getTargetingInfo } from './game/cardEffects'

interface GameStore extends GameState {
  playCard: (cardId: string) => void
  endTurn: () => void
  performTurnEnd: (board: Board) => void
  resetGame: () => void
  canPlayCard: (cardId: string) => boolean
  revealTile: (tile: Tile) => void
  targetTileForCard: (position: Position) => void
  cancelCardTargeting: () => void
  getTargetingInfo: () => { count: number; description: string; selected: Position[] } | null
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
    
    if (currentState.currentPlayer !== 'player') {
      return
    }
    
    // Use shared turn ending logic
    get().performTurnEnd(currentState.board)
  },
  
  performTurnEnd: (board: Board) => {
    const currentState = get()
    
    // End player turn and start enemy turn
    const enemyBoard = performEnemyTurn(board)
    const newTurnState = startNewTurn({
      ...currentState,
      board: enemyBoard
    })
    
    set({
      ...newTurnState,
      currentPlayer: 'player'
    })
  },
  
  resetGame: () => {
    set(createInitialState())
  },

  canPlayCard: (cardId: string) => {
    const currentState = get()
    return canPlayCardUtil(currentState, cardId)
  },

  revealTile: (tile: Tile) => {
    const currentState = get()
    
    // Handle card targeting
    if (currentState.pendingCardEffect) {
      get().targetTileForCard(tile.position)
      return
    }
    
    // Only allow tile revealing during player turn
    if (currentState.currentPlayer !== 'player') {
      return
    }
    
    const newBoard = revealTile(currentState.board, tile.position, 'player')
    const endTurn = shouldEndPlayerTurn(tile)
    
    if (endTurn) {
      // End player turn and start enemy turn immediately using shared logic
      get().performTurnEnd(newBoard)
    } else {
      set({
        ...currentState,
        board: newBoard
      })
    }
  },

  targetTileForCard: (position: Position) => {
    const currentState = get()
    if (!currentState.pendingCardEffect) return
    
    const tile = currentState.board.tiles.get(positionToKey(position))
    if (!tile || tile.revealed) return
    
    const effect = currentState.pendingCardEffect
    let newEffect: CardEffect | null = null
    let shouldExecute = false
    
    if (effect.type === 'scout') {
      newEffect = { type: 'scout', target: position }
      shouldExecute = true
    } else if (effect.type === 'quantum') {
      if ('target' in effect) {
        // Second target for quantum
        newEffect = { type: 'quantum', targets: [(effect as any).target, position] }
        shouldExecute = true
      } else {
        // First target for quantum
        newEffect = { type: 'quantum', target: position } as any
      }
    }
    
    if (shouldExecute && newEffect) {
      // Execute the effect and complete the card play
      const effectState = executeCardEffect(currentState, newEffect)
      
      // Remove the card from hand and add to discard
      const cardName = currentState.selectedCardName!
      const card = currentState.hand.find(c => c.name === cardName)!
      const newHand = currentState.hand.filter(c => c.id !== card.id)
      const newDiscard = [...effectState.discard, card]
      
      set({
        ...effectState,
        hand: newHand,
        discard: newDiscard,
        energy: effectState.energy - card.cost,
        pendingCardEffect: null
      })
    } else if (newEffect) {
      set({
        ...currentState,
        pendingCardEffect: newEffect
      })
    }
  },

  cancelCardTargeting: () => {
    const currentState = get()
    set({
      ...currentState,
      pendingCardEffect: null,
      selectedCardName: null
    })
  },

  getTargetingInfo: () => {
    const currentState = get()
    if (!currentState.pendingCardEffect || !currentState.selectedCardName) return null
    
    const info = getTargetingInfo(currentState.selectedCardName)
    if (!info) return null
    
    const selected: Position[] = []
    const effect = currentState.pendingCardEffect
    
    if (effect.type === 'quantum' && 'target' in effect) {
      selected.push((effect as any).target)
    }
    
    return {
      count: info.count,
      description: info.description,
      selected
    }
  }
}))