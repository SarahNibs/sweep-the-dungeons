import { GameState, Board, Position } from '../../types'
import { AITurnResult, AIContext, RivalAI } from './AITypes'
import { AIRegistry, selectAIForLevel } from './AIRegistry'
import { getLevelConfig, calculateCopperReward } from '../levelSystem'
import { revealTileWithResult, spawnGoblinsFromLairs, placeRivalSurfaceMines, getTile, hasSpecialTile, cleanGoblin, positionToKey } from '../boardSystem'
import { checkGameStatus, trackPlayerTileReveal } from '../cardEffects'
import { startNewTurn } from '../cardSystem'
import { isTestMode } from '../utils/testMode'
import { checkChokerEffect } from '../equipment'
import { checkTauntTrigger, updateTauntStatusEffects } from '../cards/taunt'
import { decayRivalIntentPoints } from '../clueSystem'

/**
 * Helper function to update state and award copper if game was just won
 */
function updateStateWithCopperReward(
  set: (state: GameState) => void,
  get: () => GameState,
  newState: GameState
): void {

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
 * AIController - Main controller for rival AI system
 * Orchestrates AI decisions, clue generation, state updates, and rival turn animations
 */
export class AIController {
  constructor(
    private getState: () => GameState,
    private setState: (state: Partial<GameState> | GameState) => void
  ) {}

  /**
   * Process AI decision-making: use rivalIntentPoints to select tiles
   */
  processRivalTurn(state: GameState): AITurnResult {
    if (state.debugFlags.debugLogging) {
      console.log(`[RIVAL-TURN] processRivalTurn called with rivalIntentPoints:`, state.rivalIntentPoints)
    }

    // Clean up rivalIntentPoints: remove any revealed tiles
    // This handles cases where the player revealed tiles during their turn
    const cleanedIntentPoints: { [key: string]: number } = {}
    for (const [key, points] of Object.entries(state.rivalIntentPoints)) {
      const tile = state.board.tiles.get(key)
      if (tile && !tile.revealed) {
        cleanedIntentPoints[key] = points
      }
    }

    // Update state with cleaned points
    const stateWithCleanedPoints = {
      ...state,
      rivalIntentPoints: cleanedIntentPoints
    }

    if (state.debugFlags.debugLogging) {
      const removedCount = Object.keys(state.rivalIntentPoints).length - Object.keys(cleanedIntentPoints).length
      if (removedCount > 0) {
        console.log(`[RIVAL-TURN] Removed ${removedCount} revealed tiles from intent points`)
      }
    }

    // Get level config for AI selection and special behaviors
    const levelConfig = getLevelConfig(stateWithCleanedPoints.currentLevelId)
    if (!levelConfig) {
      throw new Error(`Level config not found for ${stateWithCleanedPoints.currentLevelId}`)
    }

    // Select appropriate AI type for this level (with debug override support)
    const aiTypeName = stateWithCleanedPoints.aiTypeOverride || selectAIForLevel(levelConfig.specialBehaviors)
    const ai = AIRegistry.create(aiTypeName)

    // Build AI context
    const context: AIContext = {
      levelConfig,
      turnNumber: 0, // TODO: Track turn number if needed
      specialBehaviors: levelConfig.specialBehaviors || {}
    }

    // Let AI decide which tiles to reveal using rivalIntentPoints
    const tilesToReveal = ai.selectTilesToReveal(
      stateWithCleanedPoints,
      stateWithCleanedPoints.rivalIntentPoints,
      context
    )

    return {
      stateWithVisibleClues: stateWithCleanedPoints,
      tilesToReveal
    }
  }

  /**
   * Get the current AI instance for a given state
   * Static method - doesn't require controller instantiation
   */
  static getCurrentAI(state: GameState): RivalAI {
    const levelConfig = getLevelConfig(state.currentLevelId)
    if (!levelConfig) {
      throw new Error(`Level config not found for ${state.currentLevelId}`)
    }

    const aiTypeName = state.aiTypeOverride || selectAIForLevel(levelConfig.specialBehaviors)
    return AIRegistry.create(aiTypeName)
  }

  /**
   * Start rival turn with AI decision-making and animation
   */
  startRivalTurn(board: Board): void {
    const currentState = this.getState()

    // Clear any pending card targeting state
    const clearedState = {
      ...currentState,
      board,
      pendingCardEffect: null,
      selectedCardName: null
    }

    // Spawn goblins from lairs BEFORE rival takes their turn
    const boardWithGoblins = spawnGoblinsFromLairs(clearedState.board)
    const stateWithGoblins = {
      ...clearedState,
      board: boardWithGoblins
    }

    // Process rival turn using rivalIntentPoints
    const rivalTurnResult = this.processRivalTurn(stateWithGoblins)
    const stateAfterAI = rivalTurnResult.stateWithVisibleClues
    const tilesToReveal = rivalTurnResult.tilesToReveal

    if (tilesToReveal.length === 0) {
      // No tiles to reveal, place rival mines and end rival turn immediately
      const levelConfig = getLevelConfig(stateAfterAI.currentLevelId)
      const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
      const boardWithMines = placeRivalSurfaceMines(stateAfterAI.board, mineCount)
      const newTurnState = startNewTurn({
        ...stateAfterAI,
        board: boardWithMines
      })
      this.setState({
        ...newTurnState,
        currentPlayer: 'player'
      })
      return
    }

    if (isTestMode()) {
      // In tests, run rival turn synchronously
      let currentState = stateAfterAI
      for (const tile of tilesToReveal) {
        const revealResult = revealTileWithResult(currentState.board, tile.position, 'rival')
        currentState = {
          ...currentState,
          board: revealResult.board
        }
        // Track player tile reveals
        currentState = trackPlayerTileReveal(currentState, tile.position, revealResult.revealed)

        if (tile.owner !== 'rival') break // Stop if non-rival tile revealed
      }

      // Apply point decay after all reveals
      const revealedPositions: Position[] = tilesToReveal.map(t => t.position)
      const stateAfterDecay = decayRivalIntentPoints(currentState, revealedPositions)

      // Place rival mines before starting new turn
      const levelConfig = getLevelConfig(stateAfterDecay.currentLevelId)
      const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
      const boardWithMines = placeRivalSurfaceMines(stateAfterDecay.board, mineCount)

      const newTurnState = startNewTurn({
        ...stateAfterDecay,
        board: boardWithMines
      })
      this.setState({
        ...newTurnState,
        currentPlayer: 'player'
      })
      return
    }

    // Start the animation sequence
    this.setState({
      ...stateAfterAI,
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
      this.performNextRivalReveal()
    }, 500)
  }

  /**
   * Perform next step in rival reveal animation sequence
   */
  performNextRivalReveal(): void {
    const currentState = this.getState()
    const animation = currentState.rivalAnimation

    if (!animation || !animation.isActive) return

    const { revealsRemaining, currentRevealIndex } = animation

    if (currentRevealIndex >= revealsRemaining.length) {
      // Animation complete, apply point decay before starting new turn
      const revealedPositions: Position[] = revealsRemaining.map(t => t.position)
      const stateAfterDecay = decayRivalIntentPoints(currentState, revealedPositions)

      // Place rival mines and end rival turn
      const levelConfig = getLevelConfig(stateAfterDecay.currentLevelId)
      const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
      const boardWithMines = placeRivalSurfaceMines(stateAfterDecay.board, mineCount)
      const newTurnState = startNewTurn({
        ...stateAfterDecay,
        board: boardWithMines
      })

      // Set state with glassesNeedsTingleAnimation flag
      // The App.tsx useEffect will detect this and trigger the animation
      this.setState({
        ...newTurnState,
        currentPlayer: 'player',
        rivalAnimation: null
      })
      return
    }

    const tileToReveal = revealsRemaining[currentRevealIndex]

    // BUGFIX: Check if tile is already revealed BEFORE highlighting
    // This can happen when AI plans to reveal a tile multiple times (e.g., once to clean goblin, once to reveal)
    const currentTile = getTile(currentState.board, tileToReveal.position)
    if (currentTile && currentTile.revealed) {
      this.setState({
        ...currentState,
        rivalAnimation: {
          ...animation,
          highlightedTile: null,
          currentRevealIndex: currentRevealIndex + 1
        }
      })
      setTimeout(() => {
        this.performNextRivalReveal()
      }, 100) // Short delay before next reveal
      return
    }

    // Highlight the tile
    this.setState({
      ...currentState,
      rivalAnimation: {
        ...animation,
        highlightedTile: tileToReveal.position
      }
    })

    // After highlighting delay, check for goblin first, then reveal the tile
    setTimeout(() => {
      const state = this.getState()

      // Check if tile has a goblin and move it first
      let currentBoard = state.board

      if (currentTile && hasSpecialTile(currentTile, 'goblin')) {
        const { board: boardAfterGoblinMove } = cleanGoblin(currentBoard, tileToReveal.position)
        currentBoard = boardAfterGoblinMove
      }

      // Get the tile AFTER goblin movement to check its current owner
      const tileAfterGoblinMove = getTile(currentBoard, tileToReveal.position)

      // Now reveal the tile (which no longer has a goblin)
      const revealResult = revealTileWithResult(currentBoard, tileToReveal.position, 'rival')
      const newBoard = revealResult.board

      // BUGFIX: Check the owner AFTER goblin movement, not the original owner
      // The goblin movement can change tile ownership, so we must use the updated owner
      let shouldContinue = revealResult.revealed && tileAfterGoblinMove ? tileAfterGoblinMove.owner === 'rival' : false

      // Check if rival revealed a mine with protection active
      let stateAfterReveal = { ...state, board: newBoard }

      // Track player tile reveals and award copper every 5th reveal
      stateAfterReveal = trackPlayerTileReveal(stateAfterReveal, tileToReveal.position, revealResult.revealed)
      if (tileAfterGoblinMove && tileAfterGoblinMove.owner === 'mine' && state.rivalMineProtectionCount > 0) {

        // Mark the mine tile as protected (similar to Underwire)
        const protectedTileKey = positionToKey(tileToReveal.position)
        const protectedTile = stateAfterReveal.board.tiles.get(protectedTileKey)
        if (protectedTile) {
          const newTiles = new Map(stateAfterReveal.board.tiles)
          newTiles.set(protectedTileKey, {
            ...protectedTile,
            rivalMineProtected: true
          })
          stateAfterReveal = {
            ...stateAfterReveal,
            board: {
              ...stateAfterReveal.board,
              tiles: newTiles
            }
          }
        }

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

      // Check for Choker effect - rival has exactly 5 tiles left
      if (revealResult.revealed) {
        const chokerResult = checkChokerEffect(stateAfterReveal)
        if (chokerResult.shouldEndTurn && chokerResult.reason === 'choker_rival') {
          shouldContinue = false
        }
      }

      // Update Taunt status effects after reveal
      if (revealResult.revealed) {
        stateAfterReveal = updateTauntStatusEffects(stateAfterReveal)
      }

      // Check for Taunt effect - rival revealed all taunted tiles
      if (revealResult.revealed) {
        const triggeredTauntId = checkTauntTrigger(stateAfterReveal, tileToReveal.position)
        if (triggeredTauntId) {
          // Remove the completed taunt status effect
          stateAfterReveal = {
            ...stateAfterReveal,
            activeStatusEffects: stateAfterReveal.activeStatusEffects.filter(e => e.id !== triggeredTauntId)
          }
          shouldContinue = false
        }
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
      updateStateWithCopperReward(this.setState.bind(this), this.getState, stateWithGameStatus)

      if (gameStatus.status !== 'playing') {
        // Game ended, stop rival animation
        const endState = this.getState()
        this.setState({
          ...endState,
          rivalAnimation: null
        })
      } else if (shouldContinue && state.rivalAnimation!.currentRevealIndex + 1 < revealsRemaining.length) {
        // Continue with next reveal after delay
        setTimeout(() => {
          this.performNextRivalReveal()
        }, 800)
      } else {
        // End rival turn, apply point decay for all revealed tiles
        const finalState = this.getState()
        const revealedTiles = revealsRemaining.slice(0, finalState.rivalAnimation!.currentRevealIndex + 1)
        const revealedPositions: Position[] = revealedTiles.map(t => t.position)
        const stateAfterDecay = decayRivalIntentPoints(finalState, revealedPositions)

        // Place rival mines and start new turn
        const levelConfig = getLevelConfig(stateAfterDecay.currentLevelId)
        const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
        const boardWithMines = placeRivalSurfaceMines(stateAfterDecay.board, mineCount)
        const newTurnState = startNewTurn({
          ...stateAfterDecay,
          board: boardWithMines
        })

        // Set state with glassesNeedsTingleAnimation flag
        // The App.tsx useEffect will detect this and trigger the animation
        this.setState({
          ...newTurnState,
          currentPlayer: 'player',
          rivalAnimation: null
        })
      }
    }, 1000) // Highlighting duration
  }
}
