// ============================================
// ГЕОЛОКАЦИЯ
// ============================================

// Запрос геолокации у пользователя
function requestGeolocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation.latitude = position.coords.latitude;
                userLocation.longitude = position.coords.longitude;
                userLocation.enabled = true;
                console.log('✅ Геолокация получена:', userLocation);
                
                // Обновляем координаты на сервере
                updateUserLocation();
                
                // Перезагружаем посты с актуальными расстояниями
                if (currentUserId) {
                    loadPostsFromServer();
                }
            },
            (error) => {
                console.warn('❌ Геолокация недоступна:', error.message);
                userLocation.enabled = false;
                
                showGeolocationError(error.code);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 минут
            }
        );
    } else {
        console.warn('❌ Геолокация не поддерживается браузером');
        showError('Геолокация не поддерживается вашим браузером');
    }
}

// Показать ошибку геолокации с кнопкой настроек
function showGeolocationError(errorCode) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'geoErrorOverlay';
    overlay.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:10000; align-items:center; justify-content:center; padding:20px;';
    
    let title = '';
    let message = '';
    let showSettingsBtn = false;
    
    switch(errorCode) {
        case 1: // PERMISSION_DENIED
            title = '📍 Доступ к геолокации';
            message = 'Для показа расстояний и фильтра "Рядом" нужен доступ к вашему местоположению.';
            showSettingsBtn = true;
            break;
        case 2: // POSITION_UNAVAILABLE
            title = '📍 GPS недоступен';
            message = 'Не удалось определить местоположение. Убедитесь что GPS включён на устройстве.';
            break;
        case 3: // TIMEOUT
            title = '📍 Время ожидания';
            message = 'Не удалось получить местоположение. Попробуйте выйти на открытое место.';
            break;
        default:
            title = '📍 Геолокация';
            message = 'Не удалось получить местоположение.';
    }
    
    overlay.innerHTML = `
        <div style="background:#1a1a1a; border-radius:20px; padding:24px; max-width:320px; width:100%; text-align:center;">
            <div style="font-size:48px; margin-bottom:16px;">📍</div>
            <div style="font-size:18px; font-weight:600; color:#fff; margin-bottom:12px;">${title}</div>
            <div style="font-size:14px; color:#aaa; margin-bottom:24px; line-height:1.5;">${message}</div>
            
            ${showSettingsBtn ? `
                <div style="background:#2a2a2a; border-radius:12px; padding:16px; margin-bottom:20px; text-align:left;">
                    <div style="font-size:13px; color:#888; margin-bottom:8px;">Как включить:</div>
                    <div style="font-size:13px; color:#ccc; line-height:1.6;">
                        1. Откройте <b>Настройки</b> телефона<br>
                        2. Найдите <b>Meet&Go</b> или <b>Chrome</b><br>
                        3. <b>Разрешения</b> → <b>Местоположение</b><br>
                        4. Выберите <b>Разрешить</b>
                    </div>
                </div>
                <button onclick="tryOpenAppSettings()" style="
                    width:100%;
                    padding:14px;
                    background:#4ade80;
                    color:#000;
                    border:none;
                    border-radius:12px;
                    font-size:15px;
                    font-weight:600;
                    cursor:pointer;
                    margin-bottom:10px;
                ">Открыть настройки</button>
            ` : ''}
            
            <button onclick="closeGeoError()" style="
                width:100%;
                padding:14px;
                background:${showSettingsBtn ? '#333' : '#4ade80'};
                color:${showSettingsBtn ? '#fff' : '#000'};
                border:none;
                border-radius:12px;
                font-size:15px;
                font-weight:500;
                cursor:pointer;
            ">${showSettingsBtn ? 'Позже' : 'Понятно'}</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

// Закрыть окно ошибки геолокации
function closeGeoError() {
    const overlay = document.getElementById('geoErrorOverlay');
    if (overlay) overlay.remove();
}

// Попытка открыть настройки приложения
function tryOpenAppSettings() {
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    
    if (isAndroid) {
        try {
            window.location.href = 'intent://settings#Intent;scheme=android-app;end';
        } catch(e) {
            showError('Откройте настройки телефона вручную:\n\nНастройки → Приложения → Meet&Go → Разрешения → Местоположение');
        }
    } else if (isIOS) {
        try {
            window.location.href = 'app-settings:';
        } catch(e) {
            showError('Откройте настройки iPhone:\n\nНастройки → Конфиденциальность → Службы геолокации → Safari/Meet&Go');
        }
    } else {
        showError('Нажмите на иконку 🔒 слева от адресной строки браузера и разрешите доступ к местоположению.');
    }
    
    closeGeoError();
}

// Обновление координат пользователя на сервере
async function updateUserLocation() {
    if (!currentUserId || !userLocation.enabled) return;
    
    try {
        await fetch(`${API_URL}/users.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentUserId,
                latitude: userLocation.latitude,
                longitude: userLocation.longitude
            })
        });
        console.log('Координаты обновлены на сервере');
    } catch (error) {
        console.error('Ошибка обновления координат:', error);
    }
}

// Расчет расстояния между двумя точками (формула Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance; // в километрах
}

// Форматирование расстояния для отображения
function formatDistance(distance) {
    console.log('formatDistance called with:', distance);
    
    if (distance === null || distance === undefined) {
        return null; // Вернем null чтобы показать город
    }
    
    let result;
    if (distance < 0.5) {
        result = '<500 м';
    } else if (distance < 1) {
        result = Math.round(distance * 1000) + ' м';
    } else if (distance < 10) {
        result = distance.toFixed(1) + ' км';
    } else {
        result = Math.round(distance) + ' км';
    }
    
    console.log('formatDistance result:', result);
    return result;
}

// Вычисление расстояния от текущего пользователя до поста
function getDistanceToPost(post) {
    const postLat = post.post_latitude || post.latitude;
    const postLon = post.post_longitude || post.longitude;
    
    console.log('Calculating distance for post:', {
        postId: post.id,
        postLat: postLat,
        postLon: postLon,
        userLat: userLocation.latitude,
        userLon: userLocation.longitude
    });
    
    if (userLocation.latitude && userLocation.longitude && postLat && postLon) {
        const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(postLat),
            parseFloat(postLon)
        );
        console.log('Calculated distance:', distance, 'km');
        return distance;
    }
    
    console.log('Distance not calculated - missing data');
    return null;
}
