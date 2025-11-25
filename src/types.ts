export type PileType = 'deck' | 'discard' | 'exhaust'

export interface Card {
  id: string
  name: string
  cost: number
  exhaust?: boolean // If true, card is removed from deck after use
  energyReduced?: boolean // If true, card grants +1 energy when played
  enhanced?: boolean // If true, card has received enhanced effect upgrade
}

export type CardEffect =
  | { type: 'scout'; target: Position }
  | { type: 'scurry'; targets: Position[] }
  | { type: 'report' }
  | { type: 'imperious_instructions' }
  | { type: 'vague_instructions' }
  | { type: 'sarcastic_instructions' }
  | { type: 'energized' }
  | { type: 'options' }
  | { type: 'brush'; target: Position }
  | { type: 'ramble' }
  | { type: 'sweep'; target: Position }
  | { type: 'underwire' }
  | { type: 'tryst'; target?: Position }
  | { type: 'canary'; target: Position }
  | { type: 'monster' }
  | { type: 'argument'; target: Position }
  | { type: 'horse'; target: Position }
  | { type: 'eavesdropping'; target: Position }
  | { type: 'emanation'; target: Position }
  | { type: 'masking'; targetCardId: string }
  | { type: 'brat'; target: Position }
  | { type: 'snip_snip'; target: Position }
  | { type: 'nap'; targetCardId: string }
  | { type: 'gaze'; target: Position }
  | { type: 'fetch'; target: Position }
  | { type: 'burger' }
  | { type: 'twirl' }
  | { type: 'donut' }
  | { type: 'ice_cream' }
  | { type: 'carrots' }

export interface ClueResult {
  id: string // Unique identifier for this clue cast
  cardType: 'imperious_instructions' | 'vague_instructions' | 'rival_clue' | 'sarcastic_instructions'
  enhanced: boolean // Whether this clue came from an enhanced card
  strengthForThisTile: number // How many pips this clue contributed to this specific tile
  allAffectedTiles: Position[] // All tiles that got pips from this clue
  clueOrder: number // Order in which this clue was played (1st, 2nd, 3rd...)
  clueRowPosition: number // Row position for this clue type (player/rival separate)
  isAntiClue?: boolean // If true, render as red dots (don't reveal these tiles)
  tilesRevealedDuringTurn?: Position[] // For rival clues: tiles revealed by rival during this clue's turn
}

export interface TileAnnotation {
  type: 'safe' | 'unsafe' | 'rival' | 'clue_results' | 'owner_subset' | 'player_slash' | 'player_big_checkmark' | 'player_small_checkmark' | 'player_owner_possibility' | 'adjacency_info'
  clueResults?: ClueResult[] // For clue strength annotations
  ownerSubset?: Set<'player' | 'rival' | 'neutral' | 'mine'> // For subset annotations (lower-right, from cards/equipment)
  playerOwnerPossibility?: Set<'player' | 'rival' | 'neutral' | 'mine'> // For player's upper-right annotations
  adjacencyInfo?: { player?: number; neutral?: number; rival?: number; mine?: number } // For eavesdropping card results
}

export interface GameStatusInfo {
  status: 'playing' | 'player_won' | 'player_lost'
  reason?: 'player_revealed_mine' | 'rival_revealed_mine' | 'all_player_tiles_revealed' | 'all_rival_tiles_revealed'
  rivalTilesLeft?: number
  levelNumber?: number
}

export type GameEvent = 
  | { type: 'card_effect'; effect: CardEffect; cardId: string }
  | { type: 'tile_annotated'; position: Position; annotation: TileAnnotation }

export interface Position {
  x: number
  y: number
}

