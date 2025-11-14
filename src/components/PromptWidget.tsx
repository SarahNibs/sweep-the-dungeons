import { Position, GameStatusInfo } from '../types'
import { getLevelConfig } from '../game/levelSystem'

interface PromptWidgetProps {
  targetingInfo: { count: number; description: string; selected: Position[] } | null
  onCancel: () => void
  gameStatus: GameStatusInfo
  currentLevel: string
  onAdvanceLevel?: () => void
  isEspressoForcedPlay?: boolean
  saturationConfirmation: { position: Position } | null
  onConfirmSaturation: () => void
  onCancelSaturation: () => void
}

export function PromptWidget({ targetingInfo, onCancel, gameStatus, currentLevel, onAdvanceLevel, isEspressoForcedPlay, saturationConfirmation, onConfirmSaturation, onCancelSaturation }: PromptWidgetProps) {
  const levelConfig = getLevelConfig(currentLevel)
  const levelNumber = levelConfig?.levelNumber || currentLevel

  const getDisplayText = () => {
    if (saturationConfirmation) {
      return 'That tile is ruled out by information on an adjacent tile, are you sure?'
    } else if (gameStatus.status === 'player_won') {
      const rivalLeft = gameStatus.rivalTilesLeft || 0
      const isGameWon = levelConfig?.uponFinish?.winTheGame || false

      if (isGameWon) {
        return `🎉 GAME WON! All floors complete! 🎉`
      } else if (gameStatus.reason === 'rival_revealed_mine') {
        return `🎉 Floor ${levelNumber} Complete! Your rival revealed a mine! ${rivalLeft} rival tiles left! 🎉`
      } else {
        return `🎉 Floor ${levelNumber} Complete! ${rivalLeft} rival tiles left! 🎉`
      }
    } else if (gameStatus.status === 'player_lost') {
      const floorInfo = gameStatus.levelNumber ? ` (Floor ${gameStatus.levelNumber})` : ''
      if (gameStatus.reason === 'player_revealed_mine') {
        return `💀 Failure! You revealed a mine!${floorInfo} 💀`
      } else if (gameStatus.reason === 'all_rival_tiles_revealed') {
        return `💀 Failure! All rival tiles revealed!${floorInfo} 💀`
      }
      return `💀 Failure!${floorInfo} 💀`
    } else if (targetingInfo) {
      // Only show count for multi-target cards (e.g., Scurry with 2 or 3 targets)
      // Single-target cards shouldn't show "(0/1)"
      if (targetingInfo.count > 1) {
        return `${targetingInfo.description} (${targetingInfo.selected.length}/${targetingInfo.count})`
      } else {
        return targetingInfo.description
      }
    } else {
      return `Floor ${levelNumber}: sweep, sweep`
    }
  }
  
  const displayText = getDisplayText()

  const getBackgroundColor = () => {
    if (saturationConfirmation) return '#4a69bd' // Blue for saturation confirmation
    if (gameStatus.status === 'player_won') return '#28a745' // Green for victory
    if (gameStatus.status === 'player_lost') return '#dc3545' // Red for defeat
    return '#636e72' // Default gray
  }
  
  return (
    <div style={{
      backgroundColor: getBackgroundColor(),
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      textAlign: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      minHeight: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: (targetingInfo && gameStatus.status === 'playing') || (gameStatus.status === 'player_won') || saturationConfirmation ? 'space-between' : 'center',
      margin: '20px 0',
      width: '100%',
      border: '2px solid #74b9ff',
      gap: (targetingInfo && gameStatus.status === 'playing') || (gameStatus.status === 'player_won') || saturationConfirmation ? '20px' : '0'
    }}>
      <div style={{ flex: 1 }}>
        {displayText}
      </div>
      
      {targetingInfo && gameStatus.status === 'playing' && (
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: isEspressoForcedPlay ? '#e74c3c' : '#ffc107',
            color: isEspressoForcedPlay ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isEspressoForcedPlay ? 'Skip (costs energy)' : 'Cancel'}
        </button>
      )}
      
      {gameStatus.status === 'player_won' && onAdvanceLevel && !levelConfig?.uponFinish?.winTheGame && (
        <button
          onClick={onAdvanceLevel}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Next Floor
        </button>
      )}

      {saturationConfirmation && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onConfirmSaturation}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Reveal Anyway
          </button>
          <button
            onClick={onCancelSaturation}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}