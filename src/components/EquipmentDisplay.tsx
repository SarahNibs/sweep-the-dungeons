import { Equipment } from '../types'
import { getEquipmentIcon } from '../game/gameRepository'
import { Tooltip } from './Tooltip'

interface EquipmentDisplayProps {
  equipment: Equipment[]
}

export function EquipmentDisplay({ equipment }: EquipmentDisplayProps) {
  if (equipment.length === 0) {
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
        Equipment:
      </div>

      {equipment.map((equipment, index) => (
        <Tooltip key={index} text={equipment.hoverText} style={{ display: 'inline-block' }}>
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
            {getEquipmentIcon(equipment.name)}
          </div>
        </Tooltip>
      ))}
    </div>
  )
}