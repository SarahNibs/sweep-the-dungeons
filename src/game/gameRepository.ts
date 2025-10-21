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
  icon: string
}

// Centralized card definitions
export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  // Starter cards
  'Imperious Instructions': {
    name: 'Imperious Instructions',
    cost: 2,
    category: 'starter',
    description: {
      base: 'Strong evidence of ~two of your tiles',
      enhanced: 'Strong evidence of ~two of your tiles (never clues mines)'
    },
    icon: '👑'
  },
  'Vague Instructions': {
    name: 'Vague Instructions',
    cost: 2,
    category: 'starter',
    description: {
      base: 'Weak evidence of ~five of your tiles',
      enhanced: 'Evidence of five of your tiles'
    },
    icon: '🔎'
  },
  'Sarcastic Instructions': {
    name: 'Sarcastic Instructions',
    cost: 2,
    category: 'starter',
    description: {
      base: 'Evidence of ~two of your tiles vs ~one not yours, or of lots of your tiles AROUND 1-2 not yours',
      enhanced: 'Evidence of ~two of your tiles vs ~one not yours, or of lots of your tiles AROUND 1-2 not yours. Gain 1 energy if any other Instructions card has been played this level.'
    },
    icon: '😏'
  },
  'Spritz': {
    name: 'Spritz',
    cost: 1,
    category: 'starter',
    description: {
      base: 'Spritz a tile to see if it\'s safe or dangerous',
      enhanced: 'Spritz a tile to see if it\'s safe or dangerous. Also spritz a random adjacent tile.'
    },
    icon: '💦'
  },
  'Tingle': {
    name: 'Tingle',
    cost: 1,
    category: 'starter',
    description: {
      base: 'Sense adjacency info for a random rival tile',
      enhanced: 'Sense adjacency info for two random rival tiles'
    },
    icon: '😳'
  },
  'Easiest': {
    name: 'Easiest',
    cost: 1,
    category: 'starter',
    description: {
      base: 'Reveal the safer of two tiles',
      enhanced: 'Reveal the safer of three tiles'
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
      base: 'Gain 2 energy. Exhaust.',
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
    icon: '🤷'
  },
  'Brush': {
    name: 'Brush',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Notice minor tile owner hints in a 3x3 area',
      enhanced: 'Notice minor tile owner hints in a 3x3 area, twice'
    },
    icon: '🖌️'
  },
  'Ramble': {
    name: 'Ramble',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Infodump to your rival, she may clean inattentively',
      enhanced: 'Fascinate your rival infodumpingly, she will probably clean inattentively'
    },
    icon: '🌀'
  },
  'Sweep': {
    name: 'Sweep',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Remove all dirt in a 5x5 area',
      enhanced: 'Remove all dirt in a 7x7 area'
    },
    icon: '🧹'
  },
  'Underwire': {
    name: 'Underwire',
    cost: 0,
    exhaust: true,
    category: 'reward',
    description: {
      base: 'Protection against revealing one mine this floor. Exhaust.',
      enhanced: 'Protection against revealing one mine this floor.'
    },
    icon: '🛡️'
  },
  'Tryst': {
    name: 'Tryst',
    cost: 1,
    category: 'reward',
    description: {
      base: 'You and your rival reveal a random tile for each other',
      enhanced: 'You and your rival reveal a tile for each other as close to a designated tile as possible'
    },
    icon: '🥺'
  },
  'Canary': {
    name: 'Canary',
    cost: 0,
    category: 'reward',
    description: {
      base: 'A birb searches a burst 1 cross area for mines and exhausts if any are found',
      enhanced: 'A birb searches a 3x3 area for mines and exhausts if any are found'
    },
    icon: '🐦'
  },
  'Monster': {
    name: 'Monster',
    cost: 0,
    exhaust: true,
    category: 'reward',
    description: {
      base: 'Draw 2 cards. Exhaust.',
      enhanced: 'Draw 4 cards. Exhaust.'
    },
    icon: '🥤'
  },
  'Argument': {
    name: 'Argument',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Harumph. Locate all neutral tiles in a 3x3 area.',
      enhanced: 'Harumph. Locate all neutral tiles in a 3x3 area. Draw 1 card.'
    },
    icon: '😡'
  },
  'Horse': {
    name: 'Horse',
    cost: 3,
    category: 'reward',
    description: {
      base: 'Reveal ALL of the safest type of tile in a burst 1 cross area. After the upfront investment, Horse cards cost 0 for the rest of the floor.',
      enhanced: 'Annotate ALL of the safest type of tile in a burst 1 cross area. After the upfront investment, Horse cards cost 0 for the rest of the floor.'
    },
    icon: '🐴'
  },
  'Eavesdropping': {
    name: 'Eavesdropping',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Listen in on a tile to get player adjacency info',
      enhanced: 'Listen in on a tile to get ALL adjacency info (player, neutral, rival, mines)'
    },
    icon: '👂'
  },
  'Emanation': {
    name: 'Emanation',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Proclaim that nothing of value is on a tile and destroy it. Add Evidence to hand.',
      enhanced: 'Proclaim that nothing of value is on a tile and destroy it'
    },
    icon: '☢️'
  },
  'Masking': {
    name: 'Masking',
    cost: 0,
    category: 'reward',
    description: {
      base: 'Play and exhaust another card in your hand for free. Exhaust.',
      enhanced: 'Play and exhaust another card in your hand for free'
    },
    icon: '🎭'
  },
  'Brat': {
    name: 'Brat',
    cost: 1,
    exhaust: true,
    category: 'reward',
    description: {
      base: 'Unreveal a tile. Exhaust.',
      enhanced: 'Unreveal a tile. Gain 2 copper. Exhaust.'
    },
    icon: '😈'
  },
  'Snip, Snip': {
    name: 'Snip, Snip',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Defuse all mines on a tile. If any mine is defused, gain 2 copper, then reveal the tile.',
      enhanced: 'Defuse all mines on a tile. If any mine is defused, gain 2 copper, then reveal the tile and sense nearby mines.'
    },
    icon: '✂️'
  },
  'Nap': {
    name: 'Nap',
    cost: 1,
    exhaust: true,
    category: 'reward',
    description: {
      base: 'Remember something important from your exhaust. Exhaust.',
      enhanced: 'Remember something important from your exhaust and gain the energy to do it. Exhaust.'
    },
    icon: '💤'
  },
  'Evidence': {
    name: 'Evidence',
    cost: 1,
    exhaust: true,
    category: 'shop_only',  // Never appears in rewards or shops, only added by Emanation
    description: {
      base: 'If Evidence is not exhausted when you leave the floor, lose 2 copper. Exhaust.',
      enhanced: 'If Evidence is not exhausted when you leave the floor, lose 2 copper. Exhaust.'
    },
    icon: '🔍'
  },
}

