import { GameState } from '../../types'
import { executeCardEffect } from '../cardEffects'

export function executeMaskingEffect(state: GameState, targetCardId: string, maskingCard?: import('../../types').Card): GameState {
  // Find the target card in hand
  const targetCard = state.hand.find(card => card.id === targetCardId)

  if (!targetCard) {
    // Target card not found in hand
    return state
  }

  if (targetCard.name === 'Masking') {
    // Can't masking another masking
    return state
  }

  // Map card name to effect type for immediate-effect cards
  let effect: any = null

  switch (targetCard.name) {
    case 'Imperious Instructions':
      effect = { type: 'solid_clue' }
      break
    case 'Vague Instructions':
      effect = { type: 'stretch_clue' }
      break
    case 'Sarcastic Instructions':
      effect = { type: 'sarcastic_orders' }
      break
    case 'Energized':
      effect = { type: 'energized' }
      break
    case 'Options':
      effect = { type: 'options' }
      break
    case 'Ramble':
      effect = { type: 'ramble' }
      break
    case 'Underwire':
      effect = { type: 'underwire' }
      break
    case 'Monster':
      effect = { type: 'monster' }
      break
    case 'Tryst':
      // Tryst without targeting (basic version)
      effect = { type: 'tryst', target: undefined }
      break
    default:
      // Targeting cards like Tingle are not supported with Masking
      // This would require complex UI handling
      return state
  }

  // Execute the target card's effect
  let newState = executeCardEffect(state, effect, targetCard)

  // Remove target card from hand
  newState = {
    ...newState,
    hand: newState.hand.filter(card => card.id !== targetCardId)
  }

  // Exhaust the target card (always exhausts)
  newState = {
    ...newState,
    exhaust: [...newState.exhaust, targetCard]
  }

  // Set flag to exhaust masking card too (unless enhanced)
  if (!maskingCard?.enhanced) {
    newState = {
      ...newState,
      shouldExhaustLastCard: true
    }
  }

  return newState
}
