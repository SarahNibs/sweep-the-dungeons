import { Card, Equipment } from '../types'

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

// Equipment definitions with all properties centralized
export interface EquipmentDefinition {
  name: string
  description: string
  hoverText: string
  category: 'common' | 'uncommon' | 'rare'
  icon: string
  prerequisites?: string[] // List of equipment names that must be owned before this equipment can be offered
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
      base: 'Evidence of ~two of your tiles vs ~one not yours, or of lots of your tiles AROUND ~1 not yours',
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
      base: 'Sense a random rival or mine tile',
      enhanced: 'Sense a random rival or mine tile, and your tiles around it'
    },
    icon: '😳'
  },
  'Scurry': {
    name: 'Scurry',
    cost: 1,
    category: 'starter',
    description: {
      base: 'Reveal the safer of two tiles',
      enhanced: 'Reveal the safest of three tiles'
    },
    icon: '🐁'
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
      base: 'Clean up a 5x5 area',
      enhanced: 'Clean up a 7x7 area'
    },
    icon: '🧹'
  },
  'Underwire': {
    name: 'Underwire',
    cost: 0,
    exhaust: true,
    category: 'reward',
    description: {
      base: 'Protection against one mine this floor. Exhaust.',
      enhanced: 'Protection against one mine this floor.'
    },
    icon: '🛡️'
  },
  'Tryst': {
    name: 'Tryst',
    cost: 1,
    category: 'reward',
    description: {
      base: 'You and your rival reveal a random tile for each other',
      enhanced: 'You and your rival reveal a tile for each other as close to a designated spot as possible'
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
      base: 'Reveal ALL of the safest type of tile in a burst 1 cross area. Horses cost 0 until next floor.',
      enhanced: 'Sense ALL of the safest type of tile in a burst 1 cross area. Horses cost 0 until next floor.'
    },
    icon: '🐴'
  },
  'Eavesdropping': {
    name: 'Eavesdropping',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Listen in on a tile to sense your tiles around it',
      enhanced: 'Listen in on a tile to sense ALL tiles around it'
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
      base: 'Defuse all mines on a tile. If any mine is defused, gain 2 copper; if the tile was a mine, reveal it safely.',
      enhanced: 'Defuse all mines on a tile. If any mine is defused, gain 2 copper; if the tile was a mine, reveal it safely and sense nearby mines.'
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
      base: 'Blow dirt, goblins, and surface mines in a burst 1 cross area to adjacent tiles',
      enhanced: 'Blow dirt, goblins, and surface mines in a 3x3 area to adjacent tiles'
    },
    icon: '🪭'
  },
  'Gaze ↑': {
    name: 'Gaze ↑',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Look up and sense the first rival tile',
      enhanced: 'Look up and sense the first rival tile and the first mine tile'
    },
    icon: '👀'
  },
  'Gaze ↓': {
    name: 'Gaze ↓',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Look down and sense the first rival tile',
      enhanced: 'Look down and sense the first rival tile and the first mine tile'
    },
    icon: '👀'
  },
  'Gaze ←': {
    name: 'Gaze ←',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Look left and sense the first rival tile',
      enhanced: 'Look left and sense the first rival tile and the first mine tile'
    },
    icon: '👀'
  },
  'Gaze →': {
    name: 'Gaze →',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Look right and sense the first rival tile',
      enhanced: 'Look right and sense the first rival tile and the first mine tile'
    },
    icon: '👀'
  },
  'Fetch ↑': {
    name: 'Fetch ↑',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Look up and reveal all tiles of the most common type you see',
      enhanced: 'Look up and reveal all tiles of the most common type you see. Draw a card.'
    },
    icon: '🎾'
  },
  'Fetch ↓': {
    name: 'Fetch ↓',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Look down and reveal all tiles of the most common type you see',
      enhanced: 'Look down and reveal all tiles of the most common type you see. Draw a card.'
    },
    icon: '🎾'
  },
  'Fetch ←': {
    name: 'Fetch ←',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Look left and reveal all tiles of the most common type you see',
      enhanced: 'Look left and reveal all tiles of the most common type you see. Draw a card.'
    },
    icon: '🎾'
  },
  'Fetch →': {
    name: 'Fetch →',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Look right and reveal all tiles of the most common type you see',
      enhanced: 'Look right and reveal all tiles of the most common type you see. Draw a card.'
    },
    icon: '🎾'
  },
  'Burger': {
    name: 'Burger',
    cost: 2,
    category: 'reward',
    exhaust: true,
    description: {
      base: 'Draw a card every turn for 2 more floors',
      enhanced: 'Draw a card every turn for 3 more floors'
    },
    icon: '🍔'
  },
  'Donut': {
    name: 'Donut',
    cost: 1,
    category: 'reward',
    description: {
      base: 'Summon a goblin on one of your tiles at random',
      enhanced: 'Summon a goblin on two of your tiles at random'
    },
    icon: '🍩'
  },
  'Ice Cream': {
    name: 'Ice Cream',
    cost: 2,
    category: 'reward',
    exhaust: true,
    description: {
      base: 'Gaining copper from your tile reveals also gains 1 energy for 2 more floors',
      enhanced: 'Gaining copper from your tile reveals also gains 1 energy for 3 more floors'
    },
    icon: '🍦'
  },
  'Carrots': {
    name: 'Carrots',
    cost: 2,
    category: 'reward',
    exhaust: true,
    description: {
      base: 'Reveal one of your tiles at the start of each floor for 2 more floors',
      enhanced: 'Reveal one of your tiles at the start of each floor for 3 more floors'
    },
    icon: '🥕'
  },
}

