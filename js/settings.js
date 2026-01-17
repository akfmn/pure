// ============================================
// НАСТРОЙКИ
// ============================================

// Изменить пароль
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword) {
        await showError('Введите текущий пароль');
        return;
    }
    
    if (!newPassword || newPassword.length < 6) {
        await showError('Новый пароль должен быть минимум 6 символов');
        return;
    }
    
    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*]+$/;
    if (!passwordRegex.test(newPassword)) {
        await showError('Пароль может содержать только английские буквы, цифры и символы !@#$%^&*');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        await showError('Пароли не совпадают');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'change_password',
                user_id: currentUserId,
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            await showSuccess('Пароль успешно изменён!');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            await showError(data.message || 'Ошибка при изменении пароля');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        await showError('Ошибка соединения с сервером');
    }
}

// Подтверждение удаления аккаунта
async function confirmDeleteAccount() {
    console.log('confirmDeleteAccount called');
    
    const confirmed = await showConfirm(
        'Вы уверены, что хотите удалить аккаунт? Это действие необратимо. Все ваши данные будут удалены навсегда.',
        'Удаление аккаунта',
        '⚠️'
    );
    
    console.log('User confirmed:', confirmed);
    
    if (confirmed) {
        const password = await requestPasswordVerification();
        
        if (password) {
            await deleteAccount(password);
        } else {
            console.log('User cancelled password verification');
        }
    } else {
        console.log('User cancelled account deletion');
    }
}

// Запрос пароля для подтверждения
function requestPasswordVerification() {
    return new Promise((resolve) => {
        const modal = document.getElementById('passwordVerificationModal');
        const passwordInput = document.getElementById('deleteAccountPassword');
        const verifyBtn = document.getElementById('verifyPasswordBtn');
        const cancelBtn = document.getElementById('cancelPasswordBtn');
        
        passwordInput.value = '';
        
        modal.classList.add('active');
        
        setTimeout(() => passwordInput.focus(), 100);
        
        const handleVerify = () => {
            const password = passwordInput.value.trim();
            
            if (!password) {
                alert('Введите пароль');
                return;
            }
            
            modal.classList.remove('active');
            verifyBtn.removeEventListener('click', handleVerify);
            cancelBtn.removeEventListener('click', handleCancel);
            passwordInput.removeEventListener('keypress', handleKeyPress);
            resolve(password);
        };
        
        const handleCancel = () => {
            modal.classList.remove('active');
            verifyBtn.removeEventListener('click', handleVerify);
            cancelBtn.removeEventListener('click', handleCancel);
            passwordInput.removeEventListener('keypress', handleKeyPress);
            resolve(null);
        };
        
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                handleVerify();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        };
        
        verifyBtn.addEventListener('click', handleVerify);
        cancelBtn.addEventListener('click', handleCancel);
        passwordInput.addEventListener('keypress', handleKeyPress);
    });
}

// Удаление аккаунта
async function deleteAccount(password) {
    try {
        console.log('Deleting account for user ID:', currentUserId);
        
        const response = await fetch(`${API_URL}/users.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUserId,
                password: password
            })
        });
        
        console.log('Delete response status:', response.status);
        
        const data = await response.json();
        console.log('Delete response data:', data);
        
        if (data.success) {
            await showSuccess('Аккаунт успешно удалён');
            handleLogout();
        } else {
            await showError(data.message || 'Ошибка при удалении аккаунта');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        await showError('Ошибка соединения с сервером');
    }
}
