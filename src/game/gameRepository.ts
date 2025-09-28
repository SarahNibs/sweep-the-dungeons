import { Card, Relic } from '../types'

// Card definitions with all properties centralized
export interface CardDefinition {
  name: string
  cost: number
  exhaust?: boolean
  category: 'starter' | 'reward' | 'shop_only'
  description: {
    base: string
    enhanced?: string
  }
  icon: string
}

// Relic definitions with all properties centralized  
export interface RelicDefinition {
  name: string
  description: string
  hoverText: string
  category: 'common' | 'rare'
}

// Centralized card definitions
export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  // Starter cards
  'Imperious Orders': {
    name: 'Imperious Orders',
    cost: 2,
    category: 'starter',
    description: {
      base: 'Strong evidence of two of your tiles',
      enhanced: 'Strong evidence of two of your tiles (never clues mines)'
    },
    icon: '🔍'
  },
  'Vague Orders': {
    name: 'Vague Orders', 
    cost: 2,
    category: 'starter',
    description: {
      base: 'Evidence of five of your tiles',
      enhanced: 'Evidence of five of your tiles (5 guaranteed bag pulls)'
    },
    icon: '🔎'
  },
  'Spritz': {
    name: 'Spritz',
    cost: 1,
    category: 'starter', 
    description: {
      base: 'Click on an unrevealed tile to see if it\'s safe or dangerous',
      enhanced: 'Click on an unrevealed tile to see if it\'s safe or dangerous. Also scouts a random adjacent tile.'
    },
    icon: '👁️'
  },
  'Tingle': {
    name: 'Tingle',
    cost: 1,
    category: 'starter',
    description: {
      base: 'Mark a random rival tile with an rival indicator',
      enhanced: 'Mark 2 random rival tiles with rival indicators'
    },
    icon: '📋'
  },
  'Easiest': {
    name: 'Easiest',
    cost: 1,
    category: 'starter',
    description: {
      base: 'Click on two unrevealed tiles - the safer one will be revealed',
      enhanced: 'Click on three unrevealed tiles - the safest one will be revealed'
    },
    icon: '😴'
  },

  // Reward/shop cards
  'Energized': {
    name: 'Energized',
    cost: 1,
    exhaust: true,
    category: 'reward',
    description: {
      base: 'Gain 2 energy. Exhaust (remove from deck after use)',
      enhanced: 'Gain 2 energy'
    },
    icon: '⚡'
  },
  'Options': {
    name: 'Options',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Draw 3 cards',
      enhanced: 'Draw 5 cards'
    },
    icon: '🃏'
  },
  'Brush': {
    name: 'Brush',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Select center of 3x3 area - exclude random owners from each tile',
      enhanced: 'Select center of 3x3 area - exclude random owners from each tile (applies twice)'
    },
    icon: '🖌️'
  },
  'Ramble': {
    name: 'Ramble',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Disrupts rival\'s next turn by removing their guaranteed bag pulls',
      enhanced: 'Disrupts rival\'s next turn by removing their guaranteed bag pulls (stronger disruption 0-4)'
    },
    icon: '🌀'
  },
  'Sweep': {
    name: 'Sweep',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Select center of 5x5 area - removes all dirt from the area',
      enhanced: 'Select center of 7x7 area - removes all dirt from the area'
    },
    icon: '🧹'
  },
  'Underwire': {
    name: 'Underwire',
    cost: 0,
    exhaust: true,
    category: 'reward',
    description: {
      base: 'The next time you reveal a mine this level, you do not lose. Exhaust (remove from deck after use)',
      enhanced: 'The next time you reveal a mine this level, you do not lose and your turn does not end'
    },
    icon: '🛡️'
  },
  'Tryst': {
    name: 'Tryst',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Enemy reveals one of their tiles at random, then you reveal one of your tiles at random. Does not end your turn',
      enhanced: 'Select target tile - rival and player each reveal tiles prioritized by distance from target'
    },
    icon: '🥺'
  },
  'Canary': {
    name: 'Canary',
    cost: 0,
    category: 'reward',
    description: {
      base: 'Select center of star area to detect mines - annotates tiles based on mine presence. Exhausts if mine found',
      enhanced: 'Select center of 3x3 area to detect mines - annotates tiles based on mine presence. Exhausts if mine found'
    },
    icon: '🐦'
  }
}

// Centralized relic definitions
export const RELIC_DEFINITIONS: Record<string, RelicDefinition> = {
  'Double Broom': {
    name: 'Double Broom',
    description: 'brush some nearby tiles when cleaning',
    hoverText: 'Double Broom: whenever you reveal a tile, apply the Brush effect to two random unrevealed adjacent tiles',
    category: 'common'
  },
  'Dust Bunny': {
    name: 'Dust Bunny',
    description: 'animal companion who helps you clean',
    hoverText: 'Dust Bunny: when you start a new level, you immediately reveal one of your non-dirty tiles at random, getting adjacency info just as if you revealed it normally',
    category: 'common'
  },
  'Frilly Dress': {
    name: 'Frilly Dress',
    description: 'your counterpart sometimes watches you clean rather than cleaning themselves',
    hoverText: 'Frilly Dress: revealing neutral tiles on your first turn of any level does not end your turn',
    category: 'common'
  },
  'Busy Canary': {
    name: 'Busy Canary',
    description: 'industrious bird who scans for mines at level start',
    hoverText: 'Busy Canary: at the beginning of every level, randomly scan areas for mines until at least one mine is detected',
    category: 'common'
  },
  'Mop': {
    name: 'Mop',
    description: 'efficient cleaning tool that rewards thoroughness',
    hoverText: 'Mop: whenever you clean dirt from a tile, draw a card',
    category: 'common'
  }
}

