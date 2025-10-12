import { GameState, Card } from '../../types'
import { generatePlayerStretchClue } from '../clueSystem'
import { addClueResult } from '../cardEffects'

export function executeStretchClueEffect(state: GameState, card?: Card): GameState {
  const enhanced = card?.enhanced || false
  const result = generatePlayerStretchClue(state, state.clueCounter + 1, state.playerClueCounter + 1, enhanced)
  
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
  }
  
  return newState
}