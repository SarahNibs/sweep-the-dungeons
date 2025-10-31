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
    category: 'reward',
    description: {
      base: 'Weak evidence of ~five of your tiles',
      enhanced: 'Evidence of five of your tiles'
    },
    icon: '🔎'
  },
  'Sarcastic Instructions': {
    name: 'Sarcastic Instructions',
    cost: 2,
    category: 'reward',
    description: {
      base: 'Evidence of ~two of your tiles vs ~one not yours, or of lots of your tiles AROUND 1-2 not yours',
      enhanced: 'Evidence of ~two of your tiles vs ~one not yours, or of lots of your tiles AROUND 1-2 not yours. Gain 1 energy if any other Instructions card has been played this floor.'
    },
    icon: '😏'
  },
  'Spritz': {
    name: 'Spritz',
    cost: 1,
    category: 'starter',
    description: {
      base: 'Spritz a tile to clean it and see if it\'s safe or dangerous',
      enhanced: 'Spritz a tile to clean it and see if it\'s safe or dangerous. Also spritz a random adjacent tile.'
    },
    icon: '💦'
  },
  'Tingle': {
    name: 'Tingle',
    cost: 1,
    category: 'starter',
    description: {
      base: 'Annotate a random rival or mine tile with its owner',
      enhanced: 'Annotate a random rival or mine tile with its owner, and sense player adjacency info for it'
    },
    icon: '😳'
  },
  'Easiest': {
    name: 'Easiest',
    cost: 1,
    category: 'starter',
    description: {
      base: 'Reveal the safer of two tiles',
      enhanced: 'Reveal the safest of three tiles'
    },
    icon: '😴'
  },
  'Twirl': {
    name: 'Twirl',
    cost: 3,
    exhaust: true,
    category: 'starter',
    description: {
      base: 'Gain 3 copper. Exhaust.',
      enhanced: 'Gain 5 copper. Exhaust.'
    },
    icon: '🌪️'
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
  'Fan': {
    name: 'Fan',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Target a tile. Any dirt, goblins, and surface mines are blown to a random adjacent unrevealed tile.',
      enhanced: 'Target a tile and all tiles in manhattan distance 1. Any dirt, goblins, and surface mines are blown to a random adjacent unrevealed tile.'
    },
    icon: '🪭'
  },
  'Gaze ↑': {
    name: 'Gaze ↑',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Choose a tile, search upward for first rival tile. Annotate rival tile and all checked tiles as not rival.',
      enhanced: 'Choose a tile, search upward for first rival AND first mine. Annotate found tiles and all checked tiles.'
    },
    icon: '👀'
  },
  'Gaze ↓': {
    name: 'Gaze ↓',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Choose a tile, search downward for first rival tile. Annotate rival tile and all checked tiles as not rival.',
      enhanced: 'Choose a tile, search downward for first rival AND first mine. Annotate found tiles and all checked tiles.'
    },
    icon: '👀'
  },
  'Gaze ←': {
    name: 'Gaze ←',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Choose a tile, search left for first rival tile. Annotate rival tile and all checked tiles as not rival.',
      enhanced: 'Choose a tile, search left for first rival AND first mine. Annotate found tiles and all checked tiles.'
    },
    icon: '👀'
  },
  'Gaze →': {
    name: 'Gaze →',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Choose a tile, search right for first rival tile. Annotate rival tile and all checked tiles as not rival.',
      enhanced: 'Choose a tile, search right for first rival AND first mine. Annotate found tiles and all checked tiles.'
    },
    icon: '👀'
  },
  'Fetch ↑': {
    name: 'Fetch ↑',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Choose a tile, check it and all tiles upward. Find most common owner (tiebreak to safest). Reveal all of that owner. Annotate rest as not majority owner. Turn ends if not player.',
      enhanced: 'Choose a tile, check it and all tiles upward. Find most common owner (tiebreak to safest). Reveal all of that owner. Annotate rest as not majority owner. Turn ends if not player. Draw a card.'
    },
    icon: '🎾'
  },
  'Fetch ↓': {
    name: 'Fetch ↓',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Choose a tile, check it and all tiles downward. Find most common owner (tiebreak to safest). Reveal all of that owner. Annotate rest as not majority owner. Turn ends if not player.',
      enhanced: 'Choose a tile, check it and all tiles downward. Find most common owner (tiebreak to safest). Reveal all of that owner. Annotate rest as not majority owner. Turn ends if not player. Draw a card.'
    },
    icon: '🎾'
  },
  'Fetch ←': {
    name: 'Fetch ←',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Choose a tile, check it and all tiles leftward. Find most common owner (tiebreak to safest). Reveal all of that owner. Annotate rest as not majority owner. Turn ends if not player.',
      enhanced: 'Choose a tile, check it and all tiles leftward. Find most common owner (tiebreak to safest). Reveal all of that owner. Annotate rest as not majority owner. Turn ends if not player. Draw a card.'
    },
    icon: '🎾'
  },
  'Fetch →': {
    name: 'Fetch →',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Choose a tile, check it and all tiles rightward. Find most common owner (tiebreak to safest). Reveal all of that owner. Annotate rest as not majority owner. Turn ends if not player.',
      enhanced: 'Choose a tile, check it and all tiles rightward. Find most common owner (tiebreak to safest). Reveal all of that owner. Annotate rest as not majority owner. Turn ends if not player. Draw a card.'
    },
    icon: '🎾'
  },
  'Burger': {
    name: 'Burger',
    cost: 2,
    category: 'reward',
    exhaust: true,
    description: {
      base: 'Draw +1 card every turn for 2 floors. Stacks if played again.',
      enhanced: 'Draw +1 card every turn for 3 floors. Draw a card now. Stacks if played again.'
    },
    icon: '🍔'
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
    hoverText: 'Dust Bunny: when you start a new floor, you immediately reveal one of your non-dirty tiles at random, getting adjacency info just as if you revealed it normally',
    category: 'common',
    icon: '🐰'
  },
  'Frilly Dress': {
    name: 'Frilly Dress',
    description: 'your counterpart sometimes watches you clean rather than cleaning themselves',
    hoverText: 'Frilly Dress: revealing neutral tiles on your first turn of any floor does not end your turn',
    category: 'common',
    icon: '👗'
  },
  'Busy Canary': {
    name: 'Busy Canary',
    description: 'industrious bird who scans for mines at floor start',
    hoverText: 'Busy Canary: at the beginning of every floor, randomly scan up to 2 areas for mines',
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
    hoverText: 'Tiara: receive double the copper after each floor',
    category: 'rare',
    icon: '👑'
  },
  'Intercepted Communications': {
    name: 'Intercepted Communications',
    description: 'intel from rival communications',
    hoverText: 'Intercepted Communications: at the beginning of each floor, one of the rival\'s tiles is revealed at random, giving info about adjacent player tiles',
    category: 'common',
    icon: '📝'
  },
  'Handbag': {
    name: 'Handbag',
    description: 'carry extra supplies for the start of battle',
    hoverText: 'Handbag: draw 2 additional cards at the start of your first turn each floor',
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
  },
  'Choker': {
    name: 'Choker',
    description: 'strategic accessory for close games',
    hoverText: 'Choker: when your rival reaches 5 tiles left unrevealed, the rival\'s turn ends',
    category: 'common',
    icon: '📿'
  },
  'Crystal': {
    name: 'Crystal',
    description: 'three shimmering amplifications',
    hoverText: 'Crystal: add 3 doubly-enhanced Tingles to your permanent deck',
    category: 'rare',
    icon: '💎'
  },
  'Boots': {
    name: 'Boots',
    description: 'boots made for walking all over your deck',
    hoverText: 'Boots: when gained, transform one of your cards into any random non-starter card with BOTH enhanced and energy upgrades',
    category: 'rare',
    icon: '👢'
  },
  'Glasses': {
    name: 'Glasses',
    description: 'see everything more clearly',
    hoverText: 'Glasses: at the beginning of every turn, play a Tingle for free (adds a Tingle to discard)',
    category: 'common',
    icon: '👓'
  }
}

