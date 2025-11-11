import { getCardHelp, getEquipmentHelp } from '../itemHelpText'

interface ItemHelpModalProps {
  itemName: string
  itemType: 'card' | 'equipment'
  onClose: () => void
}

export function ItemHelpModal({ itemName, itemType, onClose }: ItemHelpModalProps) {
  const helpText = itemType === 'card' ? getCardHelp(itemName) : getEquipmentHelp(itemName)

  // Simple markdown-ish rendering
  const renderHelpText = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('# ')) {
        return (
          <h2 key={index} style={{
            color: '#e2e8f0',
            marginBottom: '16px',
            marginTop: index > 0 ? '20px' : '0',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {line.substring(2)}
          </h2>
        )
      }

      // Bold text
      if (line.includes('**')) {
        const parts = line.split('**')
        return (
          <p key={index} style={{
            color: '#e2e8f0',
            marginBottom: '12px',
            lineHeight: '1.6'
          }}>
            {parts.map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        )
      }

      // Empty lines
      if (line.trim() === '') {
        return <div key={index} style={{ height: '8px' }} />
      }

      // Normal text
      return (
        <p key={index} style={{
          color: '#e2e8f0',
          marginBottom: '12px',
          lineHeight: '1.6'
        }}>
          {line}
        </p>
      )
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000 // Higher than other modals
      }}
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault() // Prevent right-click menu on the overlay
        onClose()
      }}
    >
      <div
        style={{
          backgroundColor: '#2d3748',
          borderRadius: '8px',
          padding: '30px',
          border: '2px solid #4a5568',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80%',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()} // Prevent right-click from closing when on content
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '30px',
            height: '30px',
            backgroundColor: '#4a5568',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          ✕
        </button>

        <div>
          {renderHelpText(helpText)}
        </div>

        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #4a5568',
          color: '#a0aec0',
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          Right-click any card or equipment for detailed help. Click anywhere outside this window to close.
        </div>
      </div>
    </div>
  )
}
