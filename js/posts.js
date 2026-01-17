// ============================================
// ПОСТЫ
// ============================================

// Получение серверного времени
function getServerTime() {
    return new Date(Date.now() + serverTimeOffset);
}

// Загрузка постов с сервера
async function loadPostsFromServer() {
    try {
        const response = await fetch(`${API_URL}/posts.php`);
        const data = await response.json();
        
        if (data.success) {
            // Вычисляем разницу между серверным и клиентским временем
            if (data.server_time) {
                const serverTime = new Date(data.server_time);
                const clientTime = new Date();
                serverTimeOffset = serverTime - clientTime;
                console.log('Time offset:', serverTimeOffset, 'ms');
            }
            
            console.log('Posts data:', data.posts);
            if (data.posts.length > 0) {
                console.log('First post coordinates:', {
                    latitude: data.posts[0].latitude,
                    longitude: data.posts[0].longitude,
                    post_latitude: data.posts[0].post_latitude,
                    post_longitude: data.posts[0].post_longitude
                });
            }
            
            let postsToDisplay = data.posts;
            
            if (currentFilter === 'my') {
                postsToDisplay = postsToDisplay.filter(post => post.user_id === currentUserId);
                console.log('Filtered my posts:', postsToDisplay.length);
            } else {
                postsToDisplay = postsToDisplay.filter(post => post.user_id !== currentUserId);
                console.log('Filtered out own posts, remaining:', postsToDisplay.length);
                
                // Фильтр по возрасту (работает для всех фильтров кроме "Мои")
                if (ageFilter.enabled) {
                    postsToDisplay = postsToDisplay.filter(post => {
                        const age = parseInt(post.age);
                        return age >= ageFilter.min && age <= ageFilter.max;
                    });
                }
                
                // Фильтр "Онлайн" - показываем только тех кто в сети
                if (currentFilter === 'online') {
                    postsToDisplay = postsToDisplay.filter(post => {
                        return post.is_online === 1 || post.is_online === '1';
                    });
                    console.log('Filtered online users:', postsToDisplay.length);
                    
                    // Сортируем по расстоянию
                    if (userLocation.latitude && userLocation.longitude) {
                        postsToDisplay = postsToDisplay.map(post => {
                            const distance = getDistanceToPost(post);
                            return {
                                ...post,
                                calculatedDistance: distance
                            };
                        });
                        
                        postsToDisplay.sort((a, b) => {
                            if (a.calculatedDistance === null) return 1;
                            if (b.calculatedDistance === null) return -1;
                            return a.calculatedDistance - b.calculatedDistance;
                        });
                    }
                }
                
                // Фильтр "Рядом" - сортировка по расстоянию
                if (currentFilter === 'nearby') {
                    if (userLocation.latitude && userLocation.longitude) {
                        postsToDisplay = postsToDisplay.map(post => {
                            const distance = getDistanceToPost(post);
                            return {
                                ...post,
                                calculatedDistance: distance
                            };
                        });
                        
                        postsToDisplay.sort((a, b) => {
                            if (a.calculatedDistance === null) return 1;
                            if (b.calculatedDistance === null) return -1;
                            return a.calculatedDistance - b.calculatedDistance;
                        });
                        
                        console.log('Sorted by distance:', postsToDisplay.map(p => ({
                            id: p.id,
                            distance: p.calculatedDistance
                        })));
                    } else {
                        console.log('No user location for nearby sorting');
                    }
                }
            }
            
            currentPosts = postsToDisplay;
            
            displayPosts(postsToDisplay);
        } else {
            console.error('Failed to load posts:', data.error);
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

// Отображение постов на странице
function displayPosts(posts) {
    const content = document.getElementById('mainContent');
    content.innerHTML = '';
    
    if (posts.length === 0 && currentFilter === 'my') {
        content.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">У вас пока нет объявлений</div>
                <div style="font-size: 14px; margin-bottom: 30px;">Создайте своё первое объявление</div>
                <button onclick="showScreen('createScreen')" style="
                    background: white;
                    color: #0a0a0a;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                ">+ Создать объявление</button>
            </div>
        `;
        return;
    }
    
    // Пустое состояние для фильтра "Онлайн"
    if (posts.length === 0 && currentFilter === 'online') {
        content.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">😴</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">Никого нет онлайн</div>
                <div style="font-size: 14px;">Попробуйте зайти позже или посмотрите все объявления</div>
            </div>
        `;
        return;
    }
    
    // Подсказка о геолокации для фильтров "Рядом" и "Онлайн"
    if ((currentFilter === 'nearby' || currentFilter === 'online') && !userLocation.latitude) {
        const hint = document.createElement('div');
        hint.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #3a3a3a;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
            color: #999;
        `;
        hint.innerHTML = `
            <div style="margin-bottom: 10px;">📍</div>
            <div style="font-size: 14px; margin-bottom: 10px;">Включите геолокацию для сортировки по расстоянию</div>
            <button onclick="requestGeolocation()" style="
                background: #3a3a3a;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
            ">Включить геолокацию</button>
        `;
        content.appendChild(hint);
    }
    
    posts.forEach(post => {
        const card = createPostCard(post);
        content.appendChild(card);
    });
    
    startPostTimersFromServer();
}

// Создание карточки поста
function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'request-card';
    
    const timeAgo = formatTimeAgo(post.minutes_ago);
    
    const distance = post.calculatedDistance !== undefined ? post.calculatedDistance : getDistanceToPost(post);
    let distanceText;
    
    if (distance !== null) {
        distanceText = formatDistance(distance);
    } else {
        distanceText = post.city || '?';
    }
    
    let expiresAt = post.expires_at_iso || post.expires_at;
    
    const isOnline = post.is_online === 1 || post.is_online === '1';
    const onlineClass = isOnline ? 'online' : 'offline';
    
    // Пол
    const genderIcon = post.gender === 'male' ? '♂' : post.gender === 'female' ? '♀' : '';
    const genderText = post.gender === 'male' ? 'Мужчина' : post.gender === 'female' ? 'Женщина' : '';
    
    // Дата регистрации (если есть created_at пользователя)
    const registeredText = post.user_created_at ? formatRegisteredDate(post.user_created_at) : '';
    
    // Фото - поддержка до 3х фото (пока только 1)
    const photos = [];
    if (post.photo && post.photo !== 'null' && post.photo !== '' && post.photo !== 'undefined') {
        photos.push(post.photo);
    }
    
    // Определяем количество слайдов (2 или 3 в зависимости от наличия фото)
    const hasPhotos = photos.length > 0;
    const slideCount = hasPhotos ? 3 : 2;
    
    card.innerHTML = `
        <div class="card-swiper" data-card-id="${post.id}">
            <!-- Slide 1: User Info -->
            <div class="card-slide card-user-slide" onclick="openRequest(${post.id})">
                <div class="card-avatar">
                    ${post.avatar || '👤'}
                    <div class="online-badge ${onlineClass}"></div>
                </div>
                <div class="card-user-name">${post.name}</div>
                <div class="card-user-info">
                    <span class="gender-icon">${genderIcon}</span>
                    <span>${genderText}</span>
                    <span>•</span>
                    <span>${post.age} лет</span>
                </div>
                <div class="card-user-location">📍 ${post.city || ''}${post.city && post.country ? ', ' : ''}${post.country || ''}</div>
                ${registeredText ? `<div class="card-user-registered">На сайте ${registeredText}</div>` : ''}
                <div class="card-user-distance">${distanceText}</div>
            </div>
            
            <!-- Slide 2: Post Content -->
            <div class="card-slide card-content-slide">
                <div class="card-timer-row">
                    <div class="card-timer">
                        <span class="card-timer-icon">⏱</span>
                        <span class="post-timer" data-minutes-left="${post.minutes_left}" data-expires="${expiresAt}">
                            ${formatMinutesToTime(post.minutes_left)}
                        </span>
                    </div>
                    <div class="card-posted-time">${timeAgo}</div>
                </div>
                <div class="card-text">${post.text}</div>
                <div class="card-actions">
                    <div class="card-action-btn" onclick="event.stopPropagation(); openChat(${post.user_id})">💬</div>
                    <div class="card-action-btn" onclick="event.stopPropagation(); showMenu(event, ${post.id}, ${post.user_id})">⋮</div>
                </div>
            </div>
            
            <!-- Slide 3: Photos -->
            ${hasPhotos ? `
            <div class="card-slide card-photos-slide">
                <div class="card-photos-grid photos-${photos.length}">
                    ${photos.map(photo => `
                        <div class="card-photo">
                            <img src="${photo}" alt="Фото" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : `
            <div class="card-slide card-photos-slide">
                <div class="card-no-photos">
                    <div class="card-no-photos-icon">📷</div>
                    <div class="card-no-photos-text">Нет фотографий</div>
                </div>
            </div>
            `}
        </div>
        
        <!-- Slide Indicators -->
        <div class="card-indicators">
            <div class="card-indicator active" data-slide="0"></div>
            <div class="card-indicator" data-slide="1"></div>
            <div class="card-indicator" data-slide="2"></div>
        </div>
    `;
    
    // Добавляем обработчик скролла для индикаторов
    const swiper = card.querySelector('.card-swiper');
    const indicators = card.querySelectorAll('.card-indicator');
    
    swiper.addEventListener('scroll', () => {
        const scrollLeft = swiper.scrollLeft;
        const slideWidth = swiper.offsetWidth;
        const currentSlide = Math.round(scrollLeft / slideWidth);
        
        indicators.forEach((ind, index) => {
            ind.classList.toggle('active', index === currentSlide);
        });
    });
    
    // Клик по индикатору для перехода к слайду
    indicators.forEach((ind, index) => {
        ind.addEventListener('click', () => {
            const slideWidth = swiper.offsetWidth;
            swiper.scrollTo({
                left: slideWidth * index,
                behavior: 'smooth'
            });
        });
    });
    
    return card;
}

// Форматирование даты регистрации
function formatRegisteredDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'сегодня';
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн.`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед.`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} мес.`;
    return `${Math.floor(diffDays / 365)} г.`;
}

// Форматирование минут в формат времени HH:MM:SS
function formatMinutesToTime(totalMinutes) {
    if (totalMinutes <= 0) return 'Истекло';
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes % 1) * 60);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Форматирование времени "назад"
function formatTimeAgo(minutes) {
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${Math.floor(minutes)} мин назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} д назад`;
}

// Запуск таймеров обратного отсчета
function startPostTimersFromServer() {
    const postTimers = document.querySelectorAll('.post-timer');
    
    postTimers.forEach(timerElement => {
        let expiresAtString = timerElement.dataset.expires;
        
        let expiresAt;
        if (expiresAtString.includes('T')) {
            expiresAt = new Date(expiresAtString.replace(' ', 'T'));
        } else {
            expiresAt = new Date(expiresAtString.replace(' ', 'T'));
        }
        
        if (isNaN(expiresAt.getTime())) {
            console.error('Invalid date:', expiresAtString);
            timerElement.textContent = 'Ошибка';
            return;
        }
        
        const updateTimer = () => {
            const now = getServerTime();
            const timeLeft = expiresAt - now;
            
            if (timeLeft <= 0) {
                timerElement.textContent = 'Истекло';
                const card = timerElement.closest('.request-card');
                if (card) {
                    card.style.opacity = '0.5';
                    card.style.pointerEvents = 'none';
                }
                return false;
            } else {
                const totalSeconds = Math.floor(timeLeft / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                
                timerElement.textContent = 
                    `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                return true;
            }
        };
        
        if (updateTimer()) {
            const interval = setInterval(() => {
                if (!updateTimer()) {
                    clearInterval(interval);
                }
            }, 1000);
        }
    });
}

