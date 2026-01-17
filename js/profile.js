// ============================================
// PROFILE.JS - Модуль профиля пользователя
// Глобальные переменные viewingUserId и currentDetailPost 
// уже объявлены в config.js
// ============================================

// ============================================
// ОТКРЫТИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================
async function openUserProfile(userId) {
    viewingUserId = userId;
    
    try {
        const response = await fetch(`${API_URL}/users.php?action=get_profile&user_id=${userId}`);
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            
            // Заполняем профиль
            document.getElementById('userProfileAvatar').textContent = user.avatar || '👤';
            document.getElementById('userProfileName').textContent = user.name || 'Пользователь';
            document.getElementById('userProfileAge').textContent = user.age || '?';
            document.getElementById('userProfileGender').textContent = user.gender === 'male' ? 'М' : user.gender === 'female' ? 'Ж' : '';
            document.getElementById('userProfileLocation').textContent = '📍 ' + (user.city || '') + (user.city && user.country ? ', ' : '') + (user.country || 'Не указано');
            document.getElementById('userProfileBio').textContent = user.bio || 'Пользователь пока ничего не написал о себе';
            
            // Онлайн статус
            const onlineEl = document.getElementById('userProfileOnline');
            if (user.is_online) {
                onlineEl.innerHTML = '<span class="online-dot"></span> В сети';
                onlineEl.classList.remove('offline');
            } else {
                onlineEl.innerHTML = '<span class="online-dot"></span> Не в сети';
                onlineEl.classList.add('offline');
            }
            
            // Скрываем/показываем кнопки в зависимости от того, свой это профиль или чужой
            const reportBtn = document.getElementById('userProfileReportBtn');
            const chatBtn = document.getElementById('userProfileChatBtn');
            const editBioBtn = document.getElementById('editBioBtn');
            
            if (userId === currentUserId) {
                reportBtn.style.display = 'none';
                chatBtn.style.display = 'none';
                editBioBtn.style.display = 'flex';
            } else {
                reportBtn.style.display = 'block';
                chatBtn.style.display = 'block';
                editBioBtn.style.display = 'none';
            }
            
            // Загружаем посты пользователя
            await loadUserPosts(userId);
            
            // Показываем экран профиля
            showScreen('userProfileScreen');
        } else {
            await showError('Не удалось загрузить профиль');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        await showError('Ошибка загрузки профиля');
    }
}

