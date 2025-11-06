import { Position, GameStatusInfo } from '../types'
import { getLevelConfig } from '../game/levelSystem'

interface PromptWidgetProps {
  targetingInfo: { count: number; description: string; selected: Position[] } | null
  onCancel: () => void
  gameStatus: GameStatusInfo
  currentLevel: string
  onAdvanceLevel?: () => void
  isEspressoForcedPlay?: boolean
}

export function PromptWidget({ targetingInfo, onCancel, gameStatus, currentLevel, onAdvanceLevel, isEspressoForcedPlay }: PromptWidgetProps) {
  const levelConfig = getLevelConfig(currentLevel)
  const levelNumber = levelConfig?.levelNumber || currentLevel
  
  const getDisplayText = () => {
    if (gameStatus.status === 'player_won') {
      const rivalLeft = gameStatus.rivalTilesLeft || 0
      const isGameWon = levelConfig?.uponFinish?.winTheGame || false
      
      if (isGameWon) {
        return `🎉 GAME WON! All floors complete! 🎉`
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
      return `${targetingInfo.description} (${targetingInfo.selected.length}/${targetingInfo.count})`
    } else {
      return `Floor ${levelNumber}: sweep, sweep`
    }
  }
  
  const displayText = getDisplayText()

  const getBackgroundColor = () => {
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
      justifyContent: (targetingInfo && gameStatus.status === 'playing') || (gameStatus.status === 'player_won') ? 'space-between' : 'center',
      margin: '20px 0',
      width: '100%',
      border: '2px solid #74b9ff',
      gap: (targetingInfo && gameStatus.status === 'playing') || (gameStatus.status === 'player_won') ? '20px' : '0'
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
    </div>
  )
}