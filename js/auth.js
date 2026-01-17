// ============================================
// АВТОРИЗАЦИЯ
// ============================================

// Инициализация формы регистрации
function initRegistrationForm() {
    // Устанавливаем максимальную дату (18 лет назад)
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const maxDateString = maxDate.toISOString().split('T')[0];
    document.getElementById('regBirthdate').max = maxDateString;
    
    // Заполняем список стран
    const countrySelect = document.getElementById('regCountry');
    Object.keys(countriesData).sort().forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
}

// Загрузка городов при выборе страны
function loadCities() {
    const countrySelect = document.getElementById('regCountry');
    const citySelect = document.getElementById('regCity');
    const selectedCountry = countrySelect.value;
    
    citySelect.innerHTML = '<option value="">Выберите город</option>';
    
    if (selectedCountry && countriesData[selectedCountry]) {
        citySelect.disabled = false;
        
        countriesData[selectedCountry].forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    } else {
        citySelect.disabled = true;
    }
}

// Валидация возраста
function validateAge() {
    const birthdateInput = document.getElementById('regBirthdate');
    const ageHint = document.getElementById('ageHint');
    const birthdate = new Date(birthdateInput.value);
    const today = new Date();
    
    if (!birthdateInput.value) {
        ageHint.textContent = 'Минимум 18 лет';
        ageHint.classList.remove('error');
        return true;
    }
    
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
    }
    
    if (age < 18) {
        ageHint.textContent = 'Вам должно быть минимум 18 лет (сейчас: ' + age + ' лет)';
        ageHint.classList.add('error');
        return false;
    } else {
        ageHint.textContent = 'Возраст: ' + age + ' лет ✔';
        ageHint.classList.remove('error');
        ageHint.style.color = '#4a4';
        return true;
    }
}

// Проверка авторизации из localStorage
function checkAuth() {
    const savedUser = localStorage.getItem('meetgo_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            currentUserId = currentUser.id;
            return true;
        } catch (e) {
            localStorage.removeItem('meetgo_user');
        }
    }
    return false;
}

// Вход
async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        alert('Введите логин и пароль');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'login',
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            currentUserId = data.user.id;
            localStorage.setItem('meetgo_user', JSON.stringify(data.user));
            
            // Сбрасываем фильтр на nearby
            currentFilter = 'nearby';
            document.querySelectorAll('.filter-item').forEach(item => {
                item.classList.remove('active');
            });
            const nearbyFilter = document.querySelector('.filter-item[onclick*="nearby"]');
            if (nearbyFilter) nearbyFilter.classList.add('active');
            
            // Обновляем активность при входе
            updateUserActivity();
            
            // Запрашиваем геолокацию
            requestGeolocation();
            
            // Переход на главный экран
            showScreen('mainScreen');
            loadPostsFromServer();
            initPullToRefresh();
            initAgeFilter();
            startUnreadCheck();
        } else {
            await showLoginError(data.error || 'Неверный логин или пароль');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка подключения к серверу');
    }
}

// Показать ошибку входа с кнопкой "Забыли пароль?"
function showLoginError(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalIcon = document.getElementById('modalIcon');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');
        
        modalTitle.textContent = 'Ошибка входа';
        modalMessage.textContent = message;
        modalIcon.textContent = '❌';
        
        confirmBtn.textContent = 'OK';
        cancelBtn.textContent = 'Забыли пароль?';
        cancelBtn.style.display = 'block';
        
        modal.classList.add('active');
        
        const handleConfirm = () => {
            modal.classList.remove('active');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleForgot);
            confirmBtn.textContent = 'OK';
            cancelBtn.textContent = 'Отмена';
            resolve(true);
        };
        
        const handleForgot = () => {
            modal.classList.remove('active');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleForgot);
            confirmBtn.textContent = 'OK';
            cancelBtn.textContent = 'Отмена';
            showRecoveryModal();
            resolve(false);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleForgot);
    });
}

