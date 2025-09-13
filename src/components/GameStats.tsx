interface GameStatsProps {
  deckCount: number
  discardCount: number
  selectedCardName: string | null
  energy: number
  maxEnergy: number
}

export function GameStats({ deckCount, discardCount, selectedCardName, energy, maxEnergy }: GameStatsProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h1 style={{ margin: '0', color: '#333' }}>Sweep The Dungeons</h1>
      
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#007bff'
      }}>
        {selectedCardName ? `Played: ${selectedCardName}` : 'Select a card to play'}
      </div>
      
      <div style={{
        display: 'flex',
        gap: '24px',
        fontSize: '16px'
      }}>
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#ffc107',
          color: 'black',
          borderRadius: '4px',
          fontWeight: 'bold'
        }}>
          Energy: {energy}/{maxEnergy}
        </div>
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#28a745',
          color: 'white',
          borderRadius: '4px'
        }}>
          Deck: {deckCount}
        </div>
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#6c757d',
          color: 'white',
          borderRadius: '4px'
        }}>
          Discard: {discardCount}
        </div>
      </div>
    </div>
  )
}