// ============================================
// ЗАГРУЗКА ПОСТОВ ПОЛЬЗОВАТЕЛЯ
// ============================================
async function loadUserPosts(userId) {
    const postsContainer = document.getElementById('userProfilePosts');
    
    try {
        const response = await fetch(`${API_URL}/posts.php?user_id=${userId}`);
        const data = await response.json();
        
        if (data.success && data.posts && data.posts.length > 0) {
            postsContainer.innerHTML = data.posts.map(post => {
                // Парсим фотографии (поддержка разделителя |||)
                const photos = parsePhotos(post.photo);
                const photoCount = photos.length;
                
                // Генерируем HTML для фотографий
                let photosHtml = '';
                if (photoCount > 0) {
                    if (photoCount === 1) {
                        // Одно фото - показываем превью
                        photosHtml = `
                            <div class="user-profile-post-photos">
                                <div class="user-profile-post-photo">
                                    <img src="${photos[0]}" alt="Фото" loading="lazy">
                                </div>
                            </div>
                        `;
                    } else {
                        // Несколько фото - горизонтальный скролл
                        photosHtml = `
                            <div class="user-profile-post-photos-scroll">
                                ${photos.map((photo, index) => `
                                    <div class="user-profile-post-photo-item">
                                        <img src="${photo}" alt="Фото ${index + 1}" loading="lazy">
                                    </div>
                                `).join('')}
                            </div>
                            <div class="user-profile-post-photo-count">📷 ${photoCount} фото</div>
                        `;
                    }
                }
                
                return `
                    <div class="user-profile-post-card" onclick="openPostDetail(${post.id}, ${userId})">
                        <div class="user-profile-post-text">${post.text.length > 150 ? post.text.substring(0, 150) + '...' : post.text}</div>
                        ${photosHtml}
                        <div class="user-profile-post-time">
                            ${formatTimeAgo(post.minutes_ago)} • осталось ${formatMinutesToTime(post.minutes_left)}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            postsContainer.innerHTML = '<div class="user-profile-no-posts">Нет активных объявлений</div>';
        }
    } catch (error) {
        console.error('Error loading user posts:', error);
        postsContainer.innerHTML = '<div class="user-profile-no-posts">Ошибка загрузки объявлений</div>';
    }
}

// ============================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Парсинг фотографий
// ============================================
function parsePhotos(photoString) {
    const photos = [];
    
    if (!photoString || photoString === 'null' || photoString === '' || photoString === 'undefined') {
        return photos;
    }
    
    // Проверяем есть ли несколько фото (разделитель |||)
    if (photoString.includes('|||')) {
        const photoArray = photoString.split('|||');
        photoArray.forEach(p => {
            if (p && p.trim()) {
                photos.push(p.trim());
            }
        });
    } else {
        photos.push(photoString);
    }
    
    return photos;
}

// ============================================
// ЗАКРЫТИЕ ПРОФИЛЯ
// ============================================
function closeUserProfile() {
    viewingUserId = null;
    showScreen('mainScreen');
}

// ============================================
// ДЕТАЛЬНЫЙ ПРОСМОТР ПОСТА
// ============================================
async function openPostDetail(postId, userId) {
    try {
        const response = await fetch(`${API_URL}/posts.php?user_id=${userId}`);
        const data = await response.json();
        
        if (data.success && data.posts) {
            const post = data.posts.find(p => p.id === postId);
            if (post) {
                currentDetailPost = post;
                showPostDetailModal(post);
            }
        }
    } catch (error) {
        console.error('Error loading post:', error);
    }
}

// ============================================
// МОДАЛЬНОЕ ОКНО ПОСТА
// ============================================
function showPostDetailModal(post) {
    const modal = document.getElementById('postDetailModal');
    const container = modal.querySelector('.post-detail-modal') || modal;
    
    // Парсим фотографии
    const photos = parsePhotos(post.photo);
    const hasPhotos = photos.length > 0;
    
    // Данные пользователя
    const isOnline = post.is_online === 1 || post.is_online === '1';
    const onlineClass = isOnline ? 'online' : 'offline';
    const genderIcon = post.gender === 'male' ? '♂' : post.gender === 'female' ? '♀' : '';
    
    // Генерируем HTML для фотографий в модалке
    let photosHtml = '';
    if (hasPhotos) {
        photosHtml = `
            <div class="post-detail-photos">
                <div class="post-detail-photos-scroll" id="postDetailPhotosScroll">
                    ${photos.map((photo, index) => `
                        <div class="post-detail-photo-item">
                            <img src="${photo}" alt="Фото ${index + 1}" loading="lazy">
                        </div>
                    `).join('')}
                </div>
                ${photos.length > 1 ? `
                    <div class="post-detail-photo-indicators">
                        ${photos.map((_, index) => `
                            <div class="post-detail-photo-indicator ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Собираем полный HTML модалки
    container.innerHTML = `
        <div class="post-detail-close" onclick="closePostDetail()">✕</div>
        
        <div class="post-detail-content">
            <div class="post-detail-user">
                <div class="post-detail-avatar">
                    ${post.avatar || '👤'}
                    <div class="post-detail-online-badge ${onlineClass}"></div>
                </div>
                <div class="post-detail-user-info">
                    <div class="post-detail-name">${post.name || 'Пользователь'}</div>
                    <div class="post-detail-meta">
                        <span>${genderIcon} ${post.age} лет</span>
                        <span>📍 ${post.city || ''}${post.city && post.country ? ', ' : ''}${post.country || ''}</span>
                    </div>
                </div>
            </div>
            
            <div class="post-detail-text">${post.text}</div>
            
            ${photosHtml}
            
            <div class="post-detail-time">
                <span>⏱ Осталось ${formatMinutesToTime(post.minutes_left)}</span>
                <span>• ${formatTimeAgo(post.minutes_ago)}</span>
            </div>
            
            <div class="post-detail-actions">
                <button class="post-detail-btn post-detail-btn-chat" onclick="openChat(${post.user_id}); closePostDetail();">
                    💬 Написать
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Инициализируем скролл фотографий если их больше 1
    if (photos.length > 1) {
        initPostDetailPhotoScroll();
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ СКРОЛЛА ФОТОГРАФИЙ В МОДАЛКЕ
// ============================================
function initPostDetailPhotoScroll() {
    const scrollContainer = document.getElementById('postDetailPhotosScroll');
    const indicators = document.querySelectorAll('.post-detail-photo-indicator');
    
    if (!scrollContainer || indicators.length === 0) return;
    
    scrollContainer.addEventListener('scroll', () => {
        const scrollLeft = scrollContainer.scrollLeft;
        const itemWidth = scrollContainer.offsetWidth;
        const currentIndex = Math.round(scrollLeft / itemWidth);
        
        indicators.forEach((ind, index) => {
            ind.classList.toggle('active', index === currentIndex);
        });
    });
    
    // Клик по индикатору
    indicators.forEach((ind, index) => {
        ind.addEventListener('click', () => {
            const itemWidth = scrollContainer.offsetWidth;
            scrollContainer.scrollTo({
                left: itemWidth * index,
                behavior: 'smooth'
            });
        });
    });
}

// ============================================
// ЗАКРЫТИЕ МОДАЛКИ ПОСТА
// ============================================
function closePostDetail() {
    document.getElementById('postDetailModal').classList.remove('active');
    currentDetailPost = null;
}

// ============================================
// РЕДАКТИРОВАНИЕ "О СЕБЕ"
// ============================================
function editBio() {
    const currentBio = document.getElementById('userProfileBio').textContent;
    const textarea = document.getElementById('editBioTextarea');
    textarea.value = currentBio === 'Пользователь пока ничего не написал о себе' ? '' : currentBio;
    
    const charCount = document.getElementById('bioCharCount');
    if (charCount) {
        charCount.textContent = textarea.value.length;
    }
    
    textarea.oninput = function() {
        if (charCount) {
            charCount.textContent = this.value.length;
        }
    };
    
    document.getElementById('editBioModal').classList.add('active');
}

function closeEditBio() {
    document.getElementById('editBioModal').classList.remove('active');
}

async function saveBio() {
    const bio = document.getElementById('editBioTextarea').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/users.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentUserId,
                bio: bio
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('userProfileBio').textContent = bio || 'Пользователь пока ничего не написал о себе';
            currentUser.bio = bio;
            localStorage.setItem('meetgo_user', JSON.stringify(currentUser));
            closeEditBio();
            await showSuccess('Сохранено');
        } else {
            await showError(data.error || 'Ошибка сохранения');
        }
    } catch (error) {
        console.error('Save bio error:', error);
        await showError('Ошибка сохранения');
    }
}

// ============================================
// ОТКРЫТЬ ЧАТ С ПОЛЬЗОВАТЕЛЕМ
// ============================================
function openChatWithUser() {
    if (viewingUserId) {
        openChat(viewingUserId);
    }
}

// ============================================
// ЖАЛОБА НА ПОЛЬЗОВАТЕЛЯ
// ============================================
async function reportUser() {
    if (!viewingUserId) return;
    
    const confirmed = await showConfirm(
        'Вы уверены, что хотите пожаловаться на этого пользователя?',
        'Жалоба на пользователя',
        '⚠️'
    );
    
    if (confirmed) {
        try {
            const response = await fetch(`${API_URL}/reports.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reporter_id: currentUserId,
                    reported_user_id: viewingUserId,
                    type: 'user',
                    reason: 'Жалоба на пользователя'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                await showSuccess('Жалоба отправлена');
            } else {
                await showError(data.error || 'Ошибка отправки жалобы');
            }
        } catch (error) {
            console.error('Report error:', error);
            await showError('Ошибка отправки жалобы');
        }
    }
}

// ============================================
// ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ СВОЕГО ПРОФИЛЯ
// ============================================
function updateProfileDisplay() {
    if (!currentUser) return;
    
    const genderText = currentUser.gender === 'male' ? 'М' : currentUser.gender === 'female' ? 'Ж' : '';
    
    document.getElementById('profileAvatar').textContent = currentUser.avatar || '👤';
    document.getElementById('profileName').textContent = currentUser.name || 'Пользователь';
    document.getElementById('profileAge').textContent = (currentUser.age || '--') + ' лет ' + genderText;
    document.getElementById('profileLocation').textContent = 
        `${currentUser.city || '--'}, ${currentUser.country || '--'}`;
}