// Выбор пола
function selectGender(gender) {
    selectedGender = gender;
    document.querySelectorAll('.gender-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelector(`[data-gender="${gender}"]`).classList.add('selected');
}

// Регистрация
async function handleRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const birthdateInput = document.getElementById('regBirthdate').value;
    const country = document.getElementById('regCountry').value;
    const city = document.getElementById('regCity').value;
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    
    // Валидация
    if (!name || name.length < 2) {
        await showError('Введите имя (минимум 2 символа)');
        return;
    }
    
    if (!email) {
        await showError('Введите email');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        await showError('Введите корректный email');
        return;
    }
    
    if (!selectedGender) {
        await showError('Выберите пол');
        return;
    }
    
    if (!birthdateInput) {
        await showError('Выберите дату рождения');
        return;
    }
    
    const birthdate = new Date(birthdateInput);
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
    }
    
    if (age < 18) {
        await showError('Вам должно быть минимум 18 лет');
        document.getElementById('ageHint').classList.add('error');
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
    
    if (!username || username.length < 3) {
        await showError('Логин должен быть минимум 3 символа');
        return;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        await showError('Логин может содержать только английские буквы, цифры и символ подчеркивания');
        return;
    }
    
    if (!password || password.length < 6) {
        await showError('Пароль должен быть минимум 6 символов');
        return;
    }
    
    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*]+$/;
    if (!passwordRegex.test(password)) {
        await showError('Пароль может содержать только английские буквы, цифры и символы !@#$%^&*');
        return;
    }
    
    try {
        console.log('Отправка запроса регистрации...');
        
        const response = await fetch(`${API_URL}/auth.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'register',
                name: name,
                email: email,
                gender: selectedGender,
                age: age,
                birthdate: birthdateInput,
                country: country,
                city: city,
                username: username,
                password: password
            })
        });
        
        console.log('Статус ответа:', response.status);
        
        const text = await response.text();
        console.log('Сырой ответ:', text);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Ошибка парсинга JSON:', e);
            await showError('Ошибка сервера. Проверьте консоль для деталей.');
            return;
        }
        
        if (data.success) {
            await showSuccess(data.message);
            document.getElementById('loginUsername').value = username;
            document.getElementById('loginPassword').value = password;
            showScreen('loginScreen');
            setTimeout(() => handleLogin(), 500);
        } else {
            let errorMsg = data.error || 'Ошибка регистрации';
            if (data.debug_info) {
                errorMsg += '\n\nДетали:\nФайл: ' + data.debug_info.file + '\nСтрока: ' + data.debug_info.line;
            }
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Ошибка подключения к серверу.\n\nПроверьте:\n1. API URL: ' + API_URL + '\n2. Файл auth.php загружен\n3. Консоль браузера (F12)');
    }
}

// Выход
function handleLogout() {
    stopChatPolling();
    stopChatsListPolling();
    stopUnreadCheck();
    
    localStorage.removeItem('meetgo_user');
    
    currentUser = null;
    currentUserId = null;
    currentChatId = null;
    currentChatUserId = null;
    currentChatBlocked = false;
    currentChatBlockedByMe = false;
    
    currentFilter = 'nearby';
    
    userLocation.latitude = null;
    userLocation.longitude = null;
    userLocation.enabled = false;
    
    ageFilter.enabled = false;
    ageFilter.min = 18;
    ageFilter.max = 100;
    
    document.querySelectorAll('.filter-item').forEach(item => {
        item.classList.remove('active');
    });
    const nearbyFilter = document.querySelector('.filter-item[onclick*="nearby"]');
    if (nearbyFilter) nearbyFilter.classList.add('active');
    
    updateUnreadIndicator(0);
    
    showScreen('loginScreen');
}

// ============================================
// ВОССТАНОВЛЕНИЕ ПАРОЛЯ
// ============================================

function showRecoveryModal() {
    document.getElementById('recoveryEmail').value = '';
    document.getElementById('recoveryModal').classList.add('active');
}

function closeRecoveryModal() {
    document.getElementById('recoveryModal').classList.remove('active');
}

async function sendRecoveryEmail() {
    const emailInput = document.getElementById('recoveryEmail');
    if (!emailInput) {
        return;
    }
    
    const email = emailInput.value.trim();
    
    if (!email) {
        await showError('Введите email');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        await showError('Введите корректный email');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/recovery.php?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        closeRecoveryModal();
        
        if (data.success) {
            await showSuccess('Данные для входа отправлены на указанный email');
        } else {
            await showError(data.error || 'Ошибка восстановления');
        }
    } catch (error) {
        console.error('Recovery error:', error);
        closeRecoveryModal();
        await showError('Ошибка подключения к серверу');
    }
}
