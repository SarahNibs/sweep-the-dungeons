import { GameState, Position, Card } from '../../types'
import { getTile, revealTileWithResult } from '../boardSystem'
import { addOwnerSubsetAnnotation, checkGameStatus, trackPlayerTileReveal } from '../cardEffects'
import { createCard } from '../gameRepository'

/**
 * Fetch card effect: check a tile and all tiles in a direction,
 * find most common owner, reveal all of that owner, annotate rest
 */
export function executeFetchEffect(state: GameState, start: Position, card?: Card): GameState {
  if (!card) return state

  // Extract direction from card name
  const direction = extractDirection(card.name)
  if (!direction) {
    console.error(`❌ Could not extract direction from Fetch card: ${card.name}`)
    return state
  }

  console.log(`🎾 FETCH EFFECT - Start: (${start.x}, ${start.y}), Direction: ${direction}, Enhanced: ${card.enhanced}`)

  const checked: Position[] = []
  const ownerCounts = new Map<'player' | 'rival' | 'neutral' | 'mine', number>()

  // Get direction offset
  const offset = getDirectionOffset(direction)

  // Check the starting tile first
  const startTile = getTile(state.board, start)
  if (startTile && !startTile.revealed) {
    // Unrevealed tiles can only be player, neutral, rival, or mine (never empty)
    const owner = startTile.owner as 'player' | 'rival' | 'neutral' | 'mine'
    checked.push({ ...start })
    ownerCounts.set(owner, (ownerCounts.get(owner) || 0) + 1)
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
      // Unrevealed tiles can only be player, neutral, rival, or mine (never empty)
      const owner = tile.owner as 'player' | 'rival' | 'neutral' | 'mine'
      checked.push({ ...current })
      ownerCounts.set(owner, (ownerCounts.get(owner) || 0) + 1)
    }
  }

  console.log(`🎾 Checked ${checked.length} tiles, owner counts:`, Object.fromEntries(ownerCounts))

  // Find the most common owner, with tiebreaks to safest (player > neutral > rival > mine)
  const safetyOrder: Array<'player' | 'rival' | 'neutral' | 'mine'> = ['player', 'neutral', 'rival', 'mine']
  let majorityOwner: 'player' | 'rival' | 'neutral' | 'mine' = 'player'
  let maxCount = 0

  for (const owner of safetyOrder) {
    const count = ownerCounts.get(owner) || 0
    if (count > maxCount) {
      maxCount = count
      majorityOwner = owner
    }
  }

  console.log(`🎾 Majority owner: ${majorityOwner} (count: ${maxCount})`)

  // Reveal all tiles with the majority owner
  let newState = state
  let boardState = state.board
  const tilesToReveal: Position[] = []

  for (const pos of checked) {
    const tile = getTile(boardState, pos)
    if (tile && tile.owner === majorityOwner) {
      tilesToReveal.push(pos)
    }
  }

  // Count how many mines will be revealed
  const mineCount = tilesToReveal.filter(pos => {
    const tile = getTile(boardState, pos)
    return tile && tile.owner === 'mine'
  }).length

  console.log(`🎾 Mine count in tiles to reveal: ${mineCount}`)

  // Check if we have enough protections for all mines
  const hasUnderwire = newState.underwireProtection?.active || false
  const hasGrace = newState.activeStatusEffects.some(e => e.type === 'grace')
  const totalProtections = (hasUnderwire ? 1 : 0) + (hasGrace ? 1 : 0)

  console.log(`🎾 Protection check: ${totalProtections} protections available for ${mineCount} mines`)
  console.log(`   - Underwire: ${hasUnderwire}`)
  console.log(`   - Grace: ${hasGrace}`)

  // If we have mines but not enough protections, player loses
  if (mineCount > 0 && totalProtections < mineCount) {
    console.log(`💥 FETCH REVEALED ${mineCount} MINES - Not enough protection (only ${totalProtections})`)

    // Consume all available protections and reveal the mines
    let protectionsLeft = totalProtections
    const partialRevealTiles: Position[] = []
    const revealedPlayerTilePositions: Position[] = []

    for (const pos of tilesToReveal) {
      const tile = getTile(boardState, pos)

      if (tile && tile.owner === 'mine' && protectionsLeft > 0) {
        // Mark this mine as protected
        const result = revealTileWithResult(boardState, pos, 'player')
        boardState = result.board

        if (result.revealed) {
          const newTiles = new Map(boardState.tiles)
          const revealedTile = getTile(boardState, pos)
          if (revealedTile) {
            newTiles.set(`${pos.x},${pos.y}`, {
              ...revealedTile,
              underwireProtected: true
            })
            boardState = { ...boardState, tiles: newTiles }
          }
        }

        protectionsLeft--
        console.log(`🛡️ Protected mine at (${pos.x}, ${pos.y}) - ${protectionsLeft} protections left`)
      } else {
        // Normal reveal
        const result = revealTileWithResult(boardState, pos, 'player')
        boardState = result.board

        // Track player tile reveals
        if (result.revealed && tile && tile.owner === 'player') {
          revealedPlayerTilePositions.push(pos)
        }

        if (!result.revealed) {
          partialRevealTiles.push(pos)
          console.log(`🎾 Partial reveal at (${pos.x}, ${pos.y}) - goblin moved or dirt cleaned`)
        }
      }
    }

    // Update state with revealed player tiles
    newState = {
      ...newState,
      board: boardState
    }
    for (const pos of revealedPlayerTilePositions) {
      newState = trackPlayerTileReveal(newState, pos, true)
    }

    // Consume the protections from state
    if (hasUnderwire && totalProtections >= 1) {
      newState = {
        ...newState,
        underwireProtection: null,
        underwireUsedThisTurn: true
      }
      // Remove underwire status effect
      newState = {
        ...newState,
        activeStatusEffects: newState.activeStatusEffects.filter(e => e.type !== 'underwire_protection')
      }
      console.log(`🛡️ Consumed Underwire protection`)
    }
    if (hasGrace && totalProtections >= 2) {
      // Remove grace status effect and add 1 Evidence to discard, 1 to top of draw pile
      const evidenceCard1 = createCard('Evidence')
      const evidenceCard2 = createCard('Evidence')
      newState = {
        ...newState,
        activeStatusEffects: newState.activeStatusEffects.filter(e => e.type !== 'grace'),
        discard: [...newState.discard, evidenceCard1],
        deck: [...newState.deck, evidenceCard2] // Push to end = top of deck for drawing
      }
      console.log(`🛡️ Consumed Grace protection - 1 Evidence added to discard, 1 to top of draw pile`)
    }

    newState = { ...newState, board: boardState }

    // Player loses because not all mines were protected
    console.log(`💥 GAME OVER - Fetch revealed unprotected mines`)
    const gameStatus = checkGameStatus(newState)
    newState = { ...newState, gameStatus }

    // Annotate partial reveals
    for (const pos of partialRevealTiles) {
      const tile = getTile(newState.board, pos)
      if (tile && !tile.revealed) {
        const ownerSet = new Set<'player' | 'rival' | 'neutral' | 'mine'>([tile.owner as 'player' | 'rival' | 'neutral' | 'mine'])
        console.log(`🎾 Annotating partial reveal tile at (${pos.x}, ${pos.y}) as ${tile.owner}`)
        newState = addOwnerSubsetAnnotation(newState, pos, ownerSet)
      }
    }

    return newState
  }

  // We have enough protections - mark all mines as protected before revealing
  if (mineCount > 0) {
    console.log(`🛡️ FETCH: Enough protections available - marking ${mineCount} mines as protected`)
  }

  // Reveal all majority owner tiles, track which ones were actually revealed
  const partialRevealTiles: Position[] = []
  const revealedPlayerTilePositions: Position[] = []
  let protectionsUsed = 0

  for (const pos of tilesToReveal) {
    const tile = getTile(boardState, pos)
    const result = revealTileWithResult(boardState, pos, 'player')
    boardState = result.board

    // Track player tile reveals
    if (result.revealed && tile && tile.owner === 'player') {
      revealedPlayerTilePositions.push(pos)
    }

    // If this was a mine that was revealed, mark it as protected
    if (tile && tile.owner === 'mine' && result.revealed) {
      const newTiles = new Map(boardState.tiles)
      const revealedTile = getTile(boardState, pos)
      if (revealedTile) {
        newTiles.set(`${pos.x},${pos.y}`, {
          ...revealedTile,
          underwireProtected: true
        })
        boardState = { ...boardState, tiles: newTiles }
        protectionsUsed++
        console.log(`🛡️ Marked mine at (${pos.x}, ${pos.y}) as protected`)
      }
    }

    // If tile was not actually revealed (goblin moved or dirt cleaned), track it for annotation
    if (!result.revealed) {
      partialRevealTiles.push(pos)
      console.log(`🎾 Partial reveal at (${pos.x}, ${pos.y}) - goblin moved or dirt cleaned`)
    }
  }

  // Consume the protections we used
  if (protectionsUsed > 0) {
    console.log(`🛡️ Consuming ${protectionsUsed} protections`)

    if (hasUnderwire) {
      newState = {
        ...newState,
        underwireProtection: null,
        underwireUsedThisTurn: true
      }
      // Remove underwire status effect
      newState = {
        ...newState,
        activeStatusEffects: newState.activeStatusEffects.filter(e => e.type !== 'underwire_protection')
      }
      console.log(`🛡️ Consumed Underwire protection`)
    }

    if (protectionsUsed > 1 && hasGrace) {
      // Remove grace status effect and add 1 Evidence to discard, 1 to top of draw pile
      const evidenceCard1 = createCard('Evidence')
      const evidenceCard2 = createCard('Evidence')
      newState = {
        ...newState,
        activeStatusEffects: newState.activeStatusEffects.filter(e => e.type !== 'grace'),
        discard: [...newState.discard, evidenceCard1],
        deck: [...newState.deck, evidenceCard2] // Push to end = top of deck for drawing
      }
      console.log(`🛡️ Consumed Grace protection - 1 Evidence added to discard, 1 to top of draw pile`)
    }
  }

  newState = { ...newState, board: boardState }

  // Annotate tiles that were partially revealed with their actual owner
  for (const pos of partialRevealTiles) {
    const tile = getTile(newState.board, pos)
    if (tile && !tile.revealed) {
      // We know the tile's owner from our earlier check - annotate it
      const ownerSet = new Set<'player' | 'rival' | 'neutral' | 'mine'>([tile.owner as 'player' | 'rival' | 'neutral' | 'mine'])
      console.log(`🎾 Annotating partial reveal tile at (${pos.x}, ${pos.y}) as ${tile.owner}`)
      newState = addOwnerSubsetAnnotation(newState, pos, ownerSet)
    }
  }

  // Check game status after reveals (to detect win condition)
  const gameStatus = checkGameStatus(newState)
  newState = { ...newState, gameStatus }

  // If majority owner is not player, set flag to end turn (like neutral/rival/mine reveals)
  // Exception: neutral with Frilly Dress on first turn with 4-neutral limit
  if (majorityOwner !== 'player') {
    const hasFrillyDress = newState.equipment.some(r => r.name === 'Frilly Dress')

    // If we revealed neutrals, update the counter and check limit
    if (majorityOwner === 'neutral' && hasFrillyDress && newState.isFirstTurn) {
      // Count how many neutrals were actually revealed (not just checked)
      const neutralsRevealed = tilesToReveal.filter(pos => {
        const tile = getTile(newState.board, pos)
        return tile && tile.revealed && tile.owner === 'neutral'
      }).length

      // Update the counter
      const newNeutralsCount = newState.neutralsRevealedThisTurn + neutralsRevealed
      newState = {
        ...newState,
        neutralsRevealedThisTurn: newNeutralsCount
      }

      // Check if we're still within the limit (Tea removes the limit)
      const hasTea = newState.equipment.some(r => r.name === 'Tea')
      const withinLimit = hasTea || newNeutralsCount <= 4

      if (!withinLimit) {
        console.log(`🎾 Revealed ${neutralsRevealed} neutral tiles (total: ${newNeutralsCount}) - exceeded 4-neutral limit, turn should end`)
        newState = {
          ...newState,
          fetchRevealedNonPlayer: true
        }
      } else {
        console.log(`🎾 Revealed ${neutralsRevealed} neutral tiles (total: ${newNeutralsCount}) - within 4-neutral limit, turn continues`)
      }
    } else {
      // Non-neutral or no Frilly Dress - always end turn
      console.log(`🎾 Revealed ${majorityOwner} tiles - turn should end`)
      newState = {
        ...newState,
        fetchRevealedNonPlayer: true
      }
    }
  }

  // Annotate the other checked tiles (they can't be the majority owner)
  for (const pos of checked) {
    const tile = getTile(state.board, pos)
    if (tile && tile.owner !== majorityOwner && !tile.revealed) {
      // This tile can be any owner except the majority owner
      const possibleOwners = new Set<'player' | 'rival' | 'neutral' | 'mine'>([
        'player',
        'rival',
        'neutral',
        'mine'
      ])
      possibleOwners.delete(majorityOwner)
      newState = addOwnerSubsetAnnotation(newState, pos, possibleOwners)
    }
  }

  // If enhanced, draw a card
  if (card.enhanced) {
    console.log(`🎾 Enhanced Fetch - drawing a card`)
    // Draw from deck
    if (newState.deck.length > 0) {
      const drawnCard = newState.deck[0]
      newState = {
        ...newState,
        deck: newState.deck.slice(1),
        hand: [...newState.hand, drawnCard]
      }
    } else if (newState.discard.length > 0) {
      // If deck is empty, shuffle discard into deck then draw
      const shuffledDiscard = [...newState.discard].sort(() => Math.random() - 0.5)
      const drawnCard = shuffledDiscard[0]
      newState = {
        ...newState,
        deck: shuffledDiscard.slice(1),
        discard: [],
        hand: [...newState.hand, drawnCard]
      }
    }
  }

  // Track all player tile reveals
  for (const pos of revealedPlayerTilePositions) {
    newState = trackPlayerTileReveal(newState, pos, true)
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
