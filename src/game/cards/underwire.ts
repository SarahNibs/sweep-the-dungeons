import { GameState } from '../../types'
import { addStatusEffect } from '../gameRepository'

export function executeUnderwireEffect(state: GameState, card?: import('../../types').Card): GameState {
  
  // Activate mine protection for this level
  const stateWithProtection = {
    ...state,
    underwireProtection: {
      active: true,
      enhanced: card?.enhanced || false
    }
  }
  
  
  // Add underwire status effect (don't pass enhanced flag - effect is the same, only exhausting differs)
  const finalState = addStatusEffect(stateWithProtection, 'underwire_protection', false)
  
  
  return finalState
}