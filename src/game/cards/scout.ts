import { GameState, Position } from '../../types'
import { getTile, positionToKey, removeSpecialTile, cleanGoblin, hasSpecialTile } from '../boardSystem'
import { triggerMopEffect, hasRelic } from '../relics'
import { addOwnerSubsetAnnotation } from '../cardEffects'

export function executeScoutEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const tile = getTile(state.board, target)
  if (!tile || tile.revealed) return state

  let newState = state

  // If this is a goblin tile, move it (but don't trigger Mop)
  if (hasSpecialTile(tile, 'goblin')) {
    const { board: boardAfterGoblinMove } = cleanGoblin(state.board, target)
    newState = {
      ...state,
      board: boardAfterGoblinMove
    }
  }

  // If this is an extraDirty tile, clear the dirty state
  // (can happen in addition to goblin cleaning above)
  if (hasSpecialTile(tile, 'extraDirty')) {
    const key = positionToKey(target)
    const newTiles = new Map(newState.board.tiles)
    const currentTile = newTiles.get(key)!
    const cleanedTile = removeSpecialTile(currentTile, 'extraDirty')
    newTiles.set(key, cleanedTile)

    newState = {
      ...newState,
      board: {
        ...newState.board,
        tiles: newTiles
      }
    }

    // Draw card immediately for cleaning dirt (Mop relic effect)
    newState = triggerMopEffect(newState, 1)
  }

  // Handle surface mine defusing
  const currentTile = getTile(newState.board, target)
  if (currentTile && hasSpecialTile(currentTile, 'surfaceMine')) {
    console.log('💣 SPRITZ HIT SURFACE MINE')
    const key = positionToKey(target)
    let shouldDefuse = false

    // Enhanced Spritz always defuses
    if (card?.enhanced) {
      console.log('  - Enhanced Spritz: defusing surface mine')
      shouldDefuse = true
    }
    // Regular Spritz/Sweep on 2nd cleaning defuses
    else if (currentTile.cleanedOnce) {
      console.log('  - 2nd cleaning (Spritz/Sweep): defusing surface mine')
      shouldDefuse = true
    }
    // Any cleaning with Mop defuses (including 1st regular Spritz)
    else if (hasRelic(newState, 'Mop')) {
      console.log('  - 1st cleaning + Mop: defusing surface mine')
      shouldDefuse = true
    }
    // First cleaning without Mop marks as cleanedOnce but doesn't defuse
    else {
      console.log('  - 1st cleaning (no Mop): marking as cleanedOnce (not defusing yet)')
      const newTiles = new Map(newState.board.tiles)
      newTiles.set(key, { ...currentTile, cleanedOnce: true })
      newState = {
        ...newState,
        board: {
          ...newState.board,
          tiles: newTiles
        }
      }
    }

    // If defusing, remove surface mine and award copper
    if (shouldDefuse) {
      const newTiles = new Map(newState.board.tiles)
      const defusedTile = removeSpecialTile(currentTile, 'surfaceMine')
      newTiles.set(key, defusedTile)

      newState = {
        ...newState,
        board: {
          ...newState.board,
          tiles: newTiles
        },
        copper: newState.copper + 3
      }

      console.log('  - Surface mine defused! +3 copper')

      // Trigger Mop effect if player has Mop relic (defusing counts as cleaning)
      newState = triggerMopEffect(newState, 1)
    }
  }

  const isSafe = tile.owner === 'player' || tile.owner === 'neutral'
  const ownerSubset = isSafe 
    ? new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'neutral'])
    : new Set<'player' | 'rival' | 'neutral' | 'mine'>(['rival', 'mine'])
  
  const stateWithMainScout = addOwnerSubsetAnnotation(newState, target, ownerSubset)
  
  // Enhanced Scout: also scout a random adjacent tile
  if (card?.enhanced) {
    const adjacentPositions = [
      { x: target.x - 1, y: target.y },
      { x: target.x + 1, y: target.y },
      { x: target.x, y: target.y - 1 },
      { x: target.x, y: target.y + 1 },
      { x: target.x - 1, y: target.y - 1 },
      { x: target.x + 1, y: target.y - 1 },
      { x: target.x - 1, y: target.y + 1 },
      { x: target.x + 1, y: target.y + 1 }
    ]
    
    const unrevealedAdjacent = adjacentPositions.filter(pos => {
      const adjKey = `${pos.x},${pos.y}`
      const adjTile = stateWithMainScout.board.tiles.get(adjKey)
      return adjTile && !adjTile.revealed && adjTile.owner !== 'empty'
    })
    
    if (unrevealedAdjacent.length > 0) {
      // Pick a random adjacent tile to scout
      const randomAdjacent = unrevealedAdjacent[Math.floor(Math.random() * unrevealedAdjacent.length)]
      const adjTile = getTile(stateWithMainScout.board, randomAdjacent)
      
      if (adjTile) {
        const adjIsSafe = adjTile.owner === 'player' || adjTile.owner === 'neutral'
        const adjOwnerSubset = adjIsSafe 
          ? new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'neutral'])
          : new Set<'player' | 'rival' | 'neutral' | 'mine'>(['rival', 'mine'])
        
        return addOwnerSubsetAnnotation(stateWithMainScout, randomAdjacent, adjOwnerSubset)
      }
    }
  }
  
  return stateWithMainScout
}