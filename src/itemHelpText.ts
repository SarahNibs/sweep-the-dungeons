// Item help text for cards and equipment
// Edit this file to update the help content for specific items

// =============================================================================
// REUSABLE TEXT SNIPPETS
// =============================================================================
// Define common paragraphs here and reference them in item help below

export const snippets = {
  exhaust: `**Exhaust**: This card is removed from the game after being played. It will not return to your deck, discard pile, or hand. It's gone for good (for this run).`,

  energyReduced: `**Energy Refund**: This card has been upgraded to refund 1 energy when played. This can let you play more cards in a turn.`,

  enhanced: `**Enhanced Effect**: This card has been upgraded to have a more powerful effect when played.`,

  targeting: `**Targeting**: After playing this card, you'll need to select a tile (or tiles) on the board to target.`,

  adjacency: `**Adjacency**: When a tile is revealed, the number shown indicates how many adjacent tiles (including diagonals) belong to the same team as whoever revealed it. If you reveal it, it counts YOUR tiles. If your rival reveals it, it counts THEIR tiles.`,

  instructions: `**Instruction Cards**: These cards use a probabilistic system to mark tiles with pips. More pips = more likely to be your tile. The distribution isn't perfect - sometimes the game lies to you!`,
}

// =============================================================================
// CARD HELP
// =============================================================================

export const cardHelp: Record<string, string> = {
  // Starting cards
  'Scurry': `# Scurry

**Cost**: 0 energy

A free card that does nothing. Sometimes you'll want to remove these from your deck to make it more consistent.

Often found in starter decks or as filler.`,

  'Spritz': `# Spritz

**Cost**: 1 energy

Marks ONE random neutral tile.

${snippets.targeting}

This is a basic information-gathering card. Knowing which tiles are neutral helps you avoid wasting time on them.`,

  'Sweep': `# Sweep

**Cost**: 1 energy

Reveals a tile and continues your turn even if it's not yours.

${snippets.targeting}
${snippets.exhaust}

This is a powerful card for safely exploring tiles you're uncertain about. The exhaust means you'll only get one use per run, so use it wisely!`,

  'Scout': `# Scout

**Cost**: 1 energy

Marks a tile as either SAFE (your tile or neutral) or DANGEROUS (rival tile or mine).

${snippets.targeting}

Scout doesn't tell you exactly what a tile is, but it narrows it down significantly. Very useful for avoiding mines!`,

  'Elimination': `# Elimination

**Cost**: 1 energy

Marks ONE random rival tile.

This helps you avoid rival tiles and focus on finding your own tiles.`,

  'Quantum Choice': `# Quantum Choice

**Cost**: 1 energy

Select TWO tiles. The safer one will be auto-revealed.

${snippets.targeting}

Great for making progress when you're uncertain between two tiles. The game picks the less risky option for you.`,

  'Imperious Instructions': `# Imperious Instructions

**Cost**: 2 energy

Distributes 10 pips across tiles. More pips = more likely to be YOUR tile.

${snippets.instructions}

This is your basic instruction card. Most of the time, the tiles with the most pips will be yours... but not always!

**Enhanced**: Distributes 15 pips instead of 10.`,

  'Vague Instructions': `# Vague Instructions

**Cost**: 2 energy

Distributes 10 pips across tiles. Less accurate than Imperious Instructions.

${snippets.instructions}

The pips from Vague Instructions are less reliable. Use them as hints, not certainties.

**Enhanced**: Distributes 15 pips instead of 10.`,

  'Sarcastic Instructions': `# Sarcastic Instructions

**Cost**: 0 energy

Distributes 15 pips across tiles. This is the most reliable instruction card!

${snippets.instructions}

Free to play AND more pips than other instructions. This is a powerful card.

**Enhanced**: Distributes 20 pips instead of 15.`,

  // Placeholder for other cards - you can fill these in
  'Monster': `# Monster

**Cost**: 3 energy

Draw 2 cards immediately.

A simple but powerful card for cycling through your deck faster.

**Enhanced**: Draw 4 cards instead of 2.`,

  'Tingle': `# Tingle

**Cost**: 1 energy

Reveals a random tile that is definitely yours.

This is one of the most powerful cards in the game - it gives you a guaranteed safe reveal and continues your turn.

**Enhanced**: Reveals TWO random tiles that are yours.`,

  // Add more cards here as needed
  'Evidence': `# Evidence

**Cost**: 1 energy

A card added to your deck when you survive revealing a mine (thanks to Grace). Doesn't do anything useful.

${snippets.exhaust}

You'll want to play and exhaust these as soon as possible to clean up your deck.`,
}

