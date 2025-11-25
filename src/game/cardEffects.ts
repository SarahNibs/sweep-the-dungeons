import { GameState, CardEffect, Position, Tile, TileAnnotation, ClueResult, GameStatusInfo } from '../types'
import { positionToKey, getTile, revealTileWithResult, hasSpecialTile, calculateAdjacency, canPlayerRevealInnerTile } from './boardSystem'
import { triggerDoubleBroomEffect, checkFrillyDressEffect } from './equipment'
import { removeStatusEffect, createCard } from './gameRepository'
import { getLevelConfig } from './levelSystem'
import { executeScoutEffect } from './cards/scout'
import { executeScurryEffect } from './cards/scurry'
import { executeReportEffect } from './cards/report'
import { executeImperiousInstructionsEffect } from './cards/imperiousInstructions'
import { executeVagueInstructionsEffect } from './cards/vagueInstructions'
import { executeSarcasticInstructionsEffect } from './cards/sarcasticInstructions'
import { executeEnergizedEffect } from './cards/energized'
import { executeOptionsEffect } from './cards/options'
import { executeBrushEffect } from './cards/brush'
import { executeSweepEffect } from './cards/sweep'
import { executeUnderwireEffect } from './cards/underwire'
import { executeTrystEffect } from './cards/tryst'
import { executeCanaryEffect } from './cards/canary'
import { executeMonsterEffect } from './cards/monster'
import { executeArgumentEffect } from './cards/argument'
import { executeHorseEffect } from './cards/horse'
import { executeEavesdroppingEffect } from './cards/eavesdropping'
import { executeEmanationEffect } from './cards/emanation'
import { executeBratEffect } from './cards/brat'
import { executeSnipSnipEffect } from './cards/snipSnip'
import { executeGazeEffect } from './cards/gaze'
import { executeFetchEffect } from './cards/fetch'
import { executeBurgerEffect } from './cards/burger'
import { executeTwirlEffect } from './cards/twirl'
import { executeDonutEffect } from './cards/donut'
import { executeIceCreamEffect } from './cards/iceCream'
import { executeCarrotsEffect } from './cards/carrots'

/**
 * Track player tile reveals and award copper every 5th reveal.
 * Call this after any tile reveal to track progress.
 */
export function trackPlayerTileReveal(
  state: GameState,
  position: Position,
  wasRevealed: boolean
): GameState {
  if (!wasRevealed) return state

  const tile = getTile(state.board, position)
  if (!tile || tile.owner !== 'player') return state

  const newCount = state.playerTilesRevealedCount + 1
  const shouldAwardCopper = newCount % 5 === 0

  let updatedState = {
    ...state,
    playerTilesRevealedCount: newCount,
    copper: shouldAwardCopper ? state.copper + 1 : state.copper
  }

  if (shouldAwardCopper) {

    // Check for Ice Cream status effect - grant +1 energy when copper awarded
    const iceCreamEffect = updatedState.activeStatusEffects.find(e => e.type === 'ice_cream')
    if (iceCreamEffect && iceCreamEffect.count && iceCreamEffect.count > 0) {
      updatedState = {
        ...updatedState,
        energy: updatedState.energy + 1
      }
    }
  }

  return updatedState
}

