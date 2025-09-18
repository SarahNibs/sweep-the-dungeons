import { Relic } from '../types'

interface RelicDisplayProps {
  relics: Relic[]
}

export function RelicDisplay({ relics }: RelicDisplayProps) {
  if (relics.length === 0) {
    return null
  }

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      marginBottom: '10px'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#74b9ff',
        marginRight: '5px'
      }}>
        Relics:
      </div>
      
      {relics.map((relic, index) => (
        <div
          key={index}
          style={{
            width: '40px',
            height: '40px',
            border: '2px solid #74b9ff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            backgroundColor: 'rgba(116, 185, 255, 0.1)',
            cursor: 'pointer'
          }}
          title={relic.hoverText}
        >
          {getRelicIcon(relic.name)}
        </div>
      ))}
    </div>
  )
}

function getRelicIcon(relicName: string): string {
  switch (relicName) {
    case 'Double Broom':
      return '🧹'
    case 'Dust Bunny':
      return '🐰'
    case 'Frilly Dress':
      return '👗'
    default:
      return '✨'
  }
}