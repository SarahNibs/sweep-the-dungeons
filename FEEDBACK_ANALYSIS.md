# Game Feedback Analysis

## Simply Fixable Issues

Issues that can be addressed with straightforward code/data changes:

### 1. Bunny Helper is too expensive
**Why fixable:** Simple shop price adjustment in `shopSystem.ts`

### 2. Sarcastic Communications upgrade is bad
**Why fixable:** Just needs to buff the enhanced effect (currently only adds 2 copper, could add more value)

### 3. Emanation upgrade is bad
**Why fixable:** Enhancement just removes copper cost - could add additional benefit like revealing adjacency info or affecting larger area

### 4. Temporary Bunny Helper is too expensive or not impactful enough
**Why fixable:** Adjust shop cost or make it reveal 2 tiles instead of 1

### 5. Relic icons in shop are always an urn instead of the real relic icon
**Why fixable:** Bug in ShopSelectionScreen.tsx - need to pass relic icon instead of hardcoded '🏺'

### 6. Title panel and help button together make things feel off center
**Why fixable:** CSS/layout adjustment - center title, move help button to corner

### 7. Hovertext look and feel is inconsistent
**Why fixable:** Standardize tooltip styling across all components with consistent CSS classes (as suggested: `absolute bg-gray-800 text-white text-xs rounded-md px-2 py-1 shadow-lg`)

---

## Local Design Issues

Issues requiring design decisions but with bounded scope:

### 8. Not enough relics, tempted to force a Frilly Dress deck

