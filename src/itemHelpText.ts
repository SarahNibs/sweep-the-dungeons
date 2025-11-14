// Item help text for cards and equipment
// Edit this file to update the help content for specific items

// =============================================================================
// REUSABLE TEXT SNIPPETS
// =============================================================================
// Define common paragraphs here and reference them in item help below

export const snippets = {
  brush: `**Brush**: Annotate a tile to exclude one random tile type (except the type it actually is, of course). So, for example, if the tile happens to be mined, and has no annotations yet, after Brushing it once it will be annotated as one of [yours, neutral, mined], or [yours, rival, mined], or [neutral, rival, mined] at random.`,

  modifies_deck: `**Deck Modification**: Lots of equipment will modify your deck. Similar to card removal, purchasing cards, purchasing upgrades, etc, when you gain equipment that modifies your deck, the modification is permanent and applies to all future floors.`,

  exhaust: `**Exhaust**: When a card is **exhausted**, it goes to the exhaust pile, not the discard pile. It will not be shuffled back into your draw pile this floor.`,

  energy_reduced: `**Energy Refund**: Cards can be upgraded to refund 1 energy when played. You still need the energy to play the card in the first place.`,

  enhanced: `**Enhanced Effect**: Cards can be upgraded to have a more powerful effect when played.`,

  targeting: `**Targeting**: When playing this card, you'll need to select a tile (or tiles) on the board to target.`,

  safety: `**Safety**: Your tiles (green) are considered more safe than neutral tiles (yellow) which are more safe than rival tiles (red) which are more safe than mined tiles (purple).`,

  clean: `**Clean**: When you **clean** a tile, you remove all dirt from it, goblins move away from it to an adjacent unrevealed tile without a goblin or leave entirely if no such tile is available, and surface mines, if cleaned twice, are defused.`,

  surface_mine: `**Surface Mine**: On later floors, you may see mines sitting on tiles. They work like regular mines on tiles, except cleaning them will defuse them. They must be cleaned twice to be defused, though. When you defuse a surface mine you are awarded with 3 copper!`,

  goblin: `**Goblins**: On later floors, you may see goblins sitting on tiles. You can't reveal a tile with a goblin on it until the goblin has left! If you try, you will clean the tile instead (and your turn will end). Cleaning a tile with a goblin on it will cause the goblin to move to an adjacent unrevealed tile without a goblin or leave entirely if no such tile is available. If a goblin moves onto a tile with a surface mine, it will explode, destroying the tile (and the goblin). But it won't be your fault!`,

  goblin_lair: `**Goblin Lair**: On some empty spaces you may see goblin lairs. After each of your turns, every goblin lair will spawn one goblin on a random unrevealed tile adjacent to it. Lairs avoid spawning goblins on mines, and especially avoid spawning goblins on surface mines.`,

  dirt: `**Dirt**: Some tiles are dirty. You can't reveal a dirty tile until the tile is cleaned. If you try, you will clean the tile instead (and your turn will end).`,

  instructions: `**Instructions**: Certain effects give probabilistic information about which tiles should be revealed. This information is represented by 10 pips distributed over various unrevealed tiles. Lots of green pips near the top of tiles indicate the tile is likely yours; lots of red Xs near the top of tiles indicate the tile is likely not yours; and lots of black Xs near the bottom of tiles indicate the tile is likely your rival's. If you hover over pips, all tiles involved in that particular set of instructions will be highlighted, and the number of pips that were originally on any of them that have already been revealed will show up while hovered.`,

  bayes_instructions: `**Probabilites**: If 12 As, 12 Bs, 4 Cs, 4 Ds, 4 Es, 4 Fs, 4 Gs, and 4 Hs are in a bag, and we draw 10 letters from the bag, and notice that we have drawn 3 of some letter and no more than 2 of any other letter, how likely is it that the letter is A or B? The answer is "generally over 80%", and even higher if some of the letters C-H only have 3 instances in the bag, and then sometimes some of the C-H are your tiles anyway... also, the way that one (basic Imperious Instructions) works is that it starts with drawing two letters that are guaranteed to be either A or B, then draws the remaining 8...`,

  floors_stack: `**Lasts for N Floors**: Some effects (Burger, Ice Cream, Carrots) last for the next 3 more floors, or 7 more floors, or etc. Gaining more of the effect extends the number of floors the effect will last for, but does not otherwise enhance the effect. The number of floors remaining will appear in the lower right of the effect's display.`,

  stacking: `**Stacking**: Some effects can be stacked upon each other multiple times (Underwire, Ramble). The count of effects you have active at once will appear in the lower right of the effect's display.`,

  directional: `**Directional**: Some cards (Gaze, Fetch) have four directional variants. The tiles they target start at whichever tile you choose and then go in a line in the direction the variant specifies, all the way to the edge of the board. They do include the tile you choose!`,

  burst_1_cross: `**Burst 1 Cross**: This area is five total tiles, one in the middle and the four directly above, below, to the left, and to the right.`,

  annotations: `**Annotations**: When an effect annotates a tile, you will see up to four little colored squares in the bottom right of the tile. Top left: mines (purple), top right: neutral (yellow), lower left: rival (red), lower right: yours (green). Whichever squares are present are the remaining possible types of the tile. For example, when Tingle annotates a tile as your rival's, you will see a small red square and no others in the bottom right of the tile. Whenever these annotations rule out a tile as not yours, the tile will automatically get a black slash through it, as if you had right-clicked the tile yourself. Many effects will annotate tiles like this; for example, when Scurry reveals a tile, the other tile will be annotated as "could be any type that's not safer than the one revealed", so if Scurry reveals a neutral, the other tile will be annotated as "neutral, rival, or mine" and black slashed.`,

  prog_tree: `**Tree**: Progesterone --> DIY Gel`,
  crystal_tree: `**Tree**: Crystal --> Geode --> Disco Ball`,
  dress_tree: `**Tree**: Frilly Dress --> Tea --> Favor <-- Cocktail`,
  caffeine_tree: `**Tree**: Caffeinated --> Espresso`,
  broom_tree: `**Tree**: Double Broom --> Triple Broom --> Quadruple Broom`,
  bunny_tree: `**Tree**: Dust Bunny --> Mated Pair --> Baby Bunny`,
  bag_tree: `**Tree**: Handbag --> Pockets`,
  distract_tree: `**Tree**: Eyeshadow --> Mascara`,
  novel_tree: `**Tree**: Novel --> Fanfic`,

  requirements: `**Requirements**: Equipment often cannot show up to be chosen unless you already have its prerequisite equipment. For example, you will not be offered Triple Broom unless you already have Double Broom.`,

  distraction: `**Distraction**: All rival algorithms operate by first revealing any tiles they can deduce are theirs, then using their equivalent of information you could obtain from playing an Imperious Instructions card to make educated guesses, perhaps mixed with other probabilistic information in the case of the more sophisticated algorithms. You have three methods of disrupting their probabilistic information, each providing 1 or more stacks of a single effect which adds the equivalent of between 0 and 1.5 Instructions pips to every tile the algorithm is considering, each determined independently at random. Eyeshadow adds 1 stack, Mascara adds 1 stack, Ramble adds 2 stacks, and Enhanced Ramble adds 4 stacks. So for instance if the rival takes a turn with 3 stacks of Distraction, every one of their tiles will receive noise interfering with the signal they have of roughly 2.25 pips (0.75 * 3) with standard deviation ~0.75.`
}