export interface Tile {
  position: Position
  owner: 'player' | 'rival' | 'neutral' | 'mine' | 'empty'
  revealed: boolean
  revealedBy: 'player' | 'rival' | null
  adjacencyCount: number | null
  annotations: TileAnnotation[]
  specialTiles: Array<'extraDirty' | 'goblin' | 'destroyed' | 'lair' | 'surfaceMine' | 'sanctum'> // Can have multiple special properties
  underwireProtected?: boolean // True if this mine was protected by Underwire
  rivalMineProtected?: boolean // True if this mine was protected by rival mine protection
  cleanedOnce?: boolean // True if this tile has been cleaned once by Spritz or Sweep (used for non-surface-mine cleaning)
  surfaceMineState?: { cleanedOnce: boolean } // State carried by the surface mine itself (moves with the mine)
  innerTile?: boolean // True if this tile is an inner tile (only reachable through sanctum portals)
  connectedSanctums?: Position[] // Positions of sanctums this inner tile is connected to
}

export interface Board {
  width: number
  height: number
  tiles: Map<string, Tile>
  adjacencyRule?: 'standard' | 'manhattan-2'
}

export interface LevelConfig {
  levelNumber: number
  levelId: string
  uponFinish: {
    cardReward: boolean
    equipmentReward: boolean
    upgradeReward: boolean
    shopReward: boolean
    winTheGame: boolean
    nextLevel: string[]
  }
  description: string
  dimensions: {
    columns: number
    rows: number
  }
  tileCounts: {
    player: number
    rival: number
    neutral: number
    mine: number
  }
  unusedLocations: number[][] | number // Array of [x,y] coordinates or number of random tiles
  specialTiles: Array<{
    type: 'extraDirty' | 'goblin' | 'lair' | 'surfaceMine'
    count: number
    placement: 'random' | 'nonmine' | 'empty' | 'playerOrNeutral' | { owner: Array<'player' | 'rival' | 'neutral' | 'mine'> } | number[][]
  }>
  specialBehaviors: {
    rivalNeverMines?: boolean
    adjacencyRule?: 'standard' | 'manhattan-2'
    initialRivalReveal?: number
    rivalAI?: string  // AI type to use for this level (e.g., 'conservative', 'random', 'noguess')
    rivalMineProtection?: number // Number of mines the rival can reveal without ending the game (awards 5 copper each)
    rivalPlacesMines?: number // Number of surface mines to place on random unrevealed non-rival tiles after each rival turn
  }
  aiConfig?: {
    aiType: string           // e.g., "noguess", "conservative", "reasoning"
    aiParameters?: Record<string, any>  // AI-specific configuration
  }
}

export interface ScreenContinuation {
  returnTo: 'shop' | 'reward_flow' | 'playing'
  preservedState: {
    // For shop returns
    shopOptions?: ShopOption[]
    purchasedShopItems?: Set<number>
    copper?: number
    // For debug returns
    debugReturnPhase?: 'playing' | 'card_selection' | 'viewing_pile' | 'upgrade_selection' | 'equipment_selection' | 'shop_selection' | 'equipment_upgrade_display'
    // Add more as needed
  }
}

export interface ModalEntry {
  modalType: 'equipment_upgrade_display' | 'viewing_pile'
  continuation?: ScreenContinuation  // How to navigate when closed
}

