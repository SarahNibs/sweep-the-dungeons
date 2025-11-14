import { GameState, Card } from '../../types'
import { generatePlayerImperiousInstructions } from '../clueSystem'
import { addClueResult, addOwnerSubsetAnnotation } from '../cardEffects'
import { positionToKey } from '../boardSystem'

export function executeImperiousInstructionsEffect(state: GameState, card?: Card): GameState {
  const enhanced = card?.enhanced || false
  const result = generatePlayerImperiousInstructions(state, state.clueCounter + 1, state.playerClueCounter + 1, enhanced)

  let newState = {
    ...state,
    clueCounter: state.clueCounter + 1,
    playerClueCounter: state.playerClueCounter + 1,
    instructionsPlayedThisFloor: new Set([...state.instructionsPlayedThisFloor, 'Imperious Instructions'])
  }

  // Collect all affected tile positions for enhanced annotation
  const affectedPositions: Set<string> = new Set()

  // Use the clueResultPairs to properly match each ClueResult to its target position
  if (result.clueResultPairs) {
    for (const { clueResult, targetPosition } of result.clueResultPairs) {
      newState = addClueResult(newState, targetPosition, clueResult)
      affectedPositions.add(positionToKey(targetPosition))
    }
  } else {
    for (const clueResult of result.clueResults) {
      if (clueResult.allAffectedTiles.length > 0) {
        newState = addClueResult(newState, clueResult.allAffectedTiles[0], clueResult)
        affectedPositions.add(positionToKey(clueResult.allAffectedTiles[0]))
      }
    }
  }

  // Enhanced Imperious Instructions: add owner_subset annotation (excludes mines)
  if (enhanced && affectedPositions.size > 0) {
    const noMineSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'rival', 'neutral'])

    affectedPositions.forEach(key => {
      const [x, y] = key.split(',').map(Number)
      newState = addOwnerSubsetAnnotation(newState, { x, y }, noMineSubset)
    })
  }

  return newState
}