// Shared reveal function that includes equipment effects
export function revealTileWithEquipmentEffects(
  state: GameState,
  position: Position,
  revealer: 'player' | 'rival',
  controllableReveal: boolean = true
): GameState {
  // Check for surface mine BEFORE revealing
  const tileBeforeReveal = getTile(state.board, position)

  if (tileBeforeReveal && hasSpecialTile(tileBeforeReveal, 'surfaceMine')) {

    // Handle surface mine explosion
    let stateAfterExplosion = state

    // If controllable player reveal, try to use Underwire protection
    if (controllableReveal && revealer === 'player' && state.underwireProtection?.active) {
      const isEnhanced = state.underwireProtection.enhanced

      // Consume Underwire protection
      stateAfterExplosion = {
        ...state,
        underwireProtection: null,
        underwireUsedThisTurn: !isEnhanced // Only mark for turn end if basic Underwire
      }

      // Remove the status effect
      stateAfterExplosion = removeStatusEffect(stateAfterExplosion, 'underwire_protection')
    }

    // Explode the surface mine: change to empty and add destroyed special tile
    const newTiles = new Map(stateAfterExplosion.board.tiles)
    const originalOwner = tileBeforeReveal.owner
    const explodedTile: Tile = {
      ...tileBeforeReveal,
      owner: 'empty',
      specialTiles: ['destroyed'] // Replace surfaceMine with destroyed
    }
    newTiles.set(positionToKey(position), explodedTile)

    stateAfterExplosion = {
      ...stateAfterExplosion,
      board: {
        ...stateAfterExplosion.board,
        tiles: newTiles
      }
    }


    // Update adjacency_info annotations on neighboring tiles if owner changed
    if (originalOwner !== 'empty') {
      stateAfterExplosion = updateNeighborAdjacencyInfo(stateAfterExplosion, position)
    }

    // Check game status after surface mine explosion
    // This handles both loss (if no protection) and win (if this was the last player tile)
    const gameStatus = checkGameStatus(stateAfterExplosion)
    return {
      ...stateAfterExplosion,
      gameStatus
    }
  }

  // Normal reveal flow if no surface mine
  const revealResult = revealTileWithResult(state.board, position, revealer)
  const newBoard = revealResult.board

  let stateWithBoard = {
    ...state,
    board: newBoard
  }

  // Handle Underwire protection if player revealed a mine
  if (revealer === 'player' && revealResult.revealed) {
    const tile = getTile(newBoard, position)
    
    if (tile && tile.owner === 'mine' && state.underwireProtection?.active) {
      
      // Mark the mine tile as protected and consume the underwire protection
      const isEnhanced = state.underwireProtection.enhanced
      
      // Mark the mine tile as protected
      const newTiles = new Map(newBoard.tiles)
      newTiles.set(`${position.x},${position.y}`, {
        ...tile,
        underwireProtected: true
      })
      
      stateWithBoard = {
        ...stateWithBoard,
        board: {
          ...newBoard,
          tiles: newTiles
        },
        underwireProtection: null,
        underwireUsedThisTurn: !isEnhanced // Only mark for turn end if basic Underwire
      }
      
      
      // Remove the status effect
      stateWithBoard = removeStatusEffect(stateWithBoard, 'underwire_protection')
      
    } else if (tile && tile.owner === 'mine') {
      // Check for Grace status effect as fallback protection
      const hasGrace = state.activeStatusEffects.some(effect => effect.type === 'grace')
      if (hasGrace) {

        // Mark the mine tile as grace-protected
        const newTiles = new Map(newBoard.tiles)
        newTiles.set(`${position.x},${position.y}`, {
          ...tile,
          underwireProtected: true // Reuse this flag since it serves the same purpose
        })

        // Add 1 Evidence to discard and 1 to top of deck
        const evidenceCard1 = createCard('Evidence')
        const evidenceCard2 = createCard('Evidence')

        stateWithBoard = {
          ...stateWithBoard,
          board: {
            ...newBoard,
            tiles: newTiles
          },
          discard: [...stateWithBoard.discard, evidenceCard1],
          deck: [...stateWithBoard.deck, evidenceCard2] // Push to end = top of deck for drawing
        }

        // Remove the Grace status effect
        stateWithBoard = removeStatusEffect(stateWithBoard, 'grace')
      } else {
      }
    }
  }
  
  // Check game status after reveal (with potentially updated protection state)
  const gameStatus = checkGameStatus(stateWithBoard)
  
  stateWithBoard = {
    ...stateWithBoard,
    gameStatus
  }
  
  // Apply equipment effects only for player reveals
  if (revealer === 'player') {
    // Trigger Double Broom effect if tile was revealed (not just cleaned)
    if (revealResult.revealed) {
      const updatedStateWithBroom = triggerDoubleBroomEffect(stateWithBoard, position)
      stateWithBoard = {
        ...stateWithBoard,
        board: updatedStateWithBroom.board
      }
    }
    
    // Check for Frilly Dress effect and update turn state
    if (revealResult.revealed) {
      const tile = getTile(stateWithBoard.board, position)
      if (tile && checkFrillyDressEffect(stateWithBoard, tile)) {
        stateWithBoard = {
          ...stateWithBoard,
          neutralsRevealedThisTurn: stateWithBoard.neutralsRevealedThisTurn + 1
        }
      }
    }
  }

  // Track player tile reveals and award copper every 5th reveal
  stateWithBoard = trackPlayerTileReveal(stateWithBoard, position, revealResult.revealed)


  return stateWithBoard
}

