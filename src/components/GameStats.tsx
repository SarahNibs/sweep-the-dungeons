interface GameStatsProps {
  selectedCardName: string | null
  energy: number
  maxEnergy: number
}

export function GameStats({ selectedCardName, energy, maxEnergy }: GameStatsProps) {
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
      
      {selectedCardName && (
        <div style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#007bff'
        }}>
          Played: {selectedCardName}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#ffc107',
          color: 'black',
          borderRadius: '4px',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          Energy: {energy}/{maxEnergy}
        </div>
      </div>
    </div>
  )
}