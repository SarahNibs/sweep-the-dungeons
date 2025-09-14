import { Position } from '../types'

interface PromptWidgetProps {
  targetingInfo: { count: number; description: string; selected: Position[] } | null
  onCancel: () => void
}

export function PromptWidget({ targetingInfo, onCancel }: PromptWidgetProps) {
  const displayText = targetingInfo 
    ? `${targetingInfo.description} (${targetingInfo.selected.length}/${targetingInfo.count})`
    : "sweep, sweep"

  return (
    <div style={{
      backgroundColor: '#636e72',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      textAlign: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      minHeight: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: targetingInfo ? 'space-between' : 'center',
      margin: '20px auto',
      maxWidth: '600px',
      border: '2px solid #74b9ff',
      gap: targetingInfo ? '20px' : '0'
    }}>
      <div style={{ flex: 1 }}>
        {displayText}
      </div>
      
      {targetingInfo && (
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