// =============================================================================
// CARD HELP
// =============================================================================

export const cardHelp: Record<string, string> = {
  // Starting cards
  'Scurry': `# Scurry
**Cost**: 1 energy
**Effect**: Choose two unrevealed tiles. Of those which are the most **safe**, one will be revealed at random.
**Enhanced**: Choose between three tiles, not two.
**Curiosities**: Your own reveal triggers won't happen on tiles revealed with Scurry. The most important implication of this is that if Scurry reveals a dirty tile, or one with a goblin on it, the tile will be cleaned or goblin run away, but your turn will not end.
${snippets.safety}
`,

  'Spritz': `# Spritz
**Cost**: 1 energy
**Effect**: Choose one tile. Clean it, then it will be annotated as either **safe** (yours or neutral) or **dangerous** (rival's or a mine).
**Enhanced**: Additionally, a random adjacent tile will be cleaned and then annotated.
**Curiosities**: An enhanced Spritz will fully disarm a **surface mine** with just one cleaning.
${snippets.clean}
${snippets.safety}
${snippets.surface_mine}
`,

  'Sweep': `# Sweep
**Cost**: 1 energy
**Effect**: Choose a 5x5 area. **Clean** all tiles in the area.
**Enhanced**: Choose a 7x7 area instead.
**Curiosities**: With the Mop equipment, a Sweep will fully disarm a **surface mine** with just one cleaning.
${snippets.clean}
${snippets.surface_mine}
`,

  'Imperious Instructions': `# Imperious Instructions
**Cost**: 2 energy
**Effect**: 10 green pips will be distributed onto unrevealed tiles, and usually whichever two tiles got the most pips will be yours, but by no means always.
**Enhanced**: None of the tiles that receive any pips will be mined.
**Curiosities**: Two of your unrevealed tiles will be chosen at random to receive most of the evidence, then six other unrevealed tiles chosen from any that aren't ruled out as yours by a 0-adjacency result on a revealed tile. The first two get 12 instances apiece in a bag and of the other six, neutral and rival get 4 instances and player and mined get 3 instances, then 10 are drawn from the bag, the first 2 guaranteed to be from those initial two of your tiles chosen.
${snippets.instructions}
${snippets.bayes_instructions}
`,

  'Vague Instructions': `# Vague Instructions
**Cost**: 2 energy
**Effect**: 10 green pips will be distributed onto unrevealed tiles, and it's pretty likely that maybe around 3-6 of the tiles with pips will be yours.
**Enhanced**: Your tiles will get more pips, on average.
**Curiosities**: Five of your unrevealed tiles will be chosen at random to receive most of the evidence, with another fourteen other unrevealed tiles chosen from any that aren't ruled out as yours by a 0-adjacency result on a revealed tile. Specifically the first five get 4 instances apiece in a bag and of the other fourteen, neutral and rival get 2 instances and player and mined get 1 instance, then 10 are drawn from the bag, the first 3 (enhanced: 5) guaranteed to be from those initial five of your tiles chosen.
${snippets.instructions}
${snippets.bayes_instructions}
  `,

  'Sarcastic Instructions': `# Sarcastic Instructions
**Cost**: 2 energy
**Effect**: 10 red Xs will be distributed onto unrevealed tiles, either showing an area surrounded by lots of your unrevealed tiles if such an area exists, or just showing you lots of tiles that probably aren't yours.
**Enhanced**: Refunds 1 energy unless it's the very first Instruction card played this floor.
**Curiosities**: It might show you two areas surrounded by lots of your unrevealed tiles, if 2+ such areas exist. You can often tell that you're being instructed to guess most everything adjacent to a tile because that tile will have lots of red Xs rather than seeing a more even distribution. If it is a more even distribution, the pips will have been distributed on tiles weighted yours: 2, neutral: 3, rival's: 4, mined: 5.
${snippets.instructions}
${snippets.bayes_instructions}
  `,

  'Monster': `# Monster
**Cost**: 0 energy
**Effect**: Draw 2 cards, then exhaust.
**Enhanced**: Draw 4 instead, then exhaust.
${snippets.exhaust}
`,

  'Tingle': `# Tingle
**Cost**: 1 energy
**Effect**: From unrevealed rival and mined tiles, pick one at random and annotate it as rival or mine.
**Enhanced**: Also give adjacency info about your tiles.
**Curiosities**: Four different pieces of equipment affect Tingles; in particular Geode draws you a card every time you play a Tingle. (But you can't find Geode without first picking Crystal!)
`,

  'Twirl': `# Twirl
**Cost**: 3 energy
**Effect**: Gain 3 copper, then exhaust this card.
**Enhanced**: Gain 5 copper instead.
${snippets.exhaust}
`,

  'Energized': `# Energized
**Cost**: 1 energy
**Effect**: Gain 2 energy, then exhaust this card.
**Enhanced**: No longer exhausts.
${snippets.exhaust}
`,

  'Options': `# Options
**Cost**: 1 energy
**Effect**: Draw 3 cards.
**Enhanced**: Draw 5 cards.
`,

  'Brush': `# Brush
**Cost**: 1 energy
**Effect**: In a 3x3 area, for every tile, annotate it to exclude one random tile type (except the type it actually is, of course).
**Enhanced**: Do it again in the same area.
**Curiosities**: Brushing a tile does not necessarily give you information you don't already know! If you already know a tile can't be your rival's and can't be mined, perhaps because you've Spritz'd it, Brushing might choose to exclude rival, at random, in which case the annotations wouldn't change at all. About a third of tiles will seem unaffected by the enhanced effect of a Brush because of this; only one type will be excluded because it was randomly chosen both times.
${snippets.annotations}
`,

  'Ramble': `# Ramble
**Cost**: 1 energy
**Effect**: Gain 2 stacks of Distraction for your rival's next turn.
**Enhanced**: Gain 4 stacks instead.
${snippets.distraction}
`,

  'Underwire': `# Underwire
**Cost**: 0 energy
**Effect**: On this floor, the next tile you reveal that's mined or has a surface mine will have no effect on you. Exhaust.
**Enhanced**: This no longer exhausts.
**Curiosities**: Multiple Underwires build up charges; each mine reveal consumes one charge. These will be used before Grace.
${snippets.surface_mine}
`,

  'Tryst': `# Tryst
**Cost**: 1 energy
**Effect**: Reveal a random rival tile (this does not end your turn!), giving adjacency information about your neighboring tiles; then reveal a random one of your tiles, giving adjacency information about your rival's neighboring tiles.
**Enhanced**: First choose a tile. The random reveals will be chosen from those tiles closest to your chosen tile. Diagonal counts as 2 spaces away.
**Curiosities**: You can complete a floor this way. You can also lose a floor this way! And the rival's tile is revealed first.
`,

  'Canary': `# Canary
**Cost**: 0 energy
**Effect**: Find and annotate all mined tiles in a burst 1 cross area. If any mines were actually found, this is exhausted, otherwise discarded.
**Enhanced**: A 3x3 area instead.
${snippets.burst_1_cross}
${snippets.annotations}
`,

  'Argument': `# Argument
**Cost**: 1 energy
**Effect**: Find and annotate all neutral tiles in a 3x3 area.
**Enhanced**: Also draw a card.
${snippets.annotations}
`,

  'Horse': `# Horse
**Cost**: 3 energy
**Effect**: Choose a burst 1 cross area. Reveal all of those which are the most **safe**. Make all Horses you play for the rest of the floor cost 0 energy to play.
**Enhanced**: Instead of revealing, just annotate.
**Curiosities**: If none of the tiles are yours, then tiles which aren't yours will be revealed, which means your turn will end. A Horse can find one of your tiles but fail to reveal it because the tile is dirty; if this happens, the tile will be annotated as yours. If all of the tiles the Horse finds are like this, nothing will be revealed but it will stay your turn! An energy-upgraded Horse, after a prior Horse was played this level, will cost 0 but still "refund" you 1 energy!
${snippets.safety}
${snippets.burst_1_cross}
${snippets.annotations}
`,

  'Eavesdropping': `# Eavesdropping
**Cost**: 1 energy
**Effect**: Check whether a tile is yours without revealing it and also get adjacency info about your tiles around that tile.
**Enhanced**: Find out whose a tile is without revealing it and also get adjacency info about all tiles types around that tile.
${snippets.annotations}
`,

  'Emanation': `# Emanation
**Cost**: 1 energy
**Effect**: Destroy a tile! Add Evidence into your hand; unless you play it for 1 energy at some point, you'll lose 2 copper at the end of the floor.
**Enhanced**: Leave no evidence!
**Curiosities**: If it was your last tile to reveal, you'll complete the floor. If your rival's, you'll lose! If you destroy a surface mine with radiation this way, not only does the tile explode as normal, so do all the tiles in a burst 1 cross area. You can also destroy goblin lairs this way.
${snippets.exhaust}
${snippets.surface_mine}
${snippets.goblin_lair}
${snippets.burst_1_cross}
`,

  'Masking': `# Masking
**Cost**: 0 energy
**Effect**: Play another card in your hand for free, then exhaust both.
**Enhanced**: Don't exhaust Masking, just the other card you played with it. Masking is discarded instead.
**Curiosities**: When you choose a card which refunds energy to play with Masking, your energy will go up!
${snippets.exhaust}
`,

  'Brat': `# Brat
**Cost**: 1 energy
**Effect**: Unreveal a tile, then exhaust.
**Enhanced**: Also gain 2 copper.
**Curiosities**: Far more useful on later floors, when your rival actually uses their adjacency info for decision-making!
${snippets.exhaust}
`,

  'Snip, Snip': `# Snip, Snip
**Cost**: 1 energy
**Effect**: Defuses all mines on a tile. Surface mines are removed. If the tile was mined, it becomes neutral instead, and is revealed, and you learn how many adjacent tiles are yours; this does not end your turn. If any mines were defused, gain 2 copper.
**Enhanced**: Get adjacency info about both your own tiles and mined tiles, whether or not the tile itself was mined.
**Curiosities**: You still get the 3 copper for defusing a surface mine!
${snippets.surface_mine}
`,

  'Nap': `# Nap
**Cost**: 1 energy
**Effect**: Return an exhausted card to your hand, then Nap is exhausted.
**Enhanced**: Also gain energy equal to the exhausted card's cost.
**Curiosities**: Two Naps with at least two upgrades between them can be played infinitely! That doesn't do anything useful, though.
${snippets.exhaust}
`,

  'Gaze': `# Gaze
**Cost**: 1 energy
**Effect**: Starting from the tile you select, if the tile is your rival's, annotate it, otherwise check the next tile in a straight line in the direction specified. Any tiles between where you started and where the first rival tile was found you will know are not your rival's!
**Enhanced**: Also find the first mined tile. Any tiles before whichever of those is found first must therefore be either yours, or neutral.
**Curiosities**: Does not skip tiles you already know to be your rival's (or mined) if they're still unrevealed. So if for example a Tingle tells you where a rival's tile is, and you gaze toward that tile, if it's the first rival tile then it's still the one Gaze will find.
${snippets.directional}
${snippets.annotations}
`,

  'Fetch': `# Fetch
**Cost**: 1 energy
**Effect**: Of all (unrevealed!) tiles selected, count how many are yours, neutral, rival's, or mined. Whichever has the highest count, reveal all of those, all at once. If two or more have the highest count, reveal only the safest.
**Enhanced**: Also draw a card.
**Curiosities**: Revealing multiple mines at once can burn through all your protections and end your game all at once! Be careful!
${snippets.safety}
${snippets.directional}
${snippets.annotations}
`,

  'Burger': `# Burger
**Cost**: 2 energy
**Effect**: For an additional two floors, draw an extra card every turn. Exhaust.
**Enhanced**: For an additional three floors instead.
${snippets.floors_stack}
${snippets.exhaust}
`,

  'Donut': `# Donut
**Cost**: 0 energy
**Effect**: One of your unrevealed tiles will be chosen at random to be annotated as yours, but a goblin will appear on it.
**Enhanced**: Two of your unrevealed tiles instead.
**Curiosities**: If you summon a goblin directly onto a surface mine, it will explode, but it won't be your fault! The goblin did it.
${snippets.goblin}
${snippets.surface_mine}
${snippets.annotations}
`,

  'Ice Cream': `# Ice Cream
**Cost**: 2 energy
**Effect**: For an additional two floors, whenever your fifth tile is revealed (which gains you a copper), also gain 1 energy. Exhaust.
**Enhanced**: For an additional three floors instead.
**Curiosities**: Any method of revealing your tiles counts, for both earning copper and energy, including when your rival reveals your tiles! Ending your turn after your fourth tile reveal might be disappointing; if your rival reveals a tile, you'll gain 1 energy, but it will be lost before you can use it on your next turn.
${snippets.floors_stack}
${snippets.exhaust}
`,

  'Carrots': `# Carrots
**Cost**: 2 energy
**Effect**: For an additional two floors, when you start the floor, reveal one of your tiles automatically. Exhaust.
**Enhanced**: For an additional three floors instead.
**Curiosities**: This won't help you on the floor you play it! The start of the floor will already have passed.
${snippets.floors_stack}
${snippets.exhaust}
`,

  'Evidence': `# Evidence
**Cost**: 1 energy
**Effect**: Playing this card does nothing but exhaust it. At the end of the floor, if you haven't exhausted it, you'll lose 2 copper.
**Enhanced**: n/a
`,
}

