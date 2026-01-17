// ============================================
// CREATE-POST.JS - Создание постов
// Версия 2.0 - Полностью переписанный модуль
// ============================================

// Массив для хранения фото поста (до 3х)
var postPhotos = [];

// ============================================
// ВАЛИДАЦИЯ ДЛИТЕЛЬНОСТИ
// ============================================
function validateDuration() {
    var hoursInput = document.getElementById('hoursInput');
    var minutesInput = document.getElementById('minutesInput');
    var hint = document.getElementById('durationHint');
    
    if (!hoursInput || !minutesInput) return;
    
    var hours = parseInt(hoursInput.value) || 0;
    var minutes = parseInt(minutesInput.value) || 0;
    
    if (hours < 0) hours = 0;
    if (hours > 24) hours = 24;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    
    var totalMinutes = (hours * 60) + minutes;
    
    if (hint) {
        if (totalMinutes > 1440) {
            hoursInput.value = 24;
            minutesInput.value = 0;
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
    } else {
        selectedDuration = Math.max(1, Math.min(totalMinutes, 1440));
    }
    
    hoursInput.value = hours;
    minutesInput.value = minutes;
}

// ============================================
// ОБРАБОТКА ВЫБОРА ФОТО
// ============================================
function handlePostPhotoSelect(event) {
    console.log('handlePostPhotoSelect вызвана');
    
    var files = event.target.files;
    if (!files || files.length === 0) {
        console.log('Файлы не выбраны');
        return;
    }
    
    console.log('Выбрано файлов:', files.length);
    
    // Проверяем сколько фото уже есть
    var remainingSlots = 3 - postPhotos.length;
    if (remainingSlots <= 0) {
        alert('Максимум 3 фотографии');
        event.target.value = '';
        return;
    }
    
    // Берём только нужное количество файлов
    var filesToProcess = [];
    for (var i = 0; i < Math.min(files.length, remainingSlots); i++) {
        filesToProcess.push(files[i]);
    }
    
    console.log('Обрабатываем файлов:', filesToProcess.length);
    
    filesToProcess.forEach(function(file) {
        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            alert('Размер изображения не должен превышать 10MB');
            return;
        }
        
        // Читаем файл
        var reader = new FileReader();
        reader.onload = function(e) {
            var imageDataUrl = e.target.result;
            console.log('Файл прочитан, размер данных:', imageDataUrl.length);
            
            // Сжимаем изображение
            compressImage(imageDataUrl, function(compressedDataUrl) {
                postPhotos.push(compressedDataUrl);
                console.log('Фото добавлено, всего:', postPhotos.length);
                updatePhotoPreview();
            });
        };
        reader.onerror = function() {
            alert('Ошибка чтения файла');
        };
        reader.readAsDataURL(file);
    });
    
    // Сбрасываем input для повторного выбора
    event.target.value = '';
}

// ============================================
// СЖАТИЕ ИЗОБРАЖЕНИЯ
// ============================================
function compressImage(dataUrl, callback) {
    var img = new Image();
    img.onload = function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        
        var maxWidth = 1200;
        var maxHeight = 1200;
        
        var width = img.width;
        var height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
            var ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        var compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        console.log('Сжато с', dataUrl.length, 'до', compressedDataUrl.length);
        callback(compressedDataUrl);
    };
    img.onerror = function() {
        console.log('Ошибка загрузки изображения, используем оригинал');
        callback(dataUrl);
    };
    img.src = dataUrl;
}

// ============================================
// ОБНОВЛЕНИЕ ПРЕВЬЮ ФОТОГРАФИЙ
// ============================================
function updatePhotoPreview() {
    var preview = document.getElementById('postPhotoPreview');
    var removeBtn = document.getElementById('postPhotoRemoveBtn');
    
    if (!preview) {
        console.error('postPhotoPreview не найден!');
        return;
    }
    
    console.log('updatePhotoPreview, фото:', postPhotos.length);
    
    if (postPhotos.length === 0) {
        preview.innerHTML = '<div class="photo-upload-placeholder">' +
            '<div style="font-size: 48px; margin-bottom: 10px;">📷</div>' +
            '<div style="font-size: 14px; color: #999;">Нажмите для добавления фото (до 3х)</div>' +
            '</div>';
        preview.onclick = function() { document.getElementById('postPhotoInput').click(); };
        if (removeBtn) removeBtn.style.display = 'none';
    } else {
        var html = '<div class="photo-preview-grid">';
        
        for (var i = 0; i < postPhotos.length; i++) {
            html += '<div class="photo-preview-item">' +
                '<img src="' + postPhotos[i] + '" alt="Фото ' + (i + 1) + '">' +
                '<button type="button" class="photo-preview-remove" onclick="event.stopPropagation(); removePhoto(' + i + ')">✕</button>' +
                '</div>';
        }
        
        if (postPhotos.length < 3) {
            html += '<div class="photo-preview-add" onclick="event.stopPropagation(); document.getElementById(\'postPhotoInput\').click()">' +
                '<span>+</span>' +
                '</div>';
        }
        
        html += '</div>';
        preview.innerHTML = html;
        preview.onclick = null;
        
        if (removeBtn) {
            removeBtn.style.display = 'block';
            removeBtn.textContent = '✕ Удалить все фото';
        }
    }
    
    // Обновляем глобальную переменную для совместимости
    postPhotoDataUrl = postPhotos.length > 0 ? postPhotos[0] : null;
}

