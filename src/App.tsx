import { useGameStore } from './store'
import { GameStats } from './components/GameStats'
import { Hand } from './components/Hand'

function App() {
  const { 
    deck, 
    hand, 
    discard, 
    selectedCardName, 
    energy,
    maxEnergy,
    playCard, 
    endTurn, 
    resetGame,
    canPlayCard
  } = useGameStore()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#e9ecef',
      padding: '20px'
    }}>
      <GameStats
        deckCount={deck.length}
        discardCount={discard.length}
        selectedCardName={selectedCardName}
        energy={energy}
        maxEnergy={maxEnergy}
      />
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        margin: '20px 0'
      }}>
        <button
          onClick={endTurn}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          End Turn
        </button>
        <button
          onClick={resetGame}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset Game
        </button>
      </div>

      <Hand cards={hand} onCardClick={playCard} canPlayCard={canPlayCard} />
    </div>
  )
}

export default App