export interface GameState {
  // Persistent deck - all cards the player owns across levels
  persistentDeck: Card[]
  // In-play state - only used during levels, reset each level
  deck: Card[] // Draw pile
  hand: Card[]
  discard: Card[]
  exhaust: Card[] // Cards removed from play this level (but still in persistent deck)
  selectedCardName: string | null
  selectedCardId: string | null // ID of the card being played (for finding exact card, not just by name)
  energy: number
  maxEnergy: number
  board: Board
  currentPlayer: 'player' | 'rival'
  gameStatus: GameStatusInfo
  pendingCardEffect: CardEffect | null
  eventQueue: GameEvent[]
  hoveredClueId: string | null // For highlighting related clue pips and tiles
  clueCounter: number // Counter for clue order (1st, 2nd, 3rd...)
  playerClueCounter: number // Counter for player clue rows
  rivalClueCounter: number // Counter for rival clue rows
  instructionsPlayedThisFloor: Set<string> // Names of Instructions cards played this floor (for enhanced Instructions energy refund)
  currentLevelId: string
  gamePhase: 'playing' | 'card_selection' | 'viewing_pile' | 'upgrade_selection' | 'equipment_selection' | 'shop_selection' | 'equipment_upgrade_display'
  modalStack: ModalEntry[] // Stack of modal/overlay screens - top of stack is currently displayed
  pileViewingType?: PileType
  cardSelectionOptions?: Card[] // Three cards to choose from when advancing level
  upgradeOptions?: UpgradeOption[] // Three upgrade options to choose from
  waitingForCardRemoval?: boolean // True when remove card option was selected
  bootsTransformMode?: boolean // True when Boots equipment is transforming a card (uses card removal UI)
  pendingUpgradeOption?: UpgradeOption // The upgrade option waiting to be applied after card removal
  equipmentUpgradeResults?: { before: Card; after: Card }[] // Results from Estrogen/Progesterone equipment effects
  equipmentOptions?: EquipmentOption[] // Three equipment options to choose from
  equipment: Equipment[] // Equipment the player currently has
  isFirstTurn: boolean // True if this is the first turn of the level (for Frilly Dress)
  neutralsRevealedThisTurn: number // Number of neutrals revealed this turn (for Frilly Dress - allows 6 on turn 1)
  // Dual rival clue system: visible clues (shown as X) vs AI clues (hidden)
  rivalHiddenClues: { clueResult: ClueResult; targetPosition: Position }[] // AI-only clues for rival decision making (not shown to player)
  tingleAnimation: {
    isActive: boolean
    targetTile: Position | null
    isEmphasized: boolean
    tilesRemaining: Tile[]
    currentTileIndex: number
    isEnhanced?: boolean
  } | null
  rivalAnimation: {
    isActive: boolean
    highlightedTile: Position | null
    revealsRemaining: Tile[]
    currentRevealIndex: number
  } | null
  trystAnimation: {
    isActive: boolean
    highlightedTile: Position | null
    revealsRemaining: Array<{ tile: Tile; revealer: 'player' | 'rival' }>
    currentRevealIndex: number
    isEnhanced?: boolean
    target?: Position
  } | null
  adjacencyPatternAnimation: {
    isActive: boolean
    highlightedTiles: Position[]
    color: 'green' | 'red'
  } | null
  // Status effect pulsing (for highlighting certain effects at floor start)
  pulsingStatusEffectIds: string[] // IDs of status effects that should pulse
  seenRivalAITypes: Set<string> // Set of rival AI types that have been pulsed (first floor only)
  // Distraction stack count (used to generate independent noise per tile during rival turn)
  distractionStackCount: number // Number of Distraction stacks (each adds independent [0, 1.5] noise per tile)
  // Currency and shop system
  copper: number // Copper currency earned from unrevealed rival tiles
  playerTilesRevealedCount: number // Counter for player tiles revealed (every 5th grants 1 copper, persists across floors)
  shopOptions?: ShopOption[] // Available shop items
  purchasedShopItems?: Set<number> // Indices of purchased shop items (for current shop session)
  shopVisitCount: number // Number of shops visited in current run (for progressive price increases)
  temporaryBunnyBuffs: number // Number of temporary bunny buffs for next level
  
  // Underwire protection
  underwireProtection: { active: boolean; enhanced: boolean } | null // Mine protection status
  underwireProtectionCount: number // Number of remaining underwire protections
  underwireUsedThisTurn: boolean // True if underwire protection was consumed this turn (for turn ending logic)
  horseRevealedNonPlayer: boolean // True if Horse card revealed non-player tiles (for turn ending logic)
  fetchRevealedNonPlayer: boolean // True if Fetch card revealed non-player tiles (for turn ending logic)

  // Dynamic exhaust (for cards that conditionally exhaust)
  shouldExhaustLastCard: boolean // True if the last played card should exhaust regardless of its exhaust property
  
  // Player annotation system
  playerAnnotationMode: 'slash' | 'big_checkmark' | 'small_checkmark' // Legacy mode (deprecated)
  useDefaultAnnotations: boolean // If true, use simple slash cycling; if false, use owner possibility system
  enabledOwnerPossibilities: Set<string> // Set of enabled owner combinations (e.g., "player,rival", "mine", etc.)
  currentOwnerPossibilityIndex: number // Current index in the enabled possibilities cycle
  