// Centralized relic definitions
export const RELIC_DEFINITIONS: Record<string, RelicDefinition> = {
  'Double Broom': {
    name: 'Double Broom',
    description: 'brush some nearby tiles when cleaning',
    hoverText: 'Double Broom: whenever you reveal a tile, apply the Brush effect to two random unrevealed adjacent tiles',
    category: 'common',
    icon: '🧹'
  },
  'Dust Bunny': {
    name: 'Dust Bunny',
    description: 'animal companion who helps you clean',
    hoverText: 'Dust Bunny: when you start a new level, you immediately reveal one of your non-dirty tiles at random, getting adjacency info just as if you revealed it normally',
    category: 'common',
    icon: '🐰'
  },
  'Frilly Dress': {
    name: 'Frilly Dress',
    description: 'your counterpart sometimes watches you clean rather than cleaning themselves',
    hoverText: 'Frilly Dress: revealing neutral tiles on your first turn of any level does not end your turn',
    category: 'common',
    icon: '👗'
  },
  'Busy Canary': {
    name: 'Busy Canary',
    description: 'industrious bird who scans for mines at level start',
    hoverText: 'Busy Canary: at the beginning of every level, randomly scan up to 2 areas for mines',
    category: 'common',
    icon: '🐦'
  },
  'Mop': {
    name: 'Mop',
    description: 'efficient cleaning tool that rewards thoroughness',
    hoverText: 'Mop: whenever you clean dirt from a tile, draw a card',
    category: 'common',
    icon: '🪣'
  },
  'Caffeinated': {
    name: 'Caffeinated',
    description: 'caffeine grants unimaginable energy with no downsides!',
    hoverText: 'Caffeinated: get 4 energy per turn instead of 3 but draw 1 fewer card at the start of your turns',
    category: 'common',
    icon: '🥤'
  },
  'Estrogen': {
    name: 'Estrogen',
    description: 'everything is just... smoother',
    hoverText: 'Estrogen: replaces three random non-upgraded cards in your deck with their energy-upgraded versions',
    category: 'rare',
    icon: '💉'
  },
  'Progesterone': {
    name: 'Progesterone',
    description: "nothing's easier but everything's better",
    hoverText: 'Progesterone: replaces three random non-upgraded cards in your deck with their enhance-upgraded versions',
    category: 'rare',
    icon: '💊'
  },
  'Tiara': {
    name: 'Tiara',
    description: 'now *you* are the princess',
    hoverText: 'Tiara: receive double the copper after each level',
    category: 'rare',
    icon: '👑'
  },
  'Intercepted Communications': {
    name: 'Intercepted Communications',
    description: 'intel from rival communications',
    hoverText: 'Intercepted Communications: at the beginning of each level, one of the rival\'s tiles is revealed at random, giving info about adjacent player tiles',
    category: 'common',
    icon: '📝'
  },
  'Handbag': {
    name: 'Handbag',
    description: 'carry extra supplies for the start of battle',
    hoverText: 'Handbag: draw 2 additional cards at the start of your first turn each level',
    category: 'common',
    icon: '👜'
  },
  'Eyeshadow': {
    name: 'Eyeshadow',
    description: 'distract your rival with your beauty',
    hoverText: 'Eyeshadow: your rival gets a random [0-1] added to each priority (permanent half-Ramble effect)',
    category: 'common',
    icon: '👁️'
  },
  'Hyperfocus': {
    name: 'Hyperfocus',
    description: 'you will *definitely* do *something*',
    hoverText: 'Hyperfocus: at the beginning of each floor, add a random cost-0 card to your first turn hand (not added to persistent deck)',
    category: 'common',
    icon: '🎯'
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
    // One copy of Imperious Instructions
    createCard('Imperious Instructions'),
    // One copy of Sarcastic Instructions
    createCard('Sarcastic Instructions'),
    // One copy of Vague Instructions
    createCard('Vague Instructions'),
    // Three copies of Spritz
    createCard('Spritz'),
    createCard('Spritz'),
    createCard('Spritz'),
    // Three copies of Tingle
    createCard('Tingle'),
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

  const description = card.enhanced && definition.description.enhanced
    ? definition.description.enhanced
    : definition.description.base

  return description
}

export function getCardIcon(cardName: string): string {
  const definition = CARD_DEFINITIONS[cardName]
  return definition?.icon || '❓'
}

export function getRelicIcon(relicName: string): string {
  const definition = RELIC_DEFINITIONS[relicName]
  return definition?.icon || '✨'
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
        name: 'Underwire Protection',
        description: 'Protects from revealing mines (prevents loss)',
        enhanced,
        count: 1
      }
    case 'ramble_active':
      return {
        id: baseId,
        type: 'ramble_active',
        icon: '🌀',
        name: 'Ramble Active',
        description: 'Rival\'s guaranteed bag pulls are disrupted for their next turn',
        enhanced
      }
    case 'manhattan_adjacency':
      return {
        id: baseId,
        type: 'manhattan_adjacency',
        icon: '🔢',
        name: 'Manhattan Distance 2',
        description: 'This level uses Manhattan distance (4-way) adjacency rules at distance 2 instead of standard 8-way'
      }
    case 'horse_discount':
      return {
        id: baseId,
        type: 'horse_discount',
        icon: '🐴',
        name: 'Horse Discount',
        description: 'Horse cards cost 0 energy for the rest of this level'
      }
    case 'rival_never_mines':
      return {
        id: baseId,
        type: 'rival_never_mines',
        icon: '🚫',
        name: 'Rival Mine Avoidance',
        description: 'Your rival will never reveal mine tiles this level'
      }
    default:
      throw new Error(`Unknown status effect type: ${type}`)
  }
}

