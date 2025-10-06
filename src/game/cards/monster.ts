import { GameState } from '../../types'
import { drawCards } from '../cardSystem'

export function executeMonsterEffect(state: GameState, card?: import('../../types').Card): GameState {
  // Enhanced: Draw 4 cards, Normal: Draw 2 cards
  const cardCount = card?.enhanced ? 4 : 2
  console.log('🥤 MONSTER CARD DEBUG')
  console.log('  - Enhanced:', card?.enhanced)
  console.log('  - Cards to draw:', cardCount)
  
  const result = drawCards(state, cardCount)
  console.log('  - Monster effect completed')
  return result
}