// =============================================================================
// EQUIPMENT HELP
// =============================================================================

export const equipmentHelp: Record<string, string> = {
  'Estrogen': `# Estrogen

Upgrades random cards in your deck to refund 1 energy when played.

${snippets.energyReduced}

This equipment effect activates immediately when you gain it. You'll see which cards were upgraded.`,

  'Progesterone': `# Progesterone

Upgrades random cards in your deck to have enhanced effects.

${snippets.enhanced}

This equipment effect activates immediately when you gain it. You'll see which cards were upgraded.`,

  'Boots': `# Boots

Transform one card from your deck into a random double-upgraded card.

You'll be prompted to select a card to transform. The replacement will have both energy reduction AND enhanced effect!`,

  'Crystal': `# Crystal

Adds 3 doubly-enhanced Tingles to your permanent deck.

Tingle is one of the best cards in the game, and getting three powered-up versions is incredible.`,

  'Broom Closet': `# Broom Closet

Removes all Spritz cards from your deck and adds 3 Sweep cards (one normal, one energy-upgraded, one enhanced).

This trades weak information cards for powerful exploration tools.`,

  'Cocktail': `# Cocktail

Removes all Scurry cards from your deck and adds 2 random energy-upgraded cards.

Cleans up your deck and adds useful cards!`,

  'Disco Ball': `# Disco Ball

Adds 2 doubly-enhanced Tingles to your permanent deck.

Similar to Crystal but with only 2 Tingles instead of 3.`,

  'Novel': `# Novel

Replaces all Instruction cards (Imperious, Vague, Sarcastic) with doubly-upgraded Sarcastic Instructions.

Also transforms any future Instruction cards you gain into Sarcastic Instructions.

This makes all your instruction cards free AND more powerful!`,

  'Bleach': `# Bleach

Upgrades all Spritz and Sweep cards in your deck with enhanced effects.

${snippets.enhanced}`,

  'Espresso': `# Espresso

**Passive Effect**: At the start of each turn, draw 1 card and immediately play it for free (if you have enough energy).

This effectively gives you extra actions each turn. Very powerful!

Note: Cards that need targeting or special handling (Tingle, Masking, Nap, etc.) will be drawn but left in your hand for you to play manually.`,

  'Grace': `# Grace

**Passive Effect**: The first time you reveal a mine each floor, you survive! An Evidence card is added to your deck.

Without Grace, revealing a mine ends your run immediately. With Grace, you get one free mistake per floor.`,

  'Favor': `# Favor

**Passive Effect**: Win the floor when you have only 1 unrevealed tile of yours remaining (instead of needing to reveal all of them).

Saves you from having to find that last difficult tile!`,

  // Add more equipment here as needed
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get help text for a card
 */
export function getCardHelp(cardName: string): string {
  return cardHelp[cardName] || `# ${cardName}\n\n(No help text available yet. This card exists in the game but hasn't been documented yet.)`
}

/**
 * Get help text for equipment
 */
export function getEquipmentHelp(equipmentName: string): string {
  return equipmentHelp[equipmentName] || `# ${equipmentName}\n\n(No help text available yet. This equipment exists in the game but hasn't been documented yet.)`
}
