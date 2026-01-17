// ============================================
// НАВИГАЦИЯ И UI
// ============================================

let backPressedOnce = false;
let backPressTimer = null;
let navigationHistory = ['mainScreen'];

// Функция навигации с историей
function navigateTo(screenId) {
    if (navigationHistory[navigationHistory.length - 1] !== screenId) {
        navigationHistory.push(screenId);
        window.history.pushState({screen: screenId}, '', window.location.href);
    }
    showScreen(screenId);
}

// Функция возврата назад
function navigateBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        const previousScreen = navigationHistory[navigationHistory.length - 1];
        showScreen(previousScreen);
        return true;
    }
    return false;
}

// Screen navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    // Останавливаем polling чата при выходе из экрана чата
    if (screenId !== 'chatScreen') {
        stopChatPolling();
        currentChatId = null;
        currentChatUserId = null;
    }
    
    // Останавливаем polling списка чатов при выходе из экрана чатов
    if (screenId !== 'chatsScreen') {
        stopChatsListPolling();
    }
    
    // Если это главный экран - прокручиваем его контент
    if (screenId === 'mainScreen') {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    } else {
        const screenElement = document.getElementById(screenId);
        if (screenElement) {
            const contentElement = screenElement.querySelector('.content');
            if (contentElement) {
                contentElement.scrollTop = 0;
            }
        }
    }
    
    // Добавляем в историю браузера если это не главный экран
    if (screenId !== 'mainScreen') {
        window.history.pushState({ screen: screenId }, '', window.location.href);
    }
    
    // Обновляем профиль при открытии экрана профиля
    if (screenId === 'profileScreen' && currentUser) {
        updateProfileDisplay();
    }
    
    // Инициализируем форму регистрации
    if (screenId === 'registerScreen') {
        initRegistrationForm();
    }
    
    // Инициализируем форму редактирования профиля
    if (screenId === 'editProfileScreen' && currentUser) {
        initEditProfile();
    }
}

// Переход на главный экран с обновлением ленты
async function goToMainAndRefresh() {
    showScreen('mainScreen');
    
    const mainContent = document.getElementById('mainContent');
    const pullIndicator = document.getElementById('pullIndicator');
    
    if (!mainContent || !pullIndicator) {
        await loadPostsFromServer();
        return;
    }
    
    mainContent.style.transition = 'transform 0.3s ease-out';
    pullIndicator.style.transition = 'all 0.3s ease-out';
    
    mainContent.style.transform = 'translateY(60px)';
    pullIndicator.style.transform = 'translateY(60px)';
    pullIndicator.style.opacity = 1;
    pullIndicator.querySelector('.pull-text').textContent = 'Обновление...';
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await loadPostsFromServer();
    
    setTimeout(() => {
        mainContent.style.transform = '';
        pullIndicator.style.opacity = 0;
        pullIndicator.style.transform = '';
        
        setTimeout(() => {
            mainContent.style.transition = '';
            pullIndicator.style.transition = '';
        }, 300);
    }, 300);
}

// ============================================
// PULL-TO-REFRESH
// ============================================

let pullStartY = 0;
let isPulling = false;
let pullDistance = 0;