// Factory functions for creating cards and relics

export function createCard(name: string, upgrades?: { energyReduced?: boolean; enhanced?: boolean }): Card {
  const definition = CARD_DEFINITIONS[name]
  if (!definition) {
    throw new Error(`Unknown card: ${name}`)
  }

  let cost = definition.cost
  let exhaust = definition.exhaust

  // Energy-reduced cards no longer reduce cost - they grant +1 energy when played
  // (Cost stays the same, but playing the card refunds 1 energy)

  // Enhanced Energized no longer exhausts
  if (upgrades?.enhanced && name === 'Energized') {
    exhaust = false
  }

  return {
    id: crypto.randomUUID(),
    name: definition.name,
    cost,
    exhaust,
    energyReduced: upgrades?.energyReduced,
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
    // Zero copies of Sarcastic Instructions
    // createCard('Sarcastic Instructions'),
    // Zero copies of Vague Instructions
    // createCard('Vague Instructions'),
    // Three copies of Spritz
    createCard('Spritz'),
    createCard('Spritz'),
    createCard('Spritz'),
    // Three copies of Tingle
    createCard('Tingle'),
    createCard('Tingle'),
    createCard('Tingle'),
    // Two copies of Easiest
    createCard('Easiest'),
    createCard('Easiest'),
    // One copy of Twirl
    createCard('Twirl')
  ]
}

