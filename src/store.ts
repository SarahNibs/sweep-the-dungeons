import { create } from 'zustand'
import { GameState, Tile, Position, CardEffect, Board, Card as CardType, PileType, Relic } from './types'
import { createInitialState, playCard, startNewTurn, canPlayCard as canPlayCardUtil, discardHand, startCardSelection, selectNewCard, skipCardSelection, getAllCardsInCollection, advanceToNextLevel, queueCardDrawsFromDirtCleaning, deductEnergy } from './game/cardSystem'
import { startUpgradeSelection, applyUpgrade } from './game/upgradeSystem'
import { startRelicSelection, selectRelic, closeRelicUpgradeDisplay } from './game/relicSystem'
import { revealTile, revealTileWithResult, shouldEndPlayerTurn, positionToKey, spawnGoblinsFromLairs, getTile } from './game/boardSystem'
import { executeCardEffect, getTargetingInfo, checkGameStatus, getUnrevealedTilesByOwner, revealTileWithRelicEffects } from './game/cardEffects'
import { executeTargetedReportEffect } from './game/cards/report'
import { AIController } from './game/ai/AIController'
import { shouldShowCardReward, shouldShowUpgradeReward, shouldShowRelicReward, shouldShowShopReward, calculateCopperReward } from './game/levelSystem'
import { startShopSelection, purchaseShopItem, removeSelectedCard, exitShop } from './game/shopSystem'
import { canDirectRevealTile, canTargetTile } from './game/targetingSystem'

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
  setHoveredClueId: (clueId: string | null) => void
  startRivalTurn: (board: Board) => void
  performNextRivalReveal: () => void
  togglePlayerSlash: (position: Position) => void
  setPlayerAnnotationMode: (mode: 'slash' | 'big_checkmark' | 'small_checkmark') => void
  togglePlayerAnnotation: (position: Position) => void
  setUseDefaultAnnotations: (useDefault: boolean) => void
  toggleOwnerPossibility: (ownerCombo: string) => void
  cyclePlayerOwnerAnnotation: (position: Position) => void
  toggleAnnotationButton: (buttonType: 'player' | 'rival' | 'neutral' | 'mine') => void
  toggleFilteredAnnotation: (position: Position) => void
  startCardSelection: () => void
  selectNewCard: (card: CardType) => void
  skipCardSelection: () => void
  startUpgradeSelection: () => void
  selectUpgrade: (option: import('./types').UpgradeOption, selectedCardId?: string) => void
  selectCardForRemoval: (cardId: string) => void
  getAllCardsInCollection: () => CardType[]
  executeTingleWithAnimation: (state: GameState, isEnhanced: boolean) => void
  executeTrystWithAnimation: (state: GameState, isEnhanced: boolean, target?: Position) => void
  performNextTrystReveal: () => void
  viewPile: (pileType: PileType) => void
  closePileView: () => void
  debugWinLevel: () => void
  debugGiveRelic: (relicName: string) => void
  debugGiveCard: (cardName: string, upgrades?: { costReduced?: boolean; enhanced?: boolean }) => void
  debugSetAIType: (aiType: string) => void
  debugSkipToLevel: (levelId: string) => void
  startRelicSelection: () => void
  selectRelic: (relic: Relic) => void
  closeRelicUpgradeDisplay: () => void
  startShopSelection: () => void
  purchaseShopItem: (optionIndex: number) => void
  removeSelectedCard: (cardId: string) => void
  exitShop: () => void
}

/**
 * Check if a card needs special animation handling instead of immediate execution
 */
function needsAnimationOnPlay(card: CardType): 'tingle' | 'tryst' | null {
  if (card.name === 'Tingle') return 'tingle'
  if (card.name === 'Tryst' && !card.enhanced) return 'tryst'
  return null
}

/**
 * Helper to remove card from hand and deduct energy for animated cards
 * Returns state with card moved to discard/exhaust and energy deducted
 */
function removeCardAndDeductEnergy(
  state: GameState,
  card: CardType
): GameState {
  const stateBeforeEnergy = {
    ...state,
    hand: state.hand.filter(c => c.id !== card.id),
    discard: [...state.discard, card],
    pendingCardEffect: null,
    selectedCardName: null,
    selectedCardId: null
  }
  // Use status effects from before card was played
  return deductEnergy(stateBeforeEnergy, card, state.activeStatusEffects, 'removeCardAndDeductEnergy (animated card)')
}

/**
 * Check if a targeting card needs animation handling
 */
function needsAnimationOnTarget(cardName: string): boolean {
  return cardName === 'Tryst'
}

