import { GameState, Position } from '../../types'
import { getTile, positionToKey, clearSpecialTileState, cleanGoblin } from '../boardSystem'
import { triggerMopEffect } from '../relicSystem'
import { addOwnerSubsetAnnotation } from '../cardEffects'

export function executeScoutEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const tile = getTile(state.board, target)
  if (!tile || tile.revealed) return state

  let newState = state

  // If this is a goblin tile, move it (but don't trigger Mop)
  if (tile.specialTile === 'goblin') {
    const { board: boardAfterGoblinMove } = cleanGoblin(state.board, target)
    newState = {
      ...state,
      board: boardAfterGoblinMove
    }
  }
  // If this is an extraDirty tile, clear the dirty state first
  else if (tile.specialTile === 'extraDirty') {
    const key = positionToKey(target)
    const newTiles = new Map(state.board.tiles)
    const cleanedTile = clearSpecialTileState(tile)
    newTiles.set(key, cleanedTile)

    newState = {
      ...state,
      board: {
        ...state.board,
        tiles: newTiles
      }
    }

    // Draw card immediately for cleaning dirt (Mop relic effect)
    newState = triggerMopEffect(newState, 1)
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