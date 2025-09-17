import { GameState, Tile, ClueResult, Position } from '../types'
import { prepareEnemyClueSetup, generateEnemyClueWithSharedSetup } from './clueSystem'

export interface EnemyClueSet {
  visible: ClueResult[] // X marks shown to player
  hidden: ClueResult[]  // AI-only information
  visiblePairs: { clueResult: ClueResult, targetPosition: Position }[]
  hiddenPairs: { clueResult: ClueResult, targetPosition: Position }[]
}

export function generateDualEnemyClues(
  state: GameState,
  clueOrder: number,
  clueRowPosition: number
): EnemyClueSet {
  // Share the same tile selection and bag construction
  const { chosenEnemyTiles, chosenRandomTiles } = prepareEnemyClueSetup(state)
  
  // Generate two different clue sets using the same setup but different random draws
  const visibleResult = generateEnemyClueWithSharedSetup(
    chosenEnemyTiles, 
    chosenRandomTiles, 
    clueOrder, 
    clueRowPosition
  )
  
  const hiddenResult = generateEnemyClueWithSharedSetup(
    chosenEnemyTiles, 
    chosenRandomTiles, 
    clueOrder + 1000, // Different ID space to avoid conflicts
    clueRowPosition
  )
  
  return {
    visible: visibleResult.clueResults,
    hidden: hiddenResult.clueResults,
    visiblePairs: visibleResult.clueResultPairs || [],
    hiddenPairs: hiddenResult.clueResultPairs || []
  }
}

export function calculateTilePriorityForAI(
  tile: Tile,
  hiddenEnemyCluesPairs: { clueResult: ClueResult, targetPosition: Position }[]
): number {
  // Only use player clues and hidden enemy clues for AI decisions
  // Completely ignore visible enemy clues (X marks)
  
  let playerScore = 0
  let enemyScore = 0
  
  // Get player clue strength for this tile
  const playerClueAnnotations = tile.annotations.find(a => a.type === 'clue_results')
  if (playerClueAnnotations?.clueResults) {
    playerClueAnnotations.clueResults.forEach(result => {
      if (result.cardType !== 'enemy_clue') {
        playerScore += result.strengthForThisTile
      }
    })
  }
  
  // Get hidden enemy clue strength for this tile using proper mapping
  hiddenEnemyCluesPairs.forEach(({ clueResult, targetPosition }) => {
    if (targetPosition.x === tile.position.x && targetPosition.y === tile.position.y) {
      enemyScore += clueResult.strengthForThisTile
    }
  })
  
  // Prefer tiles that are likely to be enemy tiles based on AI's knowledge
  const priorityScore = enemyScore - Math.max(0, playerScore - 1)
  
  return priorityScore
}

export function selectEnemyTilesToRevealUsingAI(
  state: GameState, 
  hiddenEnemyCluesPairs: { clueResult: ClueResult, targetPosition: Position }[]
): Tile[] {
  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')
  
  if (unrevealedTiles.length === 0) return []
  
  // Calculate priorities using only player clues and hidden enemy clues
  const tilesWithPriority = unrevealedTiles.map(tile => ({
    tile,
    priority: calculateTilePriorityForAI(tile, hiddenEnemyCluesPairs) + Math.random() * 0.01
  }))
  
  // Sort by priority (highest first - most likely to be enemy)
  tilesWithPriority.sort((a, b) => b.priority - a.priority)
  
  // Log the top 4 tiles with their relevant clue information
  console.log('=== ENEMY AI PRIORITY ANALYSIS ===')
  const topFour = tilesWithPriority.slice(0, 4)
  topFour.forEach((item, index) => {
    const tile = item.tile
    const pos = `(${tile.position.x},${tile.position.y})`
    const owner = tile.owner
    const priority = item.priority.toFixed(2)
    
    // Get player clue information
    const playerClueAnnotations = tile.annotations.find(a => a.type === 'clue_results')
    let playerClueInfo = 'none'
    if (playerClueAnnotations?.clueResults) {
      const playerClues = playerClueAnnotations.clueResults.filter(r => r.cardType !== 'enemy_clue')
      if (playerClues.length > 0) {
        playerClueInfo = playerClues.map(r => `${r.strengthForThisTile}pips`).join(', ')
      }
    }
    
    // Get hidden enemy clue information
    let enemyClueInfo = 'none'
    const affectedByEnemyClues = hiddenEnemyCluesPairs.filter(({ targetPosition }) => {
      return targetPosition.x === tile.position.x && targetPosition.y === tile.position.y
    })
    if (affectedByEnemyClues.length > 0) {
      enemyClueInfo = affectedByEnemyClues.map(({ clueResult }) => `${clueResult.strengthForThisTile}pips`).join(', ')
    }
    
    console.log(`${index + 1}. ${pos} [${owner}] Priority: ${priority} | Player: ${playerClueInfo} | Enemy-Hidden: ${enemyClueInfo}`)
  })
  console.log('=====================================')
  
  // Return ordered list, stopping when we would reveal a non-enemy tile
  const tilesToReveal: Tile[] = []
  for (const item of tilesWithPriority) {
    tilesToReveal.push(item.tile)
    // Stop after adding a non-enemy tile (this will be the last tile revealed)
    if (item.tile.owner !== 'enemy') {
      break
    }
  }
  
  return tilesToReveal
}

export function applyVisibleEnemyClues(
  state: GameState,
  visiblePairs: { clueResult: ClueResult, targetPosition: Position }[]
): GameState {
  let newState = state
  
  // Use the clueResultPairs to properly match each ClueResult to its target position
  for (const { clueResult, targetPosition } of visiblePairs) {
    const key = `${targetPosition.x},${targetPosition.y}`
    const tile = newState.board.tiles.get(key)
    
    if (tile && !tile.revealed) {
      const existingClueAnnotation = tile.annotations.find(a => a.type === 'clue_results')
      
      let newAnnotations
      if (existingClueAnnotation) {
        // Add to existing clue results
        const updatedClueResults = [...(existingClueAnnotation.clueResults || []), clueResult]
        newAnnotations = tile.annotations.map(a =>
          a.type === 'clue_results'
            ? { ...a, clueResults: updatedClueResults }
            : a
        )
      } else {
        // Create new clue results annotation
        newAnnotations = [
          ...tile.annotations,
          {
            type: 'clue_results' as const,
            clueResults: [clueResult]
          }
        ]
      }
      
      const newTiles = new Map(newState.board.tiles)
      newTiles.set(key, {
        ...tile,
        annotations: newAnnotations
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
  
  return newState
}

export function processEnemyTurnWithDualClues(state: GameState): {
  stateWithVisibleClues: GameState
  hiddenClues: ClueResult[]
  tilesToReveal: Tile[]
} {
  // Generate dual enemy clues
  const dualClues = generateDualEnemyClues(
    state,
    state.enemyClueCounter + 1,
    state.enemyClueCounter + 1
  )
  
  // Apply only visible clues to the game state
  const stateWithVisibleClues = applyVisibleEnemyClues(state, dualClues.visiblePairs)
  
  // Use hidden clues for AI decision making
  const tilesToReveal = selectEnemyTilesToRevealUsingAI(stateWithVisibleClues, dualClues.hiddenPairs)
  
  return {
    stateWithVisibleClues: {
      ...stateWithVisibleClues,
      enemyClueCounter: stateWithVisibleClues.enemyClueCounter + 1
    },
    hiddenClues: dualClues.hidden,
    tilesToReveal
  }
}