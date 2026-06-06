import { Toast, ToastContainer } from 'react-bootstrap'

function ToastNotification({ show, message, type, onClose }) {
    const getVariant = () => {
        switch (type) {
            case 'success': return 'success'
            case 'error': return 'danger'
            default: return 'info'
        }
    }

    const getIcon = () => {
        switch (type) {
            case 'success': return 'bi-check-circle-fill'
            case 'error': return 'bi-x-circle-fill'
            default: return 'bi-info-circle-fill'
        }
    }

    return (
        <ToastContainer position="bottom-center" className="p-3">
            <Toast
                show={show}
                onClose={onClose}
                delay={3000}
                autohide
                bg="dark"
                className={`border-${getVariant()}`}
            >
                <Toast.Body className="d-flex align-items-center gap-2 text-light">
                    <i className={`bi ${getIcon()} text-${getVariant()}`}></i>
                    {message}
                </Toast.Body>
            </Toast>
        </ToastContainer>
    )
}

export default ToastNotification
