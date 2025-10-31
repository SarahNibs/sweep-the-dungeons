import { GameState, Board } from '../../types'
import { AITurnResult, AIContext, RivalAI } from './AITypes'
import { AIRegistry, selectAIForLevel } from './AIRegistry'
import { generateDualRivalClues, applyVisibleRivalClues } from './utils/aiCommon'
import { getLevelConfig, calculateCopperReward } from '../levelSystem'
import { revealTile, revealTileWithResult, spawnGoblinsFromLairs, placeRivalSurfaceMines, getTile, hasSpecialTile, cleanGoblin, positionToKey } from '../boardSystem'
import { checkGameStatus } from '../cardEffects'
import { startNewTurn } from '../cardSystem'
import { isTestMode } from '../utils/testMode'
import { checkChokerEffect } from '../relics'

/**
 * Helper function to update state and award copper if game was just won
 */
function updateStateWithCopperReward(
  set: (state: GameState) => void,
  get: () => GameState,
  newState: GameState
): void {
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
      hiddenClues: dualClues.hidden,
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

    // Process rival turn with dual clue system using AI
    const rivalTurnResult = this.processRivalTurn(clearedState)
    const stateWithRivalClue = {
      ...rivalTurnResult.stateWithVisibleClues,
      rivalHiddenClues: [...clearedState.rivalHiddenClues, ...rivalTurnResult.hiddenClues]
    }
    const tilesToReveal = rivalTurnResult.tilesToReveal

    if (tilesToReveal.length === 0) {
      // No tiles to reveal, spawn goblins from lairs and place rival mines, then end rival turn immediately
      const boardWithGoblins = spawnGoblinsFromLairs(stateWithRivalClue.board)
      const levelConfig = getLevelConfig(stateWithRivalClue.currentLevelId)
      const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
      const boardWithMines = placeRivalSurfaceMines(boardWithGoblins, mineCount)
      const newTurnState = startNewTurn({
        ...stateWithRivalClue,
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
      let boardState = stateWithRivalClue.board
      for (const tile of tilesToReveal) {
        boardState = revealTile(boardState, tile.position, 'rival')
        if (tile.owner !== 'rival') break // Stop if non-rival tile revealed
      }

      // Spawn goblins from lairs and place rival mines before starting new turn
      boardState = spawnGoblinsFromLairs(boardState)
      const levelConfig = getLevelConfig(stateWithRivalClue.currentLevelId)
      const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
      boardState = placeRivalSurfaceMines(boardState, mineCount)

      const newTurnState = startNewTurn({
        ...stateWithRivalClue,
        board: boardState
      })
      this.setState({
        ...newTurnState,
        currentPlayer: 'player'
      })
      return
    }

    // Start the animation sequence
    this.setState({
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
      // Animation complete, spawn goblins from lairs, place rival mines, and end rival turn
      const boardWithGoblins = spawnGoblinsFromLairs(currentState.board)
      const levelConfig = getLevelConfig(currentState.currentLevelId)
      const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
      const boardWithMines = placeRivalSurfaceMines(boardWithGoblins, mineCount)
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
      console.log(`⚠️ Rival tried to reveal already-revealed tile at (${tileToReveal.position.x}, ${tileToReveal.position.y}), skipping to next`)
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
      if (tileAfterGoblinMove && tileAfterGoblinMove.owner === 'mine' && state.rivalMineProtectionCount > 0) {
        console.log(`🛡️ Rival revealed protected mine! Awarding 5 copper and decrementing protection count`)

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
          console.log(`📿 CHOKER TRIGGERED: Rival has 5 tiles remaining - ending rival turn`)
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
        // End rival turn, spawn goblins from lairs, place rival mines, and start new turn
        const finalState = this.getState()
        const boardWithGoblins = spawnGoblinsFromLairs(finalState.board)
        const levelConfig = getLevelConfig(finalState.currentLevelId)
        const mineCount = levelConfig?.specialBehaviors.rivalPlacesMines || 0
        const boardWithMines = placeRivalSurfaceMines(boardWithGoblins, mineCount)
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
