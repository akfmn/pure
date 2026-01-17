// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

// Обновление активности пользователя
async function updateUserActivity() {
    if (!currentUserId) return;
    
    try {
        await fetch(`${API_URL}/users.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_activity',
                user_id: currentUserId
            })
        });
    } catch (error) {
        console.error('Error updating activity:', error);
    }
}

// Start post timers on load
function startTimer() {
    // Таймеры теперь запускаются через startPostTimersFromServer
}

// ============================================
// DOM CONTENT LOADED
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Применение обрезки
    document.getElementById('applyCropBtn').addEventListener('click', () => {
        if (!cropperState) return;
        
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        
        const outputWidth = 800;
        const outputHeight = 400;
        finalCanvas.width = outputWidth;
        finalCanvas.height = outputHeight;
        
        const { image, offsetX, offsetY, cropWidth, cropHeight } = cropperState;
        finalCtx.drawImage(
            image,
            offsetX, offsetY, cropWidth, cropHeight,
            0, 0, outputWidth, outputHeight
        );
        
        postPhotoDataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);
        
        const preview = document.getElementById('postPhotoPreview');
        preview.innerHTML = `<img src="${postPhotoDataUrl}" alt="Фото">`;
        
        document.getElementById('postPhotoRemoveBtn').style.display = 'block';
        
        document.getElementById('imageCropModal').classList.remove('active');
        cropperState = null;
    });
    
    document.getElementById('cancelCropBtn').addEventListener('click', () => {
        document.getElementById('imageCropModal').classList.remove('active');
        document.getElementById('postPhotoInput').value = '';
        cropperState = null;
    });
    
    // Enter для отправки сообщения в чате
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

// ============================================
// SPLASH SCREEN И ИНИЦИАЛИЗАЦИЯ
// ============================================

setTimeout(() => {
    document.getElementById('splashScreen').classList.remove('active');
    
    // Проверяем авторизацию
    if (checkAuth()) {
        // Сбрасываем фильтр на nearby
        currentFilter = 'nearby';
        document.querySelectorAll('.filter-item').forEach(item => {
            item.classList.remove('active');
        });
        const nearbyFilter = document.querySelector('.filter-item[onclick*="nearby"]');
        if (nearbyFilter) nearbyFilter.classList.add('active');
        
        requestGeolocation();
        document.getElementById('mainScreen').classList.add('active');
        loadPostsFromServer();
        initPullToRefresh();
        initAgeFilter();
        startUnreadCheck();
    } else {
        document.getElementById('loginScreen').classList.add('active');
    }
    
    startTimer();
}, 2000);

// ============================================
// ПЕРИОДИЧЕСКИЕ ЗАДАЧИ
// ============================================

// Автоматическое обновление постов каждые 30 секунд
setInterval(() => {
    loadPostsFromServer();
}, 30000);

// Обновляем активность каждые 2 минуты
setInterval(() => {
    updateUserActivity();
}, 120000);

// Обновляем активность при любом взаимодействии
document.addEventListener('click', () => {
    if (currentUserId) {
        updateUserActivity();
    }
});
