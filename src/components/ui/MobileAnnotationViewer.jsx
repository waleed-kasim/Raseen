import ReactDOM from 'react-dom'

function MobileAnnotationViewer({ annotation, annotations, onClose, onEdit, onDelete }) {
    const list = annotations || (annotation ? [annotation] : [])
    if (list.length === 0) return null

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20002,
            display: 'flex',
            alignItems: 'flex-end',
            pointerEvents: 'none'
        }}>
            {/* Backdrop */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    pointerEvents: 'auto',
                    backdropFilter: 'blur(2px)'
                }}
                onClick={onClose}
            />

            {/* Content Sheet */}
            <div
                className="bg-dark text-light w-100 border-top border-gold custom-scrollbar-hidden"
                dir="rtl"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
                style={{
                    pointerEvents: 'auto',
                    borderTopLeftRadius: '1.5rem',
                    borderTopRightRadius: '1.5rem',
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    position: 'absolute',
                    bottom: 0,
                    animation: 'slideUp 0.3s ease-out',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.5)'
                }}
            >
                <div className="p-4 pt-1">
                    {/* Header with drag handle */}
                    <div className="d-flex justify-content-center mb-3">
                        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }}></div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="m-0 text-gold fw-bold">تفاصيل الآيات</h5>
                        <button className="btn btn-sm btn-outline-secondary border-0" onClick={onClose}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    {/* Reflections Section */}
                    {list.some(item => item.reflection) && (
                        <div className="mb-4">
                            <div className="d-flex align-items-center mb-3 text-info">
                                <i className="bi bi-lightbulb-fill me-2 fs-5"></i>
                                <h6 className="m-0 fw-bold">تدبرات الآيات</h6>
                            </div>
                            {list.filter(item => item.reflection).map((item, idx) => (
                                <div key={`ref-${idx}`} className="mb-3 border-bottom border-secondary border-opacity-25 pb-3">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        {item.wordText && (
                                            <div className="small text-muted font-uuthmanic">{item.wordText}</div>
                                        )}
                                        <div className="d-flex gap-2">
                                            {onEdit && (
                                                <button className="btn btn-sm btn-link text-white-50 p-0" onClick={() => onEdit(item, 'reflection')}>
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button className="btn btn-sm btn-link text-danger p-0 opacity-50 hover-opacity-100" onClick={() => onDelete(item)}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-3 rounded bg-black bg-opacity-25 border border-info border-opacity-25 text-start" style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                                        {item.reflection}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Notes Section */}
                    {list.some(item => item.notes) && (
                        <div className="mb-2">
                            <div className="d-flex align-items-center mb-3 text-secondary">
                                <i className="bi bi-sticky-fill me-2 fs-5"></i>
                                <h6 className="m-0 fw-bold">ملاحظات الحفظ</h6>
                            </div>
                            {list.filter(item => item.notes).map((item, idx) => (
                                <div key={`note-${idx}`} className="mb-3 border-bottom border-secondary border-opacity-25 pb-3">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        {item.wordText && (
                                            <div className="small text-muted font-uuthmanic">{item.wordText}</div>
                                        )}
                                        <div className="d-flex gap-2">
                                            {onEdit && (
                                                <button className="btn btn-sm btn-link text-white-50 p-0" onClick={() => onEdit(item, 'notes')}>
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button className="btn btn-sm btn-link text-danger p-0 opacity-50 hover-opacity-100" onClick={() => onDelete(item)}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-3 rounded bg-black bg-opacity-25 border border-secondary border-opacity-25 text-start" style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                                        {item.notes}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .custom-scrollbar-hidden::-webkit-scrollbar {
                    display: none;
                }
                .custom-scrollbar-hidden {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>,
        document.body
    )
}

export default MobileAnnotationViewer
