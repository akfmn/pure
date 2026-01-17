// ============================================
// РЕДАКТИРОВАНИЕ ПРОФИЛЯ
// ============================================

// Открытие экрана редактирования (вызывается в showScreen)
function initEditProfile() {
    if (!currentUser) return;
    
    // Заполняем текущие данные
    document.getElementById('editName').value = currentUser.name || '';
    document.getElementById('editBirthdate').value = currentUser.birthdate || '';
    
    // Заполняем bio
    const bioTextarea = document.getElementById('editBio');
    bioTextarea.value = currentUser.bio || '';
    document.getElementById('editBioCount').textContent = bioTextarea.value.length;
    bioTextarea.oninput = function() {
        document.getElementById('editBioCount').textContent = this.value.length;
    };
    
    // Устанавливаем максимальную дату (18 лет назад)
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    document.getElementById('editBirthdate').max = maxDate.toISOString().split('T')[0];
    
    // Заполняем список стран
    const countrySelect = document.getElementById('editCountry');
    countrySelect.innerHTML = '<option value="">Выберите страну</option>';
    Object.keys(countriesData).sort().forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        if (country === currentUser.country) {
            option.selected = true;
        }
        countrySelect.appendChild(option);
    });
    
    // Загружаем города текущей страны
    loadEditCities();
    
    // Устанавливаем аватар
    selectedAvatar = currentUser.avatar || '👤';
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.avatar === selectedAvatar) {
            opt.classList.add('selected');
        }
    });
    
    // Обновляем подсказку возраста
    updateEditAge();
}

// Загрузка городов при выборе страны
function loadEditCities() {
    const countrySelect = document.getElementById('editCountry');
    const citySelect = document.getElementById('editCity');
    const selectedCountry = countrySelect.value;
    
    citySelect.innerHTML = '<option value="">Выберите город</option>';
    
    if (selectedCountry && countriesData[selectedCountry]) {
        countriesData[selectedCountry].forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            if (city === currentUser.city) {
                option.selected = true;
            }
            citySelect.appendChild(option);
        });
    }
}

// Выбор аватара
function selectAvatar(avatar) {
    selectedAvatar = avatar;
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

// Обновление подсказки возраста
function updateEditAge() {
    const birthdateInput = document.getElementById('editBirthdate');
    const ageHint = document.getElementById('editAgeHint');
    
    if (!birthdateInput.value) {
        ageHint.textContent = 'Возраст: --';
        ageHint.classList.remove('success');
        return;
    }
    
    const birthdate = new Date(birthdateInput.value);
    const today = new Date();
    
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
    }
    
    if (age >= 18) {
        ageHint.textContent = 'Возраст: ' + age + ' лет ✔';
        ageHint.classList.add('success');
    } else {
        ageHint.textContent = 'Возраст: ' + age + ' лет (минимум 18)';
        ageHint.classList.remove('success');
    }
}

// Сохранение профиля
async function saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const country = document.getElementById('editCountry').value;
    const city = document.getElementById('editCity').value;
    const bio = document.getElementById('editBio').value.trim();
    
    if (!name || name.length < 2) {
        await showError('Введите имя (минимум 2 символа)');
        return;
    }
    
    if (!country) {
        await showError('Выберите страну');
        return;
    }
    
    if (!city) {
        await showError('Выберите город');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentUserId,
                name: name,
                country: country,
                city: city,
                avatar: selectedAvatar,
                bio: bio
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser.name = name;
            currentUser.country = country;
            currentUser.city = city;
            currentUser.avatar = selectedAvatar;
            currentUser.bio = bio;
            
            localStorage.setItem('meetgo_user', JSON.stringify(currentUser));
            
            await showSuccess('Профиль обновлен!');
            showScreen('profileScreen');
            updateProfileDisplay();
        } else {
            await showError(data.error || 'Ошибка обновления профиля');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        await showError('Ошибка подключения к серверу');
    }
}

// Обновление отображения профиля
function updateProfileDisplay() {
    if (!currentUser) return;
    
    const genderText = currentUser.gender === 'male' ? 'М' : currentUser.gender === 'female' ? 'Ж' : '';
    
    document.getElementById('profileAvatar').textContent = currentUser.avatar || '👤';
    document.getElementById('profileName').textContent = currentUser.name || 'Пользователь';
    document.getElementById('profileAge').textContent = (currentUser.age || '--') + ' лет ' + genderText;
    document.getElementById('profileLocation').textContent = 
        `${currentUser.city || '--'}, ${currentUser.country || '--'}`;
}

