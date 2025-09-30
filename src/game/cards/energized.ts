import { GameState } from '../../types'

export function executeEnergizedEffect(state: GameState, _card?: import('../../types').Card): GameState {
  // Gain 2 energy (no maximum limit)
  // Enhanced version no longer exhausts (handled in cardSystem.ts)
  return {
    ...state,
    energy: state.energy + 2
  }
}