import React from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, size = 'md', children, style }) {
  if (!open) return null

  const sizes = {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '600px' },
    lg: { maxWidth: '800px' }
  }

  const mobileSize = window.innerWidth < 640 ? { maxWidth: '95vw' } : window.innerWidth < 768 ? { maxWidth: '85vw' } : window.innerWidth < 1024 ? { maxWidth: '75vw' } : sizes[size]

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        ...mobileSize,
        ...style
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px' }}>
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
