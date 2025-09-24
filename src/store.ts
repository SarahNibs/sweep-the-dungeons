import { create } from 'zustand'
import { GameState, Tile, Position, CardEffect, Board, Card as CardType, PileType, Relic } from './types'
import { createInitialState, playCard, startNewTurn, canPlayCard as canPlayCardUtil, discardHand, startCardSelection, selectNewCard, skipCardSelection, getAllCardsInCollection, advanceToNextLevel } from './game/cardSystem'
import { startUpgradeSelection, applyUpgrade } from './game/upgradeSystem'
import { startRelicSelection, selectRelic } from './game/relicSystem'
import { revealTile, revealTileWithResult, shouldEndPlayerTurn, positionToKey } from './game/boardSystem'
import { executeCardEffect, getTargetingInfo, checkGameStatus, executeTargetedReportEffect, getUnrevealedTilesByOwner, revealTileWithRelicEffects } from './game/cardEffects'
import { processEnemyTurnWithDualClues } from './game/enemyAI'
import { shouldShowCardReward, shouldShowUpgradeReward, shouldShowRelicReward, shouldShowShopReward, calculateCopperReward } from './game/levelSystem'
import { startShopSelection, purchaseShopItem, removeSelectedCard, exitShop } from './game/shopSystem'

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
  startEnemyTurn: (board: Board) => void
  performNextEnemyReveal: () => void
  togglePlayerSlash: (position: Position) => void
  setPlayerAnnotationMode: (mode: 'slash' | 'big_checkmark' | 'small_checkmark') => void
  togglePlayerAnnotation: (position: Position) => void
  setUseDefaultAnnotations: (useDefault: boolean) => void
  toggleOwnerPossibility: (ownerCombo: string) => void
  cyclePlayerOwnerAnnotation: (position: Position) => void
  startCardSelection: () => void
  selectNewCard: (card: CardType) => void
  skipCardSelection: () => void
  startUpgradeSelection: () => void
  selectUpgrade: (option: import('./types').UpgradeOption, selectedCardId?: string) => void
  selectCardForRemoval: (cardId: string) => void
  getAllCardsInCollection: () => CardType[]
  executeTingleWithAnimation: (state: GameState, isEnhanced: boolean) => void
  viewPile: (pileType: PileType) => void
  closePileView: () => void
  debugWinLevel: () => void
  startRelicSelection: () => void
  selectRelic: (relic: Relic) => void
  startShopSelection: () => void
  purchaseShopItem: (optionIndex: number) => void
  removeSelectedCard: (cardId: string) => void
  exitShop: () => void
}

