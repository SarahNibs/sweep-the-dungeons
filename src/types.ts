export type PileType = 'deck' | 'discard' | 'exhaust'

export interface Card {
  id: string
  name: string
  cost: number
  exhaust?: boolean // If true, card is removed from deck after use
  costReduced?: boolean // If true, card has received cost reduction upgrade
  enhanced?: boolean // If true, card has received enhanced effect upgrade
}

export type CardEffect =
  | { type: 'scout'; target: Position }
  | { type: 'quantum'; targets: Position[] }
  | { type: 'report' }
  | { type: 'solid_clue' }
  | { type: 'stretch_clue' }
  | { type: 'sarcastic_orders' }
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

export interface ClueResult {
  id: string // Unique identifier for this clue cast
  cardType: 'solid_clue' | 'stretch_clue' | 'rival_clue' | 'sarcastic_orders'
  enhanced: boolean // Whether this clue came from an enhanced card
  strengthForThisTile: number // How many pips this clue contributed to this specific tile
  allAffectedTiles: Position[] // All tiles that got pips from this clue
  clueOrder: number // Order in which this clue was played (1st, 2nd, 3rd...)
  clueRowPosition: number // Row position for this clue type (player/rival separate)
  isAntiClue?: boolean // If true, render as red dots (don't reveal these tiles)
}

export interface TileAnnotation {
  type: 'safe' | 'unsafe' | 'rival' | 'clue_results' | 'owner_subset' | 'player_slash' | 'player_big_checkmark' | 'player_small_checkmark' | 'player_owner_possibility' | 'adjacency_info'
  clueResults?: ClueResult[] // For clue strength annotations
  ownerSubset?: Set<'player' | 'rival' | 'neutral' | 'mine'> // For subset annotations (lower-right, from cards/relics)
  playerOwnerPossibility?: Set<'player' | 'rival' | 'neutral' | 'mine'> // For player's upper-right annotations
  adjacencyInfo?: { player?: number; neutral?: number; rival?: number; mine?: number } // For eavesdropping card results
}

export interface GameStatusInfo {
  status: 'playing' | 'player_won' | 'player_lost'
  reason?: 'player_revealed_mine' | 'rival_revealed_mine' | 'all_player_tiles_revealed' | 'all_rival_tiles_revealed'
  rivalTilesLeft?: number
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
  specialTiles: Array<'extraDirty' | 'goblin' | 'destroyed' | 'lair'> // Can have multiple special properties
  underwireProtected?: boolean // True if this mine was protected by Underwire
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
    relicReward: boolean
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
  unusedLocations: number[][]
  specialTiles: Array<{
    type: 'extraDirty' | 'goblin' | 'lair'
    count: number
    placement: 'random' | 'nonmine' | 'empty' | { owner: Array<'player' | 'rival' | 'neutral' | 'mine'> }
  }>
  specialBehaviors: {
    rivalNeverMines?: boolean
    adjacencyRule?: 'standard' | 'manhattan-2'
    initialRivalReveal?: number
    rivalAI?: string  // AI type to use for this level (e.g., 'conservative', 'random', 'noguess')
    rivalMineProtection?: number // Number of mines the rival can reveal without ending the game (awards 5 copper each)
  }
  aiConfig?: {
    aiType: string           // e.g., "noguess", "conservative", "reasoning"
    aiParameters?: Record<string, any>  // AI-specific configuration
  }
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
  currentLevelId: string
  gamePhase: 'playing' | 'card_selection' | 'viewing_pile' | 'upgrade_selection' | 'relic_selection' | 'shop_selection' | 'relic_upgrade_display'
  pileViewingType?: PileType
  cardSelectionOptions?: Card[] // Three cards to choose from when advancing level
  upgradeOptions?: UpgradeOption[] // Three upgrade options to choose from
  waitingForCardRemoval?: boolean // True when remove card option was selected
  pendingUpgradeOption?: UpgradeOption // The upgrade option waiting to be applied after card removal
  relicUpgradeResults?: { before: Card; after: Card }[] // Results from Estrogen/Progesterone relic effects
  relicOptions?: RelicOption[] // Three relic options to choose from
  relics: Relic[] // Relics the player currently has
  isFirstTurn: boolean // True if this is the first turn of the level (for Frilly Dress)
  hasRevealedNeutralThisTurn: boolean // True if player revealed neutral on first turn (for Frilly Dress)
  // Dual rival clue system: visible clues (shown as X) vs AI clues (hidden)
  rivalHiddenClues: ClueResult[] // AI-only clues for rival decision making (not shown to player)
  tingleAnimation: {
    targetTile: Position | null
    isEmphasized: boolean
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
  } | null
  rambleActive: boolean // True if Ramble was played this turn
  ramblePriorityBoosts: number[] // Array of max boost values from Rambles played this turn (e.g., [2, 4] for basic + enhanced)
  // Currency and shop system
  copper: number // Copper currency earned from unrevealed rival tiles
  shopOptions?: ShopOption[] // Available shop items
  purchasedShopItems?: Set<number> // Indices of purchased shop items (for current shop session)
  temporaryBunnyBuffs: number // Number of temporary bunny buffs for next level
  
  // Underwire protection
  underwireProtection: { active: boolean; enhanced: boolean } | null // Mine protection status
  underwireUsedThisTurn: boolean // True if underwire protection was consumed this turn (for turn ending logic)
  horseRevealedNonPlayer: boolean // True if Horse card revealed non-player tiles (for turn ending logic)
  
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

  // Player annotation button states
  annotationButtons: {
    player: boolean // Whether player button is depressed
    rival: boolean  // Whether rival button is depressed
    neutral: boolean // Whether neutral button is depressed
    mine: boolean   // Whether mine button is depressed
  }
  
  // Queued card draws (for Mop effect when cleaning by revealing dirty tiles)
  queuedCardDraws: number // Number of cards to draw at start of next turn

  // Rival mine protection (special behavior)
  rivalMineProtectionCount: number // Number of remaining protected mine reveals
}

export interface UpgradeOption {
  type: 'remove_card' | 'cost_reduction' | 'enhance_effect'
  card?: Card // For cost_reduction and enhance_effect options, this is the card to upgrade
  displayCard?: Card // The upgraded version to display
}

export interface Relic {
  id: string
  name: string
  description: string
  hoverText: string
}

export interface RelicOption {
  relic: Relic
}

export interface ShopOption {
  type: 'add_card' | 'add_energy_card' | 'add_enhanced_card' | 'add_relic' | 'remove_card' | 'temp_bunny'
  cost: number
  card?: Card // For card options
  relic?: Relic // For relic options
  displayName: string
  description: string
}

export interface StatusEffect {
  id: string
  type: 'underwire_protection' | 'ramble_active' | 'manhattan_adjacency' | 'horse_discount' | 'rival_never_mines' | 'rival_ai_type' | 'rival_mine_protection'
  icon: string
  name: string
  description: string
  enhanced?: boolean // For enhanced effects
  count?: number // For effects with counts (e.g., rival mine protection remaining)
}

export type CardZone = 'deck' | 'hand' | 'discard'