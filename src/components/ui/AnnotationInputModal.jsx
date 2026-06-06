import { useState, useEffect } from 'react'

function AnnotationInputModal({ show, onHide, onSave, type, initialValue }) {
    const [text, setText] = useState('')

    useEffect(() => {
        if (show) {
            setText(initialValue || '')
        }
    }, [show, initialValue])

    if (!show) return null

    const handleSave = () => {
        onSave(text)
        onHide()
    }

    const title = type === 'reflection' ? 'إضافة تدبر' : 'إضافة ملاحظة'
    const placeholder = type === 'reflection' ? 'اكتب تدبرك هنا...' : 'اكتب ملاحظتك هنا...'

    return (
        <div className="modal show d-block fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 11000 }}>
            <div className="modal-dialog modal-dialog-centered" dir="rtl">
                <div className="modal-content bg-dark border-gold text-light">
                    <div className="modal-header border-gold bg-dark text-gold d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid var(--border-gold)' }}>
                        <h5 className="modal-title mb-0">{title}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onHide} aria-label="Close"></button>
                    </div>
                    <div className="modal-body bg-dark text-light">
                        <div className="form-group">
                            <textarea
                                rows={4}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder={placeholder}
                                className="form-control bg-dark text-light border-secondary"
                                style={{ resize: 'none', color: '#fff', backgroundColor: '#0d0d15' }}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="modal-footer bg-dark border-gold" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <button type="button" className="btn btn-outline-secondary text-light" onClick={onHide}>إلغاء</button>
                        <button type="button" className="btn btn-warning" onClick={handleSave} style={{ fontWeight: 'bold' }}>حفظ</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AnnotationInputModal
