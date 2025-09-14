import { Position } from '../types'

interface PromptWidgetProps {
  targetingInfo: { count: number; description: string; selected: Position[] } | null
}

export function PromptWidget({ targetingInfo }: PromptWidgetProps) {
  const displayText = targetingInfo 
    ? targetingInfo.description 
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
      justifyContent: 'center',
      margin: '20px auto',
      maxWidth: '600px',
      border: '2px solid #74b9ff'
    }}>
      {displayText}
    </div>
  )
}