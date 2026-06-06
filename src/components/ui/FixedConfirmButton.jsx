import { useRef, useEffect } from 'react'

const FixedConfirmButton = ({ onConfirm, isVisible, text = "تأكيد الإجابة", disabled = false }) => {
    // We want to animate the appearance
    // If not visible, we can either unmount or just hide.
    // Unmounting is better for "clicking through" to content behind.

    if (!isVisible) return null

    return (
        <div
            className="fixed-bottom p-3 bg-dark border-top border-secondary fade-in-up confirm-btn-container"
            style={{
                zIndex: 1050,
                boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
            }}
        >

            <div className="container d-flex justify-content-center">
                <button
                    className="btn btn-gold py-3 fw-bold shadow-glow-gold responsive-confirm-btn"
                    onClick={onConfirm}
                    disabled={disabled}
                    style={{ fontSize: '1.1rem', letterSpacing: '0.5px' }}
                >
                    {text} <i className="bi bi-check-lg ms-2"></i>
                </button>
            </div>
            <style>{`
                .fade-in-up {
                    animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .confirm-btn-container {
                    /* Mobile defaults handled by bootstrap classes in className */
                }
                .responsive-confirm-btn {
                    width: 100%;
                    border-radius: 0.5rem;
                }
                @media (min-width: 768px) {
                    .confirm-btn-container {
                        background-color: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding-bottom: 2rem !important; /* Move it up a bit */
                    }
                    .responsive-confirm-btn {
                        width: auto !important;
                        min-width: 300px;
                        border-radius: 50px !important;
                        padding-left: 3rem !important;
                        padding-right: 3rem !important;
                        box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3) !important; /* Add shadow to button since container lost it */
                    }
                }
                @keyframes fadeInUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    )
}

export default FixedConfirmButton
