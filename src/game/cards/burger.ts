import { GameState, Card } from '../../types'
import { createStatusEffect } from '../gameRepository'

/**
 * Burger card effect: grants bonus card draw every turn for 3 floors
 * Base version adds 2 stacks, enhanced adds 3 stacks
 * Each stack lasts for 1 floor completion
 * As long as there are any stacks, draw +1 card per turn
 */
export function executeBurgerEffect(state: GameState, card?: Card): GameState {

  const stacksToAdd = card?.enhanced ? 3 : 2

  // Check if we already have burger status effect
  const existingBurger = state.activeStatusEffects.find(e => e.type === 'burger')

  let newState = state

  if (existingBurger) {
    // Add more stacks
    const newCount = (existingBurger.count || 0) + stacksToAdd

    newState = {
      ...state,
      activeStatusEffects: state.activeStatusEffects.map(e =>
        e.type === 'burger'
          ? {
              ...e,
              count: newCount,
              description: `Draw +1 card every turn (${newCount} floor${newCount > 1 ? 's' : ''} remaining)`
            }
          : e
      )
    }
  } else {
    // Create new burger status effect with stacks using centralized definition
    // Don't pass enhanced flag - the enhanced state is reflected in the count, not the UI indicator
    const baseEffect = createStatusEffect('burger', false)
    const burgerEffect = {
      ...baseEffect,
      count: stacksToAdd,
      description: `Draw +1 card every turn (${stacksToAdd} floor${stacksToAdd > 1 ? 's' : ''} remaining)`
    }

    newState = {
      ...state,
      activeStatusEffects: [...state.activeStatusEffects, burgerEffect]
    }
  }

  return newState
}

/**
 * Decrement Burger stacks when completing a floor
 * Called from advanceToNextLevel
 */
export function decrementBurgerStacks(state: GameState): GameState {
  const burgerEffect = state.activeStatusEffects.find(e => e.type === 'burger')

  if (!burgerEffect) {
    return state
  }

  const newCount = (burgerEffect.count || 0) - 1

  if (newCount <= 0) {
    // Remove the effect
    return {
      ...state,
      activeStatusEffects: state.activeStatusEffects.filter(e => e.type !== 'burger')
    }
  } else {
    // Update count
    return {
      ...state,
      activeStatusEffects: state.activeStatusEffects.map(e =>
        e.type === 'burger'
          ? {
              ...e,
              count: newCount,
              description: `Draw +1 card every turn (${newCount} floor${newCount > 1 ? 's' : ''} remaining)`
            }
          : e
      )
    }
  }
}