// Создание поста на сервере
async function createPostOnServer(text, durationMinutes, photoDataUrl) {
    try {
        const postData = {
            user_id: currentUserId,
            text: text,
            duration_minutes: durationMinutes,
            photo: photoDataUrl || null
        };
        
        if (userLocation.enabled) {
            postData.latitude = userLocation.latitude;
            postData.longitude = userLocation.longitude;
        }
        
        const response = await fetch(`${API_URL}/posts.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadPostsFromServer();
            return true;
        } else {
            console.error('Failed to create post:', data.error);
            return false;
        }
    } catch (error) {
        console.error('Error creating post:', error);
        return false;
    }
}

// Отправка жалобы на сервер
async function reportPostOnServer(postId) {
    try {
        const response = await fetch(`${API_URL}/reports.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reporter_id: currentUserId,
                post_id: postId,
                reason: 'Нарушение правил'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            return true;
        } else {
            console.error('Failed to report post:', data.error);
            return false;
        }
    } catch (error) {
        console.error('Error reporting post:', error);
        return false;
    }
}

// Open request details
function openRequest(postId) {
    const post = currentPosts.find(p => p.id === postId);
    if (post) {
        openUserProfile(post.user_id);
    }
}

// Delete my post
async function deleteMyPost() {
    closeMenu();
    
    const confirmed = await showConfirm(
        'Вы уверены, что хотите удалить это объявление?',
        'Удаление объявления',
        '🗑'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/posts.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                post_id: currentPostId,
                user_id: currentUserId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            await showSuccess('Объявление удалено');
            await loadPostsFromServer();
        } else {
            await showError(data.message || 'Ошибка при удалении объявления');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        await showError('Ошибка соединения с сервером');
    }
}

// Report post
async function reportPost() {
    const success = await reportPostOnServer(currentPostId);
    
    if (success) {
        alert('Жалоба на пост #' + currentPostId + ' отправлена');
    } else {
        alert('Ошибка при отправке жалобы. Попробуйте ещё раз.');
    }
    
    closeMenu();
}