// Centralized AI metadata
export interface AIMetadata {
  name: string
  description: string
  icon: string
}

export const AI_METADATA: Record<string, AIMetadata> = {
  'noguess': {
    name: 'Instruction Follower',
    description: 'Rival follows their instructions as best they can, and that\'s it',
    icon: '🛡️'
  },
  'random': {
    name: 'Random Rival',
    description: 'Makes completely random choices, ignoring all clues',
    icon: '?'
  },
  'conservative': {
    name: 'Observant',
    description: 'Rival uses some deduction if they can, then follows their instructions',
    icon: '🧠'
  },
  'reasoning': {
    name: 'Intuitive',
    description: 'Rival accounts for probabilities as best they can, while also following their instructions',
    icon: '🎲'
  }
}

// Centralized equipment definitions
export const EQUIPMENT_DEFINITIONS: Record<string, EquipmentDefinition> = {
  'Double Broom': {
    name: 'Double Broom',
    description: 'brush some nearby tiles when cleaning',
    hoverText: 'Double Broom: whenever you reveal a tile, apply a Brush effect to two random unrevealed adjacent tiles',
    category: 'common',
    icon: '🧹'
  },
  'Dust Bunny': {
    name: 'Dust Bunny',
    description: 'animal companion who helps you clean',
    hoverText: 'Dust Bunny: when you start a new floor, reveal one of your tiles at random',
    category: 'common',
    icon: '🐰'
  },
  'Frilly Dress': {
    name: 'Frilly Dress',
    description: 'your counterpart sometimes watches you clean rather than cleaning themselves',
    hoverText: 'Frilly Dress: revealing up to four neutral tiles on your first turn does not end your turn',
    category: 'common',
    icon: '👗'
  },
  'Busy Canary': {
    name: 'Busy Canary',
    description: 'industrious birb who scans for mines at floor start',
    hoverText: 'Busy Canary: at the start of every floor, randomly scan up to 2 areas for mines',
    category: 'common',
    icon: '🐦'
  },
  'Mop': {
    name: 'Mop',
    description: 'cleaning is super efficient now!',
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
    hoverText: 'Estrogen: replace three random cards in your deck with their energy-upgraded versions',
    category: 'rare',
    icon: '💉'
  },
  'Progesterone': {
    name: 'Progesterone',
    description: "nothing's easier but everything's better",
    hoverText: 'Progesterone: replace three random cards in your deck with their enhance-upgraded versions',
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
    name: 'Mirrors',
    description: 'reflect your rival\'s moves',
    hoverText: 'Mirrors: at the start of each floor, one random rival tile is revealed and you sense your own adjacent tiles',
    category: 'common',
    icon: '🪞'
  },
  'Handbag': {
    name: 'Handbag',
    description: 'a purse; a big purse',
    hoverText: 'Handbag: draw 2 additional cards on your first turn',
    category: 'common',
    icon: '👜'
  },
  'Eyeshadow': {
    name: 'Eyeshadow',
    description: 'distract your rival with your beauty',
    hoverText: 'Eyeshadow: your rival ... um. their clues won\'t work as well. kinda-sorta like playing half a Ramble every turn?',
    category: 'common',
    icon: '👁️'
  },
  'Hyperfocus': {
    name: 'Hyperfocus',
    description: 'you will *definitely* do *something*',
    hoverText: 'Hyperfocus: put a random net-cost-0 card into your first turn\'s hand',
    category: 'common',
    icon: '🎯'
  },
  'Choker': {
    name: 'Choker',
    description: 'your rival can\'t help but look',
    hoverText: 'Choker: when your rival reaches 5 tiles left unrevealed, their turn ends',
    category: 'common',
    icon: '📿'
  },
  'Crystal': {
    name: 'Crystal',
    description: 'enhance your senses',
    hoverText: 'Crystal: add 3 doubly-upgraded Tingles to your deck',
    category: 'rare',
    icon: '💎'
  },
  'Boots': {
    name: 'Boots',
    description: 'replace your slippers with rockin\' boots',
    hoverText: 'Boots: replace a card from your deck with a random doubly-upgraded card',
    category: 'rare',
    icon: '👢'
  },
  'Glasses': {
    name: 'Glasses',
    description: 'see clearly now',
    hoverText: 'Glasses: before each of your turns, play a free Tingle (it is discarded)',
    category: 'common',
    icon: '👓'
  },
  'Broom Closet': {
    name: 'Broom Closet',
    description: 'put away your spray bottle and break out the brooms',
    hoverText: 'Broom Closet: remove all Spritz cards from your deck and add 3 Broom cards (regular, energy-upgraded, one enhance-upgraded)',
    category: 'rare',
    icon: '🚪'
  },
  'Novel': {
    name: 'Novel',
    description: 'read instead of working',
    hoverText: 'Novel: replace all current and future Instruction cards in your deck with doubly-upgraded Sarcastic Instructions',
    category: 'rare',
    icon: '📖'
  },
  'Bleach': {
    name: 'Bleach',
    description: 'clean so easily',
    hoverText: 'Bleach: enhance-upgrade all Spritz and Sweep cards in your deck',
    category: 'common',
    icon: '🧴'
  },
  'Cocktail': {
    name: 'Cocktail',
    description: 'chill out and relax',
    hoverText: 'Cocktail: remove all Scurry cards from your deck, add 2 random energy-upgraded cards instead',
    category: 'uncommon',
    icon: '🍸'
  },
  'DIY Gel': {
    name: 'DIY Gel',
    description: 'waow, what a feeling',
    hoverText: 'DIY Gel: every card added to your deck will be automatically enhance-upgraded',
    category: 'rare',
    icon: '🧴',
    prerequisites: ['Progesterone']
  },
  'Tea': {
    name: 'Tea',
    description: 'she tells good stories, too',
    hoverText: 'Tea: Frilly Dress is no longer limited to 4 neutral tiles',
    category: 'uncommon',
    icon: '☕',
    prerequisites: ['Frilly Dress']
  },
  'Triple Broom': {
    name: 'Triple Broom',
    description: 'brush even more',
    hoverText: 'Triple Broom: revealing applies Brush effect to 3 random adjacent unrevealed tiles instead of 2',
    category: 'uncommon',
    icon: '3️⃣',
    prerequisites: ['Double Broom']
  },
  'Quadruple Broom': {
    name: 'Quadruple Broom',
    description: 'sweep, sweep, sweep, sweep',
    hoverText: 'Quadruple Broom: revealing applies Brush effect to 4 random adjacent unrevealed tiles instead of 3',
    category: 'rare',
    icon: '💪',
    prerequisites: ['Triple Broom']
  },
  'Mated Pair': {
    name: 'Mated Pair',
    description: 'a second bunny companion!',
    hoverText: 'Mated Pair: reveal another of your tiles at the start of each floor',
    category: 'uncommon',
    icon: '🍐',
    prerequisites: ['Dust Bunny']
  },
  'Baby Bunny': {
    name: 'Baby Bunny',
    description: 'where could this bun have come from',
    hoverText: 'Baby Bunny: reveal a third of your tiles at the start of each floor',
    category: 'rare',
    icon: '🍼',
    prerequisites: ['Mated Pair']
  },
  'Pockets': {
    name: 'Pockets',
    description: 'do you even need a purse?',
    hoverText: 'Pockets: draw a third additional card on your first turn',
    category: 'uncommon',
    icon: '👖',
    prerequisites: ['Handbag']
  },
  'Mascara': {
    name: 'Mascara',
    description: 'even more distracting beauty',
    hoverText: 'Mascara: look I don\'t know how to tell you exactly what this does but yeah it\'s like playing more Rambles',
    category: 'uncommon',
    icon: '✏️',
    prerequisites: ['Eyeshadow']
  },
  'Geode': {
    name: 'Geode',
    description: 'the future reveals itself to you',
    hoverText: 'Geode: whenever you play a Tingle, draw a card',
    category: 'rare',
    icon: '🔷',
    prerequisites: ['Crystal']
  },
  'Fanfic': {
    name: 'Fanfic',
    description: 'read *fanfiction* instead of working',
    hoverText: 'Fanfic: playing a Sarcastic Instructions draws a card and loses 1 copper',
    category: 'rare',
    icon: '📜',
    prerequisites: ['Novel']
  },
  'Favor': {
    name: 'Favor',
    description: 'your rival owes you one',
    hoverText: 'Favor: finish a floor when 1 of your tiles is remaining instead of 0',
    category: 'rare',
    icon: '🤝',
    prerequisites: ['Tea', 'Cocktail']
  },
  'Disco Ball': {
    name: 'Disco Ball',
    description: 'lock eyes across the dance floor',
    hoverText: 'Disco Ball: add 2 doubly-upgraded Tingles to your deck',
    category: 'rare',
    icon: '🪩',
    prerequisites: ['Geode']
  },
  'Espresso': {
    name: 'Espresso',
    description: 'even more caffeine',
    hoverText: 'Espresso: just before starting each turn, draw 1 final card and immediately play it (still costs energy)',
    category: 'rare',
    icon: '☕',
    prerequisites: ['Caffeinated']
  }
}

