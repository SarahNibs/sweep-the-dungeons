import { GameState, Position, TileAnnotation } from '../../types'
import { positionToKey } from '../boardSystem'

export function executeBrushEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  // Get 3x3 area around target position
  const centerX = target.x
  const centerY = target.y
  
  let currentState = state
  
  // Enhanced Brush applies the effect twice (two separate random exclusions per tile)
  const iterations = card?.enhanced ? 2 : 1
  
  for (let iteration = 0; iteration < iterations; iteration++) {
    const newTiles = new Map(currentState.board.tiles)
    
    // For each tile in 3x3 area
    for (let x = centerX - 1; x <= centerX + 1; x++) {
      for (let y = centerY - 1; y <= centerY + 1; y++) {
        const pos = { x, y }
        const key = positionToKey(pos)
        const tile = newTiles.get(key)
        
        // Only affect unrevealed tiles that are within board bounds
        if (tile && !tile.revealed) {
          // Pick one of the three non-owners at random to exclude
          const allOwners: ('player' | 'rival' | 'neutral' | 'mine')[] = ['player', 'rival', 'neutral', 'mine']
          const nonOwners = allOwners.filter(owner => owner !== tile.owner)
          
          if (nonOwners.length > 0) {
            // Pick 1 random owner to exclude from possibilities
            const excludedOwner = nonOwners[Math.floor(Math.random() * nonOwners.length)]
            const possibleOwners = new Set(allOwners.filter(owner => owner !== excludedOwner))
            
            // Add or update owner subset annotation
            const existingSubsetAnnotation = tile.annotations.find(a => a.type === 'owner_subset')
            const otherAnnotations = tile.annotations.filter(a => a.type !== 'owner_subset')
            
            let finalOwnerSet = possibleOwners
            if (existingSubsetAnnotation && existingSubsetAnnotation.ownerSubset) {
              // Combine with existing subset (intersection)
              finalOwnerSet = new Set()
              for (const owner of existingSubsetAnnotation.ownerSubset) {
                if (possibleOwners.has(owner)) {
                  finalOwnerSet.add(owner)
                }
              }
            }
            
            const newAnnotations: TileAnnotation[] = [
              ...otherAnnotations,
              {
                type: 'owner_subset',
                ownerSubset: finalOwnerSet
              }
            ]
            
            const updatedTile = {
              ...tile,
              annotations: newAnnotations
            }
            
            newTiles.set(key, updatedTile)
          }
        }
      }
    }
    
    currentState = {
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    }
  }
  
  return currentState
}