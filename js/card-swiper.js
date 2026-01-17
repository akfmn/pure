// ============================================
// CARD SWIPER - Улучшенный свайпер для карточек
// Плавное листание с притормаживанием
// ============================================

// Инициализация свайпера для карточки
function initCardSwiper(card) {
    const swiper = card.querySelector('.card-swiper');
    const indicators = card.querySelectorAll('.card-indicator');
    
    if (!swiper || indicators.length === 0) return;
    
    let isScrolling = false;
    let scrollTimeout = null;
    
    // Плавное обновление индикаторов на основе позиции скролла
    swiper.addEventListener('scroll', () => {
        const scrollLeft = swiper.scrollLeft;
        const slideWidth = swiper.offsetWidth;
        const totalSlides = indicators.length;
        
        // Вычисляем точную позицию (с дробной частью)
        const exactPosition = scrollLeft / slideWidth;
        const currentSlide = Math.floor(exactPosition);
        const progress = exactPosition - currentSlide;
        
        // Обновляем индикаторы
        indicators.forEach((ind, index) => {
            // Убираем все классы
            ind.classList.remove('active', 'partial');
            ind.style.removeProperty('--progress');
            
            if (index === currentSlide) {
                if (progress < 0.1) {
                    // Почти на слайде - показываем активным
                    ind.classList.add('active');
                } else {
                    // В процессе перехода - показываем частичный прогресс
                    ind.classList.add('active');
                    ind.style.opacity = 1 - (progress * 0.3);
                }
            } else if (index === currentSlide + 1 && progress > 0.1) {
                // Следующий слайд начинает подсвечиваться
                ind.style.opacity = 0.5 + (progress * 0.5);
                if (progress > 0.9) {
                    ind.classList.add('active');
                }
            }
        });
        
        // Определяем когда скролл остановился
        isScrolling = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            // Финальное обновление индикаторов
            const finalSlide = Math.round(scrollLeft / slideWidth);
            indicators.forEach((ind, index) => {
                ind.classList.toggle('active', index === finalSlide);
                ind.style.removeProperty('opacity');
            });
        }, 150);
    });
    
    // Клик по индикатору для перехода к слайду
    indicators.forEach((ind, index) => {
        ind.addEventListener('click', (e) => {
            e.stopPropagation();
            const slideWidth = swiper.offsetWidth;
            swiper.scrollTo({
                left: slideWidth * index,
                behavior: 'smooth'
            });
        });
    });
    
    // Touch события для улучшенной отзывчивости
    let touchStartX = 0;
    let touchStartScrollLeft = 0;
    let isTouching = false;
    
    swiper.addEventListener('touchstart', (e) => {
        isTouching = true;
        touchStartX = e.touches[0].clientX;
        touchStartScrollLeft = swiper.scrollLeft;
        // Отключаем smooth scroll во время касания для мгновенной реакции
        swiper.style.scrollBehavior = 'auto';
    }, { passive: true });
    
    swiper.addEventListener('touchmove', (e) => {
        if (!isTouching) return;
        const touchX = e.touches[0].clientX;
        const diff = touchStartX - touchX;
        swiper.scrollLeft = touchStartScrollLeft + diff;
    }, { passive: true });
    
    swiper.addEventListener('touchend', () => {
        isTouching = false;
        // Возвращаем smooth scroll
        swiper.style.scrollBehavior = 'smooth';
        
        // Определяем к какому слайду притянуть
        const slideWidth = swiper.offsetWidth;
        const currentPosition = swiper.scrollLeft;
        const targetSlide = Math.round(currentPosition / slideWidth);
        
        // Мягкое притяжение к ближайшему слайду
        setTimeout(() => {
            swiper.scrollTo({
                left: slideWidth * targetSlide,
                behavior: 'smooth'
            });
        }, 50);
    });
}

// Инициализация всех карточек на странице
function initAllCardSwipers() {
    document.querySelectorAll('.request-card').forEach(card => {
        initCardSwiper(card);
    });
}

// Автоматическая инициализация новых карточек через MutationObserver
function setupCardObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    if (node.classList && node.classList.contains('request-card')) {
                        initCardSwiper(node);
                    }
                    // Также проверяем вложенные карточки
                    const nestedCards = node.querySelectorAll ? node.querySelectorAll('.request-card') : [];
                    nestedCards.forEach(card => initCardSwiper(card));
                }
            });
        });
    });
    
    // Наблюдаем за контентом
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        observer.observe(mainContent, { childList: true, subtree: true });
    }
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    setupCardObserver();
    initAllCardSwipers();
});