// FUTURE EXTENSION POINT - Per-Card Inner Tile Filtering:
// This helper function filters out inner tiles by default.
// To add per-card rules, consider adding an optional parameter:
// getUnrevealedTiles(state: GameState, cardName?: string, options?: { includeInnerTiles?: boolean })
// Then check cardName against a rules map to determine filtering behavior.
export function getUnrevealedTiles(state: GameState): Tile[] {
  const unrevealed: Tile[] = []
  for (const tile of state.board.tiles.values()) {
    // Filter out empty tiles (including destroyed tiles which have owner='empty')
    // Also filter out inner tiles with unrevealed sanctums
    if (!tile.revealed && tile.owner !== 'empty' && canPlayerRevealInnerTile(state.board, tile.position)) {
      unrevealed.push(tile)
    }
  }
  return unrevealed
}

export function getUnrevealedTilesByOwner(state: GameState, owner: Tile['owner']): Tile[] {
  return getUnrevealedTiles(state).filter(tile => tile.owner === owner)
}

function combineOwnerSubsets(
  existing: Set<'player' | 'rival' | 'neutral' | 'mine'>, 
  incoming: Set<'player' | 'rival' | 'neutral' | 'mine'>
): Set<'player' | 'rival' | 'neutral' | 'mine'> {
  // Intersection: only owners that are possible according to BOTH sets
  const combined = new Set<'player' | 'rival' | 'neutral' | 'mine'>()
  
  for (const owner of existing) {
    if (incoming.has(owner)) {
      combined.add(owner)
    }
  }
  
  return combined
}

export function addOwnerSubsetAnnotation(
  state: GameState, 
  position: Position, 
  newOwnerSubset: Set<'player' | 'rival' | 'neutral' | 'mine'>
): GameState {
  const key = positionToKey(position)
  const tile = state.board.tiles.get(key)

  if (!tile) return state
  if (tile.owner === 'empty') return state

  const newTiles = new Map(state.board.tiles)
  
  // Find existing subset annotation if any
  const existingSubsetAnnotation = tile.annotations.find(a => a.type === 'owner_subset')
  const otherAnnotations = tile.annotations.filter(a => 
    a.type !== 'owner_subset' && a.type !== 'safe' && a.type !== 'unsafe' && a.type !== 'rival'
  )
  
  let finalOwnerSubset: Set<'player' | 'rival' | 'neutral' | 'mine'>
  
  if (existingSubsetAnnotation?.ownerSubset) {
    // Combine with existing subset through intersection
    finalOwnerSubset = combineOwnerSubsets(existingSubsetAnnotation.ownerSubset, newOwnerSubset)
  } else {
    // No existing subset, use the new one
    finalOwnerSubset = new Set(newOwnerSubset)
  }
  
  // Only add annotation if the subset is non-empty
  const finalAnnotations = [...otherAnnotations]
  if (finalOwnerSubset.size > 0) {
    finalAnnotations.push({
      type: 'owner_subset',
      ownerSubset: finalOwnerSubset
    })
  }

  // AUTO-ANNOTATION: If owner_subset rules out 'player', auto-add or update player annotation
  if (finalOwnerSubset.size > 0 && !finalOwnerSubset.has('player')) {
    const existingPlayerAnnotation = tile.annotations.find(a => a.type === 'player_owner_possibility')

    if (existingPlayerAnnotation?.playerOwnerPossibility) {
      // Intersect with the owner subset to narrow it down
      const intersected = new Set<'player' | 'rival' | 'neutral' | 'mine'>()
      for (const owner of existingPlayerAnnotation.playerOwnerPossibility) {
        if (finalOwnerSubset.has(owner)) {
          intersected.add(owner)
        }
      }

      // Remove old player annotation and add updated one
      const withoutPlayerAnnotation = finalAnnotations.filter(a => a.type !== 'player_owner_possibility')
      if (intersected.size > 0) {
        withoutPlayerAnnotation.push({
          type: 'player_owner_possibility',
          playerOwnerPossibility: intersected
        })
      }
      finalAnnotations.length = 0
      finalAnnotations.push(...withoutPlayerAnnotation)
    } else {
      // No existing player annotation - add one with the owner subset (minus 'player')
      finalAnnotations.push({
        type: 'player_owner_possibility',
        playerOwnerPossibility: new Set(finalOwnerSubset)
      })
    }
  }

  const annotatedTile: Tile = {
    ...tile,
    annotations: finalAnnotations
  }

  newTiles.set(key, annotatedTile)

  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}

