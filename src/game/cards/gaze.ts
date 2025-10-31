import { GameState, Position, Card } from '../../types'
import { getTile } from '../boardSystem'
import { addOwnerSubsetAnnotation } from '../cardEffects'

/**
 * Gaze card effect: search in a direction for rival tiles (and mines if enhanced)
 * Each Gaze card has a fixed direction encoded in its name
 */
export function executeGazeEffect(state: GameState, start: Position, card?: Card): GameState {
  if (!card) return state

  // Extract direction from card name
  const direction = extractDirection(card.name)
  if (!direction) {
    console.error(`❌ Could not extract direction from Gaze card: ${card.name}`)
    return state
  }

  console.log(`👀 GAZE EFFECT - Start: (${start.x}, ${start.y}), Direction: ${direction}, Enhanced: ${card.enhanced}`)

  const checked: Position[] = []
  let foundRival: Position | null = null
  let foundMine: Position | null = null
  let foundRivalIndex = -1  // Track when we found rival in the search order
  let foundMineIndex = -1   // Track when we found mine in the search order

  // Get direction offset
  const offset = getDirectionOffset(direction)

  // Check the starting tile first
  const startTile = getTile(state.board, start)
  if (startTile && !startTile.revealed) {
    checked.push({ ...start })
    if (!foundRival && startTile.owner === 'rival') {
      foundRival = { ...start }
      foundRivalIndex = checked.length - 1
      if (!card.enhanced) {
        // Base version stops immediately if starting tile is rival
        console.log(`👀 Checked 1 tile (starting tile), foundRival: yes`)

        // Annotate the found rival
        const rivalSet = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['rival'])
        return addOwnerSubsetAnnotation(state, foundRival, rivalSet)
      }
    }
    if (card.enhanced && !foundMine && startTile.owner === 'mine') {
      foundMine = { ...start }
      foundMineIndex = checked.length - 1
    }
  }

  // Search in the direction until we hit board edge
  let current: Position = { ...start }
  while (true) {
    // Move in direction
    current = { x: current.x + offset.dx, y: current.y + offset.dy }

    // Check if out of bounds
    const tile = getTile(state.board, current)
    if (!tile) break

    // Only check unrevealed tiles
    if (!tile.revealed) {
      checked.push({ ...current })

      // Check for rival
      if (!foundRival && tile.owner === 'rival') {
        foundRival = { ...current }
        foundRivalIndex = checked.length - 1
        if (!card.enhanced) break // Base version stops after finding rival
      }

      // Check for mine (only if enhanced)
      if (card.enhanced && !foundMine && tile.owner === 'mine') {
        foundMine = { ...current }
        foundMineIndex = checked.length - 1
      }

      // Enhanced stops when both are found (or we hit edge)
      if (card.enhanced && foundRival && foundMine) break
    }
  }

  console.log(`👀 Checked ${checked.length} tiles, foundRival: ${foundRival ? 'yes' : 'no'}, foundMine: ${foundMine ? 'yes' : 'no'}`)

  let newState = state

  // Annotate found rival tile
  if (foundRival) {
    const rivalSet = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['rival'])
    newState = addOwnerSubsetAnnotation(newState, foundRival, rivalSet)
  }

  // Annotate found mine tile (if enhanced)
  if (card.enhanced && foundMine) {
    const mineSet = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['mine'])
    newState = addOwnerSubsetAnnotation(newState, foundMine, mineSet)
  }

  // Annotate all checked tiles that weren't found as rival/mine
  for (let i = 0; i < checked.length; i++) {
    const pos = checked[i]

    // Skip the found tiles (they already have more specific annotations)
    if (foundRival && pos.x === foundRival.x && pos.y === foundRival.y) continue
    if (foundMine && pos.x === foundMine.x && pos.y === foundMine.y) continue

    // Build possible owners based on what we know
    const possibleOwners = new Set<'player' | 'rival' | 'neutral' | 'mine'>([
      'player',
      'neutral'
    ])

    if (!card.enhanced) {
      // Base version: doesn't search for mines, so mines are always possible
      // We only search for rival, so all checked tiles before the found rival are definitely not rival
      possibleOwners.add('mine')
    } else {
      // Enhanced version: searches for BOTH rival and mine
      // Key insight: we only mark the FIRST rival and FIRST mine
      // So tiles checked AFTER finding one could be another instance of that type

      // If we found a rival and this tile comes after it, it could be another rival
      if (foundRivalIndex >= 0 && i > foundRivalIndex) {
        possibleOwners.add('rival')
      }

      // If we found a mine and this tile comes after it, it could be another mine
      if (foundMineIndex >= 0 && i > foundMineIndex) {
        possibleOwners.add('mine')
      }

      // If we haven't found a rival yet, or this tile is before the found rival, it's definitely not rival
      // (already excluded by not adding it above)

      // If we haven't found a mine yet, or this tile is before the found mine, it's definitely not mine
      // (already excluded by not adding it above)
    }

    newState = addOwnerSubsetAnnotation(newState, pos, possibleOwners)
  }

  return newState
}

function extractDirection(cardName: string): 'up' | 'down' | 'left' | 'right' | null {
  if (cardName.includes('↑')) return 'up'
  if (cardName.includes('↓')) return 'down'
  if (cardName.includes('←')) return 'left'
  if (cardName.includes('→')) return 'right'
  return null
}

function getDirectionOffset(direction: 'up' | 'down' | 'left' | 'right'): { dx: number; dy: number } {
  switch (direction) {
    case 'up': return { dx: 0, dy: -1 }
    case 'down': return { dx: 0, dy: 1 }
    case 'left': return { dx: -1, dy: 0 }
    case 'right': return { dx: 1, dy: 0 }
  }
}
