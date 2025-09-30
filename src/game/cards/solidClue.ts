import { GameState } from '../../types'
import { generatePlayerSolidClue } from '../clueSystem'
import { addClueResult } from '../cardEffects'

export function executeSolidClueEffect(state: GameState): GameState {
  const result = generatePlayerSolidClue(state, state.clueCounter + 1, state.playerClueCounter + 1)
  
  let newState = { 
    ...state, 
    clueCounter: state.clueCounter + 1,
    playerClueCounter: state.playerClueCounter + 1
  }
  
  // Use the clueResultPairs to properly match each ClueResult to its target position
  if (result.clueResultPairs) {
    for (const { clueResult, targetPosition } of result.clueResultPairs) {
      newState = addClueResult(newState, targetPosition, clueResult)
    }
  } else {
    for (const clueResult of result.clueResults) {
      if (clueResult.allAffectedTiles.length > 0) {
        newState = addClueResult(newState, clueResult.allAffectedTiles[0], clueResult)
      }
    }
  }
  
  return newState
}