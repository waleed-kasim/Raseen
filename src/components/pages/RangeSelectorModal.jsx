import React, { useState } from 'react'

const RangeSelectorModal = ({ show, onHide, onApply }) => {
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')

    if (!show) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        const s = parseInt(start)
        const eVal = parseInt(end)
        if (s && eVal && s <= eVal) {
            onApply(s, eVal)
            setStart('')
            setEnd('')
            onHide()
        }
    }

    return (
        <div className="modal show d-block fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content bg-dark border-gold">
                    <div className="modal-header border-bottom border-secondary">
                        <h5 className="modal-title text-gold">إضافة نطاق حفظ</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <p className="text-muted mb-3">حدد الصفحات التي حفظتها (حسب رقم الصفحة في المصحف)</p>
                            <div className="d-flex gap-3 align-items-center">
                                <div className="form-group flex-grow-1">
                                    <label className="form-label text-secondary small">من صفحة</label>
                                    <input
                                        type="number"
                                        className="form-control bg-dark text-light border-secondary"
                                        value={start}
                                        onChange={e => setStart(e.target.value)}
                                        min="1"
                                        max="604"
                                        required
                                    />
                                </div>
                                <span className="text-muted mt-4">-</span>
                                <div className="form-group flex-grow-1">
                                    <label className="form-label text-secondary small">إلى صفحة</label>
                                    <input
                                        type="number"
                                        className="form-control bg-dark text-light border-secondary"
                                        value={end}
                                        onChange={e => setEnd(e.target.value)}
                                        min="1"
                                        max="604"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer border-top border-secondary">
                            <button type="button" className="btn btn-outline-secondary" onClick={onHide}>إلغاء</button>
                            <button type="submit" className="btn btn-gold">أضف النطاق</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default RangeSelectorModal