// Helper function to apply DIY Gel enhancement to a card if owned
export function applyDIYGel(equipment: Equipment[], card: Card): Card {
  const hasDIYGel = equipment.some(r => r.name === 'DIY Gel')

  // If DIY Gel is owned and the card is not already enhanced, enhance it
  if (hasDIYGel && !card.enhanced) {
    return createCard(card.name, {
      enhanced: true,
      energyReduced: card.energyReduced
    })
  }

  // Otherwise, return the card as-is
  return card
}

// Helper function to add a card to the persistent deck, respecting DIY Gel
export function addCardToPersistentDeck(state: { persistentDeck: Card[]; equipment: Equipment[] }, card: Card): Card[] {
  const finalCard = applyDIYGel(state.equipment, card)
  return [...state.persistentDeck, finalCard]
}

// Factory functions for creating cards and equipment

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

export function createEquipment(name: string): Equipment {
  const definition = EQUIPMENT_DEFINITIONS[name]
  if (!definition) {
    throw new Error(`Unknown equipment: ${name}`)
  }

  return {
    id: crypto.randomUUID(),
    name: definition.name,
    description: definition.description,
    hoverText: definition.hoverText,
    prerequisites: definition.prerequisites
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
    // Two copies of Scurry
    createCard('Scurry'),
    createCard('Scurry'),
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
    { baseName: 'Burger', weight: 2/3 }, // Rare - appears 2/3 as often
    { baseName: 'Ice Cream', weight: 2/3 }, // Rare - appears 2/3 as often
    { baseName: 'Donut', weight: 2/3 }, // Rare - appears 2/3 as often
    { baseName: 'Carrots', weight: 2/3 } // Rare - appears 2/3 as often
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

export function getAllEquipment(): Equipment[] {
  return Object.keys(EQUIPMENT_DEFINITIONS).map(name => createEquipment(name))
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

export function getEquipmentIcon(equipmentName: string): string {
  const definition = EQUIPMENT_DEFINITIONS[equipmentName]
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
        name: 'Underwire',
        description: 'Protects once from revealing mines',
        enhanced,
        count: 1
      }
    case 'ramble_active':
      return {
        id: baseId,
        type: 'ramble_active',
        icon: '🌀',
        name: 'Rambling',
        description: 'Rival has a harder time following instructions on their next turn',
        enhanced
      }
    case 'manhattan_adjacency':
      return {
        id: baseId,
        type: 'manhattan_adjacency',
        icon: '🔢',
        name: 'Wide Adjacency',
        description: 'For this floor, the four tiles up, down, left, and right at distance 2 are also considered adjacent'
      }
    case 'horse_discount':
      return {
        id: baseId,
        type: 'horse_discount',
        icon: '🐴',
        name: 'Horse Girl',
        description: 'Horses cost 0 for the rest of this floor (someone else is paying)'
      }
    case 'rival_never_mines':
      return {
        id: baseId,
        type: 'rival_never_mines',
        icon: '🚫',
        name: 'Rival Advantage',
        description: 'Your rival will never reveal mine tiles this floor'
      }
    case 'grace':
      return {
        id: baseId,
        type: 'grace',
        icon: '🤞',
        name: 'Grace',
        description: 'Protects once from revealing mines, but adds an Evidence to the top of your draw pile and an Evidence to your discard'
      }
    case 'rival_mine_protection':
      return {
        id: baseId,
        type: 'rival_mine_protection',
        icon: '🪙',
        name: 'Rival Favoritism',
        description: 'Protects rival, once, from revealing mines, but awards you copper if used',
        count: 0 // Will be set based on level config
      }
    case 'rival_places_mines':
      return {
        id: baseId,
        type: 'rival_places_mines',
        icon: '💣',
        name: 'Rival Mines You!',
        description: 'Rival places surface mines on your tiles after each turn!',
        count: 0 // Will be set based on level config
      }
    case 'rival_ai_type':
      return {
        id: baseId,
        type: 'rival_ai_type',
        icon: '🤖',
        name: 'AI Type',
        description: 'Rival AI type indicator',
        count: 0
      }
    case 'burger':
      return {
        id: baseId,
        type: 'burger',
        icon: '🍔',
        name: 'Burger',
        description: 'Draw an additional card every turn',
        enhanced,
        count: 1
      }
    case 'ice_cream':
      return {
        id: baseId,
        type: 'ice_cream',
        icon: '🍦',
        name: 'Ice Cream',
        description: 'Gaining copper from your tile reveals also gains 1 energy',
        enhanced,
        count: 1
      }
    case 'carrots':
      return {
        id: baseId,
        type: 'carrots',
        icon: '🥕',
        name: 'Carrots',
        description: 'Reveal one of your tiles at the start of the floor',
        enhanced,
        count: 1
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

/**
 * Get the AI type key from an AI name
 * @param aiName - The AI name (e.g., 'NoGuess Rival', 'Random Rival')
 * @returns The AI type key (e.g., 'NoGuess', 'Random')
 */
export function getAITypeKeyFromName(aiName: string): string {
  for (const [key, metadata] of Object.entries(AI_METADATA)) {
    if (metadata.name === aiName) {
      return key
    }
  }
  throw new Error(`Unknown AI name: ${aiName}. Available names: ${Object.values(AI_METADATA).map(m => m.name).join(', ')}`)
}

/**
 * Create a rival AI status effect from an AI type key
 * This centralizes the creation logic for AI status effects
 * Uses the centralized AI_METADATA registry
 *
 * @param aiTypeKey - The AI type key (e.g., 'NoGuess', 'Random', 'Conservative', 'Reasoning')
 */
export function createAIStatusEffect(aiTypeKey: string): StatusEffect {
  const metadata = AI_METADATA[aiTypeKey]

  if (!metadata) {
    throw new Error(`Unknown AI type: ${aiTypeKey}. Available types: ${Object.keys(AI_METADATA).join(', ')}`)
  }

  return {
    id: crypto.randomUUID(),
    type: 'rival_ai_type' as const,
    icon: metadata.icon,
    name: metadata.name,
    description: metadata.description,
    count: 0
  }
}