import { GameState } from '../../types'
import { AITurnResult, AIContext, RivalAI } from './AITypes'
import { AIRegistry, selectAIForLevel } from './AIRegistry'
import { generateDualRivalClues, applyVisibleRivalClues } from './utils/aiCommon'
import { getLevelConfig } from '../levelSystem'

/**
 * AIController - Main controller for rival AI system
 * Orchestrates AI decisions, clue generation, and state updates
 */
export class AIController {
  /**
   * Process a complete rival turn: generate clues, select tiles, update state
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
   */
  getCurrentAI(state: GameState): RivalAI {
    const levelConfig = getLevelConfig(state.currentLevelId)
    if (!levelConfig) {
      throw new Error(`Level config not found for ${state.currentLevelId}`)
    }

    const aiTypeName = state.aiTypeOverride || selectAIForLevel(levelConfig.specialBehaviors)
    return AIRegistry.create(aiTypeName)
  }
}