// Helper function to update state and award copper if game was just won
const updateStateWithCopperReward = (set: any, get: any, newState: GameState) => {
  console.log('🏪 UPDATE STATE WITH COPPER REWARD DEBUG')
  console.log('  - Input state underwireProtection:', newState.underwireProtection)
  console.log('  - Input state activeStatusEffects:', newState.activeStatusEffects.map(e => ({ type: e.type, id: e.id })))
  console.log('  - Input state hand size:', newState.hand.length)
  console.log('  - Input state deck size:', newState.deck.length)
  
  const previousState = get()
  const wasPlaying = previousState.gameStatus.status === 'playing'
  const isNowWon = newState.gameStatus.status === 'player_won'
  
  let finalState
  if (wasPlaying && isNowWon) {
    // Player just won - award copper immediately
    const copperReward = calculateCopperReward(newState)
    finalState = {
      ...newState,
      copper: newState.copper + copperReward
    }
    console.log('  - Added copper reward, setting state with copper')
  } else {
    finalState = newState
    console.log('  - No copper reward, setting state as-is')
  }
  
  console.log('  - Final state underwireProtection:', finalState.underwireProtection)
  console.log('  - Final state activeStatusEffects:', finalState.activeStatusEffects.map(e => ({ type: e.type, id: e.id })))
  console.log('  - Final state hand size:', finalState.hand.length)
  console.log('  - Final state deck size:', finalState.deck.length)
  
  set(finalState)
  
  console.log('🏪 STATE SET COMPLETE')
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),
  
  playCard: (cardId: string) => {
    const currentState = get()
    if (currentState.gameStatus.status !== 'playing') return

    const card = currentState.hand.find(c => c.id === cardId)
    if (!card) return

    const animationType = needsAnimationOnPlay(card)

    if (animationType === 'tingle') {
      const basicState = playCard(currentState, cardId)
      get().executeTingleWithAnimation(basicState, card.enhanced || false)
    } else if (animationType === 'tryst') {
      const basicState = playCard(currentState, cardId)
      get().executeTrystWithAnimation(basicState, false, undefined)
    } else {
      // Normal card execution (includes enhanced Tryst which uses targeting)
      const newState = playCard(currentState, cardId)
      set(newState)
    }
  },
  
  endTurn: () => {
    const currentState = get()
    
    if (currentState.gameStatus.status !== 'playing' || currentState.currentPlayer !== 'player') {
      return
    }
    
    // Check if we're in a test environment
    const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    
    if (isTestEnvironment) {
      // In tests, just do a simple turn transition without rival animation
      const discardedState = discardHand(currentState)
      const newTurnState = startNewTurn(discardedState)
      set({
        ...newTurnState,
        currentPlayer: 'player'
      })
      return
    }
    
    // Use shared turn ending logic
    get().performTurnEnd(currentState.board)
  },
  
  performTurnEnd: (board: Board) => {
    const currentState = get()
    // Discard hand immediately when player's turn ends
    const discardedState = discardHand({
      ...currentState,
      board
    })
    // Update state with discarded hand, then start rival turn
    set(discardedState)
    get().startRivalTurn(discardedState.board)
  },
  
  resetGame: () => {
    set(createInitialState('intro'))
  },

  canPlayCard: (cardId: string) => {
    const currentState = get()
    return canPlayCardUtil(currentState, cardId)
  },

  revealTile: (tile: Tile) => {
    const currentState = get()

    // Don't allow tile reveals if game is over
    if (currentState.gameStatus.status !== 'playing') {
      return
    }

    // Handle card targeting
    if (currentState.pendingCardEffect) {
      get().targetTileForCard(tile.position)
      return
    }

    // Only allow tile revealing during player turn
    if (currentState.currentPlayer !== 'player') {
      return
    }

    // Validate direct reveal (no card effect)
    const validation = canDirectRevealTile(tile)
    if (!validation.isValid) {
      return
    }

    const revealResult = revealTileWithResult(currentState.board, tile.position, 'player')
    
    // For extraDirty tiles that were cleaned but not revealed, always end turn
    let shouldEndTurn = !revealResult.revealed || shouldEndPlayerTurn(tile)
    
    // Use shared reveal function that includes relic effects
    let stateWithBoard = revealTileWithRelicEffects(currentState, tile.position, 'player')
    
    // Add hover state clearing
    stateWithBoard = {
      ...stateWithBoard,
      hoveredClueId: null // Clear hover state when tile is revealed to fix pip hover bug
    }
    
    // Check for Frilly Dress effect to override turn ending
    if (revealResult.revealed && stateWithBoard.hasRevealedNeutralThisTurn) {
      // Override the endTurn flag - don't end turn on first neutral reveal on first turn
      shouldEndTurn = false
    }
    
    // Check for Underwire effect - basic Underwire ends turn when protection is used
    if (stateWithBoard.underwireUsedThisTurn) {
      shouldEndTurn = true
    }
    
    if (stateWithBoard.gameStatus.status !== 'playing') {
      // Game ended, update state with potential copper reward
      updateStateWithCopperReward(set, get, stateWithBoard)
    } else if (shouldEndTurn) {
      console.log('🔄 SHOULD END TURN - Passing full stateWithBoard instead of just board')
      console.log('  - stateWithBoard underwireProtection:', stateWithBoard.underwireProtection)
      console.log('  - stateWithBoard activeStatusEffects:', stateWithBoard.activeStatusEffects.map(e => ({ type: e.type, id: e.id })))
      console.log('  - stateWithBoard hand size:', stateWithBoard.hand.length)
      
      // BUGFIX: Pass the full state instead of just the board to preserve status effects and card changes
      const discardedState = discardHand(stateWithBoard)
      set(discardedState)
      get().startRivalTurn(discardedState.board)
    } else {
      // Always use the copper reward helper to ensure consistency
      updateStateWithCopperReward(set, get, stateWithBoard)
    }
  },

  targetTileForCard: (position: Position) => {
    const currentState = get()
    if (!currentState.pendingCardEffect) return
    if (!currentState.selectedCardId) return
    if (currentState.currentPlayer !== 'player') return

    const tile = getTile(currentState.board, position)

    // Get card to check if it's enhanced
    const card = currentState.hand.find(c => c.id === currentState.selectedCardId)
    if (!card) {
      set({
        ...currentState,
        pendingCardEffect: null,
        selectedCardName: null,
        selectedCardId: null
      })
      return
    }

    // Validate targeting using the targeting system
    const validation = canTargetTile(
      tile,
      currentState.selectedCardName,
      currentState.board,
      position,
      card.enhanced || false
    )

    if (!validation.isValid) {
      // Invalid target, do nothing
      return
    }
    
    const effect = currentState.pendingCardEffect
    let newEffect: CardEffect | null = null
    let shouldExecute = false
    
    if (effect.type === 'scout') {
      newEffect = { type: 'scout', target: position }
      shouldExecute = true
    } else if (effect.type === 'quantum') {
      if ('targets' in effect) {
        // Add another target to existing targets
        const newTargets = [...effect.targets, position]
        const maxTargets = card.enhanced ? 3 : 2
        
        if (newTargets.length >= maxTargets) {
          // Have enough targets, execute the effect
          newEffect = { type: 'quantum', targets: newTargets }
          shouldExecute = true
        } else {
          // Need more targets
          newEffect = { type: 'quantum', targets: newTargets }
        }
      } else {
        // First target for quantum
        newEffect = { type: 'quantum', targets: [position] }
      }
    } else if (effect.type === 'brush') {
      newEffect = { type: 'brush', target: position }
      shouldExecute = true
    } else if (effect.type === 'sweep') {
      newEffect = { type: 'sweep', target: position }
      shouldExecute = true
    } else if (effect.type === 'canary') {
      newEffect = { type: 'canary', target: position }
      shouldExecute = true
    } else if (effect.type === 'argument') {
      newEffect = { type: 'argument', target: position }
      shouldExecute = true
    } else if (effect.type === 'horse') {
      newEffect = { type: 'horse', target: position }
      shouldExecute = true
    } else if (effect.type === 'eavesdropping') {
      newEffect = { type: 'eavesdropping', target: position }
      shouldExecute = true
    } else if (effect.type === 'emanation') {
      newEffect = { type: 'emanation', target: position }
      shouldExecute = true
    } else if (effect.type === 'tryst') {
      newEffect = { type: 'tryst', target: position }
      shouldExecute = true
    }

    if (shouldExecute && newEffect) {
      // Check if this card needs animation handling
      if (needsAnimationOnTarget(card.name)) {
        // Handle animated targeting cards (currently just Tryst)
        const stateAfterCardRemoval = removeCardAndDeductEnergy(currentState, card)
        get().executeTrystWithAnimation(stateAfterCardRemoval, card.enhanced || false, position)
        return
      }

      // Execute the effect with the card for enhanced effects
      let effectState = executeCardEffect(currentState, newEffect, card)
      
      // BUGFIX: Remove card from the hand AFTER card effects (which may have drawn cards)
      const newHand = effectState.hand.filter(c => c.id !== card.id)
      // Enhanced Energized cards no longer exhaust
      const baseExhaust = card.exhaust && !(card.name === 'Energized' && card.enhanced)
      const shouldExhaust = baseExhaust || effectState.shouldExhaustLastCard
      // If card has exhaust, put it in exhaust pile; otherwise put in discard
      const newDiscard = shouldExhaust ? effectState.discard : [...effectState.discard, card]
      const newExhaust = shouldExhaust ? [...effectState.exhaust, card] : effectState.exhaust
      
      const stateBeforeEnergy = {
        ...effectState,
        hand: newHand,
        discard: newDiscard,
        exhaust: newExhaust,
        pendingCardEffect: null,
        selectedCardId: null,
        shouldExhaustLastCard: false // Reset after use
      }

      // CRITICAL: Use status effects from BEFORE card executed to calculate cost
      // This prevents cards like Horse from seeing their own discount status effect
      const finalState = deductEnergy(stateBeforeEnergy, card, currentState.activeStatusEffects, 'targetTileForCard (general)')
      
      // Check if the effect revealed a tile that should end the turn (e.g., quantum)
      if (newEffect.type === 'quantum') {
        // Find the revealed tile and check if turn should end
        const [pos1, pos2] = newEffect.targets
        const tile1 = currentState.board.tiles.get(positionToKey(pos1))
        const tile2 = currentState.board.tiles.get(positionToKey(pos2))
        
        // Check which tile was revealed by comparing board states
        const newTile1 = effectState.board.tiles.get(positionToKey(pos1))
        const newTile2 = effectState.board.tiles.get(positionToKey(pos2))
        
        let revealedTile: typeof tile1 = undefined
        if (tile1 && newTile1 && !tile1.revealed && newTile1.revealed) {
          revealedTile = newTile1
        } else if (tile2 && newTile2 && !tile2.revealed && newTile2.revealed) {
          revealedTile = newTile2
        }
        
        if (revealedTile && shouldEndPlayerTurn(revealedTile)) {
          console.log('🔄 QUANTUM ENDING TURN - Using finalState instead of just board')
          const discardedState = discardHand(finalState)
          set(discardedState)
          get().startRivalTurn(discardedState.board)
          return
        }
      }
      
      // Check if Horse card revealed non-player tiles and should end turn
      if (newEffect.type === 'horse' && effectState.horseRevealedNonPlayer) {
        console.log('🐴 HORSE ENDING TURN - Revealed non-player tiles')
        const discardedState = discardHand(finalState)
        set(discardedState)
        get().startRivalTurn(discardedState.board)
        return
      }
      
      console.log('🎯 SETTING FINAL STATE FROM CARD EFFECT')
      console.log('  - Card played:', card.name)
      console.log('  - Effect type:', newEffect.type)
      console.log('  - Final state hand size:', finalState.hand.length)
      console.log('  - Final state deck size:', finalState.deck.length)
      console.log('  - Final state activeStatusEffects:', finalState.activeStatusEffects.map(e => ({ type: e.type, id: e.id })))
      
      set(finalState)
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
      selectedCardName: null,
      selectedCardId: null
    })
  },

  getTargetingInfo: () => {
    const currentState = get()
    if (!currentState.pendingCardEffect || !currentState.selectedCardName) return null
    
    // Find the card to check if it's enhanced
    const card = currentState.hand.find(c => c.name === currentState.selectedCardName)
    const info = getTargetingInfo(currentState.selectedCardName, card?.enhanced)
    if (!info) return null
    
    const selected: Position[] = []
    const effect = currentState.pendingCardEffect
    
    if (effect.type === 'quantum' && 'targets' in effect) {
      selected.push(...effect.targets)
    }
    
    return {
      count: info.count,
      description: info.description,
      selected
    }
  },

  setHoveredClueId: (clueId: string | null) => {
    set(state => ({
      ...state,
      hoveredClueId: clueId
    }))
  },

  startRivalTurn: (board: Board) => {
    const currentState = get()
    
    // Clear any pending card targeting state
    const clearedState = {
      ...currentState,
      board,
      pendingCardEffect: null,
      selectedCardName: null
    }
    
    // Process rival turn with dual clue system using AI controller
    const aiController = new AIController()
    const rivalTurnResult = aiController.processRivalTurn(clearedState)
    const stateWithRivalClue = {
      ...rivalTurnResult.stateWithVisibleClues,
      rivalHiddenClues: [...clearedState.rivalHiddenClues, ...rivalTurnResult.hiddenClues]
    }
    const tilesToReveal = rivalTurnResult.tilesToReveal
    
    if (tilesToReveal.length === 0) {
      // No tiles to reveal, spawn goblins from lairs and end rival turn immediately
      const boardWithGoblins = spawnGoblinsFromLairs(stateWithRivalClue.board)
      const newTurnState = startNewTurn({
        ...stateWithRivalClue,
        board: boardWithGoblins
      })
      set({
        ...newTurnState,
        currentPlayer: 'player'
      })
      return
    }
    
    // Check if we're in a test environment
    const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    
    if (isTestEnvironment) {
      // In tests, run rival turn synchronously
      let boardState = stateWithRivalClue.board
      for (const tile of tilesToReveal) {
        boardState = revealTile(boardState, tile.position, 'rival')
        if (tile.owner !== 'rival') break // Stop if non-rival tile revealed
      }

      // Spawn goblins from lairs before starting new turn
      boardState = spawnGoblinsFromLairs(boardState)

      const newTurnState = startNewTurn({
        ...stateWithRivalClue,
        board: boardState
      })
      set({
        ...newTurnState,
        currentPlayer: 'player'
      })
      return
    }
    
    // Start the animation sequence
    set({
      ...stateWithRivalClue,
      currentPlayer: 'rival',
      rivalAnimation: {
        isActive: true,
        highlightedTile: null,
        revealsRemaining: tilesToReveal,
        currentRevealIndex: 0
      }
    })
    
    // Start the first reveal after a short delay
    setTimeout(() => {
      get().performNextRivalReveal()
    }, 500)
  },

  performNextRivalReveal: () => {
    const currentState = get()
    const animation = currentState.rivalAnimation
    
    if (!animation || !animation.isActive) return
    
    const { revealsRemaining, currentRevealIndex } = animation
    
    if (currentRevealIndex >= revealsRemaining.length) {
      // Animation complete, spawn goblins from lairs and end rival turn
      const boardWithGoblins = spawnGoblinsFromLairs(currentState.board)
      const newTurnState = startNewTurn({
        ...currentState,
        board: boardWithGoblins
      })
      set({
        ...newTurnState,
        currentPlayer: 'player',
        rivalAnimation: null
      })
      return
    }
    
    const tileToReveal = revealsRemaining[currentRevealIndex]
    
    // Highlight the tile
    set({
      ...currentState,
      rivalAnimation: {
        ...animation,
        highlightedTile: tileToReveal.position
      }
    })
    
    // After highlighting delay, reveal the tile
    setTimeout(() => {
      const state = get()
      const newBoard = revealTile(state.board, tileToReveal.position, 'rival')
      let shouldContinue = tileToReveal.owner === 'rival' // Continue if rival tile

      // Check if rival revealed a mine with protection active
      let stateAfterReveal = { ...state, board: newBoard }
      if (tileToReveal.owner === 'mine' && state.rivalMineProtectionCount > 0) {
        console.log(`🛡️ Rival revealed protected mine! Awarding 5 copper and decrementing protection count`)

        // Award 5 copper
        stateAfterReveal = {
          ...stateAfterReveal,
          copper: stateAfterReveal.copper + 5,
          rivalMineProtectionCount: stateAfterReveal.rivalMineProtectionCount - 1
        }

        // Update status effect with new count
        const protectionEffect = stateAfterReveal.activeStatusEffects.find(e => e.type === 'rival_mine_protection')
        if (protectionEffect) {
          const newCount = stateAfterReveal.rivalMineProtectionCount

          if (newCount > 0) {
            // Update the status effect with new count
            const updatedEffect = {
              ...protectionEffect,
              description: `The rival can safely reveal ${newCount} mine${newCount > 1 ? 's' : ''} (awards 5 copper each)`,
              count: newCount
            }

            stateAfterReveal = {
              ...stateAfterReveal,
              activeStatusEffects: stateAfterReveal.activeStatusEffects.map(e =>
                e.type === 'rival_mine_protection' ? updatedEffect : e
              )
            }
          } else {
            // Remove the status effect when count reaches 0
            stateAfterReveal = {
              ...stateAfterReveal,
              activeStatusEffects: stateAfterReveal.activeStatusEffects.filter(e => e.type !== 'rival_mine_protection')
            }
          }
        }

        // End rival's turn (don't continue)
        shouldContinue = false
      }

      // Check game status after rival reveal
      const gameStatus = checkGameStatus(stateAfterReveal)

      const stateWithGameStatus = {
        ...stateAfterReveal,
        gameStatus,
        rivalAnimation: {
          ...stateAfterReveal.rivalAnimation!,
          highlightedTile: null,
          currentRevealIndex: stateAfterReveal.rivalAnimation!.currentRevealIndex + 1
        }
      }
      updateStateWithCopperReward(set, get, stateWithGameStatus)
      
      if (gameStatus.status !== 'playing') {
        // Game ended, stop rival animation
        const endState = get()
        set({
          ...endState,
          rivalAnimation: null
        })
      } else if (shouldContinue && state.rivalAnimation!.currentRevealIndex + 1 < revealsRemaining.length) {
        // Continue with next reveal after delay
        setTimeout(() => {
          get().performNextRivalReveal()
        }, 800)
      } else {
        // End rival turn, spawn goblins from lairs before starting new turn
        const finalState = get()
        const boardWithGoblins = spawnGoblinsFromLairs(finalState.board)
        const newTurnState = startNewTurn({
          ...finalState,
          board: boardWithGoblins
        })
        set({
          ...newTurnState,
          currentPlayer: 'player',
          rivalAnimation: null
        })
      }
    }, 1000) // Highlighting duration
  },

  togglePlayerSlash: (position: Position) => {
    const currentState = get()
    const key = positionToKey(position)
    const tile = currentState.board.tiles.get(key)
    
    if (!tile || tile.revealed) return
    
    const newTiles = new Map(currentState.board.tiles)
    const hasSlash = tile.annotations.some(a => a.type === 'player_slash')
    
    let newAnnotations
    if (hasSlash) {
      // Remove slash
      newAnnotations = tile.annotations.filter(a => a.type !== 'player_slash')
    } else {
      // Add slash
      newAnnotations = [...tile.annotations, { type: 'player_slash' as const }]
    }
    
    const updatedTile = {
      ...tile,
      annotations: newAnnotations
    }
    
    newTiles.set(key, updatedTile)
    
    set({
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    })
  },

  setPlayerAnnotationMode: (mode: 'slash' | 'big_checkmark' | 'small_checkmark') => {
    const currentState = get()
    set({
      ...currentState,
      playerAnnotationMode: mode
    })
  },

  togglePlayerAnnotation: (position: Position) => {
    const currentState = get()
    const key = positionToKey(position)
    const tile = currentState.board.tiles.get(key)
    
    if (!tile || tile.revealed) return
    
    const newTiles = new Map(currentState.board.tiles)
    const mode = currentState.playerAnnotationMode
    
    // Get current annotation types
    const hasSlash = tile.annotations.some(a => a.type === 'player_slash')
    const hasBigCheckmark = tile.annotations.some(a => a.type === 'player_big_checkmark')
    const hasSmallCheckmark = tile.annotations.some(a => a.type === 'player_small_checkmark')
    
    let newAnnotations = tile.annotations.filter(a => 
      a.type !== 'player_slash' && 
      a.type !== 'player_big_checkmark' && 
      a.type !== 'player_small_checkmark'
    )
    
    // Cycle through annotations based on mode
    if (mode === 'slash') {
      // Mode 1: no annotation <-> black slash
      if (!hasSlash) {
        newAnnotations = [...newAnnotations, { type: 'player_slash' as const }]
      }
    } else if (mode === 'big_checkmark') {
      // Mode 2: no annotation -> black slash -> big green checkmark -> no annotation
      if (!hasSlash && !hasBigCheckmark) {
        newAnnotations = [...newAnnotations, { type: 'player_slash' as const }]
      } else if (hasSlash && !hasBigCheckmark) {
        newAnnotations = [...newAnnotations, { type: 'player_big_checkmark' as const }]
      }
      // If hasBigCheckmark, we remove all (already filtered out above)
    } else if (mode === 'small_checkmark') {
      // Mode 3: no annotation -> black slash -> small purple checkmark -> no annotation
      if (!hasSlash && !hasSmallCheckmark) {
        newAnnotations = [...newAnnotations, { type: 'player_slash' as const }]
      } else if (hasSlash && !hasSmallCheckmark) {
        newAnnotations = [...newAnnotations, { type: 'player_small_checkmark' as const }]
      }
      // If hasSmallCheckmark, we remove all (already filtered out above)
    }
    
    const updatedTile = {
      ...tile,
      annotations: newAnnotations
    }
    
    newTiles.set(key, updatedTile)
    
    set({
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    })
  },

  startCardSelection: () => {
    const currentState = get()
    
    // Copper is now awarded immediately when player wins, not here
    
    // Check if this level should show card rewards
    if (shouldShowCardReward(currentState.currentLevelId)) {
      const cardSelectionState = startCardSelection(currentState)
      set(cardSelectionState)
    } else if (shouldShowUpgradeReward(currentState.currentLevelId)) {
      // No card reward but has upgrade reward - go directly to upgrade selection
      const upgradeState = startUpgradeSelection(currentState)
      set(upgradeState)
    } else if (shouldShowRelicReward(currentState.currentLevelId)) {
      // No card/upgrade rewards but has relic reward - go directly to relic selection
      const relicState = startRelicSelection(currentState)
      set(relicState)
    } else if (shouldShowShopReward(currentState.currentLevelId)) {
      // No card/upgrade/relic rewards but has shop reward - go directly to shop
      const shopState = startShopSelection(currentState)
      set(shopState)
    } else {
      // No rewards - skip card selection and go directly to next level
      const nextLevelState = skipCardSelection(currentState)
      set(nextLevelState)
    }
  },

  selectNewCard: (card: CardType) => {
    const currentState = get()
    const nextLevelState = selectNewCard(currentState, card)
    
    // Check if this level should show upgrade rewards after card selection
    if (shouldShowUpgradeReward(currentState.currentLevelId)) {
      const upgradeState = startUpgradeSelection(nextLevelState)
      set(upgradeState)
    } else if (shouldShowRelicReward(currentState.currentLevelId)) {
      // No upgrade rewards but has relic reward - go to relic selection
      const relicState = startRelicSelection(nextLevelState)
      set(relicState)
    } else if (shouldShowShopReward(currentState.currentLevelId)) {
      // No upgrade/relic rewards but has shop reward - go to shop
      const shopState = startShopSelection(nextLevelState)
      set(shopState)
    } else {
      // No upgrade/relic/shop rewards - advance to next level immediately
      const advancedState = advanceToNextLevel(nextLevelState)
      set(advancedState)
    }
  },

  skipCardSelection: () => {
    const currentState = get()
    const nextLevelState = skipCardSelection(currentState)
    
    // Check if this level should show upgrade rewards after skipping card selection
    if (shouldShowUpgradeReward(currentState.currentLevelId)) {
      const upgradeState = startUpgradeSelection(nextLevelState)
      set(upgradeState)
    } else if (shouldShowRelicReward(currentState.currentLevelId)) {
      // No upgrade rewards but has relic reward - go to relic selection
      const relicState = startRelicSelection(nextLevelState)
      set(relicState)
    } else if (shouldShowShopReward(currentState.currentLevelId)) {
      // No upgrade/relic rewards but has shop reward - go to shop
      const shopState = startShopSelection(nextLevelState)
      set(shopState)
    } else {
      // No upgrade/relic/shop rewards - advance to next level immediately
      const advancedState = advanceToNextLevel(nextLevelState)
      set(advancedState)
    }
  },

  getAllCardsInCollection: () => {
    const currentState = get()
    return getAllCardsInCollection(currentState)
  },

  executeTingleWithAnimation: (state: GameState, isEnhanced: boolean) => {
    // Find random rival tiles to target (1 for normal, 2 for enhanced)
    const rivalTiles = getUnrevealedTilesByOwner(state, 'rival')
    if (rivalTiles.length === 0) return

    // Helper function to check if a tile is unambiguously rival-only based on game annotations
    const isUnambiguouslyRival = (tile: Tile): boolean => {
      const subsetAnnotations = tile.annotations.filter(a => a.type === 'owner_subset')
      if (subsetAnnotations.length === 0) return false
      
      const latestSubset = subsetAnnotations[subsetAnnotations.length - 1]
      const ownerSubset = latestSubset.ownerSubset || new Set()
      
      // Tile is unambiguous if it can only be rival (size 1 and contains only 'rival')
      return ownerSubset.size === 1 && ownerSubset.has('rival')
    }

    // Separate rival tiles into ambiguous and unambiguous
    const ambiguousRivalTiles = rivalTiles.filter(tile => !isUnambiguouslyRival(tile))

    // Prefer ambiguous tiles if available, otherwise use all rival tiles
    const preferredTiles = ambiguousRivalTiles.length > 0 ? ambiguousRivalTiles : rivalTiles

    const tilesToMark = isEnhanced ? Math.min(2, preferredTiles.length) : 1
    const randomTiles: typeof rivalTiles = []
    
    // Select random tiles without replacement from preferred tiles
    const availableTiles = [...preferredTiles]
    for (let i = 0; i < tilesToMark; i++) {
      const randomIndex = Math.floor(Math.random() * availableTiles.length)
      randomTiles.push(availableTiles[randomIndex])
      availableTiles.splice(randomIndex, 1)
    }

    // Check if we're in a test environment
    const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    
    if (isTestEnvironment) {
      // In tests, execute immediately without animation
      let effectState = state
      for (const tile of randomTiles) {
        effectState = executeTargetedReportEffect(effectState, tile.position)
      }
      set(effectState)
      return
    }

    // Start the rival-style emphasis animation (show first tile)
    set({
      ...state,
      tingleAnimation: {
        targetTile: randomTiles[0].position,
        isEmphasized: true
      }
    })

    // After emphasis duration, fade back to normal
    setTimeout(() => {
      const currentState = get()
      set({
        ...currentState,
        tingleAnimation: {
          targetTile: randomTiles[0].position,
          isEmphasized: false
        }
      })
      
      // After fade duration, apply the effect to all tiles and clear animation
      setTimeout(() => {
        const finalState = get()
        let effectState: GameState = finalState
        for (const tile of randomTiles) {
          effectState = executeTargetedReportEffect(effectState, tile.position)
        }
        set({
          ...effectState,
          tingleAnimation: null
        })
      }, 300) // Fade back duration
    }, 800) // Emphasis duration
  },

  executeTrystWithAnimation: (state: GameState, isEnhanced: boolean, target?: Position) => {
    const rivalTiles = getUnrevealedTilesByOwner(state, 'rival')
    const playerTiles = getUnrevealedTilesByOwner(state, 'player')
    
    if (rivalTiles.length === 0 && playerTiles.length === 0) return
    
    const reveals: Array<{ tile: Tile; revealer: 'player' | 'rival' }> = []
    
    // First, rival reveals one of their tiles
    if (rivalTiles.length > 0) {
      let chosenRivalTile: Tile
      
      if (isEnhanced && target) {
        // Enhanced version: prioritize by Manhattan distance from target
        const manhattanDistance = (pos1: Position, pos2: Position): number => {
          return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
        }
        
        const tilesWithDistance = rivalTiles.map(tile => ({
          tile,
          distance: manhattanDistance(tile.position, target)
        }))
        
        const minDistance = Math.min(...tilesWithDistance.map(t => t.distance))
        const closestTiles = tilesWithDistance.filter(t => t.distance === minDistance)
        
        chosenRivalTile = closestTiles[Math.floor(Math.random() * closestTiles.length)].tile
      } else {
        // Basic version: completely random
        chosenRivalTile = rivalTiles[Math.floor(Math.random() * rivalTiles.length)]
      }
      
      reveals.push({ tile: chosenRivalTile, revealer: 'rival' })
    }
    
    // Then, player reveals one of their tiles
    if (playerTiles.length > 0) {
      let chosenPlayerTile: Tile
      
      if (isEnhanced && target) {
        // Enhanced version: prioritize by Manhattan distance from target
        const manhattanDistance = (pos1: Position, pos2: Position): number => {
          return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
        }
        
        const tilesWithDistance = playerTiles.map(tile => ({
          tile,
          distance: manhattanDistance(tile.position, target)
        }))
        
        const minDistance = Math.min(...tilesWithDistance.map(t => t.distance))
        const closestTiles = tilesWithDistance.filter(t => t.distance === minDistance)
        
        chosenPlayerTile = closestTiles[Math.floor(Math.random() * closestTiles.length)].tile
      } else {
        // Basic version: completely random
        chosenPlayerTile = playerTiles[Math.floor(Math.random() * playerTiles.length)]
      }
      
      reveals.push({ tile: chosenPlayerTile, revealer: 'player' })
    }
    
    if (reveals.length === 0) return
    
    // Check if we're in a test environment
    const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    
    if (isTestEnvironment) {
      // In tests, execute immediately without animation
      let effectState = state
      for (const { tile, revealer } of reveals) {
        effectState = revealTileWithRelicEffects(effectState, tile.position, revealer)
      }
      set(effectState)
      return
    }

    // Start the animation with first tile
    set({
      ...state,
      trystAnimation: {
        isActive: true,
        highlightedTile: reveals[0].tile.position,
        revealsRemaining: reveals,
        currentRevealIndex: 0
      }
    })
    
    // Start the reveal sequence
    get().performNextTrystReveal()
  },

  performNextTrystReveal: () => {
    const currentState = get()
    if (!currentState.trystAnimation || !currentState.trystAnimation.isActive) return
    
    const { revealsRemaining, currentRevealIndex } = currentState.trystAnimation
    
    if (currentRevealIndex >= revealsRemaining.length) {
      // Animation complete
      set({
        ...currentState,
        trystAnimation: null
      })
      return
    }
    
    const currentReveal = revealsRemaining[currentRevealIndex]
    
    // Clean dirty tiles before revealing if this is a player tile
    let currentStateForReveal = currentState
    if (currentReveal.revealer === 'player' && currentReveal.tile.specialTiles.includes('extraDirty')) {
      // Clean the dirty tile first
      const key = `${currentReveal.tile.position.x},${currentReveal.tile.position.y}`
      const newTiles = new Map(currentStateForReveal.board.tiles)
      const cleanedTile = {
        ...currentReveal.tile,
        specialTiles: currentReveal.tile.specialTiles.filter(t => t !== 'extraDirty') // Remove extraDirty
      }
      newTiles.set(key, cleanedTile)
      currentStateForReveal = {
        ...currentStateForReveal,
        board: {
          ...currentStateForReveal.board,
          tiles: newTiles
        }
      }
      
      // Queue card draws for cleaning dirt by revealing (Mop relic effect)
      const updatedState = queueCardDrawsFromDirtCleaning(currentStateForReveal, 1)
      currentStateForReveal = {
        ...currentStateForReveal,
        queuedCardDraws: updatedState.queuedCardDraws
      }
    }
    
    // Reveal the current tile
    let newState = revealTileWithRelicEffects(currentStateForReveal, currentReveal.tile.position, currentReveal.revealer)
    
    // Update animation state for next reveal
    const nextIndex = currentRevealIndex + 1
    if (nextIndex < revealsRemaining.length) {
      // More reveals to go
      newState = {
        ...newState,
        trystAnimation: {
          isActive: true,
          highlightedTile: revealsRemaining[nextIndex].tile.position,
          revealsRemaining,
          currentRevealIndex: nextIndex
        }
      }
      
      set(newState)
      
      // Schedule next reveal
      setTimeout(() => {
        get().performNextTrystReveal()
      }, 800)
    } else {
      // This was the last reveal
      set({
        ...newState,
        trystAnimation: null
      })
    }
  },

  viewPile: (pileType: PileType) => {
    const currentState = get()
    if (currentState.gamePhase !== 'playing') return
    
    set({
      ...currentState,
      gamePhase: 'viewing_pile',
      pileViewingType: pileType
    })
  },

  closePileView: () => {
    const currentState = get()
    set({
      ...currentState,
      gamePhase: 'playing',
      pileViewingType: undefined
    })
  },

  debugWinLevel: () => {
    const currentState = get()
    if (currentState.gameStatus.status !== 'playing') return
    
    // Force win by setting all player tiles as revealed
    const newTiles = new Map(currentState.board.tiles)
    for (const [key, tile] of newTiles) {
      if (tile.owner === 'player' && !tile.revealed) {
        newTiles.set(key, {
          ...tile,
          revealed: true,
          revealedBy: 'player',
          adjacencyCount: 0 // Don't bother calculating, just set to 0 for debug
        })
      }
    }
    
    const newBoard = {
      ...currentState.board,
      tiles: newTiles
    }
    
    const gameStatus = checkGameStatus({
      ...currentState,
      board: newBoard
    })
    
    const stateWithGameStatus = {
      ...currentState,
      board: newBoard,
      gameStatus
    }
    updateStateWithCopperReward(set, get, stateWithGameStatus)
  },
  
  debugGiveRelic: (relicName: string) => {
    console.log(`🎯 DEBUG: debugGiveRelic called with "${relicName}"`)
    const currentState = get()
    console.log('Current relics:', currentState.relics.map(r => r.name))
    
    // Import dynamically to avoid require issues
    import('./game/gameRepository').then(({ getAllRelics }) => {
      const allRelics = getAllRelics()
      console.log('All available relics:', allRelics.map((r: any) => r.name))
      
      const relic = allRelics.find((r: any) => r.name === relicName)
      
      if (!relic) {
        console.warn(`❌ Relic "${relicName}" not found in getAllRelics()`)
        return
      }
      
      // Check if already has this relic
      if (currentState.relics.some(r => r.name === relicName)) {
        console.warn(`❌ Already has relic "${relicName}"`)
        return
      }
      
      console.log(`🎁 DEBUG: Giving relic "${relicName}"`, relic)
      const newState = {
        ...currentState,
        relics: [...currentState.relics, relic]
      }
      console.log('New relics after update:', newState.relics.map(r => r.name))
      set(newState)
      console.log('✅ debugGiveRelic completed')
    }).catch(err => {
      console.error('Failed to import gameRepository:', err)
    })
  },
  
  debugGiveCard: (cardName: string, upgrades?: { costReduced?: boolean; enhanced?: boolean }) => {
    console.log(`🎯 DEBUG: debugGiveCard called with "${cardName}"`, upgrades)
    const currentState = get()
    console.log('Current hand size:', currentState.hand.length)
    console.log('Current hand cards:', currentState.hand.map(c => c.name))

    // Import dynamically to avoid require issues
    import('./game/cardSystem').then(({ createCard }) => {
      const card = createCard(cardName, upgrades)

      console.log(`🎁 DEBUG: Created card:`, card)
      const newState = {
        ...currentState,
        hand: [...currentState.hand, card]
      }
      console.log('New hand size after update:', newState.hand.length)
      console.log('New hand cards:', newState.hand.map(c => c.name))
      set(newState)
      console.log('✅ debugGiveCard completed')
    }).catch(err => {
      console.error('Failed to import cardSystem:', err)
    })
  },

  debugSetAIType: (aiType: string) => {
    console.log(`🤖 DEBUG: debugSetAIType called with "${aiType}"`)
    const currentState = get()

    // Import dynamically
    import('./game/ai/AIRegistry').then(({ AIRegistry }) => {
      // Check if AI type exists
      if (!AIRegistry.hasType(aiType)) {
        console.error(`❌ Unknown AI type: ${aiType}`)
        console.log('Available types:', AIRegistry.getAvailableTypes())
        return
      }

      // Get AI info for status effect
      const ai = AIRegistry.create(aiType)

      // Remove existing AI status effect and add new one
      const filteredEffects = currentState.activeStatusEffects.filter(e => e.type !== 'rival_ai_type')
      const newStatusEffect = {
        id: crypto.randomUUID(),
        type: 'rival_ai_type' as const,
        icon: ai.icon,
        name: ai.name,
        description: ai.description
      }

      const newState = {
        ...currentState,
        aiTypeOverride: aiType, // Set the override for AIController to use
        activeStatusEffects: [...filteredEffects, newStatusEffect]
      }

      console.log(`✅ Changed rival AI to: ${ai.name}`)
      console.log(`   Next rival turn will use AI type: ${aiType}`)
      set(newState)
    }).catch(err => {
      console.error('Failed to change AI type:', err)
    })
  },

  debugSkipToLevel: (levelId: string) => {
    console.log(`🎯 DEBUG: debugSkipToLevel called with "${levelId}"`)

    // Import dynamically
    import('./game/levelSystem').then(({ getLevelConfig }) => {
      const levelConfig = getLevelConfig(levelId)

      if (!levelConfig) {
        console.error(`❌ Level "${levelId}" not found`)
        return
      }

      console.log(`✅ Skipping to level: ${levelId}`)
      const currentState = get()

      // Create a new initial state for this level, preserving deck/relics/copper
      const newState = createInitialState(levelId)

      set({
        ...newState,
        persistentDeck: currentState.persistentDeck,
        relics: currentState.relics,
        copper: currentState.copper
      })

      console.log(`✅ Now on level: ${levelId}`)
    }).catch(err => {
      console.error('Failed to skip to level:', err)
    })
  },

  startUpgradeSelection: () => {
    const currentState = get()
    const upgradeState = startUpgradeSelection(currentState)
    set(upgradeState)
  },

  selectUpgrade: (option: import('./types').UpgradeOption, selectedCardId?: string) => {
    const currentState = get()
    
    if (option.type === 'remove_card' && !selectedCardId) {
      // Start card removal flow
      set({
        ...currentState,
        waitingForCardRemoval: true,
        pendingUpgradeOption: option
      })
    } else {
      // Apply the upgrade (including remove_card if selectedCardId is provided)
      const upgradedState = applyUpgrade(currentState, option, selectedCardId)
      set(upgradedState)
    }
  },

  selectCardForRemoval: (cardId: string) => {
    const currentState = get()
    if (!currentState.pendingUpgradeOption) return
    
    const upgradedState = applyUpgrade(currentState, currentState.pendingUpgradeOption, cardId)
    set(upgradedState)
  },

  startRelicSelection: () => {
    const currentState = get()
    const relicState = startRelicSelection(currentState)
    set(relicState)
  },

  selectRelic: (relic: Relic) => {
    const currentState = get()
    const nextLevelState = selectRelic(currentState, relic)
    set(nextLevelState)
  },

  closeRelicUpgradeDisplay: () => {
    const currentState = get()
    const nextState = closeRelicUpgradeDisplay(currentState)
    set(nextState)
  },

  startShopSelection: () => {
    const currentState = get()
    const shopState = startShopSelection(currentState)
    set(shopState)
  },

  purchaseShopItem: (optionIndex: number) => {
    const currentState = get()
    const purchaseState = purchaseShopItem(currentState, optionIndex)
    set(purchaseState)
  },

  removeSelectedCard: (cardId: string) => {
    const currentState = get()
    const updatedState = removeSelectedCard(currentState, cardId)
    set(updatedState)
  },

  exitShop: () => {
    const currentState = get()
    const nextLevelState = exitShop(currentState)
    set(nextLevelState)
  },

  setUseDefaultAnnotations: (useDefault: boolean) => {
    const currentState = get()
    set({
      ...currentState,
      useDefaultAnnotations: useDefault
    })
  },

  toggleOwnerPossibility: (ownerCombo: string) => {
    const currentState = get()
    const newEnabled = new Set(currentState.enabledOwnerPossibilities)
    
    if (newEnabled.has(ownerCombo)) {
      newEnabled.delete(ownerCombo)
    } else {
      newEnabled.add(ownerCombo)
    }
    
    set({
      ...currentState,
      enabledOwnerPossibilities: newEnabled,
      currentOwnerPossibilityIndex: 0 // Reset to first enabled option
    })
  },

  cyclePlayerOwnerAnnotation: (position: Position) => {
    const currentState = get()
    
    if (currentState.useDefaultAnnotations) {
      // Use the existing default annotation logic
      get().togglePlayerAnnotation(position)
      return
    }

    // Use the new owner possibility system
    const enabledCombos = Array.from(currentState.enabledOwnerPossibilities)
    if (enabledCombos.length === 0) return // No enabled possibilities

    const key = positionToKey(position)
    const tile = currentState.board.tiles.get(key)
    if (!tile || tile.revealed) return

    const newTiles = new Map(currentState.board.tiles)
    const updatedTile = { ...tile }

    // Remove existing player owner possibility annotation
    updatedTile.annotations = updatedTile.annotations.filter(a => a.type !== 'player_owner_possibility')

    // Find next enabled possibility
    let nextIndex = (currentState.currentOwnerPossibilityIndex + 1) % (enabledCombos.length + 1)
    
    // If not the "clear" option, add the annotation
    if (nextIndex < enabledCombos.length) {
      const ownerCombo = enabledCombos[nextIndex]
      const ownerSet = new Set(ownerCombo.split(',').filter(s => s.length > 0)) as Set<'player' | 'rival' | 'neutral' | 'mine'>
      
      updatedTile.annotations.push({
        type: 'player_owner_possibility',
        playerOwnerPossibility: ownerSet
      })
    }

    newTiles.set(key, updatedTile)

    set({
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      },
      currentOwnerPossibilityIndex: nextIndex
    })
  },

  toggleAnnotationButton: (buttonType: 'player' | 'rival' | 'neutral' | 'mine') => {
    const currentState = get()
    set({
      ...currentState,
      annotationButtons: {
        ...currentState.annotationButtons,
        [buttonType]: !currentState.annotationButtons[buttonType]
      }
    })
  },

  toggleFilteredAnnotation: (position: Position) => {
    const currentState = get()
    const key = positionToKey(position)
    const tile = currentState.board.tiles.get(key)
    if (!tile || tile.revealed) return

    const newTiles = new Map(currentState.board.tiles)
    const updatedTile = { ...tile }

    // Remove existing player owner possibility annotation
    const existingAnnotation = updatedTile.annotations.find(a => a.type === 'player_owner_possibility')
    updatedTile.annotations = updatedTile.annotations.filter(a => a.type !== 'player_owner_possibility')

    // If no existing annotation, add filtered annotation based on depressed buttons
    if (!existingAnnotation) {
      const depressedOwners: ('player' | 'rival' | 'neutral' | 'mine')[] = []
      
      if (currentState.annotationButtons.player) depressedOwners.push('player')
      if (currentState.annotationButtons.rival) depressedOwners.push('rival') 
      if (currentState.annotationButtons.neutral) depressedOwners.push('neutral')
      if (currentState.annotationButtons.mine) depressedOwners.push('mine')

      if (depressedOwners.length > 0) {
        const ownerSet = new Set(depressedOwners)
        updatedTile.annotations.push({
          type: 'player_owner_possibility',
          playerOwnerPossibility: ownerSet
        })
      }
    }
    // If annotation exists, remove it (toggle off)

    newTiles.set(key, updatedTile)

    set({
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    })
  }
}))