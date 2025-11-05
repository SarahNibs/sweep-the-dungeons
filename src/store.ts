import { create } from 'zustand'
import { GameState, Tile, Position, Board, Card as CardType, PileType, Relic } from './types'
import { createInitialState, playCard, startNewTurn, canPlayCard as canPlayCardUtil, discardHand, startCardSelection, selectNewCard, skipCardSelection, getAllCardsInCollection, advanceToNextLevel, selectCardForMasking, selectCardForNap } from './game/cardSystem'
import { AnimationController } from './game/animation/AnimationController'
import { AnnotationController } from './game/annotations/AnnotationController'
import { DebugController } from './game/debug/DebugController'
import { TargetingController } from './game/targeting/TargetingController'
import { isTestMode } from './game/utils/testMode'
import { startUpgradeSelection, applyUpgrade } from './game/upgradeSystem'
import { startRelicSelection, selectRelic, closeRelicUpgradeDisplay, transformCardForBoots } from './game/relics'
import { revealTileWithResult, shouldRevealEndTurn, getTile } from './game/boardSystem'
import { getTargetingInfo, revealTileWithRelicEffects } from './game/cardEffects'
import { AIController } from './game/ai/AIController'
import { shouldShowCardReward, shouldShowUpgradeReward, shouldShowRelicReward, shouldShowShopReward, calculateCopperReward } from './game/levelSystem'
import { startShopSelection, purchaseShopItem, removeSelectedCard, exitShop } from './game/shopSystem'
import { canDirectRevealTile } from './game/targetingSystem'

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
  performNextTingleMark: () => void
  executeTrystWithAnimation: (state: GameState, isEnhanced: boolean, target?: Position) => void
  performNextTrystReveal: () => void
  viewPile: (pileType: PileType) => void
  closePileView: () => void
  selectCardForNap: (cardId: string) => void
  debugWinLevel: () => void
  debugGiveRelic: (relicName: string) => void
  debugGiveCard: (cardName: string, upgrades?: { energyReduced?: boolean; enhanced?: boolean }) => void
  debugSetAIType: (aiType: string) => void
  debugSkipToLevel: (levelId: string) => void
  startRelicSelection: () => void
  selectRelic: (relic: Relic) => void
  closeRelicUpgradeDisplay: () => void
  startShopSelection: () => void
  purchaseShopItem: (optionIndex: number) => void
  removeSelectedCard: (cardId: string) => void
  exitShop: () => void
  clearAdjacencyPatternAnimation: () => void
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
 * Helper function to update state and award copper if game was just won
 */
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

