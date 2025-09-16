# Level System Implementation Todo List

Based on the 6-level game configuration in `levels-config.json`, here are the tasks needed to implement the full level progression system.

## Core Level System

### Level Framework
- [ ] Create level system framework with level loading from JSON config
- [ ] Implement level progression system with random branch selection
- [ ] Add level number tracking and display
- [ ] Update game state to include current level, copper count, unlocked levels

### Board Generation Enhancements
- [ ] Add unusedLocations support to board generation (holes in grid)
- [ ] Create special tile placement system (random, by owner type)
- [ ] Implement extraDirty special tile type
- [ ] Fix tiles-remaining indicators to work correctly with new level system

### Special Tile Mechanics
- [ ] Implement extraDirty reveal behavior (clear dirty and end turn without revealing)
- [ ] Add extraDirty interaction with Spritz card (clear dirty state)

## Reward Systems

### Existing System Modifications
- [ ] Modify card reward system to use level boolean indicator instead of always

### New Reward Systems
- [ ] Implement relic reward system
- [ ] Create upgrade reward system with card upgrading and removal options
- [ ] Implement shop system with copper currency and card removal options
- [ ] Add copper reward calculation (1 per unrevealed enemy tile)
- [ ] Create uponFinish reward handling system

## Enemy AI Improvements
- [ ] Modify enemy AI to avoid mine reveals (reduce mine instances in bag)

## Win Conditions
- [ ] Add winTheGame condition handling for final level

## UI/UX Enhancements
- [ ] Add copper display to UI (visible at all times)
- [ ] Add relic display to UI with hover tooltips

## Key Implementation Notes

### Level Progression
- Random branch selection for multiple nextLevel options (L4a vs L4b)
- No user choice in branching - uniformly random selection

### extraDirty Tiles
- Behavior: When player attempts to reveal, clear dirty state and end turn WITHOUT revealing the tile
- Can be cleared by Spritz card effect
- Does not end turn when cleared by card effects

### Reward System Details
- Card rewards: Use existing "choose 3 cards" screen, controlled by level's cardReward boolean
- Upgrade system: Include card removal options
- Shop system: Include card removal options
- Copper: Display persistently, not just in shop

### Enemy AI Mine Avoidance
- When mine tile selected for enemy clues, reduce instances in bag by 1 before random draws
- Reduces pure-luck wins on levels with many mines

## Dependencies
- Requires existing card system and game state management
- Uses current board generation and tile reveal systems
- Integrates with existing UI components