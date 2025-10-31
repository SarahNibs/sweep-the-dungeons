import { GameState, Position, Tile } from '../../types'
import { getTile } from '../boardSystem'
import { revealTileWithRelicEffects, addOwnerSubsetAnnotation } from '../cardEffects'

export function executeQuantumEffect(state: GameState, targets: Position[]): GameState {
  // Get all valid tiles
  const validTiles = targets
    .map(pos => ({ pos, tile: getTile(state.board, pos) }))
    .filter(({ tile }) => tile && !tile.revealed)
  
  if (validTiles.length === 0) return state
  
  // Determine which is safer (player > neutral > rival > mine)
  const getSafety = (tile: Tile): number => {
    switch (tile.owner) {
      case 'player': return 4
      case 'neutral': return 3  
      case 'rival': return 2
      case 'mine': return 1
      default: return 0
    }
  }
  
  // Find the safest tile(s)
  const tilesWithSafety = validTiles.map(({ pos, tile }) => ({
    pos,
    tile: tile!,
    safety: getSafety(tile!)
  }))
  
  const maxSafety = Math.max(...tilesWithSafety.map(t => t.safety))
  const safestTiles = tilesWithSafety.filter(t => t.safety === maxSafety)
  
  // If multiple tiles have same safety, choose randomly
  const chosenTile = safestTiles[Math.floor(Math.random() * safestTiles.length)]
  
  // Reveal the chosen tile (controllable - player chose to play Easiest)
  // BUG FIX: Changed from false to true so mines properly end turn/game and use protection
  const stateAfterReveal = revealTileWithRelicEffects(state, chosenTile.pos, 'player', true)

  // Check if the chosen tile was actually revealed or just cleaned (dirty tile case)
  const chosenTileAfterReveal = getTile(stateAfterReveal.board, chosenTile.pos)
  const wasActuallyRevealed = chosenTileAfterReveal?.revealed || false

  // BUG FIX: If tile was just cleaned (not revealed), annotate it with owner subset
  let stateAfterChosenTileAnnotation = stateAfterReveal
  if (!wasActuallyRevealed && chosenTileAfterReveal && chosenTileAfterReveal.owner !== 'empty') {
    // Tile was cleaned but not revealed - add owner annotation showing it's the safest
    const chosenOwnerSet = new Set<'player' | 'rival' | 'neutral' | 'mine'>([chosenTileAfterReveal.owner])
    stateAfterChosenTileAnnotation = addOwnerSubsetAnnotation(stateAfterReveal, chosenTile.pos, chosenOwnerSet)
  }

  // Add annotations to the non-revealed tiles
  const nonRevealedTiles = validTiles.filter(({ pos }) =>
    pos.x !== chosenTile.pos.x || pos.y !== chosenTile.pos.y
  )
  
  // Quantum reveals the safest tile, so unrevealed tiles are AT MOST as safe as revealed tile
  const revealedSafety = chosenTile.safety
  const possibleOwners = new Set<'player' | 'rival' | 'neutral' | 'mine'>()
  
  // Add all owner types that are at most as safe as the revealed tile
  if (revealedSafety >= 1) possibleOwners.add('mine')   // mine = 1
  if (revealedSafety >= 2) possibleOwners.add('rival')      // rival = 2
  if (revealedSafety >= 3) possibleOwners.add('neutral')    // neutral = 3
  if (revealedSafety >= 4) possibleOwners.add('player')     // player = 4

  // Apply annotation to all non-revealed tiles
  let finalState = stateAfterChosenTileAnnotation
  for (const { pos } of nonRevealedTiles) {
    finalState = addOwnerSubsetAnnotation(finalState, pos, possibleOwners)
  }

  return finalState
}