export function addStatusEffect(state: GameState, effectType: StatusEffect['type'], enhanced?: boolean): GameState {
  const existingEffect = state.activeStatusEffects.find(effect => effect.type === effectType)

  // Special handling for underwire_protection - increment count instead of adding new instance
  if (effectType === 'underwire_protection' && existingEffect) {
    const currentCount = existingEffect.count || 1
    const updatedEffect = {
      ...existingEffect,
      count: currentCount + 1,
      enhanced: enhanced || existingEffect.enhanced // Keep enhanced if either is enhanced
    }

    return {
      ...state,
      activeStatusEffects: state.activeStatusEffects.map(effect =>
        effect.type === effectType ? updatedEffect : effect
      )
    }
  }

  // For other effects, don't duplicate
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
  console.log('🗑️ REMOVE STATUS EFFECT DEBUG')
  console.log('  - Removing effect type:', effectType)
  console.log('  - Before removal:', state.activeStatusEffects.map(e => ({ type: e.type, id: e.id, count: e.count })))

  let filteredEffects: StatusEffect[]

  // For underwire_protection, decrement count or remove if count reaches 0
  if (effectType === 'underwire_protection') {
    const existingEffect = state.activeStatusEffects.find(effect => effect.type === effectType)
    if (existingEffect) {
      const currentCount = existingEffect.count || 1
      if (currentCount > 1) {
        // Decrement count
        filteredEffects = state.activeStatusEffects.map(effect =>
          effect.type === effectType
            ? { ...effect, count: currentCount - 1 }
            : effect
        )
      } else {
        // Remove effect entirely when count reaches 0
        filteredEffects = state.activeStatusEffects.filter(effect => effect.type !== effectType)
      }
    } else {
      filteredEffects = state.activeStatusEffects
    }
  } else {
    // For all other effects, remove all instances (original behavior)
    filteredEffects = state.activeStatusEffects.filter(effect => effect.type !== effectType)
  }

  console.log('  - After filtering:', filteredEffects.map(e => ({ type: e.type, id: e.id, count: e.count })))

  const result = {
    ...state,
    activeStatusEffects: filteredEffects
  }

  console.log('  - Final result activeStatusEffects:', result.activeStatusEffects.map(e => ({ type: e.type, id: e.id, count: e.count })))

  return result
}

export function clearAllStatusEffects(state: GameState): GameState {
  return {
    ...state,
    activeStatusEffects: []
  }
}