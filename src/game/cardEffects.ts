import { GameState, CardEffect, Position, Tile, TileAnnotation, ClueResult, GameStatusInfo } from '../types'
import { positionToKey, getTile, revealTileWithResult } from './boardSystem'
import { triggerDoubleBroomEffect, checkFrillyDressEffect } from './relicSystem'
import { removeStatusEffect } from './gameRepository'
import { executeScoutEffect } from './cards/scout'
import { executeQuantumEffect } from './cards/quantumChoice'
import { executeReportEffect } from './cards/report'
import { executeSolidClueEffect } from './cards/solidClue'
import { executeStretchClueEffect } from './cards/stretchClue'
import { executeSarcasticOrdersEffect } from './cards/sarcasticOrders'
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

// Shared reveal function that includes relic effects
export function revealTileWithRelicEffects(state: GameState, position: Position, revealer: 'player' | 'rival'): GameState {
  const revealResult = revealTileWithResult(state.board, position, revealer)
  const newBoard = revealResult.board
  
  let stateWithBoard = {
    ...state,
    board: newBoard
  }
  
  // Handle Underwire protection if player revealed a mine
  if (revealer === 'player' && revealResult.revealed) {
    const tile = getTile(newBoard, position)
    console.log('🔍 UNDERWIRE DEBUG - Player revealed tile:', {
      position,
      tileExists: !!tile,
      tileOwner: tile?.owner,
      underwireProtection: state.underwireProtection,
      activeStatusEffects: state.activeStatusEffects.map(e => e.type)
    })
    
    if (tile && tile.owner === 'mine' && state.underwireProtection?.active) {
      console.log('🛡️ UNDERWIRE TRIGGERED - Mine revealed with active protection!')
      console.log('Before protection logic:')
      console.log('  - underwireProtection:', state.underwireProtection)
      console.log('  - activeStatusEffects:', state.activeStatusEffects)
      
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
      
      console.log('After setting state (before removeStatusEffect):')
      console.log('  - underwireProtection:', stateWithBoard.underwireProtection)
      console.log('  - activeStatusEffects:', stateWithBoard.activeStatusEffects)
      
      // Remove the status effect
      stateWithBoard = removeStatusEffect(stateWithBoard, 'underwire_protection')
      
      console.log('After removeStatusEffect:')
      console.log('  - underwireProtection:', stateWithBoard.underwireProtection)
      console.log('  - activeStatusEffects:', stateWithBoard.activeStatusEffects)
      console.log('🛡️ UNDERWIRE PROTECTION CONSUMED')
    } else if (tile && tile.owner === 'mine') {
      console.log('💥 MINE REVEALED WITHOUT PROTECTION - Game should end')
    }
  }
  
  // Check game status after reveal (with potentially updated protection state)
  const gameStatus = checkGameStatus(stateWithBoard)
  
  stateWithBoard = {
    ...stateWithBoard,
    gameStatus
  }
  
  // Apply relic effects only for player reveals
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
          hasRevealedNeutralThisTurn: true
        }
      }
    }
  }
  
  console.log('🔚 REVEAL TILE WITH RELIC EFFECTS - FINAL STATE')
  console.log('  - Final underwireProtection:', stateWithBoard.underwireProtection)
  console.log('  - Final activeStatusEffects:', stateWithBoard.activeStatusEffects.map(e => ({ type: e.type, id: e.id })))
  console.log('  - Final hand size:', stateWithBoard.hand.length)
  console.log('  - Final deck size:', stateWithBoard.deck.length)
  
  return stateWithBoard
}

export function getUnrevealedTiles(state: GameState): Tile[] {
  const unrevealed: Tile[] = []
  for (const tile of state.board.tiles.values()) {
    // Filter out empty tiles (including destroyed tiles which have owner='empty')
    if (!tile.revealed && tile.owner !== 'empty') {
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
      
      return {
        status: tile.revealedBy === 'player' ? 'player_lost' : 'player_won',
        reason: tile.revealedBy === 'player' ? 'player_revealed_mine' : 'rival_revealed_mine',
        rivalTilesLeft: tile.revealedBy === 'rival' ? totalRivalTiles - rivalTilesRevealed : undefined
      }
    }
  }
  
  // Check win conditions
  if (playerTilesRevealed === totalPlayerTiles) {
    return {
      status: 'player_won',
      reason: 'all_player_tiles_revealed',
      rivalTilesLeft: totalRivalTiles - rivalTilesRevealed
    }
  }
  
  if (rivalTilesRevealed === totalRivalTiles) {
    return {
      status: 'player_lost',
      reason: 'all_rival_tiles_revealed'
    }
  }
  
  return { status: 'playing' }
}


export function executeCardEffect(state: GameState, effect: CardEffect, card?: import('../types').Card): GameState {
  switch (effect.type) {
    case 'scout':
      return executeScoutEffect(state, effect.target, card)
    case 'quantum':
      return executeQuantumEffect(state, effect.targets)
    case 'report':
      return executeReportEffect(state)
    case 'solid_clue':
      return executeSolidClueEffect(state, card)
    case 'stretch_clue':
      return executeStretchClueEffect(state, card)
    case 'sarcastic_orders':
      return executeSarcasticOrdersEffect(state, card)
    case 'energized':
      return executeEnergizedEffect(state, card)
    case 'options':
      return executeOptionsEffect(state, card)
    case 'brush':
      return executeBrushEffect(state, effect.target, card)
    case 'ramble':
      const maxBoost = card?.enhanced ? 4 : 2
      const stateWithRamble = {
        ...state,
        rambleActive: true,
        ramblePriorityBoosts: [...state.ramblePriorityBoosts, maxBoost] // Collect boost values
      }
      // Remove existing ramble status effect first, then add updated one with count
      const stateWithoutOldRamble = removeStatusEffect(stateWithRamble, 'ramble_active')
      return addRambleStatusEffectWithCount(stateWithoutOldRamble, card?.enhanced)
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
    default:
      return state
  }
}

export function requiresTargeting(cardName: string, enhanced?: boolean): boolean {
  if (cardName === 'Tryst') {
    return enhanced || false // Only enhanced Tryst requires targeting
  }
  return cardName === 'Spritz' || cardName === 'Easiest' || cardName === 'Brush' || cardName === 'Sweep' || cardName === 'Canary' || cardName === 'Argument' || cardName === 'Horse' || cardName === 'Eavesdropping' || cardName === 'Emanation'
}

export function getTargetingInfo(cardName: string, enhanced?: boolean): { count: number; description: string } | null {
  switch (cardName) {
    case 'Spritz':
      return { count: 1, description: enhanced ? 'Click on an unrevealed tile to scout (also scouts adjacent tile)' : 'Click on an unrevealed tile to scout' }
    case 'Easiest':
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
    default:
      return null
  }
}

function addRambleStatusEffectWithCount(state: GameState, enhanced?: boolean): GameState {
  const rambleCount = state.ramblePriorityBoosts.length
  
  // Create custom status effect with count in the name/description
  const rambleStatusEffect = {
    id: crypto.randomUUID(),
    type: 'ramble_active' as const,
    icon: '🌀',
    name: rambleCount > 1 ? `Ramble Active (×${rambleCount})` : 'Ramble Active',
    description: rambleCount > 1 
      ? `Rival's guaranteed bag pulls are disrupted for their next turn (${rambleCount} rambles played)`
      : "Rival's guaranteed bag pulls are disrupted for their next turn",
    enhanced
  }
  
  return {
    ...state,
    activeStatusEffects: [...state.activeStatusEffects, rambleStatusEffect]
  }
}






