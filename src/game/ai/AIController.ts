import { GameState, Board } from '../../types'
import { AITurnResult, AIContext, RivalAI } from './AITypes'
import { AIRegistry, selectAIForLevel } from './AIRegistry'
import { generateDualRivalClues, applyVisibleRivalClues } from './utils/aiCommon'
import { getLevelConfig, calculateCopperReward } from '../levelSystem'
import { revealTileWithResult, spawnGoblinsFromLairs, placeRivalSurfaceMines, getTile, hasSpecialTile, cleanGoblin, positionToKey } from '../boardSystem'
import { checkGameStatus, trackPlayerTileReveal } from '../cardEffects'
import { startNewTurn } from '../cardSystem'
import { isTestMode } from '../utils/testMode'
import { checkChokerEffect } from '../equipment'
import { removeStatusEffect } from '../gameRepository'

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
   * Process AI decision-making: generate clues, select tiles
   */
  processRivalTurn(state: GameState): AITurnResult {
    console.log(`[RIVAL-TURN] processRivalTurn called with distractionStackCount=${state.distractionStackCount}`)

    // Get level config for AI selection and special behaviors
    const levelConfig = getLevelConfig(state.currentLevelId)
    if (!levelConfig) {
      throw new Error(`Level config not found for ${state.currentLevelId}`)
    }

    // Select appropriate AI type for this level (with debug override support)
    const aiTypeName = state.aiTypeOverride || selectAIForLevel(levelConfig.specialBehaviors)
    const ai = AIRegistry.create(aiTypeName)

    // Generate dual rival clues (visible X marks + hidden AI clues)
    const dualClues = generateDualRivalClues(
      state,
      state.rivalClueCounter + 1,
      state.rivalClueCounter + 1
    )

    // Apply only visible clues to the game state (X marks for player)
    const stateWithVisibleClues = applyVisibleRivalClues(state, dualClues.visiblePairs)

    // Build AI context
    const context: AIContext = {
      levelConfig,
      turnNumber: 0, // TODO: Track turn number if needed
      specialBehaviors: levelConfig.specialBehaviors || {}
    }

    // Let AI decide which tiles to reveal using hidden clues
    const tilesToReveal = ai.selectTilesToReveal(
      stateWithVisibleClues,
      dualClues.hiddenPairs,
      context
    )

    return {
      stateWithVisibleClues: {
        ...stateWithVisibleClues,
        rivalClueCounter: stateWithVisibleClues.rivalClueCounter + 1
      },
      hiddenClues: dualClues.hiddenPairs,
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

    // CRITICAL: Read distraction count from status effect BEFORE removing it
    let distractionStackCount = 0
    const distractionEffect = currentState.activeStatusEffects.find(e => e.type === 'distraction')
    if (distractionEffect) {
      distractionStackCount = distractionEffect.count || 0
      console.log(`[RIVAL-TURN] Found distraction status effect with ${distractionStackCount} stacks`)
    }

    // Remove Distraction status effect (it was visible during player's turn, now consumed)
    const stateWithoutDistraction = removeStatusEffect(currentState, 'distraction')

    // Clear any pending card targeting state
    const clearedState = {
      ...stateWithoutDistraction,
      board,
      pendingCardEffect: null,
      selectedCardName: null,
      distractionStackCount // Update count for rival clue generation
    }

    // Spawn goblins from lairs BEFORE rival takes their turn
    const boardWithGoblins = spawnGoblinsFromLairs(clearedState.board)
    const stateWithGoblins = {
      ...clearedState,
      board: boardWithGoblins
    }

    // Process rival turn with dual clue system using AI
    const rivalTurnResult = this.processRivalTurn(stateWithGoblins)
    const stateWithRivalClue = {
      ...rivalTurnResult.stateWithVisibleClues,
      rivalHiddenClues: [...stateWithGoblins.rivalHiddenClues, ...rivalTurnResult.hiddenClues]
    }
    const tilesToReveal = rivalTurnResult.tilesToReveal

    // Update rival clue results to include tiles that will be revealed this turn
    const tilesRevealedPositions = tilesToReveal.map(t => t.position)
    const updatedBoard = { ...stateWithRivalClue.board }
    updatedBoard.tiles = new Map(stateWithRivalClue.board.tiles)

    // Update all tiles that have rival clue annotations to include tiles revealed during this turn
    for (const [key, tile] of stateWithRivalClue.board.tiles.entries()) {
      const clueResultsAnnotation = tile.annotations.find(a => a.type === 'clue_results')
      if (clueResultsAnnotation?.clueResults) {
        const updatedClueResults = clueResultsAnnotation.clueResults.map(clueResult => {
          if (clueResult.cardType === 'rival_clue') {
            return {
              ...clueResult,
              tilesRevealedDuringTurn: tilesRevealedPositions
            }
          }
          return clueResult
        })

        const updatedAnnotations = tile.annotations.map(annotation => {
          if (annotation.type === 'clue_results') {
            return {
              ...annotation,
              clueResults: updatedClueResults
            }
          }
          return annotation
        })

        updatedBoard.tiles.set(key, {
          ...tile,
          annotations: updatedAnnotations
        })
      }
    }

    const stateWithUpdatedClues = {
      ...stateWithRivalClue,
      board: updatedBoard
    }

    if (tilesToReveal.length === 0) {
      // No tiles to reveal, place rival mines and end rival turn immediately
      const levelConfig = getLevelConfig(stateWithUpdatedClues.currentLevelId)
      const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
      const boardWithMines = placeRivalSurfaceMines(stateWithUpdatedClues.board, mineCount)
      const newTurnState = startNewTurn({
        ...stateWithUpdatedClues,
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
      let currentState = stateWithUpdatedClues
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

      // Place rival mines before starting new turn
      const levelConfig = getLevelConfig(currentState.currentLevelId)
      const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
      const boardWithMines = placeRivalSurfaceMines(currentState.board, mineCount)

      const newTurnState = startNewTurn({
        ...currentState,
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
      ...stateWithUpdatedClues,
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
      // Animation complete, place rival mines and end rival turn
      const levelConfig = getLevelConfig(currentState.currentLevelId)
      const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
      const boardWithMines = placeRivalSurfaceMines(currentState.board, mineCount)
      const newTurnState = startNewTurn({
        ...currentState,
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
        // End rival turn, place rival mines and start new turn
        const finalState = this.getState()
        const levelConfig = getLevelConfig(finalState.currentLevelId)
        const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
        const boardWithMines = placeRivalSurfaceMines(finalState.board, mineCount)
        const newTurnState = startNewTurn({
          ...finalState,
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