// ============================================
// ПРОСМОТР ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================

async function openUserProfile(userId) {
    viewingUserId = userId;
    
    try {
        const response = await fetch(`${API_URL}/users.php?action=get_profile&user_id=${userId}`);
        const data = await response.json();
        
        if (data.success && data.user) {
            const user = data.user;
            
            document.getElementById('userProfileAvatar').textContent = user.avatar || '👤';
            document.getElementById('userProfileName').textContent = user.name || 'Пользователь';
            document.getElementById('userProfileAge').textContent = user.age || '?';
            document.getElementById('userProfileGender').textContent = user.gender === 'male' ? 'М' : user.gender === 'female' ? 'Ж' : '';
            document.getElementById('userProfileLocation').textContent = '📍 ' + (user.city || '') + (user.city && user.country ? ', ' : '') + (user.country || 'Не указано');
            document.getElementById('userProfileBio').textContent = user.bio || 'Пользователь пока ничего не написал о себе';
            
            const onlineEl = document.getElementById('userProfileOnline');
            if (user.is_online) {
                onlineEl.innerHTML = '<span class="online-dot"></span> В сети';
                onlineEl.classList.remove('offline');
            } else {
                onlineEl.innerHTML = '<span class="online-dot"></span> Не в сети';
                onlineEl.classList.add('offline');
            }
            
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
            
            await loadUserPosts(userId);
            
            showScreen('userProfileScreen');
        } else {
            await showError('Не удалось загрузить профиль');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        await showError('Ошибка загрузки профиля');
    }
}

async function loadUserPosts(userId) {
    const postsContainer = document.getElementById('userProfilePosts');
    
    try {
        const response = await fetch(`${API_URL}/posts.php?user_id=${userId}`);
        const data = await response.json();
        
        if (data.success && data.posts && data.posts.length > 0) {
            postsContainer.innerHTML = data.posts.map(post => `
                <div class="user-profile-post-card" onclick="openPostDetail(${post.id}, ${userId})">
                    <div class="user-profile-post-text">${post.text.length > 100 ? post.text.substring(0, 100) + '...' : post.text}</div>
                    ${post.photo ? '<div class="user-profile-post-has-photo">📷 Есть фото</div>' : ''}
                    <div class="user-profile-post-time">
                        ${formatTimeAgo(post.minutes_ago)} • осталось ${formatMinutesToTime(post.minutes_left)}
                    </div>
                </div>
            `).join('');
        } else {
            postsContainer.innerHTML = '<div class="user-profile-no-posts">Нет активных объявлений</div>';
        }
    } catch (error) {
        postsContainer.innerHTML = '<div class="user-profile-no-posts">Ошибка загрузки объявлений</div>';
    }
}

function closeUserProfile() {
    viewingUserId = null;
    showScreen('mainScreen');
}

// Открытие детального просмотра поста
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

function showPostDetailModal(post) {
    const modal = document.getElementById('postDetailModal');
    
    document.getElementById('postDetailAvatar').textContent = post.avatar || '👤';
    document.getElementById('postDetailName').textContent = post.name;
    document.getElementById('postDetailAge').textContent = post.age + ' лет';
    document.getElementById('postDetailText').textContent = post.text;
    document.getElementById('postDetailTime').textContent = formatTimeAgo(post.minutes_ago) + ' • осталось ' + formatMinutesToTime(post.minutes_left);
    
    const photoContainer = document.getElementById('postDetailPhoto');
    if (post.photo && post.photo !== 'null' && post.photo !== '') {
        photoContainer.innerHTML = `<img src="${post.photo}" alt="Фото" style="width: 100%; border-radius: 12px;">`;
        photoContainer.style.display = 'block';
    } else {
        photoContainer.style.display = 'none';
    }
    
    modal.classList.add('active');
}

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
    document.getElementById('bioCharCount').textContent = textarea.value.length;
    
    textarea.oninput = function() {
        document.getElementById('bioCharCount').textContent = this.value.length;
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

function openChatWithUser() {
    if (viewingUserId) {
        openChat(viewingUserId);
    }
}

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