function initPullToRefresh() {
    const mainContent = document.getElementById('mainContent');
    const pullIndicator = document.getElementById('pullIndicator');
    
    if (!mainContent || !pullIndicator) return;
    
    mainContent.addEventListener('touchstart', (e) => {
        if (mainContent.scrollTop === 0) {
            pullStartY = e.touches[0].clientY;
            isPulling = true;
            mainContent.style.transition = 'none';
        }
    }, { passive: true });
    
    mainContent.addEventListener('touchmove', (e) => {
        if (!isPulling || mainContent.scrollTop > 0) {
            isPulling = false;
            mainContent.style.transform = '';
            mainContent.style.transition = '';
            return;
        }
        
        const currentY = e.touches[0].clientY;
        pullDistance = Math.max(0, currentY - pullStartY);
        
        const damping = 0.5;
        const dampedDistance = pullDistance * damping;
        
        const maxDistance = 100;
        const finalDistance = Math.min(dampedDistance, maxDistance);
        
        if (finalDistance > 5) {
            mainContent.style.transform = `translateY(${finalDistance}px)`;
            
            const opacity = Math.min(finalDistance / 40, 1);
            pullIndicator.style.opacity = opacity;
            pullIndicator.style.transform = `translateY(${finalDistance}px)`;
        }
        
        if (pullDistance > 80) {
            pullIndicator.querySelector('.pull-text').textContent = '←" Отпустите для обновления';
        } else if (pullDistance > 10) {
            pullIndicator.querySelector('.pull-text').textContent = '←" Потяните вниз';
        }
    }, { passive: true });
    
    mainContent.addEventListener('touchend', async (e) => {
        if (!isPulling) return;
        
        mainContent.style.transition = 'transform 0.3s ease-out';
        pullIndicator.style.transition = 'all 0.3s ease-out';
        
        if (pullDistance > 80) {
            mainContent.style.transform = 'translateY(60px)';
            pullIndicator.style.transform = 'translateY(60px)';
            pullIndicator.style.opacity = 1;
            pullIndicator.querySelector('.pull-text').textContent = 'Обновление...';
            
            await loadPostsFromServer();
            
            setTimeout(() => {
                mainContent.style.transform = '';
                pullIndicator.style.opacity = 0;
                pullIndicator.style.transform = '';
                
                setTimeout(() => {
                    mainContent.style.transition = '';
                    pullIndicator.style.transition = '';
                }, 300);
            }, 300);
        } else {
            mainContent.style.transform = '';
            pullIndicator.style.opacity = 0;
            pullIndicator.style.transform = '';
            
            setTimeout(() => {
                mainContent.style.transition = '';
                pullIndicator.style.transition = '';
            }, 300);
        }
        
        isPulling = false;
        pullStartY = 0;
        pullDistance = 0;
    }, { passive: true });
    
    mainContent.addEventListener('touchcancel', () => {
        if (isPulling) {
            mainContent.style.transition = 'transform 0.3s ease-out';
            mainContent.style.transform = '';
            pullIndicator.style.opacity = 0;
            pullIndicator.style.transform = '';
            isPulling = false;
            pullStartY = 0;
            pullDistance = 0;
        }
    }, { passive: true });
}

// ============================================
// ФИЛЬТРЫ
// ============================================