// Factory functions for creating cards and relics

export function createCard(name: string, upgrades?: { costReduced?: boolean; enhanced?: boolean }): Card {
  const definition = CARD_DEFINITIONS[name]
  if (!definition) {
    throw new Error(`Unknown card: ${name}`)
  }

  let cost = definition.cost
  let exhaust = definition.exhaust

  // Apply upgrades
  if (upgrades?.costReduced && cost > 0) {
    cost = Math.max(0, cost - 1)
  }
  
  // Enhanced Energized no longer exhausts
  if (upgrades?.enhanced && name === 'Energized') {
    exhaust = false
  }

  return {
    id: crypto.randomUUID(),
    name: definition.name,
    cost,
    exhaust,
    costReduced: upgrades?.costReduced,
    enhanced: upgrades?.enhanced
  }
}

export function createRelic(name: string): Relic {
  const definition = RELIC_DEFINITIONS[name]
  if (!definition) {
    throw new Error(`Unknown relic: ${name}`)
  }

  return {
    id: crypto.randomUUID(),
    name: definition.name,
    description: definition.description,
    hoverText: definition.hoverText
  }
}

// Helper functions for getting card lists by category

export function getStarterCards(): Card[] {
  return [
    // Two copies of Imperious Orders
    createCard('Imperious Orders'),
    createCard('Imperious Orders'),
    // One copy of Vague Orders
    createCard('Vague Orders'),
    // Four copies of Spritz
    createCard('Spritz'),
    createCard('Spritz'),
    createCard('Spritz'),
    createCard('Spritz'),
    // Two copies of Tingle
    createCard('Tingle'),
    createCard('Tingle'),
    // One copy of Easiest
    createCard('Easiest')
  ]
}

export function getRewardCardPool(): Card[] {
  const rewardCardNames = Object.keys(CARD_DEFINITIONS).filter(
    name => CARD_DEFINITIONS[name].category === 'reward'
  )
  
  return rewardCardNames.map(name => createCard(name))
}

export function getAllRelics(): Relic[] {
  return Object.keys(RELIC_DEFINITIONS).map(name => createRelic(name))
}

export function getCardDescription(card: Card): string {
  const definition = CARD_DEFINITIONS[card.name]
  if (!definition) {
    return 'Unknown card'
  }

  const baseCost = `Cost: ${card.cost} energy. `
  const description = card.enhanced && definition.description.enhanced 
    ? definition.description.enhanced
    : definition.description.base

  return baseCost + description
}

export function getCardIcon(cardName: string): string {
  const definition = CARD_DEFINITIONS[cardName]
  return definition?.icon || '❓'
}

// Status Effects System

import type { StatusEffect, GameState } from '../types'

export function createStatusEffect(type: StatusEffect['type'], enhanced?: boolean): StatusEffect {
  const baseId = crypto.randomUUID()
  
  switch (type) {
    case 'underwire_protection':
      return {
        id: baseId,
        type: 'underwire_protection',
        icon: '🛡️',
        name: enhanced ? 'Enhanced Underwire' : 'Underwire Protection',
        description: enhanced 
          ? 'The next time you reveal a mine this level, you do not lose and your turn does not end'
          : 'The next time you reveal a mine this level, you do not lose',
        enhanced
      }
    case 'ramble_active':
      return {
        id: baseId,
        type: 'ramble_active',
        icon: '🌀',
        name: 'Ramble Active',
        description: 'Enemy\'s guaranteed bag pulls are disrupted for their next turn',
        enhanced
      }
    case 'manhattan_adjacency':
      return {
        id: baseId,
        type: 'manhattan_adjacency',
        icon: '🔢',
        name: 'Manhattan Distance',
        description: 'This level uses Manhattan distance (4-way) adjacency rules instead of standard 8-way'
      }
    default:
      throw new Error(`Unknown status effect type: ${type}`)
  }
}

export function addStatusEffect(state: GameState, effectType: StatusEffect['type'], enhanced?: boolean): GameState {
  // Check if effect already exists (don't duplicate)
  const existingEffect = state.activeStatusEffects.find(effect => effect.type === effectType)
  if (existingEffect) {
    return state
  }
  
  const newEffect = createStatusEffect(effectType, enhanced)
  return {
    ...state,
    activeStatusEffects: [...state.activeStatusEffects, newEffect]
  }
}

export function removeStatusEffect(state: GameState, effectType: StatusEffect['type']): GameState {
  return {
    ...state,
    activeStatusEffects: state.activeStatusEffects.filter(effect => effect.type !== effectType)
  }
}

export function clearAllStatusEffects(state: GameState): GameState {
  return {
    ...state,
    activeStatusEffects: []
  }
}