export function getRewardCardPool(): Card[] {
  const rewardCardNames = Object.keys(CARD_DEFINITIONS).filter(
    name => CARD_DEFINITIONS[name].category === 'reward'
  )

  return rewardCardNames.map(name => createCard(name))
}

/**
 * Interface for weighted card selection
 */
export interface CardPoolEntry {
  baseName: string           // e.g., "Fetch", "Monster", "Gaze"
  weight: number             // relative probability (1.0 = normal, 1.5 = common, 0.67 = rare)
  variants?: string[]        // e.g., ["Fetch ↑", "Fetch ↓", "Fetch ←", "Fetch →"]
}

/**
 * Get weighted reward card pool for proper rarity and directional card handling
 */
export function getWeightedRewardCardPool(): CardPoolEntry[] {
  return [
    { baseName: 'Vague Instructions', weight: 1.0 },
    { baseName: 'Sarcastic Instructions', weight: 1.0 },
    { baseName: 'Energized', weight: 1.0 },
    { baseName: 'Options', weight: 1.0 },
    { baseName: 'Brush', weight: 1.0 },
    { baseName: 'Ramble', weight: 1.0 },
    { baseName: 'Sweep', weight: 1.5 }, // Common - appears 1.5x as often
    { baseName: 'Underwire', weight: 1.0 },
    { baseName: 'Tryst', weight: 1.0 },
    { baseName: 'Canary', weight: 1.0 },
    { baseName: 'Monster', weight: 1.0 },
    { baseName: 'Argument', weight: 1.0 },
    { baseName: 'Horse', weight: 1.0 },
    { baseName: 'Eavesdropping', weight: 1.0 },
    { baseName: 'Emanation', weight: 1.0 },
    { baseName: 'Masking', weight: 1.0 },
    { baseName: 'Brat', weight: 1.0 },
    { baseName: 'Snip, Snip', weight: 1.0 },
    { baseName: 'Nap', weight: 1.0 },
    { baseName: 'Fan', weight: 1.0 },
    { baseName: 'Gaze', weight: 1.0, variants: ['Gaze ↑', 'Gaze ↓', 'Gaze ←', 'Gaze →'] },
    { baseName: 'Fetch', weight: 1.0, variants: ['Fetch ↑', 'Fetch ↓', 'Fetch ←', 'Fetch →'] },
    { baseName: 'Burger', weight: 2/3 } // Rare - appears 2/3 as often
  ]
}

/**
 * Select a random card from weighted pool
 * Directional cards (with variants) pick a random direction
 */
export function selectWeightedCard(pool: CardPoolEntry[]): string {
  // Calculate total weight
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0)

  // Random selection based on weight
  let random = Math.random() * totalWeight

  for (const entry of pool) {
    random -= entry.weight
    if (random <= 0) {
      // If has variants, pick random variant (for directional cards)
      if (entry.variants && entry.variants.length > 0) {
        return entry.variants[Math.floor(Math.random() * entry.variants.length)]
      }
      return entry.baseName
    }
  }

  // Fallback (shouldn't happen, but return first entry)
  const firstEntry = pool[0]
  if (firstEntry.variants && firstEntry.variants.length > 0) {
    return firstEntry.variants[0]
  }
  return firstEntry.baseName
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
        description: 'This floor uses Manhattan distance (4-way) adjacency rules at distance 2 instead of standard 8-way'
      }
    case 'horse_discount':
      return {
        id: baseId,
        type: 'horse_discount',
        icon: '🐴',
        name: 'Horse Discount',
        description: 'Horse cards cost 0 energy for the rest of this floor'
      }
    case 'rival_never_mines':
      return {
        id: baseId,
        type: 'rival_never_mines',
        icon: '🚫',
        name: 'Rival Mine Avoidance',
        description: 'Your rival will never reveal mine tiles this floor'
      }
    case 'grace':
      return {
        id: baseId,
        type: 'grace',
        icon: '🤞',
        name: 'Grace',
        description: 'Prevents losing to one mine reveal this floor (adds Evidence to hand if triggered)'
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