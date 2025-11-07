import { GameState, Card } from '../../types'
import { createStatusEffect } from '../gameRepository'

/**
 * Ice Cream card effect: grants 1 energy when gaining copper from revealing player tiles
 * Base version adds 2 stacks, enhanced adds 3 stacks
 * Each stack lasts for 1 floor completion
 * As long as there are any stacks, gain +1 energy when revealing player tiles grants copper
 */
export function executeIceCreamEffect(state: GameState, card?: Card): GameState {

  const stacksToAdd = card?.enhanced ? 3 : 2

  // Check if we already have ice cream status effect
  const existingIceCream = state.activeStatusEffects.find(e => e.type === 'ice_cream')

  let newState = state

  if (existingIceCream) {
    // Add more stacks
    const newCount = (existingIceCream.count || 0) + stacksToAdd

    newState = {
      ...state,
      activeStatusEffects: state.activeStatusEffects.map(e =>
        e.type === 'ice_cream'
          ? {
              ...e,
              count: newCount,
              description: `Gain +1 energy when revealing player tiles grants copper (${newCount} floor${newCount > 1 ? 's' : ''} remaining)`
            }
          : e
      )
    }
  } else {
    // Create new ice cream status effect with stacks using centralized definition
    const baseEffect = createStatusEffect('ice_cream', card?.enhanced)
    const iceCreamEffect = {
      ...baseEffect,
      count: stacksToAdd,
      description: `Gain +1 energy when revealing player tiles grants copper (${stacksToAdd} floor${stacksToAdd > 1 ? 's' : ''} remaining)`
    }

    newState = {
      ...state,
      activeStatusEffects: [...state.activeStatusEffects, iceCreamEffect]
    }
  }

  return newState
}

/**
 * Decrement Ice Cream stacks when completing a floor
 * Called from advanceToNextLevel
 */
export function decrementIceCreamStacks(state: GameState): GameState {
  const iceCreamEffect = state.activeStatusEffects.find(e => e.type === 'ice_cream')

  if (!iceCreamEffect) {
    return state
  }

  const newCount = (iceCreamEffect.count || 0) - 1

  if (newCount <= 0) {
    // Remove the effect
    return {
      ...state,
      activeStatusEffects: state.activeStatusEffects.filter(e => e.type !== 'ice_cream')
    }
  } else {
    // Update count
    return {
      ...state,
      activeStatusEffects: state.activeStatusEffects.map(e =>
        e.type === 'ice_cream'
          ? {
              ...e,
              count: newCount,
              description: `Gain +1 energy when revealing player tiles grants copper (${newCount} floor${newCount > 1 ? 's' : ''} remaining)`
            }
          : e
      )
    }
  }
}
