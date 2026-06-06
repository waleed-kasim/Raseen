import React, { useState, useEffect } from 'react'
import StorageService from '../../services/storage'

const TutorialOverlay = ({ steps, isOpen, onClose }) => {
    const [stepIndex, setStepIndex] = useState(0)
    const [isClosing, setIsClosing] = useState(false)
    const [showSkipConfirm, setShowSkipConfirm] = useState(false)

    const currentStep = steps[stepIndex]
    const isLastStep = stepIndex === steps.length - 1

    const handleNext = () => {
        if (isLastStep) {
            handleComplete()
        } else {
            setStepIndex(prev => prev + 1)
        }
    }

    const handleComplete = () => {
        setIsClosing(true)
        setTimeout(() => {
            onClose()
            setStepIndex(0)
            setIsClosing(false)
        }, 300)
    }

    const handleSkipAll = () => {
        setShowSkipConfirm(true)
    }

    const confirmSkipAll = () => {
        StorageService.setSkipAllTutorials(true)
        setIsClosing(true)
        setTimeout(() => {
            onClose()
            setStepIndex(0)
            setIsClosing(false)
        }, 300)
    }

    if (!isOpen || !currentStep) return null

    return (
        <div className={`tutorial-overlay ${isClosing ? 'fade-out' : 'fade-in'}`} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            {/* Skip All Confirmation Modal */}
            {showSkipConfirm && (
                <div className="card bg-dark border-danger shadow-lg p-4 text-center" style={{ maxWidth: '350px', zIndex: 10002, animation: 'popIn 0.3s' }}>
                    <i className="bi bi-exclamation-triangle-fill text-danger fs-1 mb-3"></i>
                    <h5 className="text-white mb-2">هل أنت متأكد؟</h5>
                    <p className="text-muted small mb-4">
                        إيقاف كل التلميحات قد يجعلك تفوت ميزات "احترافية" خفية في التطبيق!
                        <br />
                        لن تظهر هذه التلميحات مرة أخرى أبداً.
                    </p>
                    <div className="d-flex gap-2 justify-content-center">
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowSkipConfirm(false)}>إلغاء</button>
                        <button className="btn btn-danger btn-sm" onClick={confirmSkipAll}>نعم، أوقفها</button>
                    </div>
                </div>
            )}

            {/* Main Tutorial Card */}
            {!showSkipConfirm && (
                <div className="card border-0 shadow-lg text-center" style={{
                    background: 'rgba(20, 20, 35, 0.95)',
                    border: '1px solid var(--gold)',
                    borderRadius: '20px',
                    maxWidth: '400px',
                    width: '100%',
                    boxShadow: '0 0 50px rgba(212, 175, 55, 0.15)',
                    animation: 'slideUp 0.4s ease'
                }}>
                    <div className="card-body p-4 d-flex flex-column align-items-center">
                        {/* Graphic / Icon */}
                        <div className="mb-4 d-flex align-items-center justify-content-center" style={{
                            width: '80px', height: '80px',
                            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(0,0,0,0))',
                            borderRadius: '50%',
                            border: '1px solid rgba(212, 175, 55, 0.3)'
                        }}>
                            <i className={`${currentStep.icon || 'bi-lightbulb'} text-gold`} style={{ fontSize: '2.5rem' }}></i>
                        </div>

                        {/* Content */}
                        <h4 className="fw-bold text-gold mb-2">{currentStep.title}</h4>
                        <p className="text-muted mb-4" style={{ lineHeight: '1.6' }}>
                            {currentStep.description}
                        </p>

                        {/* Steps Indicator */}
                        <div className="d-flex gap-2 mb-4">
                            {steps.map((_, idx) => (
                                <div key={idx} style={{
                                    width: '8px', height: '8px',
                                    borderRadius: '50%',
                                    background: idx === stepIndex ? 'var(--gold)' : '#444',
                                    transition: 'all 0.3s'
                                }}></div>
                            ))}
                        </div>

                        {/* Actions */}
                        <button
                            className="btn btn-gold w-100 py-2 mb-3 fw-bold shadow-gold"
                            onClick={handleNext}
                        >
                            {isLastStep ? 'ابدأ الاستخدام 🚀' : 'التالي'}
                        </button>

                        <button
                            className="btn btn-link text-muted text-decoration-none btn-sm"
                            onClick={handleComplete}
                        >
                            تخطي هذا الشرح
                        </button>

                        {/* "Hard to find" Skip All */}
                        <div className="mt-3 pt-3 border-top border-secondary w-100">
                            <span
                                className="text-muted small cursor-pointer"
                                style={{ fontSize: '0.65rem', opacity: 0.5 }}
                                onClick={handleSkipAll}
                            >
                                لا تعرض التلميحات مرة أخرى
                            </span>
                        </div>

                    </div>
                </div>
            )}

            {/* Styles moved to index.css */}
            <style>{`
                .cursor-pointer { cursor: pointer; }
                .cursor-pointer:hover { opacity: 1 !important; text-decoration: underline; }
            `}</style>
        </div>
    )
}

export default TutorialOverlay
