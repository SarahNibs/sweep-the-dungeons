import { GameState } from '../../types'
import { addDistractionPoint, getExcludedPositionsByAdjacency } from '../clueSystem'

/**
 * Ramble: Add distraction points to rival intent
 * - Basic: 2 distractions
 * - Enhanced: 4 distractions
 */
export function executeRambleEffect(state: GameState, card?: import('../../types').Card): GameState {
  const distractionsToAdd = card?.enhanced ? 4 : 2

  if (state.debugFlags.debugLogging) {
    console.log(`[RAMBLE] Adding ${distractionsToAdd} distraction points (enhanced=${card?.enhanced})`)
  }

  // Clone the current rivalIntentPoints
  const rivalIntentPoints = { ...state.rivalIntentPoints }

  // Get excluded positions for adjacency rules
  const excludedPositions = getExcludedPositionsByAdjacency(state.board, 'rival')

  // Add the distraction points
  for (let i = 0; i < distractionsToAdd; i++) {
    addDistractionPoint(rivalIntentPoints, excludedPositions)
  }

  if (state.debugFlags.debugLogging) {
    console.log(`[RAMBLE] Updated rivalIntentPoints:`, rivalIntentPoints)
  }

  return {
    ...state,
    rivalIntentPoints
  }
}