  // Status effects system
  activeStatusEffects: StatusEffect[] // Active temporary status effects

  // AI system override (for debugging/testing)
  aiTypeOverride?: string // If set, overrides the level's configured AI type

  // Debug flags (for testing and development)
  debugFlags: {
    adjacencyColor: boolean // If true, adjacency text is white; if false, black
    adjacencyStyle: 'palette' | 'dark' // 'palette' = darker/desaturated bg + white text, 'dark' = dark bg + colored text
    easyMode: boolean // If true, reveal random tile owner at turn start
    sarcasticInstructionsAlternate: boolean // If true, use alternate Sarcastic Instructions implementation
    debugLogging: boolean // If true, output console debug logs; if false, suppress all logging
  }

  // Player annotation: which tile type is currently selected
  selectedAnnotationTileType: 'player' | 'rival' | 'neutral' | 'mine'

  // Card processing guard (prevents race conditions from rapid clicking)
  isProcessingCard: boolean // True while a card is being played/animated

  // Espresso forced play (when Espresso draws a targeting card, we force the play)
  espressoForcedPlay?: {
    cardId: string
    energyCost: number
    shouldExhaust: boolean
  }

  // Espresso special card (when Espresso draws a card needing special handling)
  espressoSpecialCard?: {
    cardId: string
    cardName: string
    type: 'tingle' | 'masking' | 'tryst' | 'nap' | 'targeting'
    enhanced: boolean
  }

  // Queued card draws (for Mop effect when cleaning by revealing dirty tiles)
  queuedCardDraws: number // Number of cards to draw at start of next turn

  // Glasses Tingle animation (for Glasses equipment effect)
  glassesNeedsTingleAnimation: boolean // True if Glasses equipment should trigger Tingle animation

  // Easy mode Tingle annotation (for debug flag)
  easyModeTingleTile: Position | null // If set, triggers easy mode Tingle annotation for this tile

  // Rival mine protection (special behavior)
  rivalMineProtectionCount: number // Number of remaining protected mine reveals

  // Masking card state (for selecting which card to play with Masking)
  maskingState: {
    maskingCardId: string  // ID of the Masking card being played
    enhanced: boolean      // Whether the Masking card is enhanced
  } | null

  // Nap card state (for selecting which card to retrieve from exhaust)
  napState: {
    napCardId: string  // ID of the Nap card being played
    enhanced: boolean  // Whether the Nap card is enhanced
  } | null

  // Saturation confirmation (for warning when clicking tiles ruled out by saturated neighbors)
  saturationConfirmation: {
    position: Position // Position of the tile that needs confirmation
  } | null
}

export interface UpgradeOption {
  type: 'remove_card' | 'cost_reduction' | 'enhance_effect'
  card?: Card // For cost_reduction and enhance_effect options, this is the card to upgrade
  displayCard?: Card // The upgraded version to display
}

export interface Equipment {
  id: string
  name: string
  description: string
  hoverText: string
  prerequisites?: string[] // List of equipment names that must be owned before this equipment can be offered
}

export interface EquipmentOption {
  equipment: Equipment
}

export interface ShopOption {
  type: 'add_card' | 'add_energy_card' | 'add_enhanced_card' | 'add_equipment' | 'remove_card' | 'temp_bunny' | 'random_enhance'
  cost: number
  card?: Card // For card options
  equipment?: Equipment // For equipment options
  displayName: string
  description: string
}

export interface StatusEffect {
  id: string
  type: 'underwire_protection' | 'ramble_active' | 'distraction' | 'manhattan_adjacency' | 'horse_discount' | 'rival_never_mines' | 'rival_ai_type' | 'rival_mine_protection' | 'grace' | 'burger' | 'ice_cream' | 'carrots' | 'rival_places_mines'
  icon: string
  name: string
  description: string
  enhanced?: boolean // For enhanced effects
  count?: number // For effects with counts (e.g., rival mine protection remaining, burger stacks, rival places mines count, distraction stacks)
}

export type CardZone = 'deck' | 'hand' | 'discard'