import { GameState, Card } from '../../types'
import { generatePlayerSolidClue } from '../clueSystem'
import { addClueResult } from '../cardEffects'
import { positionToKey } from '../boardSystem'

export function executeSolidClueEffect(state: GameState, card?: Card): GameState {
  const enhanced = card?.enhanced || false
  const result = generatePlayerSolidClue(state, state.clueCounter + 1, state.playerClueCounter + 1, enhanced)

  let newState = {
    ...state,
    clueCounter: state.clueCounter + 1,
    playerClueCounter: state.playerClueCounter + 1
  }

  // Collect all affected tile positions for enhanced annotation
  const affectedPositions: Set<string> = new Set()

  // Use the clueResultPairs to properly match each ClueResult to its target position
  if (result.clueResultPairs) {
    for (const { clueResult, targetPosition } of result.clueResultPairs) {
      newState = addClueResult(newState, targetPosition, clueResult)
      affectedPositions.add(positionToKey(targetPosition))
    }
  } else {
    for (const clueResult of result.clueResults) {
      if (clueResult.allAffectedTiles.length > 0) {
        newState = addClueResult(newState, clueResult.allAffectedTiles[0], clueResult)
        affectedPositions.add(positionToKey(clueResult.allAffectedTiles[0]))
      }
    }
  }

  // Enhanced Imperious Instructions: add owner_subset annotation (excludes mines)
  if (enhanced && affectedPositions.size > 0) {
    console.log('🔍 ENHANCED IMPERIOUS ORDERS: Adding no-mine annotation to', affectedPositions.size, 'tiles')
    const newTiles = new Map(newState.board.tiles)
    const noMineSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'rival', 'neutral'])

    affectedPositions.forEach(key => {
      const tile = newTiles.get(key)
      if (tile && !tile.revealed) {
        // Find existing owner_subset annotation if any
        const existingSubset = tile.annotations.find(a => a.type === 'owner_subset')
        const otherAnnotations = tile.annotations.filter(a => a.type !== 'owner_subset')

        let finalSubset: Set<'player' | 'rival' | 'neutral' | 'mine'>
        if (existingSubset?.ownerSubset) {
          // Intersect with existing subset
          finalSubset = new Set()
          for (const owner of noMineSubset) {
            if (existingSubset.ownerSubset.has(owner)) {
              finalSubset.add(owner)
            }
          }
        } else {
          finalSubset = noMineSubset
        }

        // Only add if non-empty
        if (finalSubset.size > 0) {
          newTiles.set(key, {
            ...tile,
            annotations: [...otherAnnotations, { type: 'owner_subset', ownerSubset: finalSubset }]
          })
        }
      }
    })

    newState = {
      ...newState,
      board: {
        ...newState.board,
        tiles: newTiles
      }
    }
  }

  return newState
}