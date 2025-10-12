import { GameState, ClueResult, Position, Tile } from '../../../types'
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
  console.log('=== GENERATING PLAYER-FACING RIVAL CLUES (Xs) ===')
  const visibleResult = generateRivalClueWithSharedSetup(
    chosenRivalTiles,
    chosenRandomTiles,
    clueOrder,
    clueRowPosition
  )

  console.log('=== GENERATING AI-ONLY RIVAL CLUES (Hidden) ===')
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
export function logAIPriorityAnalysis(
  tilesWithPriority: Array<{ tile: Tile; priority: number }>,
  hiddenRivalCluesPairs: { clueResult: ClueResult; targetPosition: Position }[],
  rivalNeverMines: boolean
): void {
  console.log('=== ENEMY AI PRIORITY ANALYSIS ===')
  const topFour = tilesWithPriority.slice(0, 4)
  topFour.forEach((item, index) => {
    const tile = item.tile
    const pos = `(${tile.position.x},${tile.position.y})`
    const owner = tile.owner
    const priority = item.priority.toFixed(2)

    // Get player clue information
    const playerClueAnnotations = tile.annotations.find(a => a.type === 'clue_results')
    let playerClueInfo = 'none'
    if (playerClueAnnotations?.clueResults) {
      const playerClues = playerClueAnnotations.clueResults.filter(r => r.cardType !== 'rival_clue')
      if (playerClues.length > 0) {
        playerClueInfo = playerClues.map(r => `${r.strengthForThisTile}pips`).join(', ')
      }
    }

    // Get hidden rival clue information
    let rivalClueInfo = 'none'
    const affectedByRivalClues = hiddenRivalCluesPairs.filter(({ targetPosition }) => {
      return targetPosition.x === tile.position.x && targetPosition.y === tile.position.y
    })
    if (affectedByRivalClues.length > 0) {
      rivalClueInfo = affectedByRivalClues.map(({ clueResult }) => `${clueResult.strengthForThisTile}pips`).join(', ')
    }

    console.log(`${index + 1}. ${pos} [${owner}] Priority: ${priority} | Player: ${playerClueInfo} | Rival-Hidden: ${rivalClueInfo}`)
  })
  console.log('=====================================')
  if (rivalNeverMines) {
    console.log('SPECIAL BEHAVIOR: Rival will skip mine tiles')
  }
}
