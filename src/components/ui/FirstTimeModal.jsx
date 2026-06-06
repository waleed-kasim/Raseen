import React, { useEffect, useState } from 'react'

const FirstTimeModal = ({ onClose }) => {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Small delay for animation
        setTimeout(() => setIsVisible(true), 100)
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onClose, 300)
    }

    return (
        <div className={`modal-overlay ${isVisible ? 'fade-in' : 'fade-out'}`} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10050, // Higher than TutorialOverlay
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div className={`card border-0 shadow-lg text-center ${isVisible ? 'slide-up' : ''}`} style={{
                background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
                border: '1px solid var(--gold)',
                borderRadius: '20px',
                maxWidth: '450px',
                width: '100%',
                boxShadow: '0 0 50px rgba(212, 175, 55, 0.2)',
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.3s ease-out'
            }}>
                <div className="card-body p-4 position-relative">
                    {/* Decorative Header */}
                    <div className="position-absolute top-0 start-50 translate-middle" style={{
                        width: '60px', height: '60px',
                        background: 'var(--bg-dark)',
                        borderRadius: '50%',
                        border: '1px solid var(--gold)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                    }}>
                        <i className="bi bi-info-circle-fill text-gold fs-2"></i>
                    </div>

                    <h4 className="fw-bold text-white mt-4 mb-4" style={{ fontFamily: 'var(--font-quran)' }}>تنبيه هام</h4>

                    <div className="alert alert-warning bg-opacity-10 border-warning text-warning mb-4" role="alert">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        هذه نسخة تجريبية
                    </div>

                    <p className="text-light mb-4 text-start" style={{ lineHeight: '1.8', fontSize: '1.1rem' }}>
                        هذا التطبيق نسخة تجريبية ومحدودة إلى سورة البقرة فقط. يرجى التواصل معنا في حال وجود اي ملاحظات او اخطاء برمجية، او لتقديم الاقتراحات عبر الوسائل التالية:
                    </p>

                    <div className="bg-dark rounded-3 p-3 mb-4 border border-secondary">
                        <div className="text-center mb-3">
                            <span className="text-gold fw-bold ltr" style={{ fontSize: '1.2rem', letterSpacing: '1px' }}>0788644248</span>
                        </div>
                        <div className="d-flex justify-content-center gap-2">
                            <a href="https://wa.me/962788644248" target="_blank" rel="noreferrer" className="btn btn-sm btn-success rounded-pill flex-grow-1">
                                <i className="bi bi-whatsapp me-1"></i> واتساب
                            </a>
                            <a href="https://t.me/+962788644248" target="_blank" rel="noreferrer" className="btn btn-sm btn-info rounded-pill flex-grow-1 text-white">
                                <i className="bi bi-telegram me-1"></i> تيليجرام
                            </a>
                        </div>
                    </div>

                    <button
                        className="btn btn-gold w-100 py-2 fw-bold shadow-gold rounded-pill"
                        onClick={handleClose}
                    >
                        فهمت، ابدأ التطبيق
                    </button>
                </div>
            </div>
        </div>
    )
}

export default FirstTimeModal