export function addTileAnnotation(state: GameState, position: Position, annotation: TileAnnotation): GameState {
  const key = positionToKey(position)
  const tile = state.board.tiles.get(key)

  if (!tile) return state

  // Use new combining logic for owner_subset annotations
  if (annotation.type === 'owner_subset' && annotation.ownerSubset) {
    return addOwnerSubsetAnnotation(state, position, annotation.ownerSubset)
  }

  // Legacy logic for non-subset annotations
  const newTiles = new Map(state.board.tiles)
  let existingAnnotations = [...tile.annotations]

  // Handle annotation replacement rules
  if (annotation.type === 'rival') {
    // Enemy annotations override safety annotations
    existingAnnotations = existingAnnotations.filter(a => a.type !== 'safe' && a.type !== 'unsafe')
  }

  const annotatedTile: Tile = {
    ...tile,
    annotations: [...existingAnnotations, annotation]
  }

  newTiles.set(key, annotatedTile)

  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}

/**
 * Updates adjacency_info annotations for all neighbors of a position
 * Should be called when a tile's ownership changes (e.g., Snip Snip converting mine to neutral)
 */
export function updateNeighborAdjacencyInfo(state: GameState, changedPosition: Position): GameState {
  const neighbors = Array.from(state.board.tiles.values()).filter(tile => {
    // Find tiles that are neighbors of the changed position
    const dx = Math.abs(tile.position.x - changedPosition.x)
    const dy = Math.abs(tile.position.y - changedPosition.y)
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)
  })

  let newState = state

  for (const neighborTile of neighbors) {
    // Only update if this tile has an adjacency_info annotation
    const hasAdjacencyInfo = neighborTile.annotations.some(a => a.type === 'adjacency_info')
    if (!hasAdjacencyInfo) continue

    // Find the existing adjacency_info annotation to determine if it was enhanced
    const existingAnnotation = neighborTile.annotations.find(a => a.type === 'adjacency_info')
    if (!existingAnnotation || !existingAnnotation.adjacencyInfo) continue

    // Determine if this was an enhanced annotation (has all owner types)
    const isEnhanced = 'mine' in existingAnnotation.adjacencyInfo

    // Recalculate adjacency info
    const neighborPositions = Array.from(newState.board.tiles.values()).filter(t => {
      const dx = Math.abs(t.position.x - neighborTile.position.x)
      const dy = Math.abs(t.position.y - neighborTile.position.y)
      return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)
    })

    const adjacencyInfo: { player?: number; neutral?: number; rival?: number; mine?: number } = {}

    if (isEnhanced) {
      // Enhanced version: show all adjacency info
      let playerCount = 0
      let neutralCount = 0
      let rivalCount = 0
      let mineCount = 0

      for (const adjTile of neighborPositions) {
        switch (adjTile.owner) {
          case 'player':
            playerCount++
            break
          case 'neutral':
            neutralCount++
            break
          case 'rival':
            rivalCount++
            break
          case 'mine':
            mineCount++
            break
        }
      }

      adjacencyInfo.player = playerCount
      adjacencyInfo.neutral = neutralCount
      adjacencyInfo.rival = rivalCount
      adjacencyInfo.mine = mineCount
    } else {
      // Basic version: only show player adjacency info
      let playerCount = 0

      for (const adjTile of neighborPositions) {
        if (adjTile.owner === 'player') {
          playerCount++
        }
      }

      adjacencyInfo.player = playerCount
    }

    // Update the tile's annotation
    const newTiles = new Map(newState.board.tiles)
    const key = positionToKey(neighborTile.position)
    const tileToUpdate = newTiles.get(key)

    if (tileToUpdate) {
      const otherAnnotations = tileToUpdate.annotations.filter(a => a.type !== 'adjacency_info')
      newTiles.set(key, {
        ...tileToUpdate,
        annotations: [
          ...otherAnnotations,
          {
            type: 'adjacency_info',
            adjacencyInfo
          }
        ]
      })

      newState = {
        ...newState,
        board: {
          ...newState.board,
          tiles: newTiles
        }
      }
    }
  }

  // BUG FIX: Also update adjacencyCount on revealed neighboring tiles
  // When a tile's owner changes (e.g., mine explodes to empty), adjacency counts need recalculation
  for (const neighborTile of neighbors) {
    // Only update revealed tiles
    if (!neighborTile.revealed || !neighborTile.revealedBy) continue

    // Recalculate adjacency count based on who revealed it
    const newAdjacencyCount = calculateAdjacency(newState.board, neighborTile.position, neighborTile.revealedBy)

    // Only update if the count changed
    if (newAdjacencyCount !== neighborTile.adjacencyCount) {

      const newTiles = new Map(newState.board.tiles)
      const key = positionToKey(neighborTile.position)
      const tileToUpdate = newTiles.get(key)

      if (tileToUpdate) {
        newTiles.set(key, {
          ...tileToUpdate,
          adjacencyCount: newAdjacencyCount
        })

        newState = {
          ...newState,
          board: {
            ...newState.board,
            tiles: newTiles
          }
        }
      }
    }
  }

  return newState
}