// Прокрутка к началу контента
function scrollToTop() {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// Инициализация фильтра возраста
function initAgeFilter() {
    const minSlider = document.getElementById('minAgeSlider');
    const maxSlider = document.getElementById('maxAgeSlider');
    const minValue = document.getElementById('minAgeValue');
    const maxValue = document.getElementById('maxAgeValue');
    const rangeDisplay = document.getElementById('ageRangeDisplay');
    const applyBtn = document.getElementById('applyAgeFilterBtn');
    const resetBtn = document.getElementById('resetAgeFilterBtn');
    
    // Восстанавливаем сохранённые значения
    minSlider.value = ageFilter.min;
    maxSlider.value = ageFilter.max;
    minValue.textContent = ageFilter.min;
    maxValue.textContent = ageFilter.max;
    rangeDisplay.textContent = ageFilter.min + ' - ' + ageFilter.max + ' лет';
    
    // Обновляем кнопку фильтра если фильтр был активен
    const ageBtn = document.getElementById('ageFilterBtn');
    if (ageFilter.enabled && ageBtn) {
        ageBtn.style.background = '#2a4a2a';
        ageBtn.textContent = `◉ ${ageFilter.min}-${ageFilter.max} лет`;
    }
    
    minSlider.addEventListener('input', () => {
        let min = parseInt(minSlider.value);
        let max = parseInt(maxSlider.value);
        
        if (min > max) {
            min = max;
            minSlider.value = min;
        }
        
        minValue.textContent = min;
        rangeDisplay.textContent = min + ' - ' + max + ' лет';
    });
    
    maxSlider.addEventListener('input', () => {
        let min = parseInt(minSlider.value);
        let max = parseInt(maxSlider.value);
        
        if (max < min) {
            max = min;
            maxSlider.value = max;
        }
        
        maxValue.textContent = max;
        rangeDisplay.textContent = min + ' - ' + max + ' лет';
    });
    
    applyBtn.addEventListener('click', () => {
        ageFilter.min = parseInt(minSlider.value);
        ageFilter.max = parseInt(maxSlider.value);
        ageFilter.enabled = true;
        
        localStorage.setItem('meetgo_age_filter', JSON.stringify(ageFilter));
        
        const ageBtn = document.getElementById('ageFilterBtn');
        if (ageBtn) {
            ageBtn.style.background = '#2a4a2a';
            ageBtn.textContent = `◉ ${ageFilter.min}-${ageFilter.max} лет`;
        }
        
        document.getElementById('ageFilterModal').classList.remove('active');
        
        scrollToTop();
        
        console.log('Age filter applied:', ageFilter);
        loadPostsFromServer();
    });
    
    resetBtn.addEventListener('click', () => {
        ageFilter.min = 18;
        ageFilter.max = 80;
        ageFilter.enabled = false;
        
        localStorage.setItem('meetgo_age_filter', JSON.stringify(ageFilter));
        
        const ageBtn = document.getElementById('ageFilterBtn');
        if (ageBtn) {
            ageBtn.style.background = '';
            ageBtn.textContent = '◉ Возраст';
        }
        
        minSlider.value = 18;
        maxSlider.value = 80;
        minValue.textContent = '18';
        maxValue.textContent = '80';
        rangeDisplay.textContent = '18 - 80 лет';
        
        document.getElementById('ageFilterModal').classList.remove('active');
        
        scrollToTop();
        
        console.log('Age filter reset');
        loadPostsFromServer();
    });
}

// Показать модальное окно фильтра возраста
function showAgeFilter() {
    const modal = document.getElementById('ageFilterModal');
    const minSlider = document.getElementById('minAgeSlider');
    const maxSlider = document.getElementById('maxAgeSlider');
    const minValue = document.getElementById('minAgeValue');
    const maxValue = document.getElementById('maxAgeValue');
    const rangeDisplay = document.getElementById('ageRangeDisplay');
    
    minSlider.value = ageFilter.min;
    maxSlider.value = ageFilter.max;
    minValue.textContent = ageFilter.min;
    maxValue.textContent = ageFilter.max;
    rangeDisplay.textContent = ageFilter.min + ' - ' + ageFilter.max + ' лет';
    
    modal.classList.add('active');
}

function selectFilter(element, filterType) {
    if (filterType === 'age') {
        showAgeFilter();
        return;
    }
    
    document.querySelectorAll('.filter-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    currentFilter = filterType;
    console.log('Selected filter:', filterType);
    
    scrollToTop();
    
    loadPostsFromServer();
}

// ============================================
// МЕНЮ
// ============================================

// Show menu popup
function showMenu(event, postId, userId) {
    event.stopPropagation();
    currentPostId = postId;
    
    const deleteItem = document.getElementById('deletePostItem');
    if (userId === currentUserId) {
        deleteItem.style.display = 'block';
    } else {
        deleteItem.style.display = 'none';
    }
    
    document.getElementById('menuOverlay').classList.add('active');
    document.getElementById('menuPopup').classList.add('active');
}

// Close menu popup
function closeMenu() {
    document.getElementById('menuOverlay').classList.remove('active');
    document.getElementById('menuPopup').classList.remove('active');
}

// ============================================
// ОБРАБОТКА КНОПКИ "НАЗАД" НА ANDROID
// ============================================

// Инициализация истории браузера
window.history.replaceState({screen: 'mainScreen'}, '', window.location.href);

// Обработка кнопки "Назад" браузера
window.addEventListener('popstate', function(event) {
    const currentScreen = document.querySelector('.screen.active');
    const currentScreenId = currentScreen ? currentScreen.id : null;
    
    console.log('Back pressed, screen:', currentScreenId, 'history:', navigationHistory);
    
    window.history.pushState({screen: currentScreenId}, '', window.location.href);
    
    if (currentScreenId === 'chatScreen') {
        closeChat();
        navigationHistory = navigationHistory.filter(s => s !== 'chatScreen');
    } else if (currentScreenId === 'chatsScreen') {
        showScreen('mainScreen');
        navigationHistory = ['mainScreen'];
    } else if (currentScreenId === 'userProfileScreen') {
        showScreen('mainScreen');
        navigationHistory = ['mainScreen'];
    } else if (currentScreenId === 'settingsScreen' || 
               currentScreenId === 'profileScreen' ||
               currentScreenId === 'editProfileScreen' ||
               currentScreenId === 'changePasswordScreen') {
        showScreen('mainScreen');
        navigationHistory = ['mainScreen'];
    } else if (currentScreenId === 'mainScreen') {
        if (backPressedOnce) {
            showToast('Выход из приложения...');
            window.history.go(-2);
        } else {
            backPressedOnce = true;
            showToast('Нажмите ещё раз для выхода');
            
            if (backPressTimer) clearTimeout(backPressTimer);
            backPressTimer = setTimeout(() => {
                backPressedOnce = false;
            }, 2500);
        }
    } else {
        showScreen('mainScreen');
        navigationHistory = ['mainScreen'];
    }
});