export const useGameStore = create<GameStore>((set, get) => {
  // Create a wrapper for setState that handles game completion and copper rewards
  const setStateWithGameCompletion = (newState: Partial<GameState> | GameState) => {
    // If it's a partial state update, just use set directly
    if (!('gameStatus' in newState) || !('board' in newState)) {
      set(newState)
      return
    }

    // Full state update - check for game completion
    const fullState = newState as GameState
    updateStateWithCopperReward(set, get, fullState)
  }

  // Create controller instances with access to store get/set
  const animationController = new AnimationController(get, setStateWithGameCompletion)
  const annotationController = new AnnotationController(get, set)
  const debugController = new DebugController(get, setStateWithGameCompletion)
  const aiController = new AIController(get, setStateWithGameCompletion)

  // Targeting controller needs access to store methods, so we create it lazily
  let targetingController: TargetingController | null = null
  const getTargetingController = () => {
    if (!targetingController) {
      const store = get()
      targetingController = new TargetingController(
        get,
        setStateWithGameCompletion,
        store.executeTrystWithAnimation,
        store.startRivalTurn
      )
    }
    return targetingController
  }

  return {
  ...createInitialState(),

  playCard: (cardId: string) => {
    const currentState = get()
    if (currentState.gameStatus.status !== 'playing') return

    // RACE CONDITION GUARD: Prevent concurrent card plays
    if (currentState.isProcessingCard) {
      console.log('⏳ Card already processing, ignoring click')
      return
    }

    const card = currentState.hand.find(c => c.id === cardId)
    if (!card) return

    // If in masking mode, call selectCardForMasking instead
    if (currentState.maskingState) {
      const newState = selectCardForMasking(currentState, cardId)

      // Check if the selected card is Tingle (needs animation)
      if (newState.selectedCardName === 'Tingle') {
        // Remove Tingle from hand and exhaust the target card
        const tingleCard = newState.hand.find(c => c.id === newState.selectedCardId)
        if (tingleCard) {
          const stateWithoutTingle = {
            ...newState,
            hand: newState.hand.filter(c => c.id !== newState.selectedCardId),
            exhaust: [...newState.exhaust, tingleCard]
          }

          // Handle Masking card exhausting if not enhanced
          let finalState = stateWithoutTingle
          if (newState.maskingState && !newState.maskingState.enhanced) {
            const maskingCard = finalState.discard.find(c => c.id === newState.maskingState!.maskingCardId)
            if (maskingCard) {
              finalState = {
                ...finalState,
                discard: finalState.discard.filter(c => c.id !== newState.maskingState!.maskingCardId),
                exhaust: [...finalState.exhaust, maskingCard]
              }
            }
          }

          // Clear masking state and add processing flag before triggering animation
          finalState = {
            ...finalState,
            maskingState: null,
            selectedCardName: null,
            selectedCardId: null,
            isProcessingCard: true
          }

          get().executeTingleWithAnimation(finalState, tingleCard.enhanced || false)
        }
        return
      }

      set({ ...newState, isProcessingCard: false })
      return
    }

    const animationType = needsAnimationOnPlay(card)

    if (animationType === 'tingle') {
      const basicState = playCard(currentState, cardId)
      const stateWithFlag = { ...basicState, isProcessingCard: true }
      get().executeTingleWithAnimation(stateWithFlag, card.enhanced || false)
    } else if (animationType === 'tryst') {
      const basicState = playCard(currentState, cardId)
      const stateWithFlag = { ...basicState, isProcessingCard: true }
      get().executeTrystWithAnimation(stateWithFlag, false, undefined)
    } else {
      // Normal card execution (includes enhanced Tryst which uses targeting)
      const newState = playCard(currentState, cardId)
      set({ ...newState, isProcessingCard: false })
    }
  },
  
  endTurn: () => {
    const currentState = get()
    
    if (currentState.gameStatus.status !== 'playing' || currentState.currentPlayer !== 'player') {
      return
    }
    
    if (isTestMode()) {
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

    // Use shared reveal function that includes relic effects
    let stateWithBoard = revealTileWithRelicEffects(currentState, tile.position, 'player')

    // Add hover state clearing
    stateWithBoard = {
      ...stateWithBoard,
      hoveredClueId: null // Clear hover state when tile is revealed to fix pip hover bug
    }

    // Determine if turn should end using centralized function
    // For extraDirty tiles that were cleaned but not revealed, always end turn
    const revealedTile = getTile(stateWithBoard.board, tile.position)
    let shouldEndTurn = !revealResult.revealed || (revealedTile && shouldRevealEndTurn(stateWithBoard, revealedTile))

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
    getTargetingController().targetTileForCard(position)
  },

  cancelCardTargeting: () => {
    getTargetingController().cancelCardTargeting()
  },

  getTargetingInfo: () => {
    const currentState = get()
    if (!currentState.pendingCardEffect || !currentState.selectedCardName) return null

    // Find the card to check if it's enhanced - use ID to find the exact card being played
    const card = currentState.selectedCardId
      ? currentState.hand.find(c => c.id === currentState.selectedCardId)
      : currentState.hand.find(c => c.name === currentState.selectedCardName)
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
    aiController.startRivalTurn(board)
  },

  performNextRivalReveal: () => {
    aiController.performNextRivalReveal()
  },

  togglePlayerSlash: (position: Position) => {
    annotationController.togglePlayerSlash(position)
  },

  setPlayerAnnotationMode: (mode: 'slash' | 'big_checkmark' | 'small_checkmark') => {
    annotationController.setPlayerAnnotationMode(mode)
  },

  togglePlayerAnnotation: (position: Position) => {
    annotationController.togglePlayerAnnotation(position)
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
    animationController.executeTingleWithAnimation(state, isEnhanced)
  },

  performNextTingleMark: () => {
    animationController.performNextTingleMark()
  },

  executeTrystWithAnimation: (state: GameState, isEnhanced: boolean, target?: Position) => {
    animationController.executeTrystWithAnimation(state, isEnhanced, target)
  },

  performNextTrystReveal: () => {
    animationController.performNextTrystReveal()
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

    // If closing during napState, exhaust the Nap card and clear napState
    if (currentState.napState) {
      const napCard = currentState.discard.find(card => card.id === currentState.napState!.napCardId)
      let newDiscard = currentState.discard
      let newExhaust = currentState.exhaust

      if (napCard) {
        newDiscard = currentState.discard.filter(card => card.id !== currentState.napState!.napCardId)
        newExhaust = [...currentState.exhaust, napCard]
      }

      set({
        ...currentState,
        gamePhase: 'playing',
        pileViewingType: undefined,
        napState: null,
        selectedCardName: null,
        discard: newDiscard,
        exhaust: newExhaust
      })
      return
    }

    // Only change gamePhase if we're in viewing_pile phase
    // (Don't change it if called from CardSelectionScreen or other screens)
    if (currentState.gamePhase === 'viewing_pile') {
      set({
        ...currentState,
        gamePhase: 'playing',
        pileViewingType: undefined
      })
    } else {
      // Just clear the pile viewing type without changing game phase
      set({
        ...currentState,
        pileViewingType: undefined
      })
    }
  },

  selectCardForNap: (cardId: string) => {
    const currentState = get()
    const newState = selectCardForNap(currentState, cardId)
    set({
      ...newState,
      gamePhase: 'playing',
      pileViewingType: undefined
    })
  },

  debugWinLevel: () => {
    debugController.debugWinLevel()
  },
  
  debugGiveRelic: (relicName: string) => {
    debugController.debugGiveRelic(relicName)
  },
  
  debugGiveCard: (cardName: string, upgrades?: { energyReduced?: boolean; enhanced?: boolean }) => {
    debugController.debugGiveCard(cardName, upgrades)
  },

  debugSetAIType: (aiType: string) => {
    debugController.debugSetAIType(aiType)
  },

  debugSkipToLevel: (levelId: string) => {
    debugController.debugSkipToLevel(levelId)
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

    // Check if this is Boots transformation mode
    if (currentState.bootsTransformMode) {
      // transformCardForBoots sets gamePhase to 'relic_upgrade_display'
      // The closeRelicUpgradeDisplay will handle shop/level advancement
      const transformedState = transformCardForBoots(currentState, cardId)
      set(transformedState)
      return
    }

    // Normal upgrade card removal
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
    annotationController.setUseDefaultAnnotations(useDefault)
  },

  toggleOwnerPossibility: (ownerCombo: string) => {
    annotationController.toggleOwnerPossibility(ownerCombo)
  },

  cyclePlayerOwnerAnnotation: (position: Position) => {
    annotationController.cyclePlayerOwnerAnnotation(position)
  },

  toggleAnnotationButton: (buttonType: 'player' | 'rival' | 'neutral' | 'mine') => {
    annotationController.toggleAnnotationButton(buttonType)
  },

  toggleFilteredAnnotation: (position: Position) => {
    annotationController.toggleFilteredAnnotation(position)
  },

  clearAdjacencyPatternAnimation: () => {
    animationController.clearAdjacencyPatternAnimation()
  }
}})
