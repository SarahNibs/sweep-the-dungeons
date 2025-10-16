import { GameState } from '../../types'
import { addStatusEffect } from '../gameRepository'

export function executeUnderwireEffect(state: GameState, card?: import('../../types').Card): GameState {
  console.log('🛡️ UNDERWIRE CARD PLAYED')
  console.log('Before effect:')
  console.log('  - underwireProtection:', state.underwireProtection)
  console.log('  - activeStatusEffects:', state.activeStatusEffects)
  console.log('  - enhanced:', card?.enhanced)
  
  // Activate mine protection for this level
  const stateWithProtection = {
    ...state,
    underwireProtection: {
      active: true,
      enhanced: card?.enhanced || false
    }
  }
  
  console.log('After setting protection:')
  console.log('  - underwireProtection:', stateWithProtection.underwireProtection)
  
  // Add underwire status effect (don't pass enhanced flag - effect is the same, only exhausting differs)
  const finalState = addStatusEffect(stateWithProtection, 'underwire_protection', false)
  
  console.log('After adding status effect:')
  console.log('  - underwireProtection:', finalState.underwireProtection)
  console.log('  - activeStatusEffects:', finalState.activeStatusEffects)
  
  return finalState
}