// Helper function to update state and award copper if game was just won
const updateStateWithCopperReward = (set: any, get: any, newState: GameState) => {
  const previousState = get()
  const wasPlaying = previousState.gameStatus.status === 'playing'
  const isNowWon = newState.gameStatus.status === 'player_won'
  
  if (wasPlaying && isNowWon) {
    // Player just won - award copper immediately
    const copperReward = calculateCopperReward(newState)
    const stateWithCopper = {
      ...newState,
      copper: newState.copper + copperReward
    }
    set(stateWithCopper)
  } else {
    set(newState)
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),
  
  playCard: (cardId: string) => {
    const currentState = get()
    if (currentState.gameStatus.status !== 'playing') return
    
    // Check if this is a Tingle card
    const card = currentState.hand.find(c => c.id === cardId)
    if (card?.name === 'Tingle') {
      // Handle Tingle specially with animation
      const basicState = playCard(currentState, cardId) // This won't execute the effect
      get().executeTingleWithAnimation(basicState, card.enhanced || false)
    } else {
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
      // In tests, just do a simple turn transition without enemy animation
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
    // Update state with discarded hand, then start enemy turn
    set(discardedState)
    get().startEnemyTurn(discardedState.board)
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
    
    if (stateWithBoard.gameStatus.status !== 'playing') {
      // Game ended, update state with potential copper reward
      updateStateWithCopperReward(set, get, stateWithBoard)
    } else if (shouldEndTurn) {
      // End player turn and start enemy turn immediately using shared logic
      get().performTurnEnd(stateWithBoard.board)
    } else {
      // Always use the copper reward helper to ensure consistency
      updateStateWithCopperReward(set, get, stateWithBoard)
    }
  },

  targetTileForCard: (position: Position) => {
    const currentState = get()
    if (!currentState.pendingCardEffect) return
    if (!currentState.selectedCardName) return
    if (currentState.currentPlayer !== 'player') return
    
    const tile = currentState.board.tiles.get(positionToKey(position))
    if (!tile) return
    
    // For Brush and Sweep cards, allow targeting revealed tiles (they're selecting center of areas)
    if (tile.revealed && currentState.selectedCardName !== 'Brush' && currentState.selectedCardName !== 'Sweep') return
    
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
        const card = currentState.hand.find(c => c.name === currentState.selectedCardName)
        const maxTargets = card?.enhanced ? 3 : 2
        
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
    }
    
    if (shouldExecute && newEffect) {
      // Remove the card from hand first so we can pass it to executeCardEffect
      const cardName = currentState.selectedCardName
      const card = currentState.hand.find(c => c.name === cardName)
      if (!card) {
        // Card not found in hand, clear targeting state and return
        set({
          ...currentState,
          pendingCardEffect: null,
          selectedCardName: null
        })
        return
      }
      
      // Execute the effect with the card for enhanced effects
      const effectState = executeCardEffect(currentState, newEffect, card)
      
      const newHand = currentState.hand.filter(c => c.id !== card.id)
      // Enhanced Energized cards no longer exhaust
      const shouldExhaust = card.exhaust && !(card.name === 'Energized' && card.enhanced)
      // If card has exhaust, put it in exhaust pile; otherwise put in discard
      const newDiscard = shouldExhaust ? effectState.discard : [...effectState.discard, card]
      const newExhaust = shouldExhaust ? [...effectState.exhaust, card] : effectState.exhaust
      
      const finalState = {
        ...effectState,
        hand: newHand,
        discard: newDiscard,
        exhaust: newExhaust,
        energy: effectState.energy - card.cost,
        pendingCardEffect: null
      }
      
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
          get().performTurnEnd(finalState.board)
          return
        }
      }
      
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
      selectedCardName: null
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

  startEnemyTurn: (board: Board) => {
    const currentState = get()
    
    // Clear any pending card targeting state
    const clearedState = {
      ...currentState,
      board,
      pendingCardEffect: null,
      selectedCardName: null
    }
    
    // Process enemy turn with dual clue system
    const enemyTurnResult = processEnemyTurnWithDualClues(clearedState)
    const stateWithEnemyClue = {
      ...enemyTurnResult.stateWithVisibleClues,
      enemyHiddenClues: [...clearedState.enemyHiddenClues, ...enemyTurnResult.hiddenClues]
    }
    const tilesToReveal = enemyTurnResult.tilesToReveal
    
    if (tilesToReveal.length === 0) {
      // No tiles to reveal, end enemy turn immediately
      const newTurnState = startNewTurn(stateWithEnemyClue)
      set({
        ...newTurnState,
        currentPlayer: 'player'
      })
      return
    }
    
    // Check if we're in a test environment
    const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    
    if (isTestEnvironment) {
      // In tests, run enemy turn synchronously
      let boardState = stateWithEnemyClue.board
      for (const tile of tilesToReveal) {
        boardState = revealTile(boardState, tile.position, 'enemy')
        if (tile.owner !== 'enemy') break // Stop if non-enemy tile revealed
      }
      
      const newTurnState = startNewTurn({
        ...stateWithEnemyClue,
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
      ...stateWithEnemyClue,
      currentPlayer: 'enemy',
      enemyAnimation: {
        isActive: true,
        highlightedTile: null,
        revealsRemaining: tilesToReveal,
        currentRevealIndex: 0
      }
    })
    
    // Start the first reveal after a short delay
    setTimeout(() => {
      get().performNextEnemyReveal()
    }, 500)
  },

  performNextEnemyReveal: () => {
    const currentState = get()
    const animation = currentState.enemyAnimation
    
    if (!animation || !animation.isActive) return
    
    const { revealsRemaining, currentRevealIndex } = animation
    
    if (currentRevealIndex >= revealsRemaining.length) {
      // Animation complete, end enemy turn
      const newTurnState = startNewTurn(currentState)
      set({
        ...newTurnState,
        currentPlayer: 'player',
        enemyAnimation: null
      })
      return
    }
    
    const tileToReveal = revealsRemaining[currentRevealIndex]
    
    // Highlight the tile
    set({
      ...currentState,
      enemyAnimation: {
        ...animation,
        highlightedTile: tileToReveal.position
      }
    })
    
    // After highlighting delay, reveal the tile
    setTimeout(() => {
      const state = get()
      const newBoard = revealTile(state.board, tileToReveal.position, 'enemy')
      const shouldContinue = tileToReveal.owner === 'enemy' // Continue if enemy tile
      
      // Check game status after enemy reveal
      const gameStatus = checkGameStatus({
        ...state,
        board: newBoard
      })
      
      const stateWithGameStatus = {
        ...state,
        board: newBoard,
        gameStatus,
        enemyAnimation: {
          ...state.enemyAnimation!,
          highlightedTile: null,
          currentRevealIndex: state.enemyAnimation!.currentRevealIndex + 1
        }
      }
      updateStateWithCopperReward(set, get, stateWithGameStatus)
      
      if (gameStatus.status !== 'playing') {
        // Game ended, stop enemy animation
        const endState = get()
        set({
          ...endState,
          enemyAnimation: null
        })
      } else if (shouldContinue && state.enemyAnimation!.currentRevealIndex + 1 < revealsRemaining.length) {
        // Continue with next reveal after delay
        setTimeout(() => {
          get().performNextEnemyReveal()
        }, 800)
      } else {
        // End enemy turn
        const finalState = get()
        const newTurnState = startNewTurn(finalState)
        set({
          ...newTurnState,
          currentPlayer: 'player',
          enemyAnimation: null
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
    // Find random enemy tiles to target (1 for normal, 2 for enhanced)
    const enemyTiles = getUnrevealedTilesByOwner(state, 'enemy')
    if (enemyTiles.length === 0) return

    const tilesToMark = isEnhanced ? Math.min(2, enemyTiles.length) : 1
    const randomTiles: typeof enemyTiles = []
    
    // Select random tiles without replacement
    const availableTiles = [...enemyTiles]
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

    // Start the enemy-style emphasis animation (show first tile)
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
      const ownerSet = new Set(ownerCombo.split(',').filter(s => s.length > 0)) as Set<'player' | 'enemy' | 'neutral' | 'mine'>
      
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
  }
}))