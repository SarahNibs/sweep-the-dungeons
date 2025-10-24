import { Relic } from '../types'
import { getRelicIcon } from '../game/gameRepository'
import { Tooltip } from './Tooltip'

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
        <Tooltip key={index} text={relic.hoverText} style={{ display: 'inline-block' }}>
          <div
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
          >
            {getRelicIcon(relic.name)}
          </div>
        </Tooltip>
      ))}
    </div>
  )
}