// =============================================================================
// EQUIPMENT HELP
// =============================================================================

export const equipmentHelp: Record<string, string> = {
  'Estrogen': `# Estrogen
**Effect**: Energy-upgrade three random cards in your deck that weren't already energy-upgraded.
${snippets.energy_reduced}
${snippets.modifies_deck}
`,

  'Progesterone': `# Progesterone
**Effect**: Enhance-upgrade three random cards in your deck that weren't already enhance-upgraded.
${snippets.prog_tree}
${snippets.enhanced}
${snippets.modifies_deck}
${snippets.requirements}
`,

  'Boots': `# Boots
**Effect**: Pick a card from your deck to be removed. In its place, a random double-upgraded card will be added to your deck.
${snippets.energy_reduced}
${snippets.enhanced}
${snippets.modifies_deck}
`,

  'Crystal': `# Crystal
**Effect**: Add three double-upgraded Tingle cards to your deck.
${snippets.crystal_tree}
${snippets.energy_reduced}
${snippets.enhanced}
${snippets.modifies_deck}
${snippets.requirements}
`,

  'Broom Closet': `# Broom Closet
**Effect**: Remove all Spritz cards from your deck. Add a Sweep, and energy-upgraded sweep, and an enhance-upgraded Sweep to your deck instead.
${snippets.energy_reduced}
${snippets.enhanced}
${snippets.modifies_deck}
`,

  'Cocktail': `# Cocktail
**Effect**: Remove all Scurry cards from your deck. Add two randomly chosen energy-upgraded cards to your deck instead.
${snippets.dress_tree}
${snippets.energy_reduced}
${snippets.modifies_deck}
${snippets.requirements}
`,

  'Disco Ball': `# Disco Ball
**Effect**: Add two double-upgraded Tingles to your deck.
${snippets.crystal_tree}
${snippets.energy_reduced}
${snippets.enhanced}
${snippets.modifies_deck}
${snippets.requirements}
`,

  'Novel': `# Novel
**Effect**: Replace all Instruction cards (Imperious, Vague, Sarcastic) in your deck with double-upgraded Sarcastic Instructions instead. Any future Instruction card you attempt to add to your deck will instead add a double-upgrade Sarcastic Instructions to your deck.
${snippets.novel_tree}
${snippets.energy_reduced}
${snippets.enhanced}
${snippets.modifies_deck}
${snippets.requirements}
`,

  'Bleach': `# Bleach
**Effect**: Enhance-upgrade all Spritz and Sweep cards in your deck.
${snippets.enhanced}
${snippets.modifies_deck}
`,

  'Espresso': `# Espresso
**Effect**: At the start of each turn, draw 1 card and immediately play it for free. This does cost energy! You can opt not to play cards that require choosing tiles, but the energy will still be spent.
${snippets.caffeine_tree}
${snippets.requirements}
`,

  'Double Broom': `# Double Broom
**Effect**: When you reveal a tile, apply a Brush effect to two random adjacent tiles.
${snippets.brush}
${snippets.broom_tree}
${snippets.requirements}
`,

  'Triple Broom': `# Triple Broom
**Effect**: When you reveal a tile, apply a Brush effect to another random adjacent tile. So three overall since you already have Double Broom.
${snippets.brush}
${snippets.broom_tree}
${snippets.requirements}
`,

  'Quadruple Broom': `# Quadruple Broom
**Effect**: When you reveal a tile, apply a Brush effect to yet another random adjacent tile. So four overall since you already have Double Broom and Triple Broom.
${snippets.brush}
${snippets.broom_tree}
${snippets.requirements}
`,

  'Dust Bunny': `# Dust Bunny
**Effect**: Reveal one of your tiles at random at the beginning of each floor.
${snippets.bunny_tree}
${snippets.requirements}
`,

  'Mated Pair': `# Mated Pair
**Effect**: Reveal another one of your tiles at random at the beginning of each floor. So two overall, since you already have Dust Bunny. Or maybe three if you purchased a Bunny Helper in a shop just before the floor.
${snippets.bunny_tree}
${snippets.requirements}
`,

  'Baby Bunny': `# Baby Bunny
**Effect**: Reveal yet another one of your tiles at random at the beginning of each floor. So three overall, since you already have Dust Bunny and Mated Pair. Or maybe four if you purchased a Bunny Helper in a shop just before the floor.
${snippets.bunny_tree}
${snippets.requirements}
`,

  'Caffeinated': `# Caffeinated
**Effect**: Get 4 energy per turn rather than 3, but draw 1 fewer card per turn. Except on turn 1. There are no immediate downsides to caffeine.
${snippets.caffeine_tree}
${snippets.requirements}
`,

  'Handbag': `# Handbag
**Effect**: Draw an additional two cards on your first turn on each floor.
${snippets.bag_tree}
${snippets.requirements}
`,

  'Pockets': `# Pockets
**Effect**: Draw another additional card on your first turn on each floor. So three overall, since you already have Handbag.
${snippets.bag_tree}
${snippets.requirements}
`,

  'Eyeshadow': `# Eyeshadow
**Effect**: Gain 1 stack of Distraction on every one of your rival's turns.
${snippets.distract_tree}
${snippets.distraction}
${snippets.requirements}
`,

  'Mascara': `# Mascara
**Effect**: Gain an additional 1 stack of Distraction on every one of your rival's turns.
${snippets.distract_tree}
${snippets.distraction}
${snippets.requirements}
`,

  'Hyperfocus': `# Hyperfocus
**Effect**: On your first turn on each floor, add into your hand a random card which costs net-zero energy to play. This is not a card from your deck, it's randomly generated. This card is not added to your deck; it's with you for this floor, but won't persist into subsequent floors. Unless it's the one randomly chosen again!
${snippets.energy_reduced}
`,

  'Choker': `# Choker
**Effect**: When your rival reaches exactly 5 of their tiles remaining unrevealed, their turn immediately ends. If you reveal their sixth-to-last tile for them, you'll lose out on any benefit from Choker this floor!
`,

  'DIY Gel': `# DIY Gel
**Effect**: Every card you add to your deck will become enhance-upgraded.
${snippets.prog_tree}
${snippets.enhanced}
${snippets.requirements}
`,

  'Glasses': `# Glasses
**Effect**: Just before each of your turns, play a Tingle without paying its energy cost, which picks a random rival or mine tile to annotate with its type. Yes, if you have Geode, this will draw a card. These Tingles go to your discard pile and will start clogging your deck after you reshuffle, but they don't persist across floors.
`,

  'Tea': `# Tea
**Effect**: On the first turn of every floor, and only the first turn, revealing neutral tiles does not end your turn. This supercedes Frilly Dress, which is limited to four neutral tiles.
${snippets.dress_tree}
${snippets.requirements}
`,

  'Geode': `# Geode
**Effect**: Whenever you play a Tingle, draw a card.
${snippets.crystal_tree}
${snippets.requirements}
`,

  'Fanfic': `# Fanfic
**Effect**: Whenever you play a Sarcastic Instructions, lose 1 copper and draw a card.
${snippets.novel_tree}
${snippets.requirements}
`,

  'Tiara': `# Tiara
**Effect**: Double the copper you get from completing a floor (number of unrevealed rival tiles remaining).
`,

  'Mirrors': `# Mirrors
**Effect**: Reveal one of your rival's tiles at random at the beginning of each floor, but get adjacency information about your surrounding tiles.
`,

  'Frilly Dress': `# Frilly Dress
**Effect**: On the first turn of every floor, and only the first turn, you can reveal up the four neutral tiles without your turn ending.
${snippets.dress_tree}
${snippets.requirements}
`,

  'Mop': `# Mop
**Effect**: Whenever you clean a tile for any reason, draw a card.
${snippets.clean}
`,

  'Busy Canary': `# Busy Canary
**Effect**: At the beginning of each floor, a random tile will be picked and the 3x3 area around it checked for mines. All non-mined tiles will be annotated as not mined. If any tiles were mined, they will be annotated as such. Otherwise, this effect will repeat one more time.
${snippets.annotations}
`,

  'Favor': `# Favor
**Effect**: Complete the floor when you have only 1 unrevealed tile of yours remaining (instead of needing to reveal all of them).
${snippets.dress_tree}
${snippets.requirements}
`

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
