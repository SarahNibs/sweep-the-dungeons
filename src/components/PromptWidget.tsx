import { Position, GameStatusInfo } from '../types'

interface PromptWidgetProps {
  targetingInfo: { count: number; description: string; selected: Position[] } | null
  onCancel: () => void
  gameStatus: GameStatusInfo
}

export function PromptWidget({ targetingInfo, onCancel, gameStatus }: PromptWidgetProps) {
  const getDisplayText = () => {
    if (gameStatus.status === 'player_won') {
      const enemyLeft = gameStatus.enemyTilesLeft || 0
      return `🎉 Victory! ${enemyLeft} enemy tiles left! 🎉`
    } else if (gameStatus.status === 'player_lost') {
      if (gameStatus.reason === 'player_revealed_mine') {
        return "💀 Failure! You revealed a mine! 💀"
      } else if (gameStatus.reason === 'all_enemy_tiles_revealed') {
        return "💀 Failure! All enemy tiles revealed! 💀"
      }
      return "💀 Failure! 💀"
    } else if (targetingInfo) {
      return `${targetingInfo.description} (${targetingInfo.selected.length}/${targetingInfo.count})`
    } else {
      return "sweep, sweep"
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
      justifyContent: (targetingInfo && gameStatus.status === 'playing') ? 'space-between' : 'center',
      margin: '20px 0',
      width: '100%',
      border: '2px solid #74b9ff',
      gap: (targetingInfo && gameStatus.status === 'playing') ? '20px' : '0'
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
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Cancel
        </button>
      )}
    </div>
  )
}