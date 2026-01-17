// ============================================
        // КАСТОМНЫЕ МОДАЛЬНЫЕ ОКНА
        // ============================================
        
        // Показать модальное окно
        function showModal(message, title = 'Уведомление', icon = 'ℹ️', showCancel = false) {
            return new Promise((resolve) => {
                const modal = document.getElementById('customModal');
                const modalTitle = document.getElementById('modalTitle');
                const modalMessage = document.getElementById('modalMessage');
                const modalIcon = document.getElementById('modalIcon');
                const confirmBtn = document.getElementById('modalConfirm');
                const cancelBtn = document.getElementById('modalCancel');
                
                modalTitle.textContent = title;
                modalMessage.textContent = message;
                modalIcon.textContent = icon;
                
                if (showCancel) {
                    cancelBtn.style.display = 'block';
                } else {
                    cancelBtn.style.display = 'none';
                }
                
                modal.classList.add('active');
                
                const handleConfirm = () => {
                    modal.classList.remove('active');
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                    resolve(true);
                };
                
                const handleCancel = () => {
                    modal.classList.remove('active');
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                    resolve(false);
                };
                
                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
            });
        }
        
        // Заменяем стандартный alert
        function alert(message) {
            return showModal(message, 'Уведомление', 'ℹ️');
        }
        
        // Функция для подтверждения
        function confirm(message) {
            return showModal(message, 'Подтверждение', '❓', true);
        }
        
        // Функция для подтверждения с кастомным заголовком и иконкой
        function showConfirm(message, title = 'Подтверждение', icon = '❓') {
            return showModal(message, title, icon, true);
        }
        
        // Функция для успеха
        function showSuccess(message) {
            return showModal(message, 'Успешно', '✅');
        }
        
        // Функция для ошибки
        function showError(message) {
            return showModal(message, 'Ошибка', '❌');
        }
        
        // Функция для предупреждения
        function showWarning(message) {
            return showModal(message, 'Внимание', '⚠️');
        }
        
        // Показать toast-уведомление внизу экрана
        function showToast(message) {
            // Удаляем предыдущий toast если есть
            const existingToast = document.getElementById('toast-notification');
            if (existingToast) {
                existingToast.remove();
            }
            
            // Создаём новый toast
            const toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(30, 30, 30, 0.95);
                color: white;
                padding: 12px 24px;
                border-radius: 24px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                animation: toastSlideUp 0.3s ease-out;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                max-width: 90%;
                text-align: center;
            `;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            // Удаляем через 2 секунды
            setTimeout(() => {
                toast.style.animation = 'toastSlideDown 0.3s ease-in';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }, 2000);
        }

        // ============================================
        // КОНФИГУРАЦИЯ API
        // ============================================
        const API_URL = 'https://kofpack.com/api';
        
        // ID текущего пользователя (в реальном приложении будет из сессии/авторизации)
        let currentUserId = null;
        let currentUser = null;
        
        // Глобальный массив постов
        let currentPosts = [];
        
        // Разница между серверным и клиентским временем (в миллисекундах)
        let serverTimeOffset = 0;
        
        // Геолокация пользователя
        let userLocation = {
            latitude: null,
            longitude: null,
            enabled: false
        };
        
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
            // На Android можно попробовать открыть настройки через intent
            // Но это работает только в некоторых браузерах/PWA
            
            // Пробуем разные способы
            const isAndroid = /android/i.test(navigator.userAgent);
            const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
            
            if (isAndroid) {
                // Попытка открыть настройки Android
                try {
                    // Некоторые браузеры поддерживают это
                    window.location.href = 'intent://settings#Intent;scheme=android-app;end';
                } catch(e) {
                    // Если не сработало, показываем инструкцию
                    showError('Откройте настройки телефона вручную:\n\nНастройки → Приложения → Meet&Go → Разрешения → Местоположение');
                }
            } else if (isIOS) {
                // На iOS можно открыть настройки приложения
                try {
                    window.location.href = 'app-settings:';
                } catch(e) {
                    showError('Откройте настройки iPhone:\n\nНастройки → Конфиденциальность → Службы геолокации → Safari/Meet&Go');
                }
            } else {
                // Для десктопа показываем инструкцию
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
                // Меньше 500 метров
                result = '<500 м';
            } else if (distance < 1) {
                // От 500м до 1км
                result = Math.round(distance * 1000) + ' м';
            } else if (distance < 10) {
                // От 1 до 10 км
                result = distance.toFixed(1) + ' км';
            } else {
                // Больше 10 км
                result = Math.round(distance) + ' км';
            }
            
            console.log('formatDistance result:', result);
            return result;
        }
        
        // Вычисление расстояния от текущего пользователя до поста
        function getDistanceToPost(post) {
            // Проверяем наличие координат поста (могут быть в post_latitude/post_longitude или latitude/longitude)
            const postLat = post.post_latitude || post.latitude;
            const postLon = post.post_longitude || post.longitude;
            
            console.log('Calculating distance for post:', {
                postId: post.id,
                postLat: postLat,
                postLon: postLon,
                userLat: userLocation.latitude,
                userLon: userLocation.longitude
            });
            
            // Если у поста есть координаты и у пользователя есть геолокация
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
        
        // ============================================
        // РЕДАКТИРОВАНИЕ ПРОФИЛЯ
        // ============================================
        
        let selectedAvatar = '👤';
        
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
            
            // Валидация
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
                    // Обновляем локальные данные
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

        // ============================================
        // АВТОРИЗАЦИЯ
        // ============================================
        
        // Данные стран и городов
        const countriesData = {
            'Украина': ['Киев', 'Харьков', 'Одесса', 'Днепр', 'Донецк', 'Запорожье', 'Львов', 'Кривой Рог', 'Николаев', 'Мариуполь', 'Луганск', 'Винница', 'Херсон', 'Полтава', 'Чернигов', 'Черкассы', 'Житомир', 'Сумы', 'Хмельницкий', 'Черновцы', 'Ровно', 'Ивано-Франковск', 'Тернополь', 'Луцк', 'Ужгород'],
            'Россия': ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Нижний Новгород', 'Казань', 'Челябинск', 'Омск', 'Самара', 'Ростов-на-Дону', 'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград', 'Краснодар', 'Саратов', 'Тюмень', 'Тольятти', 'Ижевск'],
            'Беларусь': ['Минск', 'Гомель', 'Могилев', 'Витебск', 'Гродно', 'Брест', 'Бобруйск', 'Барановичи', 'Борисов', 'Пинск'],
            'Казахстан': ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Тараз', 'Павлодар', 'Усть-Каменогорск', 'Семей', 'Атырау', 'Костанай', 'Кызылорда'],
            'Польша': ['Варшава', 'Краков', 'Лодзь', 'Вроцлав', 'Познань', 'Гданьск', 'Щецин', 'Быдгощ', 'Люблин', 'Катовице'],
            'Германия': ['Берлин', 'Гамбург', 'Мюнхен', 'Кёльн', 'Франкфурт', 'Штутгарт', 'Дюссельдорф', 'Дортмунд', 'Эссен', 'Лейпциг', 'Бремен', 'Дрезден', 'Ганновер', 'Нюрнберг'],
            'США': ['Нью-Йорк', 'Лос-Анджелес', 'Чикаго', 'Хьюстон', 'Феникс', 'Филадельфия', 'Сан-Антонио', 'Сан-Диего', 'Даллас', 'Сан-Хосе', 'Остин', 'Джексонвилл', 'Форт-Уэрт', 'Колумбус', 'Сан-Франциско'],
            'Великобритания': ['Лондон', 'Бирмингем', 'Лидс', 'Глазго', 'Шеффилд', 'Манчестер', 'Эдинбург', 'Ливерпуль', 'Бристоль', 'Кардифф'],
            'Франция': ['Париж', 'Марсель', 'Лион', 'Тулуза', 'Ницца', 'Нант', 'Страсбург', 'Монпелье', 'Бордо', 'Лилль'],
            'Италия': ['Рим', 'Милан', 'Неаполь', 'Турин', 'Палермо', 'Генуя', 'Болонья', 'Флоренция', 'Бари', 'Катания'],
            'Испания': ['Мадрид', 'Барселона', 'Валенсия', 'Севилья', 'Сарагоса', 'Малага', 'Мурсия', 'Пальма', 'Лас-Пальмас', 'Бильбао'],
            'Турция': ['Стамбул', 'Анкара', 'Измир', 'Бурса', 'Адана', 'Газиантеп', 'Конья', 'Анталья', 'Диярбакыр', 'Мерсин'],
            'Грузия': ['Тбилиси', 'Батуми', 'Кутаиси', 'Рустави', 'Гори', 'Зугдиди', 'Поти', 'Сухуми', 'Телави'],
            'Армения': ['Ереван', 'Гюмри', 'Ванадзор', 'Вагаршапат', 'Абовян', 'Капан', 'Раздан', 'Горис'],
            'Азербайджан': ['Баку', 'Гянджа', 'Сумгаит', 'Мингечевир', 'Ленкорань', 'Нахичевань', 'Ширван', 'Шеки'],
            'Молдова': ['Кишинев', 'Тирасполь', 'Бельцы', 'Бендеры', 'Рыбница', 'Кагул', 'Унгены', 'Сороки'],
            'Литва': ['Вильнюс', 'Каунас', 'Клайпеда', 'Шяуляй', 'Паневежис'],
            'Латвия': ['Рига', 'Даугавпилс', 'Лиепая', 'Елгава', 'Юрмала'],
            'Эстония': ['Таллин', 'Тарту', 'Нарва', 'Пярну', 'Кохтла-Ярве'],
            'Узбекистан': ['Ташкент', 'Самарканд', 'Бухара', 'Фергана', 'Андижан', 'Наманган', 'Коканд', 'Нукус'],
            'Киргизия': ['Бишкек', 'Ош', 'Джалал-Абад', 'Каракол', 'Токмок', 'Узген'],
            'Таджикистан': ['Душанбе', 'Худжанд', 'Куляб', 'Курган-Тюбе', 'Истаравшан'],
            'Туркменистан': ['Ашхабад', 'Туркменабат', 'Дашогуз', 'Мары', 'Балканабат']
        };
        
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
            
            // Очищаем список городов
            citySelect.innerHTML = '<option value="">Выберите город</option>';
            
            if (selectedCountry && countriesData[selectedCountry]) {
                // Включаем выбор города
                citySelect.disabled = false;
                
                // Заполняем города выбранной страны
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
            
            // Вычисляем возраст
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
                    initPullToRefresh(); // Инициализируем pull-to-refresh
                    initAgeFilter(); // Инициализируем фильтр возраста
                    startUnreadCheck(); // Проверка непрочитанных сообщений
                } else {
                    // Показываем ошибку с кнопкой восстановления пароля
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
                
                // Показываем кнопку "Забыли пароль?" вместо "Отмена"
                confirmBtn.textContent = 'OK';
                cancelBtn.textContent = 'Забыли пароль?';
                cancelBtn.style.display = 'block';
                
                modal.classList.add('active');
                
                const handleConfirm = () => {
                    modal.classList.remove('active');
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleForgot);
                    // Восстанавливаем текст кнопок
                    confirmBtn.textContent = 'OK';
                    cancelBtn.textContent = 'Отмена';
                    resolve(true);
                };
                
                const handleForgot = () => {
                    modal.classList.remove('active');
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleForgot);
                    // Восстанавливаем текст кнопок
                    confirmBtn.textContent = 'OK';
                    cancelBtn.textContent = 'Отмена';
                    // Открываем окно восстановления пароля
                    showRecoveryModal();
                    resolve(false);
                };
                
                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleForgot);
            });
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
        
        // Регистрация
        let selectedGender = '';
        
        // Выбор пола
        function selectGender(gender) {
            selectedGender = gender;
            document.querySelectorAll('.gender-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.querySelector(`[data-gender="${gender}"]`).classList.add('selected');
        }
        
        async function handleRegister() {
            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const birthdateInput = document.getElementById('regBirthdate').value;
            const country = document.getElementById('regCountry').value;
            const city = document.getElementById('regCity').value;
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;
            
            // Валидация на фронтенде
            if (!name || name.length < 2) {
                await showError('Введите имя (минимум 2 символа)');
                return;
            }
            
            // Валидация email
            if (!email) {
                await showError('Введите email');
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                await showError('Введите корректный email');
                return;
            }
            
            // Валидация пола
            if (!selectedGender) {
                await showError('Выберите пол');
                return;
            }
            
            if (!birthdateInput) {
                await showError('Выберите дату рождения');
                return;
            }
            
            // Вычисляем возраст
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
            
            // Валидация логина - только английские буквы, цифры и _
            if (!username || username.length < 3) {
                await showError('Логин должен быть минимум 3 символа');
                return;
            }
            
            const usernameRegex = /^[a-zA-Z0-9_]+$/;
            if (!usernameRegex.test(username)) {
                await showError('Логин может содержать только английские буквы, цифры и символ подчеркивания');
                return;
            }
            
            // Валидация пароля - только английские буквы, цифры и спецсимволы
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
                    // Автоматический вход после регистрации
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
            // Останавливаем все polling интервалы
            stopChatPolling();
            stopChatsListPolling();
            stopUnreadCheck();
            
            // Очищаем localStorage
            localStorage.removeItem('meetgo_user');
            
            // Сбрасываем все переменные состояния
            currentUser = null;
            currentUserId = null;
            currentChatId = null;
            currentChatUserId = null;
            currentChatBlocked = false;
            currentChatBlockedByMe = false;
            
            // Сбрасываем фильтр на значение по умолчанию
            currentFilter = 'nearby';
            
            // Сбрасываем геолокацию
            userLocation.latitude = null;
            userLocation.longitude = null;
            userLocation.enabled = false;
            
            // Сбрасываем фильтр возраста
            ageFilter.enabled = false;
            ageFilter.min = 18;
            ageFilter.max = 100;
            
            // Сбрасываем UI фильтров
            document.querySelectorAll('.filter-item').forEach(item => {
                item.classList.remove('active');
            });
            const nearbyFilter = document.querySelector('.filter-item[onclick*="nearby"]');
            if (nearbyFilter) nearbyFilter.classList.add('active');
            
            // Очищаем индикатор непрочитанных
            updateUnreadIndicator(0);
            
            showScreen('loginScreen');
        }
        
        // ============================================
        // НАСТРОЙКИ
        // ============================================
        
        // Изменить пароль
        async function changePassword() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Валидация
            if (!currentPassword) {
                await showError('Введите текущий пароль');
                return;
            }
            
            if (!newPassword || newPassword.length < 6) {
                await showError('Новый пароль должен быть минимум 6 символов');
                return;
            }
            
            // Валидация пароля - только английские буквы, цифры и спецсимволы
            const passwordRegex = /^[a-zA-Z0-9!@#$%^&*]+$/;
            if (!passwordRegex.test(newPassword)) {
                await showError('Пароль может содержать только английские буквы, цифры и символы !@#$%^&*');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                await showError('Пароли не совпадают');
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/users.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'change_password',
                        user_id: currentUserId,
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    await showSuccess('Пароль успешно изменён!');
                    // Очищаем поля
                    document.getElementById('currentPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmPassword').value = '';
                } else {
                    await showError(data.message || 'Ошибка при изменении пароля');
                }
            } catch (error) {
                console.error('Error changing password:', error);
                await showError('Ошибка соединения с сервером');
            }
        }
        
        // Подтверждение удаления аккаунта
        async function confirmDeleteAccount() {
            console.log('confirmDeleteAccount called');
            
            // Первое подтверждение - предупреждение
            const confirmed = await showConfirm(
                'Вы уверены, что хотите удалить аккаунт? Это действие необратимо. Все ваши данные будут удалены навсегда.',
                'Удаление аккаунта',
                '⚠️'
            );
            
            console.log('User confirmed:', confirmed);
            
            if (confirmed) {
                // Второе подтверждение - ввод пароля
                const password = await requestPasswordVerification();
                
                if (password) {
                    await deleteAccount(password);
                } else {
                    console.log('User cancelled password verification');
                }
            } else {
                console.log('User cancelled account deletion');
            }
        }
        
        // Запрос пароля для подтверждения
        function requestPasswordVerification() {
            return new Promise((resolve) => {
                const modal = document.getElementById('passwordVerificationModal');
                const passwordInput = document.getElementById('deleteAccountPassword');
                const verifyBtn = document.getElementById('verifyPasswordBtn');
                const cancelBtn = document.getElementById('cancelPasswordBtn');
                
                // Очищаем поле пароля
                passwordInput.value = '';
                
                // Показываем модальное окно
                modal.classList.add('active');
                
                // Фокус на поле ввода
                setTimeout(() => passwordInput.focus(), 100);
                
                const handleVerify = () => {
                    const password = passwordInput.value.trim();
                    
                    if (!password) {
                        alert('Введите пароль');
                        return;
                    }
                    
                    modal.classList.remove('active');
                    verifyBtn.removeEventListener('click', handleVerify);
                    cancelBtn.removeEventListener('click', handleCancel);
                    passwordInput.removeEventListener('keypress', handleKeyPress);
                    resolve(password);
                };
                
                const handleCancel = () => {
                    modal.classList.remove('active');
                    verifyBtn.removeEventListener('click', handleVerify);
                    cancelBtn.removeEventListener('click', handleCancel);
                    passwordInput.removeEventListener('keypress', handleKeyPress);
                    resolve(null);
                };
                
                const handleKeyPress = (e) => {
                    if (e.key === 'Enter') {
                        handleVerify();
                    } else if (e.key === 'Escape') {
                        handleCancel();
                    }
                };
                
                verifyBtn.addEventListener('click', handleVerify);
                cancelBtn.addEventListener('click', handleCancel);
                passwordInput.addEventListener('keypress', handleKeyPress);
            });
        }
        
        // Удаление аккаунта
        async function deleteAccount(password) {
            try {
                console.log('Deleting account for user ID:', currentUserId);
                
                const response = await fetch(`${API_URL}/users.php`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: currentUserId,
                        password: password
                    })
                });
                
                console.log('Delete response status:', response.status);
                
                const data = await response.json();
                console.log('Delete response data:', data);
                
                if (data.success) {
                    await showSuccess('Аккаунт успешно удалён');
                    handleLogout();
                } else {
                    await showError(data.message || 'Ошибка при удалении аккаунта');
                }
            } catch (error) {
                console.error('Error deleting account:', error);
                await showError('Ошибка соединения с сервером');
            }
        }
        
        // ============================================
        // API ФУНКЦИИ
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
                    
                    // Логируем данные постов для отладки
                    console.log('Posts data:', data.posts);
                    if (data.posts.length > 0) {
                        console.log('First post coordinates:', {
                            latitude: data.posts[0].latitude,
                            longitude: data.posts[0].longitude,
                            post_latitude: data.posts[0].post_latitude,
                            post_longitude: data.posts[0].post_longitude
                        });
                    }
                    
                    // Фильтруем и сортируем посты
                    let postsToDisplay = data.posts;
                    
                    if (currentFilter === 'my') {
                        // Фильтр "Мои объявления" - показываем ТОЛЬКО свои
                        postsToDisplay = postsToDisplay.filter(post => post.user_id === currentUserId);
                        console.log('Filtered my posts:', postsToDisplay.length);
                    } else {
                        // Для всех остальных фильтров - СКРЫВАЕМ свои объявления
                        postsToDisplay = postsToDisplay.filter(post => post.user_id !== currentUserId);
                        console.log('Filtered out own posts, remaining:', postsToDisplay.length);
                        
                        // Применяем фильтр по возрасту для всех фильтров
                        if (ageFilter.enabled) {
                            postsToDisplay = postsToDisplay.filter(post => {
                                const age = parseInt(post.age);
                                return age >= ageFilter.min && age <= ageFilter.max;
                            });
                        }
                        
                        if (currentFilter === 'nearby') {
                            // Фильтр "Рядом" - сортируем по расстоянию
                            if (userLocation.latitude && userLocation.longitude) {
                                // Вычисляем расстояние для каждого поста
                                postsToDisplay = postsToDisplay.map(post => {
                                    const distance = getDistanceToPost(post);
                                    return {
                                        ...post,
                                        calculatedDistance: distance
                                    };
                                });
                                
                                // Сортируем по расстоянию (от ближайших к дальним)
                                postsToDisplay.sort((a, b) => {
                                    // Посты без координат в конец
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
                    
                    // Сохраняем посты в глобальную переменную
                    currentPosts = postsToDisplay;
                    
                    displayPosts(postsToDisplay);
                } else {
                    console.error('Failed to load posts:', data.error);
                }
            } catch (error) {
                console.error('Error loading posts:', error);
                // Если API не работает, показываем статичные посты
            }
        }
        
        // Обновление ленты (с анимацией)
        
        // Pull-to-refresh функционал
        let pullStartY = 0;
        let isPulling = false;
        let pullDistance = 0;
        
        function initPullToRefresh() {
            const mainContent = document.getElementById('mainContent');
            const pullIndicator = document.getElementById('pullIndicator');
            
            if (!mainContent || !pullIndicator) return;
            
            mainContent.addEventListener('touchstart', (e) => {
                // Проверяем что скролл в самом верху
                if (mainContent.scrollTop === 0) {
                    pullStartY = e.touches[0].clientY;
                    isPulling = true;
                    // Отключаем transition для плавного движения
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
                
                // Применяем резиновый эффект (чем дальше тянешь, тем медленнее движется)
                const damping = 0.5; // Коэффициент замедления
                const dampedDistance = pullDistance * damping;
                
                // Ограничиваем максимальное расстояние
                const maxDistance = 100;
                const finalDistance = Math.min(dampedDistance, maxDistance);
                
                // Двигаем content вниз
                if (finalDistance > 5) {
                    mainContent.style.transform = `translateY(${finalDistance}px)`;
                    
                    // Показываем индикатор с плавным появлением
                    const opacity = Math.min(finalDistance / 40, 1);
                    pullIndicator.style.opacity = opacity;
                    pullIndicator.style.transform = `translateY(${finalDistance}px)`;
                }
                
                // Меняем текст подсказки
                if (pullDistance > 80) {
                    pullIndicator.querySelector('.pull-text').textContent = '←“ Отпустите для обновления';
                } else if (pullDistance > 10) {
                    pullIndicator.querySelector('.pull-text').textContent = '←“ Потяните вниз';
                }
            }, { passive: true });
            
            mainContent.addEventListener('touchend', async (e) => {
                if (!isPulling) return;
                
                // Включаем обратно transition для плавного возврата
                mainContent.style.transition = 'transform 0.3s ease-out';
                pullIndicator.style.transition = 'all 0.3s ease-out';
                
                // Если потянули достаточно далеко - обновляем
                if (pullDistance > 80) {
                    // Оставляем content немного опущенным во время загрузки
                    mainContent.style.transform = 'translateY(60px)';
                    pullIndicator.style.transform = 'translateY(60px)';
                    pullIndicator.style.opacity = 1;
                    pullIndicator.querySelector('.pull-text').textContent = 'Обновление...';
                    
                    // Обновляем посты
                    await loadPostsFromServer();
                    
                    // Возвращаем на место
                    setTimeout(() => {
                        mainContent.style.transform = '';
                        pullIndicator.style.opacity = 0;
                        pullIndicator.style.transform = '';
                        
                        // Очищаем стили после анимации
                        setTimeout(() => {
                            mainContent.style.transition = '';
                            pullIndicator.style.transition = '';
                        }, 300);
                    }, 300);
                } else {
                    // Возвращаем на место без обновления
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
            
            // Отмена при прерывании касания
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
        
        // Отображение постов на странице
        function displayPosts(posts) {
            const content = document.getElementById('mainContent');
            content.innerHTML = ''; // Очищаем контент
            
            // Проверяем если нет постов в фильтре "Мои"
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
            
            // Показываем подсказку если фильтр "Рядом" но нет геолокации
            if (currentFilter === 'nearby' && !userLocation.latitude) {
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
            
            // Запускаем таймеры для обратного отсчета
            startPostTimersFromServer();
        }
        
        // Создание карточки поста
        function createPostCard(post) {
            const card = document.createElement('div');
            card.className = 'request-card';
            card.onclick = function() { openRequest(post.id); };
            
            // Форматирование времени
            const timeAgo = formatTimeAgo(post.minutes_ago);
            
            // Вычисляем расстояние (используем уже вычисленное если есть)
            const distance = post.calculatedDistance !== undefined ? post.calculatedDistance : getDistanceToPost(post);
            let distanceText;
            
            console.log('createPostCard - post:', post.id, 'distance:', distance);
            
            if (distance !== null) {
                // Есть расстояние - показываем его
                distanceText = formatDistance(distance);
            } else {
                // Нет геолокации - показываем город
                distanceText = post.city || '?';
            }
            
            console.log('createPostCard - distanceText:', distanceText);
            
            // Определяем правильное время истечения
            let expiresAt = post.expires_at_iso || post.expires_at;
            
            // Определяем статус онлайн
            const isOnline = post.is_online === 1 || post.is_online === '1';
            const onlineClass = isOnline ? 'online' : 'offline';
            
            // Определяем что показывать в card-image (только если есть фото)
            let cardImageHtml = '';
            // Проверяем что фото реально есть (не null, не пустая строка, не "null")
            if (post.photo && post.photo !== 'null' && post.photo !== '' && post.photo !== 'undefined') {
                // Если есть фото поста - показываем его
                cardImageHtml = `<div class="card-image" style="background: none; padding: 0; overflow: hidden;"><img src="${post.photo}" alt="Фото" style="width: 100%; height: 100%; object-fit: cover;"></div>`;
            }
            // Если нет фото - не добавляем блок изображения вообще
            
            card.innerHTML = `
                ${cardImageHtml}
                <div class="card-content">
                    <div class="card-header">
                        <div>
                            <span class="card-name">${post.name}</span>
                            <span class="card-age">${post.age}</span>
                            <span class="card-gender">${post.gender === 'male' ? 'М' : post.gender === 'female' ? 'Ж' : ''}</span>
                            <span class="online-indicator ${onlineClass}" title="${isOnline ? 'В сети' : 'Не в сети'}"></span>
                        </div>
                        <div class="card-distance" title="${distance !== null ? 'Расстояние от вас' : 'Город пользователя'}">${distanceText}</div>
                    </div>
                    <div class="card-text">
                        ${post.text}
                    </div>
                    <div class="card-time">
                        <div class="card-time-left">
                            <span>${timeAgo}</span>
                            <span class="card-timer">
                                <span class="card-timer-icon">⏱</span>
                                <span class="post-timer" data-minutes-left="${post.minutes_left}" data-expires="${expiresAt}">
                                    ${formatMinutesToTime(post.minutes_left)}
                                </span>
                            </span>
                        </div>
                        <div class="card-actions">
                            <span class="chat-icon" onclick="event.stopPropagation(); openChat(${post.user_id})">💬</span>
                            <span class="menu-dots" onclick="event.stopPropagation(); showMenu(event, ${post.id}, ${post.user_id})">⋮</span>
                        </div>
                    </div>
                </div>
            `;
            
            return card;
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
        
        // Запуск таймеров обратного отсчета на основе серверного времени
        function startPostTimersFromServer() {
            const postTimers = document.querySelectorAll('.post-timer');
            
            postTimers.forEach(timerElement => {
                // Получаем время истечения с сервера
                let expiresAtString = timerElement.dataset.expires;
                
                // Парсим дату (может быть в разных форматах)
                let expiresAt;
                if (expiresAtString.includes('T')) {
                    // ISO формат: 2025-01-15T14:30:00
                    expiresAt = new Date(expiresAtString.replace(' ', 'T'));
                } else {
                    // MySQL формат: 2025-01-15 14:30:00
                    expiresAt = new Date(expiresAtString.replace(' ', 'T'));
                }
                
                // Проверяем что дата валидна
                if (isNaN(expiresAt.getTime())) {
                    console.error('Invalid date:', expiresAtString);
                    timerElement.textContent = 'Ошибка';
                    return;
                }
                
                // Функция обновления таймера
                const updateTimer = () => {
                    const now = getServerTime(); // Используем серверное время
                    const timeLeft = expiresAt - now;
                    
                    if (timeLeft <= 0) {
                        // Таймер истек
                        timerElement.textContent = 'Истекло';
                        const card = timerElement.closest('.request-card');
                        if (card) {
                            card.style.opacity = '0.5';
                            card.style.pointerEvents = 'none';
                        }
                        return false; // Останавливаем обновление
                    } else {
                        // Пересчитываем оставшееся время
                        const totalSeconds = Math.floor(timeLeft / 1000);
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        const seconds = totalSeconds % 60;
                        
                        timerElement.textContent = 
                            `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        return true; // Продолжаем обновление
                    }
                };
                
                // Запускаем сразу
                if (updateTimer()) {
                    // Обновляем каждую секунду, только если таймер не истек
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
                    photo: photoDataUrl || null // Добавляем фото (base64) или null
                };
                
                // Добавляем координаты если доступны
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
                    // Перезагружаем посты
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
        
        // ============================================
        // ИНИЦИАЛИЗАЦИЯ
        // ============================================
        
        // Splash screen
        setTimeout(() => {
            document.getElementById('splashScreen').classList.remove('active');
            
            // Проверяем авторизацию
            if (checkAuth()) {
                // Пользователь уже авторизован
                
                // Сбрасываем фильтр на nearby
                currentFilter = 'nearby';
                document.querySelectorAll('.filter-item').forEach(item => {
                    item.classList.remove('active');
                });
                const nearbyFilter = document.querySelector('.filter-item[onclick*="nearby"]');
                if (nearbyFilter) nearbyFilter.classList.add('active');
                
                requestGeolocation(); // Запрашиваем геолокацию
                document.getElementById('mainScreen').classList.add('active');
                loadPostsFromServer();
                initPullToRefresh(); // Инициализируем pull-to-refresh
                initAgeFilter(); // Инициализируем фильтр возраста
                startUnreadCheck(); // Проверка непрочитанных сообщений
            } else {
                // Показываем экран входа
                document.getElementById('loginScreen').classList.add('active');
            }
            
            startTimer();
        }, 2000);

        // ============================================
        // ОБРАБОТКА КНОПКИ "НАЗАД" НА ANDROID
        // ============================================
        
        let backPressedOnce = false;
        let backPressTimer = null;
        let navigationHistory = ['mainScreen']; // Стек навигации
        
        // Функция навигации с историей
        function navigateTo(screenId) {
            // Добавляем в стек если это не тот же экран
            if (navigationHistory[navigationHistory.length - 1] !== screenId) {
                navigationHistory.push(screenId);
                window.history.pushState({screen: screenId}, '', window.location.href);
            }
            showScreen(screenId);
        }
        
        // Функция возврата назад
        function navigateBack() {
            if (navigationHistory.length > 1) {
                navigationHistory.pop(); // Убираем текущий
                const previousScreen = navigationHistory[navigationHistory.length - 1];
                showScreen(previousScreen);
                return true;
            }
            return false; // Некуда возвращаться
        }
        
        // Инициализация истории браузера
        window.history.replaceState({screen: 'mainScreen'}, '', window.location.href);
        
        // Обработка кнопки "Назад" браузера
        window.addEventListener('popstate', function(event) {
            const currentScreen = document.querySelector('.screen.active');
            const currentScreenId = currentScreen ? currentScreen.id : null;
            
            console.log('Back pressed, screen:', currentScreenId, 'history:', navigationHistory);
            
            // Всегда сначала предотвращаем выход - добавляем запись обратно
            window.history.pushState({screen: currentScreenId}, '', window.location.href);
            
            if (currentScreenId === 'chatScreen') {
                // Из чата - в список чатов
                closeChat();
                // Обновляем стек
                navigationHistory = navigationHistory.filter(s => s !== 'chatScreen');
            } else if (currentScreenId === 'chatsScreen') {
                // Из списка чатов - на главную
                showScreen('mainScreen');
                navigationHistory = ['mainScreen'];
            } else if (currentScreenId === 'userProfileScreen') {
                // Из профиля пользователя - на главную
                showScreen('mainScreen');
                navigationHistory = ['mainScreen'];
            } else if (currentScreenId === 'settingsScreen' || 
                       currentScreenId === 'profileScreen' ||
                       currentScreenId === 'editProfileScreen' ||
                       currentScreenId === 'changePasswordScreen') {
                // Из настроек/профиля - на главную
                showScreen('mainScreen');
                navigationHistory = ['mainScreen'];
            } else if (currentScreenId === 'mainScreen') {
                // На главной - предупреждение о выходе
                if (backPressedOnce) {
                    // Второе нажатие - выходим
                    showToast('Выход из приложения...');
                    // Убираем запись из истории чтобы выйти
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
                // Остальные экраны - на главную
                showScreen('mainScreen');
                navigationHistory = ['mainScreen'];
            }
        });

        // Start post timers on load
        function startTimer() {
            // Таймеры теперь запускаются через startPostTimersFromServer
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
                // Для других экранов прокручиваем сам экран
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
            // Переключаем на главный экран
            showScreen('mainScreen');
            
            // Получаем элементы
            const mainContent = document.getElementById('mainContent');
            const pullIndicator = document.getElementById('pullIndicator');
            
            if (!mainContent || !pullIndicator) {
                await loadPostsFromServer();
                return;
            }
            
            // Анимация опускания контента
            mainContent.style.transition = 'transform 0.3s ease-out';
            pullIndicator.style.transition = 'all 0.3s ease-out';
            
            // Опускаем контент и показываем индикатор
            mainContent.style.transform = 'translateY(60px)';
            pullIndicator.style.transform = 'translateY(60px)';
            pullIndicator.style.opacity = 1;
            pullIndicator.querySelector('.pull-text').textContent = 'Обновление...';
            
            // Ждём немного для визуального эффекта
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Обновляем ленту
            await loadPostsFromServer();
            
            // Возвращаем на место
            setTimeout(() => {
                mainContent.style.transform = '';
                pullIndicator.style.opacity = 0;
                pullIndicator.style.transform = '';
                
                // Очищаем стили после анимации
                setTimeout(() => {
                    mainContent.style.transition = '';
                    pullIndicator.style.transition = '';
                }, 300);
            }, 300);
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

        // Duration selection with manual input
        let selectedDuration = 60; // По умолчанию 60 минут (1 час)
        
        function validateDuration() {
            const hoursInput = document.getElementById('hoursInput');
            const minutesInput = document.getElementById('minutesInput');
            const hint = document.getElementById('durationHint');
            
            let hours = parseInt(hoursInput.value) || 0;
            let minutes = parseInt(minutesInput.value) || 0;
            
            // Ограничиваем значения
            if (hours < 0) hours = 0;
            if (minutes < 0) minutes = 0;
            if (minutes > 59) {
                minutes = 59;
                minutesInput.value = 59;
            }
            
            // Проверяем лимит 24 часа
            const totalMinutes = (hours * 60) + minutes;
            
            if (totalMinutes > 1440) {
                // Превышен лимит 24 часа
                hoursInput.value = 24;
                minutesInput.value = 0;
                hours = 24;
                minutes = 0;
                hint.textContent = 'Максимум 24 часа!';
                hint.classList.add('error');
                selectedDuration = 1440;
            } else if (totalMinutes === 0) {
                // Минимум 1 минута
                hint.textContent = 'Минимум 1 минута';
                hint.classList.add('error');
                selectedDuration = 1;
            } else {
                hint.textContent = 'Максимум 24 часа';
                hint.classList.remove('error');
                selectedDuration = totalMinutes;
            }
            
            // Обновляем значения в полях
            hoursInput.value = hours;
            minutesInput.value = minutes;
        }

        // Переменная для хранения фото поста
        let postPhotoFile = null;
        let postPhotoDataUrl = null;
        let cropperState = null;
        
        // Обработка выбора фото для поста
        function handlePostPhotoSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            // Проверка типа файла
            if (!file.type.startsWith('image/')) {
                showError('Пожалуйста, выберите изображение');
                return;
            }
            
            // Проверка размера (максимум 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showError('Размер изображения не должен превышать 5MB');
                return;
            }
            
            postPhotoFile = file;
            
            // Открываем редактор для обрезки
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
                // Соотношение сторон карточки (примерно 2:1 - ширина к высоте)
                const cardAspectRatio = 2; // width / height
                
                // Определяем размеры области обрезки на основе изображения
                let cropWidth, cropHeight;
                
                // Вычисляем оптимальные размеры обрезки
                const imgAspectRatio = img.width / img.height;
                
                if (imgAspectRatio > cardAspectRatio) {
                    // Изображение шире чем нужно - ограничиваем по высоте
                    cropHeight = img.height;
                    cropWidth = cropHeight * cardAspectRatio;
                } else {
                    // Изображение уже или равно - ограничиваем по ширине
                    cropWidth = img.width;
                    cropHeight = cropWidth / cardAspectRatio;
                }
                
                // Устанавливаем размер canvas для превью (фиксированный)
                const previewWidth = 400;
                const previewHeight = 200;
                canvas.width = previewWidth;
                canvas.height = previewHeight;
                
                // Инициализируем состояние кроппера
                cropperState = {
                    image: img,
                    scale: 1,
                    offsetX: (img.width - cropWidth) / 2,
                    offsetY: (img.height - cropHeight) / 2,
                    cropWidth: cropWidth,
                    cropHeight: cropHeight
                };
                
                // Рисуем изображение
                drawCropPreview();
                
                // Добавляем управление масштабом
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
            
            // Очищаем canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Рисуем изображение с учётом масштаба и смещения
            ctx.drawImage(
                image,
                offsetX, offsetY, cropWidth, cropHeight,
                0, 0, canvas.width, canvas.height
            );
            
            // Рисуем рамку обрезки
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
                
                // Ограничиваем смещение
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
                
                // Ограничиваем смещение
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
        
        // Применение обрезки
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('applyCropBtn').addEventListener('click', () => {
                if (!cropperState) return;
                
                // Создаём финальное изображение
                const finalCanvas = document.createElement('canvas');
                const finalCtx = finalCanvas.getContext('2d');
                
                // Размер изображения как в карточке (соотношение 2:1)
                const outputWidth = 800;
                const outputHeight = 400;
                finalCanvas.width = outputWidth;
                finalCanvas.height = outputHeight;
                
                // Рисуем обрезанное изображение
                const { image, offsetX, offsetY, cropWidth, cropHeight } = cropperState;
                finalCtx.drawImage(
                    image,
                    offsetX, offsetY, cropWidth, cropHeight,
                    0, 0, outputWidth, outputHeight
                );
                
                // Получаем base64
                postPhotoDataUrl = finalCanvas.toDataURL('image/jpeg', 0.9);
                
                // Обновляем превью
                const preview = document.getElementById('postPhotoPreview');
                preview.innerHTML = `<img src="${postPhotoDataUrl}" alt="Фото">`;
                
                // Показываем кнопку удаления
                document.getElementById('postPhotoRemoveBtn').style.display = 'block';
                
                // Закрываем редактор
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
            
            // Обновляем счётчик символов
            if (charCounter) {
                charCounter.textContent = `${text.length} / 550`;
                
                // Меняем цвет при приближении к лимиту
                if (text.length > 500) {
                    charCounter.style.color = '#ff6b6b';
                } else if (text.length > 450) {
                    charCounter.style.color = '#ffa500';
                } else {
                    charCounter.style.color = '#666';
                }
            }
            
            // Button is always active now, just visual feedback
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
            
            // Показываем индикатор загрузки
            const postButton = document.getElementById('postButton');
            postButton.textContent = 'Создание...';
            postButton.style.opacity = '0.5';
            
            // Отправляем на сервер (теперь с фото)
            const success = await createPostOnServer(text, selectedDuration, postPhotoDataUrl);
            
            if (success) {
                // Очищаем форму
                document.getElementById('requestText').value = '';
                removePostPhoto(); // Очищаем фото
                validateForm();
                
                // Возвращаемся на главный экран
                showScreen('mainScreen');
                
                // Показываем сообщение об успехе
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
                    
                    // Сбрасываем форму
                    document.getElementById('hoursInput').value = 1;
                    document.getElementById('minutesInput').value = 0;
                    validateDuration();
                }, 300);
            } else {
                alert('Ошибка при создании запроса. Попробуйте ещё раз.');
            }
            
            // Восстанавливаем кнопку
            postButton.textContent = 'Создать';
            postButton.style.opacity = '1';
        }

        // Filter selection
        // Текущий фильтр
        let currentFilter = 'nearby';
        
        // Прокрутка к началу контента
        function scrollToTop() {
            // Прокручиваем контент главного экрана (именно он имеет overflow-y: auto)
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        }
        
        // Фильтр возраста
        // Загружаем фильтр возраста из localStorage
        let ageFilter = JSON.parse(localStorage.getItem('meetgo_age_filter')) || {
            min: 18,
            max: 80,
            enabled: false
        };
        
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
            
            // Обновление значений при движении слайдера
            minSlider.addEventListener('input', () => {
                let min = parseInt(minSlider.value);
                let max = parseInt(maxSlider.value);
                
                // Минимальный не может быть больше максимального
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
                
                // Максимальный не может быть меньше минимального
                if (max < min) {
                    max = min;
                    maxSlider.value = max;
                }
                
                maxValue.textContent = max;
                rangeDisplay.textContent = min + ' - ' + max + ' лет';
            });
            
            // Применить фильтр
            applyBtn.addEventListener('click', () => {
                ageFilter.min = parseInt(minSlider.value);
                ageFilter.max = parseInt(maxSlider.value);
                ageFilter.enabled = true;
                
                // Сохраняем в localStorage
                localStorage.setItem('meetgo_age_filter', JSON.stringify(ageFilter));
                
                // Обновляем визуальный индикатор
                const ageBtn = document.getElementById('ageFilterBtn');
                if (ageBtn) {
                    ageBtn.style.background = '#2a4a2a';
                    ageBtn.textContent = `◉ ${ageFilter.min}-${ageFilter.max} лет`;
                }
                
                document.getElementById('ageFilterModal').classList.remove('active');
                
                // Прокручиваем к началу контента
                scrollToTop();
                
                console.log('Age filter applied:', ageFilter);
                loadPostsFromServer();
            });
            
            // Сбросить фильтр
            resetBtn.addEventListener('click', () => {
                ageFilter.min = 18;
                ageFilter.max = 80;
                ageFilter.enabled = false;
                
                // Сохраняем в localStorage
                localStorage.setItem('meetgo_age_filter', JSON.stringify(ageFilter));
                
                // Сбрасываем визуальный индикатор
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
                
                // Прокручиваем к началу контента
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
            
            // Устанавливаем текущие значения
            minSlider.value = ageFilter.min;
            maxSlider.value = ageFilter.max;
            minValue.textContent = ageFilter.min;
            maxValue.textContent = ageFilter.max;
            rangeDisplay.textContent = ageFilter.min + ' - ' + ageFilter.max + ' лет';
            
            modal.classList.add('active');
        }
        
        function selectFilter(element, filterType) {
            // Если выбран фильтр "возраст" - показываем модальное окно
            if (filterType === 'age') {
                showAgeFilter();
                return; // Не меняем активный фильтр пока не применят
            }
            
            document.querySelectorAll('.filter-item').forEach(item => {
                item.classList.remove('active');
            });
            element.classList.add('active');
            currentFilter = filterType;
            console.log('Selected filter:', filterType);
            
            // Прокручиваем к началу контента
            scrollToTop();
            
            // Перезагружаем посты с новым фильтром
            loadPostsFromServer();
        }
        
        // Автоматическое обновление постов каждые 30 секунд
        setInterval(() => {
            loadPostsFromServer();
        }, 30000);
        
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
        
        // Обновляем активность каждые 2 минуты
        setInterval(() => {
            updateUserActivity();
        }, 120000); // 2 минуты
        
        // Обновляем активность при любом взаимодействии
        document.addEventListener('click', () => {
            if (currentUserId) {
                updateUserActivity();
            }
        });

        // Open request details
        // ============================================
        // ПРОСМОТР ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
        // ============================================
        
        let viewingUserId = null;
        
        async function openRequest(postId) {
            // Находим пост и открываем профиль его автора
            const post = currentPosts.find(p => p.id === postId);
            if (post) {
                await openUserProfile(post.user_id);
            }
        }
        
        async function openUserProfile(userId) {
            viewingUserId = userId;
            
            try {
                // Загружаем данные пользователя
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
                    
                    // Скрываем кнопки жалобы и сообщения если это свой профиль
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
                    
                    // Показываем экран
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
        let currentDetailPost = null;
        
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
            
            // Добавляем обработчик счетчика символов
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

        // ============================================
        // СИСТЕМА ЧАТОВ
        // ============================================
        
        let currentChatId = null;
        let currentChatUserId = null;
        let chatPollingInterval = null;
        let unreadCheckInterval = null;
        
        // Обновить индикатор непрочитанных в меню
        function updateUnreadIndicator(count) {
            console.log('updateUnreadIndicator called with:', count);
            const dot = document.getElementById('navUnreadDot');
            console.log('navUnreadDot element:', dot);
            if (dot) {
                dot.style.display = count > 0 ? 'block' : 'none';
                console.log('dot display set to:', dot.style.display);
            }
        }
        
        // Проверить непрочитанные сообщения
        async function checkUnreadMessages() {
            if (!currentUserId) return;
            
            try {
                const response = await fetch(`${API_URL}/chats.php?action=list&user_id=${currentUserId}`);
                const data = await response.json();
                
                if (data.success && data.chats) {
                    const totalUnread = data.chats.reduce((sum, chat) => sum + (parseInt(chat.unread_count) || 0), 0);
                    updateUnreadIndicator(totalUnread);
                }
            } catch (error) {
                console.error('Error checking unread:', error);
            }
        }
        
        // Запустить периодическую проверку непрочитанных
        function startUnreadCheck() {
            stopUnreadCheck();
            checkUnreadMessages();
            unreadCheckInterval = setInterval(checkUnreadMessages, 30000); // каждые 30 секунд
        }
        
        // Остановить проверку
        function stopUnreadCheck() {
            if (unreadCheckInterval) {
                clearInterval(unreadCheckInterval);
                unreadCheckInterval = null;
            }
        }
        
        // Polling для списка чатов
        let chatsListPollingInterval = null;
        
        // Открыть список чатов
        async function openChatsScreen() {
            // Добавляем в историю навигации
            if (!navigationHistory.includes('chatsScreen')) {
                navigationHistory.push('chatsScreen');
                window.history.pushState({screen: 'chatsScreen'}, '', window.location.href);
            }
            showScreen('chatsScreen');
            await loadChatsList();
            startChatsListPolling();
        }
        
        // Запустить polling списка чатов
        function startChatsListPolling() {
            stopChatsListPolling();
            chatsListPollingInterval = setInterval(async () => {
                const chatsScreen = document.getElementById('chatsScreen');
                if (chatsScreen && chatsScreen.classList.contains('active')) {
                    await loadChatsList();
                }
            }, 5000); // каждые 5 секунд
        }
        
        // Остановить polling списка чатов
        function stopChatsListPolling() {
            if (chatsListPollingInterval) {
                clearInterval(chatsListPollingInterval);
                chatsListPollingInterval = null;
            }
        }
        
        // Загрузить список чатов
        async function loadChatsList() {
            const chatsList = document.getElementById('chatsList');
            const chatsEmpty = document.getElementById('chatsEmpty');
            
            try {
                const response = await fetch(`${API_URL}/chats.php?action=list&user_id=${currentUserId}`);
                const data = await response.json();
                
                if (data.success && data.chats && data.chats.length > 0) {
                    chatsList.style.display = 'block';
                    chatsEmpty.style.display = 'none';
                    
                    // Считаем общее количество непрочитанных
                    const totalUnread = data.chats.reduce((sum, chat) => sum + (parseInt(chat.unread_count) || 0), 0);
                    updateUnreadIndicator(totalUnread);
                    
                    chatsList.innerHTML = data.chats.map(chat => `
                        <div class="chat-item" onclick="openChat(${chat.other_user_id}, ${chat.chat_id})">
                            <div class="chat-item-avatar">
                                ${chat.other_user_avatar || '👤'}
                                ${chat.is_online == 1 ? '<div class="chat-item-online"></div>' : ''}
                            </div>
                            <div class="chat-item-content">
                                <div class="chat-item-header">
                                    <div class="chat-item-name">${chat.other_user_name}</div>
                                    <div class="chat-item-time">${formatChatTime(chat.last_message_time)}</div>
                                </div>
                                <div class="chat-item-message ${chat.unread_count > 0 ? 'unread' : ''}">${chat.last_message || 'Нет сообщений'}</div>
                            </div>
                            ${chat.unread_count > 0 ? `<div class="chat-item-unread">${chat.unread_count}</div>` : ''}
                        </div>
                    `).join('');
                } else {
                    chatsList.style.display = 'none';
                    chatsEmpty.style.display = 'flex';
                    updateUnreadIndicator(0);
                }
            } catch (error) {
                console.error('Error loading chats:', error);
            }
        }
        
        // Форматирование времени для списка чатов
        function formatChatTime(dateString) {
            if (!dateString) return '';
            // Серверное время MySQL формата - считаем как UTC
            let date;
            if (dateString.includes('T') || dateString.includes('Z')) {
                date = new Date(dateString);
            } else {
                date = new Date(dateString.replace(' ', 'T') + 'Z');
            }
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'сейчас';
            if (diff < 3600000) return Math.floor(diff / 60000) + ' мин';
            if (diff < 86400000) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            if (diff < 604800000) {
                const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                return days[date.getDay()];
            }
            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        }
        
        // Открыть чат с пользователем
        let currentChatBlocked = false;
        let currentChatBlockedByMe = false;
        
        async function openChat(userId, chatId = null) {
            currentChatUserId = userId;
            currentChatId = chatId;
            currentChatBlocked = false;
            currentChatBlockedByMe = false;
            
            // Останавливаем polling списка чатов
            stopChatsListPolling();
            
            // Добавляем в историю навигации
            navigationHistory.push('chatScreen');
            window.history.pushState({screen: 'chatScreen'}, '', window.location.href);
            
            showScreen('chatScreen');
            
            try {
                let url = `${API_URL}/chats.php?action=messages&user_id=${currentUserId}`;
                if (chatId) {
                    url += `&chat_id=${chatId}`;
                } else {
                    url += `&other_user_id=${userId}`;
                }
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.success) {
                    currentChatId = data.chat_id; // может быть null для нового чата
                    currentChatBlocked = data.is_blocked || false;
                    currentChatBlockedByMe = data.blocked_by_me || false;
                    
                    // Заполняем шапку чата
                    document.getElementById('chatAvatar').textContent = data.other_user.avatar || '👤';
                    document.getElementById('chatUserName').textContent = data.other_user.name;
                    
                    const statusEl = document.getElementById('chatUserStatus');
                    if (data.other_user.is_online == 1) {
                        statusEl.textContent = 'В сети';
                        statusEl.classList.remove('offline');
                    } else {
                        statusEl.textContent = 'Не в сети';
                        statusEl.classList.add('offline');
                    }
                    
                    // Обновляем кнопку блокировки
                    updateBlockButton();
                    
                    // Обновляем поле ввода
                    updateChatInput();
                    
                    // Сбрасываем флаг инициализации для автоскролла
                    document.getElementById('chatMessages').dataset.initialized = '';
                    
                    // Отображаем сообщения
                    displayMessages(data.messages);
                    
                    // Запускаем polling только если есть существующий чат
                    if (currentChatId) {
                        startChatPolling();
                    }
                }
            } catch (error) {
                console.error('Error opening chat:', error);
            }
        }
        
        // Обновление кнопки блокировки
        function updateBlockButton() {
            const btn = document.getElementById('blockUserBtn');
            if (btn) {
                if (currentChatBlockedByMe) {
                    btn.innerHTML = '✓ Разблокировать';
                    btn.onclick = unblockChatUser;
                } else {
                    btn.innerHTML = '🚫 Заблокировать';
                    btn.onclick = blockChatUser;
                }
            }
        }
        
        // Обновление поля ввода при блокировке
        function updateChatInput() {
            const input = document.getElementById('chatInput');
            const sendBtn = document.getElementById('chatSendBtn');
            
            if (currentChatBlocked) {
                input.disabled = true;
                input.placeholder = 'Чат заблокирован';
                sendBtn.disabled = true;
            } else {
                input.disabled = false;
                input.placeholder = 'Сообщение...';
                sendBtn.disabled = false;
            }
        }
        
        // Отображение сообщений
        function displayMessages(messages) {
            const container = document.getElementById('chatMessages');
            
            console.log('displayMessages called with:', messages);
            
            if (!messages || messages.length === 0) {
                container.innerHTML = '<div class="chats-empty-hint" style="text-align: center; padding: 40px;">Напишите первое сообщение!</div>';
                return;
            }
            
            // Находим индексы последнего прочитанного и последнего непрочитанного исходящего сообщения
            let lastReadOutgoingIndex = -1;
            let lastUnreadOutgoingIndex = -1;
            
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg.sender_id == currentUserId) {
                    console.log(`Outgoing msg ${i}: is_read=${msg.is_read}, text="${msg.message?.substring(0,20)}"`);
                    if (msg.is_read == 1 && lastReadOutgoingIndex === -1) {
                        lastReadOutgoingIndex = i;
                    }
                    if (msg.is_read == 0 && lastUnreadOutgoingIndex === -1) {
                        lastUnreadOutgoingIndex = i;
                    }
                }
            }
            
            console.log(`lastReadOutgoingIndex=${lastReadOutgoingIndex}, lastUnreadOutgoingIndex=${lastUnreadOutgoingIndex}`);
            
            container.innerHTML = messages.map((msg, index) => {
                console.log('Message object:', msg);
                const isOutgoing = msg.sender_id == currentUserId;
                const replyHtml = msg.reply_to_id ? `
                    <div class="message-reply" onclick="scrollToMessage(${msg.reply_to_id})">
                        <div class="message-reply-name">${msg.reply_sender_name || 'Сообщение'}</div>
                        <div class="message-reply-text">${(msg.reply_message || '').substring(0, 50)}${msg.reply_message && msg.reply_message.length > 50 ? '...' : ''}</div>
                    </div>
                ` : '';
                
                // Определяем статус доставки только для исходящих
                let statusHtml = '';
                if (isOutgoing) {
                    // Показываем статус только под последним прочитанным и последним непрочитанным
                    if (index === lastReadOutgoingIndex && lastUnreadOutgoingIndex === -1) {
                        // Все сообщения прочитаны - показываем под последним
                        statusHtml = '<div class="message-status">Прочитано</div>';
                    } else if (index === lastReadOutgoingIndex && lastUnreadOutgoingIndex > lastReadOutgoingIndex) {
                        // Есть непрочитанные после прочитанных - показываем под последним прочитанным
                        statusHtml = '<div class="message-status">Прочитано</div>';
                    } else if (index === lastUnreadOutgoingIndex) {
                        // Последнее непрочитанное
                        statusHtml = '<div class="message-status">Доставлено</div>';
                    }
                }
                
                return `
                <div class="message ${isOutgoing ? 'message-outgoing' : 'message-incoming'}" 
                     data-message-id="${msg.id}" 
                     data-message-text="${(msg.message || '').replace(/"/g, '&quot;')}"
                     data-sender-name="${msg.sender_name || ''}"
                     data-sender-id="${msg.sender_id}">
                    ${replyHtml}
                    ${msg.message}
                    <div class="message-time">${formatMessageTime(msg.created_at)}</div>
                    ${statusHtml}
                </div>
            `}).join('');
            
            // Прокручиваем вниз только если пользователь был внизу или это первая загрузка
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            if (isAtBottom || !container.dataset.initialized) {
                container.scrollTop = container.scrollHeight;
                container.dataset.initialized = 'true';
            }
            
            // Инициализируем свайпы для сообщений
            initMessageSwipes();
        }
        
        // Переменные для ответа на сообщение
        let replyToMessageId = null;
        let replyToMessageText = null;
        let replyToSenderName = null;
        
        // Инициализация свайпов для сообщений
        function initMessageSwipes() {
            const messages = document.querySelectorAll('.message');
            
            messages.forEach(msg => {
                let startX = 0;
                let currentX = 0;
                let isDragging = false;
                const isOutgoing = msg.classList.contains('message-outgoing');
                
                msg.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    isDragging = true;
                    msg.style.transition = 'none';
                }, { passive: true });
                
                msg.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    
                    currentX = e.touches[0].clientX;
                    let diff = currentX - startX;
                    
                    // Ограничиваем направление свайпа
                    if (isOutgoing) {
                        // Исходящие - свайп вправо
                        diff = Math.max(0, Math.min(diff, 80));
                    } else {
                        // Входящие - свайп влево
                        diff = Math.min(0, Math.max(diff, -80));
                    }
                    
                    msg.style.transform = `translateX(${diff}px)`;
                }, { passive: true });
                
                msg.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    
                    const diff = currentX - startX;
                    msg.style.transition = 'transform 0.2s ease';
                    msg.style.transform = 'translateX(0)';
                    
                    // Если свайп достаточный - выбираем сообщение для ответа
                    if ((isOutgoing && diff > 50) || (!isOutgoing && diff < -50)) {
                        const messageId = msg.dataset.messageId;
                        const messageText = msg.dataset.messageText;
                        const senderName = msg.dataset.senderName;
                        const senderId = msg.dataset.senderId;
                        
                        selectMessageForReply(parseInt(messageId), messageText, senderName, parseInt(senderId));
                        
                        // Вибрация если поддерживается
                        if (navigator.vibrate) {
                            navigator.vibrate(30);
                        }
                    }
                    
                    startX = 0;
                    currentX = 0;
                });
            });
        }
        
        // Выбор сообщения для ответа
        function selectMessageForReply(messageId, messageText, senderName, senderId) {
            replyToMessageId = messageId;
            replyToMessageText = messageText;
            replyToSenderName = senderId == currentUserId ? 'Вы' : senderName;
            
            // Показываем превью ответа
            showReplyPreview();
        }
        
        // Показать превью ответа
        function showReplyPreview() {
            let preview = document.getElementById('replyPreview');
            if (!preview) {
                const inputContainer = document.querySelector('.chat-input-container');
                preview = document.createElement('div');
                preview.id = 'replyPreview';
                preview.className = 'reply-preview';
                inputContainer.insertBefore(preview, inputContainer.firstChild);
            }
            
            preview.innerHTML = `
                <div class="reply-preview-content">
                    <div class="reply-preview-name">${replyToSenderName}</div>
                    <div class="reply-preview-text">${replyToMessageText.substring(0, 50)}${replyToMessageText.length > 50 ? '...' : ''}</div>
                </div>
                <div class="reply-preview-close" onclick="cancelReply(event)">✕</div>
            `;
            preview.style.display = 'flex';
            
            // Фокус на поле ввода
            document.getElementById('chatInput').focus();
        }
        
        // Отменить ответ
        function cancelReply(event) {
            if (event) event.stopPropagation();
            replyToMessageId = null;
            replyToMessageText = null;
            replyToSenderName = null;
            
            const preview = document.getElementById('replyPreview');
            if (preview) {
                preview.style.display = 'none';
            }
        }
        
        // Прокрутка к сообщению
        function scrollToMessage(messageId) {
            const message = document.querySelector(`[data-message-id="${messageId}"]`);
            if (message) {
                message.scrollIntoView({ behavior: 'smooth', block: 'center' });
                message.classList.add('message-highlighted');
                setTimeout(() => message.classList.remove('message-highlighted'), 1500);
            }
        }
        
        // Форматирование времени сообщения
        function formatMessageTime(dateString) {
            // Если это серверное время (без Z), добавляем указание что это UTC
            let date;
            if (dateString.includes('T') || dateString.includes('Z')) {
                date = new Date(dateString);
            } else {
                // Серверное время MySQL формата "YYYY-MM-DD HH:MM:SS" - считаем как UTC
                date = new Date(dateString.replace(' ', 'T') + 'Z');
            }
            return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
        
        // Отправка сообщения
        async function sendMessage() {
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            
            if (!text) return;
            
            try {
                const response = await fetch(`${API_URL}/chats.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sender_id: currentUserId,
                        receiver_id: currentChatUserId,
                        chat_id: currentChatId,
                        text: text,
                        reply_to_id: replyToMessageId
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    input.value = '';
                    
                    // Если это был новый чат - сохраняем chat_id и запускаем polling
                    const wasNewChat = !currentChatId;
                    currentChatId = data.chat_id;
                    
                    if (wasNewChat) {
                        startChatPolling();
                    }
                    
                    // Добавляем сообщение в UI
                    const container = document.getElementById('chatMessages');
                    const emptyHint = container.querySelector('.chats-empty-hint');
                    if (emptyHint) emptyHint.remove();
                    
                    const replyHtml = replyToMessageId ? `
                        <div class="message-reply">
                            <div class="message-reply-name">${replyToSenderName}</div>
                            <div class="message-reply-text">${replyToMessageText.substring(0, 50)}${replyToMessageText.length > 50 ? '...' : ''}</div>
                        </div>
                    ` : '';
                    
                    container.innerHTML += `
                        <div class="message message-outgoing" data-message-id="${data.message_id}">
                            ${replyHtml}
                            ${text}
                            <div class="message-time">${formatMessageTime(new Date().toISOString())}</div>
                            <div class="message-status">Доставлено</div>
                        </div>
                    `;
                    container.scrollTop = container.scrollHeight;
                    
                    // Инициализируем свайп для нового сообщения
                    initMessageSwipes();
                    
                    // Сбрасываем reply
                    cancelReply();
                } else {
                    // Ошибка - возможно заблокирован
                    await showError(data.error || 'Не удалось отправить сообщение');
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
        
        // Polling для новых сообщений
        function startChatPolling() {
            stopChatPolling();
            chatPollingInterval = setInterval(async () => {
                if (currentChatId) {
                    try {
                        const response = await fetch(`${API_URL}/chats.php?action=messages&user_id=${currentUserId}&chat_id=${currentChatId}`);
                        const data = await response.json();
                        if (data.success) {
                            displayMessages(data.messages);
                        }
                    } catch (error) {
                        console.error('Polling error:', error);
                    }
                }
            }, 3000);
        }
        
        function stopChatPolling() {
            if (chatPollingInterval) {
                clearInterval(chatPollingInterval);
                chatPollingInterval = null;
            }
        }
        
        // Закрыть чат
        function closeChat() {
            showScreen('chatsScreen');
            loadChatsList();
            startChatsListPolling();
        }
        
        // Открыть профиль пользователя из чата
        function openChatUserProfile() {
            if (currentChatUserId) {
                stopChatPolling();
                openUserProfile(currentChatUserId);
            }
        }
        
        // Меню чата
        function showChatMenu() {
            document.getElementById('chatMenuPopup').classList.add('active');
            document.getElementById('menuOverlay').classList.add('active');
        }
        
        function closeChatMenu() {
            document.getElementById('chatMenuPopup').classList.remove('active');
            document.getElementById('menuOverlay').classList.remove('active');
        }
        
        async function reportChatUser() {
            closeChatMenu();
            
            if (!currentChatUserId) return;
            
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
                            reported_user_id: currentChatUserId,
                            chat_id: currentChatId,
                            type: 'user',
                            reason: 'Жалоба на пользователя из чата'
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
        
        async function deleteChat() {
            closeChatMenu();
            
            if (!currentChatId) return;
            
            const confirmed = await showConfirm(
                'Удалить этот чат? Все сообщения будут удалены.',
                'Удаление чата',
                '🗑'
            );
            
            if (confirmed) {
                try {
                    const response = await fetch(`${API_URL}/chats.php`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: currentChatId,
                            user_id: currentUserId
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        await showSuccess('Чат удалён');
                        closeChat();
                    } else {
                        await showError(data.error || 'Ошибка удаления чата');
                    }
                } catch (error) {
                    console.error('Delete chat error:', error);
                    await showError('Ошибка удаления чата');
                }
            }
        }
        
        // Заблокировать пользователя
        async function blockChatUser() {
            closeChatMenu();
            
            if (!currentChatUserId) return;
            
            const confirmed = await showConfirm(
                'Заблокировать этого пользователя? Вы не сможете обмениваться сообщениями.',
                'Блокировка',
                '🚫'
            );
            
            if (confirmed) {
                try {
                    const response = await fetch(`${API_URL}/chats.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'block',
                            blocker_id: currentUserId,
                            blocked_id: currentChatUserId
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        currentChatBlocked = true;
                        currentChatBlockedByMe = true;
                        updateBlockButton();
                        updateChatInput();
                        await showSuccess('Пользователь заблокирован');
                    } else {
                        await showError(data.error || 'Ошибка блокировки');
                    }
                } catch (error) {
                    console.error('Block user error:', error);
                    await showError('Ошибка блокировки');
                }
            }
        }
        
        // Разблокировать пользователя
        async function unblockChatUser() {
            closeChatMenu();
            
            if (!currentChatUserId) return;
            
            const confirmed = await showConfirm(
                'Разблокировать этого пользователя?',
                'Разблокировка',
                '✓'
            );
            
            if (confirmed) {
                try {
                    const response = await fetch(`${API_URL}/chats.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'unblock',
                            blocker_id: currentUserId,
                            blocked_id: currentChatUserId
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        currentChatBlocked = false;
                        currentChatBlockedByMe = false;
                        updateBlockButton();
                        updateChatInput();
                        await showSuccess('Пользователь разблокирован');
                    } else {
                        await showError(data.error || 'Ошибка разблокировки');
                    }
                } catch (error) {
                    console.error('Unblock user error:', error);
                    await showError('Ошибка разблокировки');
                }
            }
        }

        // Show menu popup
        let currentPostId = null;
        
        function showMenu(event, postId, userId) {
            event.stopPropagation();
            currentPostId = postId;
            
            // Проверяем, является ли текущий пользователь владельцем поста
            const deleteItem = document.getElementById('deletePostItem');
            if (userId === currentUserId) {
                // Это мой пост - показываем кнопку удаления
                deleteItem.style.display = 'block';
            } else {
                // Не мой пост - скрываем кнопку удаления
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
                    // Обновляем ленту
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