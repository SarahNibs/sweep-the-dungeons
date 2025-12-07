import { GameState, Position } from '../../types'
import { positionToKey, canPlayerRevealInnerTile } from '../boardSystem'
import { addOwnerSubsetAnnotation } from '../cardEffects'

export function executeBrushEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  // Get 3x3 area around target position
  const centerX = target.x
  const centerY = target.y

  let currentState = state

  // Enhanced Brush applies the effect twice (two separate random exclusions per tile)
  const iterations = card?.enhanced ? 2 : 1

  for (let iteration = 0; iteration < iterations; iteration++) {
    // For each tile in 3x3 area
    for (let x = centerX - 1; x <= centerX + 1; x++) {
      for (let y = centerY - 1; y <= centerY + 1; y++) {
        const pos = { x, y }
        const key = positionToKey(pos)
        const tile = currentState.board.tiles.get(key)

        // Only affect unrevealed, accessible tiles that are within board bounds
        // Skip inaccessible inner tiles (treat them as if they don't exist)
        if (tile && !tile.revealed && canPlayerRevealInnerTile(currentState.board, pos)) {
          // Pick one of the three non-owners at random to exclude
          const allOwners: ('player' | 'rival' | 'neutral' | 'mine')[] = ['player', 'rival', 'neutral', 'mine']
          const nonOwners = allOwners.filter(owner => owner !== tile.owner)

          if (nonOwners.length > 0) {
            // Pick 1 random owner to exclude from possibilities
            const excludedOwner = nonOwners[Math.floor(Math.random() * nonOwners.length)]
            const possibleOwners = new Set(allOwners.filter(owner => owner !== excludedOwner))

            currentState = addOwnerSubsetAnnotation(currentState, pos, possibleOwners)
          }
        }
      }
    }
  }

  return currentState
}