export function addClueResult(state: GameState, position: Position, clueResult: ClueResult): GameState {
  const key = positionToKey(position)
  const tile = state.board.tiles.get(key)
  
  if (!tile) {
    return state
  }
  
  const newTiles = new Map(state.board.tiles)
  
  // Find existing clue_results annotation or create new one
  const existingAnnotations = tile.annotations.filter(a => a.type !== 'clue_results')
  const clueAnnotation = tile.annotations.find(a => a.type === 'clue_results')
  
  const updatedClueResults = clueAnnotation?.clueResults || []
  updatedClueResults.push(clueResult)
  
  
  const newAnnotation: TileAnnotation = {
    type: 'clue_results',
    clueResults: updatedClueResults
  }
  
  const annotatedTile: Tile = {
    ...tile,
    annotations: [...existingAnnotations, newAnnotation]
  }
  
  newTiles.set(key, annotatedTile)
  
  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}










export function checkGameStatus(state: GameState): GameStatusInfo {
  const board = state.board

  // Get level config for level number
  const levelConfig = getLevelConfig(state.currentLevelId)
  const levelNumber = levelConfig?.levelNumber

  // Count tiles first for potential rival tiles left calculation
  // Exclude destroyed tiles from all counts
  let playerTilesRevealed = 0
  let totalPlayerTiles = 0
  let rivalTilesRevealed = 0
  let totalRivalTiles = 0

  for (const tile of board.tiles.values()) {
    // Skip destroyed tiles
    if (tile.specialTiles.includes('destroyed')) continue

    if (tile.owner === 'player') {
      totalPlayerTiles++
      if (tile.revealed) playerTilesRevealed++
    } else if (tile.owner === 'rival') {
      totalRivalTiles++
      if (tile.revealed) rivalTilesRevealed++
    }
  }

  // Check if mine was revealed
  for (const tile of board.tiles.values()) {
    if (tile.revealed && tile.owner === 'mine') {
      // Skip mines that were protected by Underwire
      if (tile.underwireProtected) {
        continue
      }

      // Skip mines that were protected by rival mine protection
      if (tile.rivalMineProtected) {
        continue
      }

      return {
        status: tile.revealedBy === 'player' ? 'player_lost' : 'player_won',
        reason: tile.revealedBy === 'player' ? 'player_revealed_mine' : 'rival_revealed_mine',
        rivalTilesLeft: tile.revealedBy === 'rival' ? totalRivalTiles - rivalTilesRevealed : undefined,
        levelNumber: tile.revealedBy === 'player' ? levelNumber : undefined
      }
    }
  }
  
  // Check win conditions
  // Favor equipment: finish when 1 player tile remaining instead of 0
  const hasFavor = state.equipment.some(r => r.name === 'Favor')
  const unrevealedPlayerTiles = totalPlayerTiles - playerTilesRevealed

  if (playerTilesRevealed === totalPlayerTiles) {
    return {
      status: 'player_won',
      reason: 'all_player_tiles_revealed',
      rivalTilesLeft: totalRivalTiles - rivalTilesRevealed
    }
  }

  if (hasFavor && unrevealedPlayerTiles === 1) {
    return {
      status: 'player_won',
      reason: 'all_player_tiles_revealed',
      rivalTilesLeft: totalRivalTiles - rivalTilesRevealed
    }
  }
  
  if (rivalTilesRevealed === totalRivalTiles) {
    return {
      status: 'player_lost',
      reason: 'all_rival_tiles_revealed',
      levelNumber
    }
  }
  
  return { status: 'playing' }
}


