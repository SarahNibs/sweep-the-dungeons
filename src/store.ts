import { create } from 'zustand'
import { GameState, Tile, Position, Board, Card as CardType, PileType, Equipment } from './types'
import { createInitialState, playCard, startNewTurn, canPlayCard as canPlayCardUtil, discardHand, startCardSelection, selectNewCard, skipCardSelection, getAllCardsInCollection, advanceToNextLevel, selectCardForMasking, selectCardForNap, cleanupMaskingAfterExecution } from './game/cardSystem'
import { AnimationController } from './game/animation/AnimationController'
import { AnnotationController } from './game/annotations/AnnotationController'
import { DebugController } from './game/debug/DebugController'
import { TargetingController } from './game/targeting/TargetingController'
import { isTestMode } from './game/utils/testMode'
import { startUpgradeSelection, applyUpgrade } from './game/upgradeSystem'
import { startEquipmentSelection, selectEquipment, transformCardForBoots } from './game/equipment'
import { closeTopModal, pushEquipmentUpgradeModal } from './game/modalManager'
import { revealTileWithResult, shouldRevealEndTurn, getTile, getNeighbors } from './game/boardSystem'
import { getTargetingInfo, revealTileWithEquipmentEffects } from './game/cardEffects'
import { AIController } from './game/ai/AIController'
import { shouldShowCardReward, shouldShowUpgradeReward, shouldShowEquipmentReward, shouldShowShopReward, calculateCopperReward } from './game/levelSystem'
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
  selectAnnotationTileType: (tileType: 'player' | 'rival' | 'neutral' | 'mine') => void
  cycleAnnotationOnTile: (position: Position) => void
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
  debugGiveEquipment: (equipmentName: string) => void
  debugGiveCard: (cardName: string, upgrades?: { energyReduced?: boolean; enhanced?: boolean }) => void
  debugSetAIType: (aiType: string) => void
  debugSkipToLevel: (levelId: string) => void
  toggleDebugFlag: (flagName: 'adjacencyColor' | 'easyMode' | 'sarcasticInstructionsAlternate') =>void
  cycleAdjacencyStyle: () => void
  startEquipmentSelection: () => void
  selectEquipment: (equipmentItem: Equipment) => void
  closeEquipmentUpgradeDisplay: () => void
  startShopSelection: () => void
  purchaseShopItem: (optionIndex: number) => void
  removeSelectedCard: (cardId: string) => void
  exitShop: () => void
  clearAdjacencyPatternAnimation: () => void
  // Item help modal
  itemHelpModal: { itemName: string; itemType: 'card' | 'equipment' } | null
  showItemHelp: (itemName: string, itemType: 'card' | 'equipment') => void
  closeItemHelp: () => void
  // Saturation confirmation
  saturationConfirmation: { position: Position } | null
  confirmSaturationReveal: () => void
  cancelSaturationReveal: () => void
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
  } else {
    finalState = newState
  }

  set(finalState)
}

/**
 * Check if a tile is "saturated" (adjacency count satisfied by revealed neighbors)
 * and if so, whether it rules out the target tile as not-player
 */