**Suggestions:**
1. **Add more relics** - Design 5-10 new relics to increase variety (e.g., "Spare Key" = remove 1 card from deck, "Lucky Coin" = first reveal each level can't be mine, "Magnifying Glass" = enhanced Spritz cards)
2. **Make relic selection more frequent** - Offer relic choice every 3-4 levels instead of less frequently
3. **Add relic synergies** - Create relics that work well together (e.g., "Cleaning Gloves" = Double Broom triggers on 3 tiles instead of 2, "Speed Cleaning" = Frilly Dress also works on player tiles)

### 9. Tryst is bad

**Suggestions:**
1. **Make it more controlled** - Basic: You choose tile for rival to reveal, rival chooses random tile for you. Enhanced: Both are targeted
2. **Add asymmetric benefit** - Basic: Rival reveals random, you reveal safest of 2 random. Enhanced: You reveal safest of 3, rival reveals random
3. **Make it pure information** - Change to only reveal adjacency info for both tiles without actually revealing them (like dual Eavesdropping)

### 10. Underwire seems too crucial?

**Suggestions:**
1. **Add alternative defensive relics** - Create other ways to survive mistakes (e.g., "Second Chance" = first mine each level becomes neutral instead, "Careful Eye" = see mine count in each 3x3 area)
2. **Make mines less instantly fatal** - Introduce "damaged" state where revealing mine loses health/resources instead of instant loss, Underwire prevents damage
3. **Buff other safety cards** - Make Canary, Spritz, Eavesdropping more powerful so players have more non-Underwire safety options

### 11. Eavesdropping is surprisingly bad

**Suggestions:**
1. **Show more useful info** - Basic version shows ALL adjacency (player, neutral, rival, mine) instead of just player. Enhanced shows it for 3x3 area
2. **Make it persistent annotation** - Info stays visible on tile permanently as player-controlled annotation
3. **Combine with exclusion** - In addition to showing adjacency, exclude one random owner type from the tile (like Brush effect)

### 12. Receiving Emanation or Nap from Hyperfocus in early game is often almost useless

**Suggestions:**
1. **Filter Hyperfocus pool by floor** - Early floors (1-5) exclude late-game cards. Or weight against cards that require specific game states
2. **Make problematic cards more universally useful** - Emanation could also work on revealed tiles to "clean up" info. Nap could retrieve from discard instead when exhaust is empty
3. **Add "reroll" mechanic** - If Hyperfocus gives you a card, you can discard it for 1 energy (making dead draws less punishing)

---

## Large & Nebulous Issues

Fundamental design challenges requiring broader solutions:

### 13. Too hard, rarely make it past level 16

**Things to think about:**
- Is the difficulty curve appropriate? Should level 10-15 be easier?
- Are there enough ways to gain power? (Related to issue #14)
- Do players have the tools they need by mid-game, or are they missing key cards/relics?
- Should there be more "scaling" relics that get stronger each floor?
- Consider: Separate "floor difficulty" from "unlock progression" - players could tackle easier versions of late floors to learn them
- Are there too many ways to fail vs too few ways to succeed?
- Does the rival AI become too strong, or do surface mines/goblins compound too much?
- Should there be more "comeback mechanics" when behind?

### 14. Doing really well doesn't translate into much more power, just a slightly better shop

**Things to think about:**
- What should "doing well" mean? (Perfect clear, no damage, excess copper earned?)
- Reward structure: Should copper accumulate more? Should perfect clears give bonus rewards?
- Consider: "Streak bonuses" for consecutive perfect floors
- Consider: "Mastery rewards" for clearing a floor without certain card types
- Consider: Permanent buffs earned through gameplay (e.g., "Each perfect clear permanently +1 max energy")
- Should the shop scale more dramatically with copper? (Rare relics, enhanced cards available)
- Alternative: "Prestige" system where later run rewards become earlier run starting bonuses
- The tension: Too much snowball makes runs too variable; too little makes good play feel unrewarding

### 15. All text except the card hovertext feels like AI

**Things to think about:**
- What's the voice/tone of the game? Playful, serious, sarcastic, clinical?
- UI text needs personality: Button labels, flavor text, tutorial messages
- Consider: Adding narrative context (why are you cleaning? who is the rival?)
- Consider: Relic flavor text beyond just mechanical descriptions
- Consider: Event text, encounter descriptions, story beats
- This might require a writing pass focused on character voice
- Examples to examine: Does the game have a "narrator"? Is it you talking to yourself? Is there a character guiding you?
- The clinical "do X to Y" language works for rules clarity but not for flavor

### 16. Want things to look more "3d", more dynamic. Maybe more use of shadows of varying depths, less of outlines?

**Things to think about:**
- Visual hierarchy: What should feel "raised" vs "recessed"?
- Current design uses flat colors + outlines; moving to shadows/depth requires redesigning all components
- Consider: CSS box-shadow at multiple levels (low: 2px, medium: 4px, high: 8px, very-high: 12px)
- Consider: Gradient backgrounds instead of flat colors
- Consider: Transform/scale on hover to create depth
- Consider: Layered cards that lift on hover (translateY + shadow increase)
- Animation integration: Tiles could "pop up" when revealed
- Color theory: Darker backgrounds make foreground elements feel more raised
- This is a full visual design pass, likely affecting every component
- Reference question: What games have the right "feel"? What makes them feel tactile?

### 17. There's not much counterplay; revealing your own tiles is too good to not do...

**Things to think about:**
- Core tension: Should you want to reveal rival tiles? Currently there's no reason to
- Possible mechanics: "Contamination" where revealed rival tiles near yours are dangerous
- Possible mechanics: "Territory control" where revealing more tiles in an area gives benefits
- Possible mechanics: "Rival gets faster" the more tiles you reveal (opposite of current)
- Card design: More cards like Brat that interact with revealed state
- Card design: Cards that benefit from rival's revealed tiles ("Study": draw cards equal to revealed rival tiles in area)
- Relic design: "Competitive Spirit" - revealing rival tiles gives resources
- The fundamental question: Should this be adversarial or parallel? Currently it's parallel with minor interference
- Intent system ideas: Rival "telegraphs" next move, you can prepare/counter. Or you telegraph and rival adapts
- What if revealing certain tiles triggered rival response? (Like a trap card)
- Combat game design parallel: "Threat" mechanics, "priority" in Magic, "tempo" in card games

### 18. Feels like it has some "best deck is small, cheap, with card draw" issues. Maybe changing cost reduction upgrade to "refund one energy when played" helps?

**Things to think about:**
- Classic deckbuilder problem: Thin decks with cycling are often optimal
- The proposed solution (refund instead of cost reduction) is interesting - it changes when you can play, not just how much
- Other approaches: Cards that care about deck size ("Overwhelming Force": Damage = deck size)
- Other approaches: Dilution benefits ("Diverse Tools": Different card names in hand provide bonus)
- Other approaches: Make some powerful effects require specific deck construction ("Combo" cards)
- Energy system: Should max energy scale differently? Should costs be higher?
- Upgrade balance: If enhanced effects were much stronger, would they compete with cost reduction?
- Remove card option: Is it too strong? Should it cost copper? Should it be rarer?
- The Mask issue mentioned: Does refund help Mask specifically? (Yes - you can refund after Masking something)
- Consider: "Exhaust matters" cards that benefit from having an exhaust pile
- Consider: "First time each turn" effects that encourage variety
- The meta-question: Is having an "optimal" strategy bad if multiple paths are viable?