export function executeCardEffect(state: GameState, effect: CardEffect, card?: import('../types').Card): GameState {
  switch (effect.type) {
    case 'scout':
      return executeScoutEffect(state, effect.target, card)
    case 'scurry':
      return executeScurryEffect(state, effect.targets)
    case 'report':
      return executeReportEffect(state)
    case 'imperious_instructions':
      return executeImperiousInstructionsEffect(state, card)
    case 'vague_instructions':
      return executeVagueInstructionsEffect(state, card)
    case 'sarcastic_instructions':
      return executeSarcasticInstructionsEffect(state, card)
    case 'energized':
      return executeEnergizedEffect(state, card)
    case 'options':
      return executeOptionsEffect(state, card)
    case 'brush':
      return executeBrushEffect(state, effect.target, card)
    case 'ramble':
      // Ramble now adds Distraction stacks: 2 for basic, 4 for enhanced
      const stacksToAdd = card?.enhanced ? 4 : 2
      return addDistractionStacks(state, stacksToAdd)
    case 'sweep':
      return executeSweepEffect(state, effect.target, card)
    case 'underwire':
      return executeUnderwireEffect(state, card)
    case 'tryst':
      return executeTrystEffect(state, effect.target, card)
    case 'canary':
      return executeCanaryEffect(state, effect.target, card)
    case 'monster':
      return executeMonsterEffect(state, card)
    case 'argument':
      return executeArgumentEffect(state, effect.target, card)
    case 'horse':
      return executeHorseEffect(state, effect.target, card)
    case 'eavesdropping':
      return executeEavesdroppingEffect(state, effect.target, card)
    case 'emanation':
      return executeEmanationEffect(state, effect.target, card)
    case 'brat':
      return executeBratEffect(state, effect.target, card)
    case 'snip_snip':
      return executeSnipSnipEffect(state, effect.target, card)
    case 'gaze':
      return executeGazeEffect(state, effect.target, card)
    case 'fetch':
      return executeFetchEffect(state, effect.target, card)
    case 'burger':
      return executeBurgerEffect(state, card)
    case 'twirl':
      return executeTwirlEffect(state, card)
    case 'donut':
      return executeDonutEffect(state, card?.enhanced || false)
    case 'ice_cream':
      return executeIceCreamEffect(state, card)
    case 'carrots':
      return executeCarrotsEffect(state, card)
    default:
      return state
  }
}

export function requiresTargeting(cardName: string, enhanced?: boolean): boolean {
  if (cardName === 'Tryst') {
    return enhanced || false // Only enhanced Tryst requires targeting
  }
  // Masking has special handling - doesn't use regular targeting system
  // Gaze and Fetch cards all start with their base name
  if (cardName.startsWith('Gaze')) return true
  if (cardName.startsWith('Fetch')) return true
  return cardName === 'Spritz' || cardName === 'Scurry' || cardName === 'Brush' || cardName === 'Sweep' || cardName === 'Canary' || cardName === 'Argument' || cardName === 'Horse' || cardName === 'Eavesdropping' || cardName === 'Emanation' || cardName === 'Brat' || cardName === 'Snip, Snip'
}

