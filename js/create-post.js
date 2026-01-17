// ============================================
// СОЗДАНИЕ ПОСТА
// ============================================

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

// Обработка выбора фото для поста
function handlePostPhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showError('Пожалуйста, выберите изображение');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showError('Размер изображения не должен превышать 5MB');
        return;
    }
    
    postPhotoFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        openImageCropEditor(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Открытие редактора обрезки
function openImageCropEditor(imageDataUrl) {
    const modal = document.getElementById('imageCropModal');
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
        const cardAspectRatio = 2;
        
        let cropWidth, cropHeight;
        
        const imgAspectRatio = img.width / img.height;
        
        if (imgAspectRatio > cardAspectRatio) {
            cropHeight = img.height;
            cropWidth = cropHeight * cardAspectRatio;
        } else {
            cropWidth = img.width;
            cropHeight = cropWidth / cardAspectRatio;
        }
        
        const previewWidth = 400;
        const previewHeight = 200;
        canvas.width = previewWidth;
        canvas.height = previewHeight;
        
        cropperState = {
            image: img,
            scale: 1,
            offsetX: (img.width - cropWidth) / 2,
            offsetY: (img.height - cropHeight) / 2,
            cropWidth: cropWidth,
            cropHeight: cropHeight
        };
        
        drawCropPreview();
        
        setupCropControls();
        
        modal.classList.add('active');
    };
    img.src = imageDataUrl;
}

// Отрисовка превью обрезки
function drawCropPreview() {
    if (!cropperState) return;
    
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    const { image, scale, offsetX, offsetY, cropWidth, cropHeight } = cropperState;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.drawImage(
        image,
        offsetX, offsetY, cropWidth, cropHeight,
        0, 0, canvas.width, canvas.height
    );
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

// Настройка управления обрезкой
function setupCropControls() {
    const canvas = document.getElementById('cropCanvas');
    let isDragging = false;
    let startX, startY;
    
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.offsetX;
        startY = e.offsetY;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging || !cropperState) return;
        
        const dx = e.offsetX - startX;
        const dy = e.offsetY - startY;
        
        cropperState.offsetX -= dx / cropperState.scale;
        cropperState.offsetY -= dy / cropperState.scale;
        
        const img = cropperState.image;
        const maxOffsetX = img.width - cropperState.cropWidth;
        const maxOffsetY = img.height - cropperState.cropHeight;
        
        cropperState.offsetX = Math.max(0, Math.min(maxOffsetX, cropperState.offsetX));
        cropperState.offsetY = Math.max(0, Math.min(maxOffsetY, cropperState.offsetY));
        
        drawCropPreview();
        
        startX = e.offsetX;
        startY = e.offsetY;
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
    
    // Touch events для мобильных
    canvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        startX = touch.clientX - rect.left;
        startY = touch.clientY - rect.top;
        e.preventDefault();
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging || !cropperState) return;
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const dx = x - startX;
        const dy = y - startY;
        
        cropperState.offsetX -= dx / cropperState.scale;
        cropperState.offsetY -= dy / cropperState.scale;
        
        const img = cropperState.image;
        const maxOffsetX = img.width - cropperState.cropWidth;
        const maxOffsetY = img.height - cropperState.cropHeight;
        
        cropperState.offsetX = Math.max(0, Math.min(maxOffsetX, cropperState.offsetX));
        cropperState.offsetY = Math.max(0, Math.min(maxOffsetY, cropperState.offsetY));
        
        drawCropPreview();
        
        startX = x;
        startY = y;
        e.preventDefault();
    });
    
    canvas.addEventListener('touchend', () => {
        isDragging = false;
    });
}

// Удаление фото поста
function removePostPhoto() {
    postPhotoFile = null;
    postPhotoDataUrl = null;
    
    const preview = document.getElementById('postPhotoPreview');
    preview.innerHTML = `
        <div class="photo-upload-placeholder">
            <div style="font-size: 48px; margin-bottom: 10px;">📷</div>
            <div style="font-size: 14px; color: #999;">Нажмите для добавления фото</div>
        </div>
    `;
    
    document.getElementById('postPhotoInput').value = '';
    document.getElementById('postPhotoRemoveBtn').style.display = 'none';
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
    
    const success = await createPostOnServer(text, selectedDuration, postPhotoDataUrl);
    
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
