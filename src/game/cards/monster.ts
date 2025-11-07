import { GameState } from '../../types'
import { drawCards } from '../cardSystem'

export function executeMonsterEffect(state: GameState, card?: import('../../types').Card): GameState {
  // Enhanced: Draw 4 cards, Normal: Draw 2 cards
  const cardCount = card?.enhanced ? 4 : 2
  
  const result = drawCards(state, cardCount)
  return result
}