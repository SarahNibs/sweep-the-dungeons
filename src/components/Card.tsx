import { Card as CardType } from '../types'

interface CardProps {
  card: CardType
  onClick: (cardId: string) => void
  isPlayable: boolean
}

export function Card({ card, onClick, isPlayable }: CardProps) {
  const handleClick = () => {
    if (isPlayable) {
      onClick(card.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        width: '80px',
        height: '100px',
        border: `2px solid ${isPlayable ? '#333' : '#ccc'}`,
        borderRadius: '6px',
        padding: '4px',
        margin: '2px',
        backgroundColor: isPlayable ? '#f5f5f5' : '#e9e9e9',
        cursor: isPlayable ? 'pointer' : 'not-allowed',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.1s, box-shadow 0.1s',
        opacity: isPlayable ? 1 : 0.6
      }}
      onMouseEnter={(e) => {
        if (isPlayable) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
        }
      }}
      onMouseLeave={(e) => {
        if (isPlayable) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      <div>
        <h3 style={{ 
          margin: '0 0 4px 0', 
          fontSize: '10px', 
          fontWeight: 'bold',
          lineHeight: '1.1'
        }}>
          {card.name}
        </h3>
      </div>
      <div style={{
        backgroundColor: isPlayable ? '#007bff' : '#6c757d',
        color: 'white',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
        alignSelf: 'flex-end'
      }}>
        {card.cost}
      </div>
    </div>
  )
}