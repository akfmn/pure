// ============================================
// КАСТОМНЫЕ МОДАЛЬНЫЕ ОКНА
// ============================================

// Показать модальное окно
function showModal(message, title = 'Уведомление', icon = 'ℹ️', showCancel = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalIcon = document.getElementById('modalIcon');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalIcon.textContent = icon;
        
        if (showCancel) {
            cancelBtn.style.display = 'block';
        } else {
            cancelBtn.style.display = 'none';
        }
        
        modal.classList.add('active');
        
        const handleConfirm = () => {
            modal.classList.remove('active');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.classList.remove('active');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

// Заменяем стандартный alert
function alert(message) {
    return showModal(message, 'Уведомление', 'ℹ️');
}

// Функция для подтверждения
function confirm(message) {
    return showModal(message, 'Подтверждение', '❓', true);
}

// Функция для подтверждения с кастомным заголовком и иконкой
function showConfirm(message, title = 'Подтверждение', icon = '❓') {
    return showModal(message, title, icon, true);
}

// Функция для успеха
function showSuccess(message) {
    return showModal(message, 'Успешно', '✅');
}

// Функция для ошибки
function showError(message) {
    return showModal(message, 'Ошибка', '❌');
}

// Функция для предупреждения
function showWarning(message) {
    return showModal(message, 'Внимание', '⚠️');
}

// Показать toast-уведомление внизу экрана
function showToast(message) {
    // Удаляем предыдущий toast если есть
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Создаём новый toast
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(30, 30, 30, 0.95);
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        animation: toastSlideUp 0.3s ease-out;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 90%;
        text-align: center;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Удаляем через 2 секунды
    setTimeout(() => {
        toast.style.animation = 'toastSlideDown 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 2000);
}
