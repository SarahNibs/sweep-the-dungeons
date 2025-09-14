interface GameStatsProps {
  selectedCardName: string | null
  currentPlayer: 'player' | 'enemy'
}

export function GameStats({ selectedCardName, currentPlayer }: GameStatsProps) {
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
        padding: '8px 16px',
        backgroundColor: currentPlayer === 'player' ? '#28a745' : '#dc3545',
        color: 'white',
        borderRadius: '4px',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        {currentPlayer === 'player' ? 'Your Turn' : 'Enemy Turn'}
      </div>
      
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
    </div>
  )
}