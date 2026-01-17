// ============================================
// СОЗДАНИЕ ПОСТА
// ============================================

// Массив для хранения фото поста (до 3х)
let postPhotos = [];

// Duration validation
function validateDuration() {
    const hoursInput = document.getElementById('hoursInput');
    const minutesInput = document.getElementById('minutesInput');
    const hint = document.getElementById('durationHint');
    
    let hours = parseInt(hoursInput.value) || 0;
    let minutes = parseInt(minutesInput.value) || 0;
    
    if (hours < 0) hours = 0;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) {
        minutes = 59;
        minutesInput.value = 59;
    }
    
    const totalMinutes = (hours * 60) + minutes;
    
    if (totalMinutes > 1440) {
        hoursInput.value = 24;
        minutesInput.value = 0;
        hours = 24;
        minutes = 0;
        hint.textContent = 'Максимум 24 часа!';
        hint.classList.add('error');
        selectedDuration = 1440;
    } else if (totalMinutes === 0) {
        hint.textContent = 'Минимум 1 минута';
        hint.classList.add('error');
        selectedDuration = 1;
    } else {
        hint.textContent = 'Максимум 24 часа';
        hint.classList.remove('error');
        selectedDuration = totalMinutes;
    }
    
    hoursInput.value = hours;
    minutesInput.value = minutes;
}

// Обработка выбора фото для поста - до 3х фотографий
function handlePostPhotoSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Проверяем сколько фото уже есть
    const remainingSlots = 3 - postPhotos.length;
    if (remainingSlots <= 0) {
        showError('Максимум 3 фотографии');
        return;
    }
    
    // Берём только нужное количество файлов
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
        if (!file.type.startsWith('image/')) {
            showError('Пожалуйста, выберите изображение');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showError('Размер изображения не должен превышать 5MB');
            return;
        }
        
        // Читаем файл
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            
            // Сжимаем изображение сохраняя пропорции
            compressImage(imageDataUrl, (compressedDataUrl) => {
                postPhotos.push(compressedDataUrl);
                updatePhotoPreview();
            });
        };
        reader.readAsDataURL(file);
    });
    
    // Сбрасываем input для повторного выбора
    event.target.value = '';
}

// Сжатие изображения с сохранением пропорций
function compressImage(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Максимальные размеры
        const maxWidth = 1200;
        const maxHeight = 1200;
        
        let width = img.width;
        let height = img.height;
        
        // Масштабируем если нужно, сохраняя пропорции
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Рисуем изображение
        ctx.drawImage(img, 0, 0, width, height);
        
        // Конвертируем в JPEG с качеством 0.85
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(compressedDataUrl);
    };
    img.src = dataUrl;
}

// Обновление превью фотографий
function updatePhotoPreview() {
    const preview = document.getElementById('postPhotoPreview');
    const removeBtn = document.getElementById('postPhotoRemoveBtn');
    
    if (postPhotos.length === 0) {
        preview.innerHTML = `
            <div class="photo-upload-placeholder">
                <div style="font-size: 48px; margin-bottom: 10px;">📷</div>
                <div style="font-size: 14px; color: #999;">Нажмите для добавления фото (до 3х)</div>
            </div>
        `;
        removeBtn.style.display = 'none';
    } else {
        let html = '<div class="photo-preview-grid">';
        
        postPhotos.forEach((photo, index) => {
            html += `
                <div class="photo-preview-item">
                    <img src="${photo}" alt="Фото ${index + 1}">
                    <button class="photo-preview-remove" onclick="removePhoto(${index})">✕</button>
                </div>
            `;
        });
        
        // Показываем кнопку добавления если меньше 3х фото
        if (postPhotos.length < 3) {
            html += `
                <div class="photo-preview-add" onclick="document.getElementById('postPhotoInput').click()">
                    <span>+</span>
                </div>
            `;
        }
        
        html += '</div>';
        preview.innerHTML = html;
        removeBtn.style.display = 'block';
        removeBtn.textContent = '✕ Удалить все фото';
    }
    
    // Обновляем глобальную переменную для совместимости
    postPhotoDataUrl = postPhotos.length > 0 ? postPhotos[0] : null;
}

// Удаление одного фото по индексу
function removePhoto(index) {
    postPhotos.splice(index, 1);
    updatePhotoPreview();
}

// Удаление всех фото
function removePostPhoto() {
    postPhotos = [];
    postPhotoFile = null;
    postPhotoDataUrl = null;
    updatePhotoPreview();
    document.getElementById('postPhotoInput').value = '';
}

// Form validation
function validateForm() {
    const text = document.getElementById('requestText').value;
    const postButton = document.getElementById('postButton');
    const charCounter = document.getElementById('charCounter');
    
    if (charCounter) {
        charCounter.textContent = `${text.length} / 550`;
        
        if (text.length > 500) {
            charCounter.style.color = '#ff6b6b';
        } else if (text.length > 450) {
            charCounter.style.color = '#ffa500';
        } else {
            charCounter.style.color = '#666';
        }
    }
    
    if (text.trim().length > 0) {
        postButton.style.opacity = '1';
    } else {
        postButton.style.opacity = '0.5';
    }
}

// Create request
async function createRequest() {
    const text = document.getElementById('requestText').value;
    
    if (text.trim().length === 0) {
        alert('Пожалуйста, напишите описание встречи');
        return;
    }
    
    const postButton = document.getElementById('postButton');
    postButton.textContent = 'Создание...';
    postButton.style.opacity = '0.5';
    
    // Передаём все фото (или первое для совместимости)
    const photoToSend = postPhotos.length > 0 ? postPhotos.join('|||') : null;
    const success = await createPostOnServer(text, selectedDuration, photoToSend);
    
    if (success) {
        document.getElementById('requestText').value = '';
        removePostPhoto();
        validateForm();
        
        showScreen('mainScreen');
        
        setTimeout(async () => {
            const hours = parseInt(document.getElementById('hoursInput').value) || 0;
            const minutes = parseInt(document.getElementById('minutesInput').value) || 0;
            
            let durationText = '';
            if (hours > 0 && minutes > 0) {
                durationText = hours + ' ч ' + minutes + ' мин';
            } else if (hours > 0) {
                durationText = hours + ' час(а)';
            } else {
                durationText = minutes + ' минут';
            }
            
            await showSuccess('Запрос создан! Он будет активен ' + durationText);
            
            document.getElementById('hoursInput').value = 1;
            document.getElementById('minutesInput').value = 0;
            validateDuration();
        }, 300);
    } else {
        alert('Ошибка при создании запроса. Попробуйте ещё раз.');
    }
    
    postButton.textContent = 'Создать';
    postButton.style.opacity = '1';
}