import { GameState, Position } from '../../types'
import { getTile } from '../boardSystem'
import { addStatusEffect } from '../gameRepository'
import { revealTileWithRelicEffects } from '../cardEffects'
import { addOwnerSubsetAnnotation } from '../cardEffects'

export function executeHorseEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  // Get Manhattan distance 1 area around target
  const area: Position[] = [
    target, // Center
    { x: target.x - 1, y: target.y }, // Left
    { x: target.x + 1, y: target.y }, // Right
    { x: target.x, y: target.y - 1 }, // Up
    { x: target.x, y: target.y + 1 }  // Down
  ]
  
  // Find tiles in the area that exist and are unrevealed
  const validTiles = area
    .map(pos => ({ pos, tile: getTile(state.board, pos) }))
    .filter(({ tile }) => tile && !tile.revealed && tile.owner !== 'empty')
  
  if (validTiles.length === 0) {
    // No valid tiles, just add status effect
    return addStatusEffect(state, 'horse_discount')
  }
  
  // Count tiles by owner to find safest (player > neutral > rival > mine)
  const ownerCounts: Record<string, number> = {}
  validTiles.forEach(({ tile }) => {
    if (tile) {
      ownerCounts[tile.owner] = (ownerCounts[tile.owner] || 0) + 1
    }
  })
  
  // Determine safest owner (priority: player > neutral > rival > mine)
  let safestOwner: string
  if (ownerCounts.player > 0) {
    safestOwner = 'player'
  } else if (ownerCounts.neutral > 0) {
    safestOwner = 'neutral'
  } else if (ownerCounts.rival > 0) {
    safestOwner = 'rival'
  } else {
    safestOwner = 'mine'
  }
  
  // Get all tiles with the safest owner in the area
  const tilesToProcess = validTiles.filter(({ tile }) => tile?.owner === safestOwner)
  
  let newState = state
  let processedNonPlayerTiles = false
  
  if (card?.enhanced && safestOwner !== 'player') {
    // Enhanced version: annotate instead of reveal for non-player owners
    const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>([safestOwner as any])
    tilesToProcess.forEach(({ pos }) => {
      newState = addOwnerSubsetAnnotation(newState, pos, ownerSubset)
    })
  } else {
    // Normal version: reveal all tiles with safest owner
    // Handle dirty tiles specially - annotate instead of reveal/clean
    tilesToProcess.forEach(({ pos, tile }) => {
      if (tile?.specialTiles.includes('extraDirty')) {
        // For dirty tiles, annotate with the exact owner instead of revealing/cleaning
        const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>([tile.owner as any])
        newState = addOwnerSubsetAnnotation(newState, pos, ownerSubset)
        // Track that we processed a non-player tile (for turn ending logic)
        if (safestOwner !== 'player') {
          processedNonPlayerTiles = true
        }
      } else {
        // For non-dirty tiles, reveal normally
        newState = revealTileWithRelicEffects(newState, pos, 'player')

        // Check if the tile was actually revealed (it might not be if there was a goblin)
        const tileAfterReveal = getTile(newState.board, pos)
        if (tileAfterReveal && !tileAfterReveal.revealed && tile) {
          // Reveal failed (probably due to goblin) - add annotation with the owner info
          const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>([tile.owner as any])
          newState = addOwnerSubsetAnnotation(newState, pos, ownerSubset)
        }

        // Track that we processed a non-player tile (for turn ending logic)
        if (safestOwner !== 'player') {
          processedNonPlayerTiles = true
        }
      }
    })
    
    // Note: If safest owner is not player, this should end the turn
    // This will be handled by the store logic checking the card effect results
  }
  
  // Add game annotations to unrevealed tiles in the area
  // Exclude tiles that were already processed (revealed or annotated)
  const processedPositions = new Set(tilesToProcess.map(({ pos }) => `${pos.x},${pos.y}`))
  const unrevealedTilesInArea = area
    .map(pos => ({ pos, tile: getTile(newState.board, pos) }))
    .filter(({ tile, pos }) => 
      tile && 
      !tile.revealed && 
      tile.owner !== 'empty' && 
      !processedPositions.has(`${pos.x},${pos.y}`)
    )
  
  // Determine what to exclude based on what was revealed
  let exclusionSet: Set<'player' | 'rival' | 'neutral' | 'mine'>
  
  if (safestOwner === 'player') {
    // All player tiles were revealed, so remaining tiles are anything but player
    exclusionSet = new Set(['rival', 'neutral', 'mine'])
  } else if (safestOwner === 'neutral') {
    // All neutral tiles were revealed, and since player has higher priority but wasn't chosen,
    // there were no player tiles. So remaining tiles are anything but player or neutral
    exclusionSet = new Set(['rival', 'mine'])
  } else if (safestOwner === 'rival') {
    // All rival tiles were revealed, and since player/neutral have higher priority but weren't chosen,
    // there were no player or neutral tiles. So remaining tiles must be mines
    exclusionSet = new Set(['mine'])
  } else {
    // safestOwner === 'mine' - all mines revealed, game probably lost anyway
    // But for completeness, remaining tiles are anything but mines
    exclusionSet = new Set(['player', 'rival', 'neutral'])
  }
  
  // Apply annotations to unrevealed tiles
  unrevealedTilesInArea.forEach(({ pos }) => {
    newState = addOwnerSubsetAnnotation(newState, pos, exclusionSet)
  })
  
  // Add Horse discount status effect
  newState = addStatusEffect(newState, 'horse_discount')
  
  // Mark if we processed non-player tiles (for turn ending logic)
  // This includes both revealing and annotating dirty tiles
  if (!card?.enhanced && processedNonPlayerTiles) {
    newState = {
      ...newState,
      horseRevealedNonPlayer: true
    }
  }
  
  return newState
}