function isTileRuledOutBySaturatedNeighbor(board: Board, targetPosition: Position): boolean {
  const neighbors = getNeighbors(board, targetPosition)

  for (const neighborPos of neighbors) {
    const neighbor = getTile(board, neighborPos)
    if (!neighbor || !neighbor.revealed || neighbor.adjacencyCount === null || !neighbor.revealedBy) continue

    // Check if this revealed tile is "saturated"
    const neighborNeighbors = getNeighbors(board, neighborPos)

    // Count revealed neighbors that match the revealer's owner type
    const targetOwner = neighbor.revealedBy // 'player' or 'rival'
    let revealedMatchingCount = 0

    for (const nnPos of neighborNeighbors) {
      const nn = getTile(board, nnPos)
      if (nn && nn.revealed && nn.owner === targetOwner) {
        revealedMatchingCount++
      }
    }

    const isSaturated = revealedMatchingCount === neighbor.adjacencyCount

    if (!isSaturated) continue

    // This neighbor is saturated. Check if it rules out the target tile as not-player.
    // The target tile would be ruled out if:
    // - The saturated tile was revealed by 'player' and has all player neighbors accounted for
    // - The target tile is one of those neighbors
    // - Therefore the target tile cannot be a player tile

    const isTargetInNeighbors = neighborNeighbors.some(nnPos =>
      nnPos.x === targetPosition.x && nnPos.y === targetPosition.y
    )

    if (!isTargetInNeighbors) continue

    // Target is a neighbor of this saturated tile
    // If this is a player-revealed tile and all player neighbors are accounted for, target cannot be player
    if (neighbor.revealedBy === 'player') {
      // All player tiles in this neighborhood are accounted for
      // Target tile (unrevealed) cannot be player
      return true
    }
  }

  return false
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
          if (newState.maskingState) {
            // Use cleanupMaskingAfterExecution to handle Masking exhaustion
            finalState = cleanupMaskingAfterExecution(stateWithoutTingle)
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

    // Check if tile is ruled out by saturated adjacent tiles
    if (isTileRuledOutBySaturatedNeighbor(currentState.board, tile.position)) {
      // Set saturation confirmation state and wait for user input
      set({ saturationConfirmation: { position: tile.position } })
      return
    }

    const revealResult = revealTileWithResult(currentState.board, tile.position, 'player')

    // Use shared reveal function that includes equipment effects
    let stateWithBoard = revealTileWithEquipmentEffects(currentState, tile.position, 'player')

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

    // Check for masking state
    if (currentState.maskingState) {
      // If there's also a pending card effect, we're in targeting mode for a masked card
      // Show the targeting UI for the card, not the masking selection UI
      if (currentState.pendingCardEffect && currentState.selectedCardName) {
        // Fall through to show targeting info for the selected card
      } else {
        // No pending card effect - show masking selection UI
        return {
          count: 1,
          description: `🎭 Select a card from your hand to play for free! (Both cards will exhaust${currentState.maskingState.enhanced ? ', except Masking' : ''})`,
          selected: []
        }
      }
    }

    if (!currentState.pendingCardEffect || !currentState.selectedCardName) return null

    // Find the card to check if it's enhanced - use ID to find the exact card being played
    const card = currentState.selectedCardId
      ? currentState.hand.find(c => c.id === currentState.selectedCardId)
      : currentState.hand.find(c => c.name === currentState.selectedCardName)
    const info = getTargetingInfo(currentState.selectedCardName, card?.enhanced)
    if (!info) return null

    const selected: Position[] = []
    const effect = currentState.pendingCardEffect

    if (effect.type === 'scurry' && 'targets' in effect) {
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
    } else if (shouldShowEquipmentReward(currentState.currentLevelId)) {
      // No card/upgrade rewards but has equipment reward - go directly to equipment selection
      const equipmentState = startEquipmentSelection(currentState)
      set(equipmentState)
    } else if (shouldShowShopReward(currentState.currentLevelId)) {
      // No card/upgrade/equipment rewards but has shop reward - go directly to shop
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
    } else if (shouldShowEquipmentReward(currentState.currentLevelId)) {
      // No upgrade rewards but has equipment reward - go to equipment selection
      const equipmentState = startEquipmentSelection(nextLevelState)
      set(equipmentState)
    } else if (shouldShowShopReward(currentState.currentLevelId)) {
      // No upgrade/equipment rewards but has shop reward - go to shop
      const shopState = startShopSelection(nextLevelState)
      set(shopState)
    } else {
      // No upgrade/equipment/shop rewards - advance to next level immediately
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
    } else if (shouldShowEquipmentReward(currentState.currentLevelId)) {
      // No upgrade rewards but has equipment reward - go to equipment selection
      const equipmentState = startEquipmentSelection(nextLevelState)
      set(equipmentState)
    } else if (shouldShowShopReward(currentState.currentLevelId)) {
      // No upgrade/equipment rewards but has shop reward - go to shop
      const shopState = startShopSelection(nextLevelState)
      set(shopState)
    } else {
      // No upgrade/equipment/shop rewards - advance to next level immediately
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
  
  debugGiveEquipment: (equipmentName: string) => {
    debugController.debugGiveEquipment(equipmentName)
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

  toggleDebugFlag: (flagName: 'adjacencyColor' | 'easyMode' | 'sarcasticInstructionsAlternate') =>{
    const currentState = get()
    set({
      ...currentState,
      debugFlags: {
        ...currentState.debugFlags,
        [flagName]: !currentState.debugFlags[flagName]
      }
    })
  },

  cycleAdjacencyStyle: () => {
    const currentState = get()
    const newStyle = currentState.debugFlags.adjacencyStyle === 'palette' ? 'dark' : 'palette'
    set({
      ...currentState,
      debugFlags: {
        ...currentState.debugFlags,
        adjacencyStyle: newStyle
      }
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

    // Check if this is Boots transformation mode
    if (currentState.bootsTransformMode) {
      const { state: newState, results } = transformCardForBoots(currentState, cardId)

      // If Boots transformation has results, show modal with appropriate continuation
      if (results && results.length > 0) {
        // Determine continuation based on context
        if (currentState.shopOptions) {
          // In shop context
          const finalState = pushEquipmentUpgradeModal(newState, results, {
            returnTo: 'shop',
            preservedState: {
              shopOptions: currentState.shopOptions,
              purchasedShopItems: currentState.purchasedShopItems,
              copper: currentState.copper
            }
          })
          set(finalState)
        } else {
          // In reward flow
          const finalState = pushEquipmentUpgradeModal(newState, results, {
            returnTo: 'reward_flow',
            preservedState: {}
          })
          set(finalState)
        }
      } else {
        set(newState)
      }
      return
    }

    // Normal upgrade card removal
    if (!currentState.pendingUpgradeOption) return

    const upgradedState = applyUpgrade(currentState, currentState.pendingUpgradeOption, cardId)
    set(upgradedState)
  },

  startEquipmentSelection: () => {
    const currentState = get()
    const equipmentState = startEquipmentSelection(currentState)
    set(equipmentState)
  },

  selectEquipment: (equipmentItem: Equipment) => {
    const currentState = get()
    const nextLevelState = selectEquipment(currentState, equipmentItem)
    set(nextLevelState)
  },

  closeEquipmentUpgradeDisplay: () => {
    const currentState = get()
    const nextState = closeTopModal(currentState)
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

  selectAnnotationTileType: (tileType: 'player' | 'rival' | 'neutral' | 'mine') => {
    annotationController.selectAnnotationTileType(tileType)
  },

  cycleAnnotationOnTile: (position: Position) => {
    annotationController.cycleAnnotationOnTile(position)
  },

  clearAdjacencyPatternAnimation: () => {
    animationController.clearAdjacencyPatternAnimation()
  },

  // Item help modal state and methods
  itemHelpModal: null,

  showItemHelp: (itemName: string, itemType: 'card' | 'equipment') => {
    set({ itemHelpModal: { itemName, itemType } })
  },

  closeItemHelp: () => {
    set({ itemHelpModal: null })
  },

  // Saturation confirmation state and methods
  saturationConfirmation: null,

  confirmSaturationReveal: () => {
    const currentState = get()
    if (!currentState.saturationConfirmation) return

    const position = currentState.saturationConfirmation.position
    const tileKey = `${position.x},${position.y}`
    const tile = currentState.board.tiles.get(tileKey)

    if (!tile || tile.revealed) {
      set({ saturationConfirmation: null })
      return
    }

    // Now perform the actual reveal (same logic as revealTile, but skip saturation check)
    const revealResult = revealTileWithResult(currentState.board, position, 'player')

    // Use shared reveal function that includes equipment effects
    let stateWithBoard = revealTileWithEquipmentEffects(currentState, position, 'player')

    // Add hover state clearing and clear saturation confirmation
    stateWithBoard = {
      ...stateWithBoard,
      hoveredClueId: null,
      saturationConfirmation: null
    }

    // Determine if turn should end
    const revealedTile = getTile(stateWithBoard.board, position)
    let shouldEndTurn = !revealResult.revealed || (revealedTile && shouldRevealEndTurn(stateWithBoard, revealedTile))

    // Check for Underwire effect
    if (stateWithBoard.underwireUsedThisTurn) {
      shouldEndTurn = true
    }

    if (stateWithBoard.gameStatus.status !== 'playing') {
      updateStateWithCopperReward(set, get, stateWithBoard)
    } else if (shouldEndTurn) {
      const discardedState = discardHand(stateWithBoard)
      set(discardedState)
      get().startRivalTurn(discardedState.board)
    } else {
      updateStateWithCopperReward(set, get, stateWithBoard)
    }
  },

  cancelSaturationReveal: () => {
    set({ saturationConfirmation: null })
  }
}})
