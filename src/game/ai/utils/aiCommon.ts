import { GameState, ClueResult, Position } from '../../../types'
import { prepareRivalClueSetup, generateRivalClueWithSharedSetup } from '../../clueSystem'
import { RivalClueSet } from '../AITypes'

/**
 * Generate dual rival clues: visible (X marks) and hidden (AI-only)
 * Both use the same tile selection but different random draws from the bag
 */
export function generateDualRivalClues(
  state: GameState,
  clueOrder: number,
  clueRowPosition: number
): RivalClueSet {
  // Share the same tile selection and bag construction
  const { chosenRivalTiles, chosenRandomTiles } = prepareRivalClueSetup(state)

  // Generate two different clue sets using the same setup but different random draws
  const visibleResult = generateRivalClueWithSharedSetup(
    chosenRivalTiles,
    chosenRandomTiles,
    clueOrder,
    clueRowPosition
  )

  const hiddenResult = generateRivalClueWithSharedSetup(
    chosenRivalTiles,
    chosenRandomTiles,
    clueOrder + 1000, // Different ID space to avoid conflicts
    clueRowPosition
  )

  return {
    visible: visibleResult.clueResults,
    hidden: hiddenResult.clueResults,
    visiblePairs: visibleResult.clueResultPairs || [],
    hiddenPairs: hiddenResult.clueResultPairs || []
  }
}

/**
 * Apply visible rival clues (X marks) to the game state
 * This modifies tile annotations to show X marks to the player
 */
export function applyVisibleRivalClues(
  state: GameState,
  visiblePairs: { clueResult: ClueResult; targetPosition: Position }[]
): GameState {
  let newState = state

  // Use the clueResultPairs to properly match each ClueResult to its target position
  for (const { clueResult, targetPosition } of visiblePairs) {
    const key = `${targetPosition.x},${targetPosition.y}`
    const tile = newState.board.tiles.get(key)

    if (tile && !tile.revealed) {
      const existingClueAnnotation = tile.annotations.find(a => a.type === 'clue_results')

      let newAnnotations
      if (existingClueAnnotation) {
        // Add to existing clue results
        const updatedClueResults = [...(existingClueAnnotation.clueResults || []), clueResult]
        newAnnotations = tile.annotations.map(a =>
          a.type === 'clue_results'
            ? { ...a, clueResults: updatedClueResults }
            : a
        )
      } else {
        // Create new clue results annotation
        newAnnotations = [
          ...tile.annotations,
          {
            type: 'clue_results' as const,
            clueResults: [clueResult]
          }
        ]
      }

      const newTiles = new Map(newState.board.tiles)
      newTiles.set(key, {
        ...tile,
        annotations: newAnnotations
      })

      newState = {
        ...newState,
        board: {
          ...newState.board,
          tiles: newTiles
        }
      }
    }
  }

  return newState
}

/**
 * Log the top tiles for AI debugging
 */
export function logAIPriorityAnalysis(): void {
  // Log AI priority analysis
  // (removed for production)
}
