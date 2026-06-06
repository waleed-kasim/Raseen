import React, { useEffect, useState } from 'react'
import { StorageService } from '../../services/storage'

const PagesGrid = ({ pages, memorizedIds, onTogglePage }) => {
    // Dynamic width calculation for responsiveness
    // On mobile, we might want fewer columns. On desktop, more.
    // However, flex-wrap with fixed min-width is usually best.

    return (
        <div className="pages-grid d-flex flex-wrap gap-2 gap-md-3 p-3 justify-content-center">
            {pages.map(page => {
                const isMemorized = memorizedIds.has(page.id)
                return (
                    <div
                        key={page.id}
                        onClick={() => onTogglePage(page.id)}
                        className={`page-square d-flex align-items-center justify-content-center shadow-sm position-relative overflow-hidden`}
                        style={{
                            width: 'var(--page-grid-size, 60px)', // Default 60px, can be overridden by media query
                            height: 'var(--page-grid-size, 60px)',
                            borderRadius: '12px', // Softer corners
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            fontWeight: isMemorized ? 'bold' : '500',
                            // Gradient for memorized, faint glass for empty
                            background: isMemorized
                                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                            color: isMemorized ? '#fff' : 'var(--text-muted)',
                            border: isMemorized ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            boxShadow: isMemorized ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            userSelect: 'none'
                        }}
                    >
                        {/* Shine effect for memorized */}
                        {isMemorized && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
                                zIndex: 1,
                                width: '200%',
                            }} className="shine-effect"></div>
                        )}
                        {/* Shared page indicator (page has multiple surahs) */}
                        {StorageService.getPageChunks(page.pageNumber).length > 1 && (
                            <div className="composite-page-badge"></div>
                        )}
                        <span style={{ zIndex: 2, textShadow: isMemorized ? '0 1px 2px rgba(0,0,0,0.2)' : 'none' }}>
                            {page.pageNumber}
                        </span>
                    </div>
                )
            })}
            {/* Global Style Override for this component */}
            {/* Styles moved to index.css */}
        </div>
    )
}

export default PagesGrid