export function getTargetingInfo(cardName: string, enhanced?: boolean): { count: number; description: string } | null {
  switch (cardName) {
    case 'Spritz':
      return { count: 1, description: enhanced ? 'Click on an unrevealed tile to spritz (also spritzes adjacent tile)' : 'Click on an unrevealed tile to spritz' }
    case 'Scurry':
      return { count: enhanced ? 3 : 2, description: enhanced ? 'Click on three unrevealed tiles - the safest will be revealed' : 'Click on two unrevealed tiles - the safer will be revealed' }
    case 'Brush':
      return { count: 1, description: enhanced ? 'Click center of 3x3 area to exclude random owners (applies twice)' : 'Click center of 3x3 area to exclude random owners' }
    case 'Sweep':
      return { count: 1, description: enhanced ? 'Click center of 7x7 area to remove all dirt' : 'Click center of 5x5 area to remove all dirt' }
    case 'Tryst':
      return enhanced ? { count: 1, description: 'Click target tile - reveals will be prioritized by distance from it' } : null
    case 'Canary':
      return { count: 1, description: enhanced ? 'Click center of 3x3 area to detect mines' : 'Click center of star area to detect mines' }
    case 'Argument':
      return { count: 1, description: enhanced ? 'Click center of 3x3 area to identify neutral tiles and draw 1 card' : 'Click center of 3x3 area to identify neutral tiles' }
    case 'Horse':
      return { count: 1, description: enhanced ? 'Click center of small area - reveal/annotate all tiles of safest owner in area, Horse cards cost 0' : 'Click center of small area - reveal all tiles of safest owner in area, Horse cards cost 0 (ends turn if not player!)' }
    case 'Eavesdropping':
      return { count: 1, description: enhanced ? 'Click an unrevealed tile to get ALL adjacency info (player, neutral, rival, mines)' : 'Click an unrevealed tile to get player adjacency info' }
    case 'Emanation':
      return { count: 1, description: enhanced ? 'Click a tile to destroy it (no copper loss)' : 'Click a tile to destroy it (lose 1 copper)' }
    case 'Masking':
      return { count: 1, description: enhanced ? 'Select a card from hand to play for free and exhaust it (Masking doesn\'t exhaust)' : 'Select a card from hand to play for free and exhaust both cards' }
    case 'Brat':
      return { count: 1, description: enhanced ? 'Click a revealed tile to unreveal it (adjacency info remains). Gain 2 copper' : 'Click a revealed tile to unreveal it (adjacency info remains)' }
    case 'Snip, Snip':
      return { count: 1, description: enhanced ? 'Click a tile to defuse mines and get mine adjacency info. Defusing grants 2 copper' : 'Click a tile to defuse mines. Defusing grants 2 copper' }
    case 'Gaze ↑':
    case 'Gaze ↓':
    case 'Gaze ←':
    case 'Gaze →':
      const gazeDirection = cardName.includes('↑') ? 'upward' : cardName.includes('↓') ? 'downward' : cardName.includes('←') ? 'left' : 'right'
      return { count: 1, description: enhanced ? `Click start tile, search ${gazeDirection} for first rival AND mine, annotate them and all checked tiles` : `Click start tile, search ${gazeDirection} for first rival, annotate it and all checked tiles as not rival` }
    case 'Fetch ↑':
    case 'Fetch ↓':
    case 'Fetch ←':
    case 'Fetch →':
      const fetchDirection = cardName.includes('↑') ? 'upward' : cardName.includes('↓') ? 'downward' : cardName.includes('←') ? 'left' : 'right'
      return { count: 1, description: enhanced ? `Click start tile, check ${fetchDirection} for most common owner (tiebreak to safest), reveal all of that owner, annotate rest. Draw a card.` : `Click start tile, check ${fetchDirection} for most common owner (tiebreak to safest), reveal all of that owner, annotate rest. Turn ends if not player.` }
    default:
      return null
  }
}

/**
 * Add Distraction stacks to the game state.
 * Creates or updates the Distraction status effect.
 */
function addDistractionStacks(state: GameState, stacks: number): GameState {
  // Find existing Distraction status effect
  const existingDistraction = state.activeStatusEffects.find(e => e.type === 'distraction')

  if (existingDistraction) {
    // Update existing Distraction with increased count
    const newCount = (existingDistraction.count || 0) + stacks
    const updatedEffects = state.activeStatusEffects.map(e =>
      e.type === 'distraction'
        ? {
            ...e,
            count: newCount,
            name: `Distraction (×${newCount})`,
            description: `Rival's tile priorities are disrupted for their next turn (${newCount} stack${newCount > 1 ? 's' : ''})`
          }
        : e
    )
    return {
      ...state,
      activeStatusEffects: updatedEffects
    }
  } else {
    // Create new Distraction status effect
    const distractionEffect = {
      id: crypto.randomUUID(),
      type: 'distraction' as const,
      icon: '🌀',
      name: stacks > 1 ? `Distraction (×${stacks})` : 'Distraction',
      description: stacks > 1
        ? `Rival's tile priorities are disrupted for their next turn (${stacks} stacks)`
        : "Rival's tile priorities are disrupted for their next turn",
      count: stacks
    }

    return {
      ...state,
      activeStatusEffects: [...state.activeStatusEffects, distractionEffect]
    }
  }
}