// ============================================
// УДАЛЕНИЕ ФОТО
// ============================================
function removePhoto(index) {
    console.log('Удаление фото по индексу:', index);
    postPhotos.splice(index, 1);
    updatePhotoPreview();
}

function removePostPhoto() {
    console.log('Удаление всех фото');
    postPhotos = [];
    postPhotoFile = null;
    postPhotoDataUrl = null;
    updatePhotoPreview();
    var input = document.getElementById('postPhotoInput');
    if (input) input.value = '';
}

// ============================================
// ВАЛИДАЦИЯ ФОРМЫ
// ============================================
function validateForm() {
    var textArea = document.getElementById('requestText');
    var postButton = document.getElementById('postButton');
    var charCounter = document.getElementById('charCounter');
    
    if (!textArea) return;
    
    var text = textArea.value;
    
    if (charCounter) {
        charCounter.textContent = text.length + ' / 550';
        
        if (text.length > 500) {
            charCounter.style.color = '#ff6b6b';
        } else if (text.length > 450) {
            charCounter.style.color = '#ffa500';
        } else {
            charCounter.style.color = '#666';
        }
    }
    
    if (postButton) {
        if (text.trim().length > 0) {
            postButton.style.opacity = '1';
        } else {
            postButton.style.opacity = '0.5';
        }
    }
}

// ============================================
// СОЗДАНИЕ ПОСТА
// ============================================
async function createRequest() {
    var textArea = document.getElementById('requestText');
    var postButton = document.getElementById('postButton');
    
    if (!textArea) {
        console.error('requestText не найден');
        return;
    }
    
    var text = textArea.value.trim();
    
    if (text.length === 0) {
        alert('Пожалуйста, напишите описание');
        return;
    }
    
    console.log('Создание поста...');
    console.log('Текст:', text.substring(0, 50) + '...');
    console.log('Длительность:', selectedDuration);
    console.log('Фото:', postPhotos.length);
    
    // Блокируем кнопку
    if (postButton) {
        postButton.textContent = 'Создание...';
        postButton.style.opacity = '0.5';
        postButton.style.pointerEvents = 'none';
    }
    
    try {
        // Объединяем фото через разделитель |||
        var photoToSend = postPhotos.length > 0 ? postPhotos.join('|||') : null;
        
        // Сохраняем длительность для сообщения
        var durationForMessage = selectedDuration;
        
        var success = await createPostOnServer(text, selectedDuration, photoToSend);
        
        console.log('Результат создания:', success);
        
        if (success) {
            // Очищаем форму
            textArea.value = '';
            removePostPhoto();
            validateForm();
            
            // Сбрасываем длительность
            var hoursInput = document.getElementById('hoursInput');
            var minutesInput = document.getElementById('minutesInput');
            if (hoursInput) hoursInput.value = 1;
            if (minutesInput) minutesInput.value = 0;
            validateDuration();
            
            // Переключаемся на главный экран
            showScreen('mainScreen');
            
            // Показываем сообщение об успехе
            setTimeout(function() {
                var durationText = '';
                if (durationForMessage >= 60) {
                    var h = Math.floor(durationForMessage / 60);
                    var m = durationForMessage % 60;
                    if (m > 0) {
                        durationText = h + ' ч ' + m + ' мин';
                    } else {
                        durationText = h + ' час(а)';
                    }
                } else {
                    durationText = durationForMessage + ' минут';
                }
                
                if (typeof showSuccess === 'function') {
                    showSuccess('Запрос создан! Он будет активен ' + durationText);
                } else {
                    alert('Запрос создан! Он будет активен ' + durationText);
                }
            }, 300);
        } else {
            alert('Ошибка при создании запроса. Попробуйте ещё раз.');
        }
    } catch (error) {
        console.error('Ошибка создания поста:', error);
        alert('Ошибка при создании запроса');
    }
    
    // Разблокируем кнопку
    if (postButton) {
        postButton.textContent = 'Создать';
        postButton.style.opacity = '1';
        postButton.style.pointerEvents = 'auto';
    }
}

// ============================================
// СОЗДАНИЕ ПОСТА НА СЕРВЕРЕ
// ============================================
async function createPostOnServer(text, durationMinutes, photoDataUrl) {
    try {
        var postData = {
            user_id: currentUserId,
            text: text,
            duration_minutes: durationMinutes,
            photo: photoDataUrl || null
        };
        
        // Добавляем координаты если доступны
        if (typeof userLocation !== 'undefined' && userLocation && userLocation.enabled) {
            postData.latitude = userLocation.latitude;
            postData.longitude = userLocation.longitude;
        }
        
        console.log('Отправка на сервер:', {
            user_id: postData.user_id,
            text: postData.text.substring(0, 30) + '...',
            duration: postData.duration_minutes,
            hasPhoto: !!postData.photo
        });
        
        var response = await fetch(API_URL + '/posts.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        var data = await response.json();
        console.log('Ответ сервера:', data);
        
        if (data.success) {
            // Перезагружаем посты
            if (typeof loadPostsFromServer === 'function') {
                await loadPostsFromServer();
            }
            return true;
        } else {
            console.error('Ошибка создания поста:', data.error);
            return false;
        }
    } catch (error) {
        console.error('Ошибка запроса:', error);
        return false;
    }
}

// Инициализация при загрузке
console.log('create-post.js загружен');