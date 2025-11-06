import { GameState, Position } from '../../types'
import { getTile, positionToKey, removeSpecialTile, cleanGoblin, hasSpecialTile } from '../boardSystem'
import { triggerMopEffect, hasEquipment } from '../equipment'
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

    // Draw card immediately for cleaning dirt (Mop equipment effect)
    newState = triggerMopEffect(newState, 1)

    // Spread clean to adjacent tiles (Bleach equipment effect)
    
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
    else if (currentTile.surfaceMineState?.cleanedOnce) {
      console.log('  - 2nd cleaning (Spritz/Sweep): defusing surface mine')
      shouldDefuse = true
    }
    // Any cleaning with Mop defuses (including 1st regular Spritz)
    else if (hasEquipment(newState, 'Mop')) {
      console.log('  - 1st cleaning + Mop: defusing surface mine')
      shouldDefuse = true
    }
    // First cleaning without Mop marks surface mine as cleanedOnce but doesn't defuse
    else {
      console.log('  - 1st cleaning (no Mop): marking surface mine as cleanedOnce (not defusing yet)')
      const newTiles = new Map(newState.board.tiles)
      newTiles.set(key, { ...currentTile, surfaceMineState: { cleanedOnce: true } })
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

      // Trigger Mop effect if player has Mop equipment (defusing counts as cleaning)
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
      let adjTile = getTile(stateWithMainScout.board, randomAdjacent)

      if (adjTile) {
        let stateAfterAdjacentClean = stateWithMainScout

        // Clean goblin if present on adjacent tile
        if (hasSpecialTile(adjTile, 'goblin')) {
          const { board: boardAfterGoblinMove } = cleanGoblin(stateAfterAdjacentClean.board, randomAdjacent)
          stateAfterAdjacentClean = {
            ...stateAfterAdjacentClean,
            board: boardAfterGoblinMove
          }
        }

        // Clean dirt if present on adjacent tile
        if (hasSpecialTile(adjTile, 'extraDirty')) {
          const key = positionToKey(randomAdjacent)
          const newTiles = new Map(stateAfterAdjacentClean.board.tiles)
          const currentTile = newTiles.get(key)!
          const cleanedTile = removeSpecialTile(currentTile, 'extraDirty')
          newTiles.set(key, cleanedTile)

          stateAfterAdjacentClean = {
            ...stateAfterAdjacentClean,
            board: {
              ...stateAfterAdjacentClean.board,
              tiles: newTiles
            }
          }

          // Draw card immediately for cleaning dirt (Mop equipment effect)
          stateAfterAdjacentClean = triggerMopEffect(stateAfterAdjacentClean, 1)

          // Spread clean to adjacent tiles (Bleach equipment effect)
          
        }

        // Handle surface mine defusing on adjacent tile (enhanced Spritz always defuses)
        adjTile = getTile(stateAfterAdjacentClean.board, randomAdjacent)!
        if (hasSpecialTile(adjTile, 'surfaceMine')) {
          console.log('💣 SPRITZ+ HIT SURFACE MINE ON ADJACENT TILE - defusing')
          const key = positionToKey(randomAdjacent)
          const newTiles = new Map(stateAfterAdjacentClean.board.tiles)
          const defusedTile = removeSpecialTile(adjTile, 'surfaceMine')
          newTiles.set(key, defusedTile)

          stateAfterAdjacentClean = {
            ...stateAfterAdjacentClean,
            board: {
              ...stateAfterAdjacentClean.board,
              tiles: newTiles
            },
            copper: stateAfterAdjacentClean.copper + 3
          }

          console.log('  - Adjacent surface mine defused! +3 copper')

          // Trigger Mop effect if player has Mop equipment (defusing counts as cleaning)
          stateAfterAdjacentClean = triggerMopEffect(stateAfterAdjacentClean, 1)
        }

        const adjIsSafe = adjTile.owner === 'player' || adjTile.owner === 'neutral'
        const adjOwnerSubset = adjIsSafe
          ? new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'neutral'])
          : new Set<'player' | 'rival' | 'neutral' | 'mine'>(['rival', 'mine'])

        return addOwnerSubsetAnnotation(stateAfterAdjacentClean, randomAdjacent, adjOwnerSubset)
      }
    }
  }
  
  return stateWithMainScout
}