import { useState, useRef } from 'react'


function SettingsPage({ onBack, showToast }) {
    const [statusMsg, setStatusMsg] = useState('')
    const [clickCount, setClickCount] = useState(0)
    const fileInputRef = useRef(null)

    const handleExport = async () => {
        setStatusMsg('⚠️ وظيفة النسخ الاحتياطي معطلة مؤقتاً للتحديث.')
    }

    const handleImportClick = () => {
        setStatusMsg('⚠️ وظيفة الاستعادة معطلة مؤقتاً للتحديث.')
    }

    const handleFileChange = async (e) => {
        // Disabled
    }

    // Mock values for UI
    const isBackingUp = false
    const isRestoring = false
    const error = null
    const lastBackupTime = null

    return (
        <div className="settings-page fade-in p-3">
            <div className="page-header">
                <BackButton onClick={onBack} />
                <h2 className="page-title">الإعدادات والبيانات</h2>
                <div style={{ width: '40px' }}></div>
            </div>

            <div className="container" style={{ maxWidth: '600px' }}>

                {/* Status Alert */}
                {statusMsg && (
                    <div className={`alert ${statusMsg.includes('❌') ? 'alert-danger' : 'alert-success'} mb-4`} role="alert">
                        {statusMsg}
                    </div>
                )}

                {error && <div className="alert alert-danger mb-4">{error}</div>}

                {/* Data Management Card */}
                <div className="card card-dark-gold mb-4">
                    <div className="card-header text-gold" style={{ borderBottom: '1px solid var(--border-gold)' }}>
                        <i className="bi bi-database-fill-gear me-2"></i>
                        النسخ الاحتياطي
                    </div>
                    <div className="card-body">
                        <p className="text-muted small mb-4">
                            قم بحفظ نسخة من تقدمك (الصفحات والتعليقات) في ملف على جهازك لتأمينها.
                        </p>

                        <div className="d-grid gap-3">
                            <button
                                className="btn btn-warning py-2"
                                onClick={handleExport}
                                disabled={isBackingUp}
                            >
                                {isBackingUp ? (
                                    <span><span className="spinner-border spinner-border-sm me-2"></span>جاري التصدير...</span>
                                ) : (
                                    <span><i className="bi bi-download me-2"></i>تصدير البيانات (Backup)</span>
                                )}
                            </button>

                            <button
                                className="btn btn-outline-info py-2"
                                onClick={handleImportClick}
                                disabled={isRestoring}
                            >
                                {isRestoring ? (
                                    <span><span className="spinner-border spinner-border-sm me-2"></span>جاري الاستعادة...</span>
                                ) : (
                                    <span><i className="bi bi-upload me-2"></i>استعادة بيانات (Restore)</span>
                                )}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".json"
                                onChange={handleFileChange}
                            />
                        </div>

                        {lastBackupTime && (
                            <div className="text-center mt-3 text-muted small">
                                آخر نسخ احتياطي: {lastBackupTime.toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* App Info */}
                <div 
                    className="text-center text-muted mt-5" 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => {
                        const newCount = clickCount + 1
                        if (newCount >= 5) {
                            const isDev = localStorage.getItem('devMode') === 'true'
                            localStorage.setItem('devMode', !isDev ? 'true' : 'false')
                            showToast(!isDev ? '🚀 تم تفعيل وضع المطور' : '🔒 تم إغلاق وضع المطور', 'info')
                            setClickCount(0)
                        } else {
                            setClickCount(newCount)
                        }
                    }}
                >
                    <small>Quran Tool - v1.0.0 (Full Edition)</small>
                </div>
            </div>
        </div>
    )
}

export default SettingsPage
