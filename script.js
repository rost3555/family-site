// =====================================
// НАВИГАЦИЯ И ВОЗВРАТ К САМОМУ ВЕРХУ
// =====================================

const toTop = document.getElementById('toTop');

function forceTop() {
    window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
    });

    const header = document.querySelector('.site-header');
    if (header) {
        header.classList.remove('header-hidden');
    }

    const nav = document.querySelector('.site-header nav');
    if (nav) {
        nav.classList.remove('mobile-menu-open');
    }
}

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

window.addEventListener('scroll', () => {
    if (toTop) {
        if (window.scrollY > 400) {
            toTop.classList.add('show');
        } else {
            toTop.classList.remove('show');
        }
    }
}, { passive: true });

if (toTop) {
    toTop.addEventListener('click', (event) => {
        event.preventDefault();
        forceTop();
        setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 100);
        setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 300);
    });
}

document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href="#home"]');
    if (!link) {
        return;
    }

    event.preventDefault();
    forceTop();

    history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
    );
});

function resetPageToTop() {
    window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
    });

    const header = document.querySelector('.site-header');
    if (header) {
        header.classList.remove('header-hidden');
    }

    const nav = document.querySelector('.site-header nav');
    if (nav) {
        nav.classList.remove('mobile-menu-open');
    }

    if (window.location.hash === '#home') {
        history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
        );
    }
}

window.addEventListener('load', resetPageToTop);

window.addEventListener('pageshow', () => {
    resetPageToTop();
    setTimeout(resetPageToTop, 100);
    setTimeout(resetPageToTop, 400);
});

// ================================
// Lightbox — просмотр фотографий
// ================================

document.addEventListener('DOMContentLoaded', () => {

    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxCounter = document.getElementById('lightboxCounter');

    // Текущая галерея
    let currentGalleryImages = [];

    // Текущая фотография
    let currentImageIndex = 0;

    // Название текущей галереи
    let currentGalleryName = '';

    // Блокировка повторного перелистывания во время анимации
    let lightboxAnimating = false;

        // Масштаб фотографии
    let lightboxScale = 1;
    const lightboxMinScale = 1;
    const lightboxMaxScale = 3;
    const lightboxZoomStep = 0.2;

    // Положение увеличенной фотографии
    let lightboxOffsetX = 0;
    let lightboxOffsetY = 0;

    // Перемещение фотографии мышью
    let lightboxDragging = false;
    let lightboxDragStartX = 0;
    let lightboxDragStartY = 0;


    // ================================
    // Получение года из имени файла
    // ================================

    function getPhotoYear(image) {

        const fileName = image.src.split('/').pop();

        // Для фотографий людей:
        // 1.26.jpg
        const match = fileName.match(/\.(\d{2})\./);

        if (match) {
            return '20' + match[1];
        }

        // Для общего альбома:
        // images/album/2026/1.jpg
        const pathMatch = image.src.match(/album\/(\d{4})\//);

        if (pathMatch) {
            return pathMatch[1];
        }

        return '';
    }


    // ================================
    // Обновление фотографии и счётчика
    // ================================

    function updateLightbox() {

        const image = currentGalleryImages[currentImageIndex];

        if (!image) {
            return;
        }

        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;

        const year = getPhotoYear(image);

        // Общий семейный альбом
        if (currentGalleryName === 'Наш альбом') {

            lightboxCounter.textContent =
                `${currentGalleryName} · ${year} · ${currentImageIndex + 1} из ${currentGalleryImages.length}`;

        // Раздел человека
        } else if (year) {

            lightboxCounter.textContent =
                `${currentGalleryName} · ${year} · ${currentImageIndex + 1} из ${currentGalleryImages.length}`;

        // Запасной вариант
        } else {

            lightboxCounter.textContent =
                `${currentGalleryName} · ${currentImageIndex + 1} из ${currentGalleryImages.length}`;
        }
    }

        // ================================
    // Масштабирование фотографии
    // ================================

        function updateLightboxZoom() {

        // При масштабе 1× фотография всегда возвращается в центр
        if (lightboxScale <= 1) {

            lightboxScale = 1;
            lightboxOffsetX = 0;
            lightboxOffsetY = 0;

        } else {

            // Размер фотографии без учёта transform
            const imageWidth =
                lightboxImage.offsetWidth;

            const imageHeight =
                lightboxImage.offsetHeight;

            // Размер области просмотра
            const containerWidth =
                lightbox.clientWidth;

            const containerHeight =
                lightbox.clientHeight;

            // Максимальное смещение от центра
            const maxOffsetX =
                Math.max(
                    0,
                    (imageWidth * lightboxScale - containerWidth) / 2
                );

            const maxOffsetY =
                Math.max(
                    0,
                    (imageHeight * lightboxScale - containerHeight) / 2
                );

            // Не позволяем утащить фотографию слишком далеко
            lightboxOffsetX =
                Math.max(
                    -maxOffsetX,
                    Math.min(
                        maxOffsetX,
                        lightboxOffsetX
                    )
                );

            lightboxOffsetY =
                Math.max(
                    -maxOffsetY,
                    Math.min(
                        maxOffsetY,
                        lightboxOffsetY
                    )
                );
        }

        lightboxImage.style.transition = 'none';
        lightboxImage.style.transform =
            `translate(${lightboxOffsetX}px, ${lightboxOffsetY}px) scale(${lightboxScale})`;
    }


    // ================================
    // Направленная анимация Lightbox
    // ================================

    function animateLightbox(direction, newImage) {

        if (!newImage || lightboxAnimating) {
            return;
        }

        lightboxAnimating = true;


        // --------------------------------
        // Создаём копию текущей фотографии
        // --------------------------------

        const oldImage = lightboxImage.cloneNode(true);

        oldImage.removeAttribute('id');

        oldImage.style.position = 'absolute';
        oldImage.style.margin = '0';
        oldImage.style.pointerEvents = 'none';
        oldImage.style.zIndex = '2';
        oldImage.style.willChange = 'transform, opacity';


        // --------------------------------
        // Запоминаем положение старой фотографии
        // --------------------------------

        const oldRect = lightboxImage.getBoundingClientRect();
        const lightboxRect = lightbox.getBoundingClientRect();

        lightbox.style.overflow = 'hidden';

        oldImage.style.left =
            `${oldRect.left - lightboxRect.left}px`;

        oldImage.style.top =
            `${oldRect.top - lightboxRect.top}px`;

        oldImage.style.width =
            `${oldRect.width}px`;

        oldImage.style.height =
            `${oldRect.height}px`;


        // --------------------------------
        // Добавляем старую фотографию
        // --------------------------------

        lightbox.appendChild(oldImage);


        // --------------------------------
        // Рассчитываем направление движения
        // --------------------------------

        const distance =
            lightboxRect.width + oldRect.width;

        const startX =
            direction === 'next'
                ? distance
                : -distance;

        const endX =
            direction === 'next'
                ? -distance
                : distance;


        // --------------------------------
        // Устанавливаем новую фотографию
        // --------------------------------

        lightboxImage.src = newImage.src;
        lightboxImage.alt = newImage.alt;

        lightboxImage.style.position = 'absolute';
        lightboxImage.style.zIndex = '1';
        lightboxImage.style.pointerEvents = 'none';
        lightboxImage.style.margin = '0';
        lightboxImage.style.willChange = 'transform, opacity';
        lightboxImage.style.transition = 'none';
        lightboxImage.style.filter = 'none';

        // --------------------------------
        // Начальное положение новой фотографии
        // --------------------------------

        lightboxImage.style.transform =
            `translateX(${startX}px)`;

        lightboxImage.style.opacity = '0';


        // --------------------------------
        // Старая фотография остаётся видимой
        // --------------------------------

        oldImage.style.transform = 'translateX(0)';
        oldImage.style.opacity = '1';


        // --------------------------------
        // Запускаем анимацию
        // --------------------------------

        requestAnimationFrame(() => {

            requestAnimationFrame(() => {

                const duration = 700;

                lightboxImage.style.transition =
                    `transform ${duration}ms cubic-bezier(.12,.82,.20,1),
                     opacity ${duration}ms ease-in-out`;

                oldImage.style.transition =
                    `transform ${duration}ms cubic-bezier(.12,.82,.20,1),
                     opacity ${duration}ms ease-in-out`;


                // Новая фотография приезжает
                lightboxImage.style.transform =
                    'translateX(0)';

                lightboxImage.style.opacity = '1';


                // Старая фотография полностью уезжает
                oldImage.style.transform =
                    `translateX(${endX}px)`;

                oldImage.style.opacity = '0.85';


                // --------------------------------
                // Завершение
                // --------------------------------

                setTimeout(() => {

                    oldImage.style.willChange = '';
                    oldImage.remove();

                    // Убираем временные стили
                    lightboxImage.style.position = '';
                    lightboxImage.style.zIndex = '';
                    lightboxImage.style.pointerEvents = '';
                    lightboxImage.style.margin = '';
                    lightboxImage.style.transform = '';
                    lightboxImage.style.opacity = '';
                    lightboxImage.style.transition = '';
                    lightbox.style.overflow = '';
                    lightboxImage.style.willChange = '';

                    lightboxAnimating = false;

                }, duration + 30);

            });

        });
    }


    // ================================
    // Открытие фотографии
    // ================================

    function openLightbox(image) {

        // =====================================
        // 1. Фотография из общего альбома
        // =====================================

        const albumYearSection =
            image.closest('.album-year-section');

        if (albumYearSection) {

            // Берём только фотографии этого года
            currentGalleryImages = Array.from(
                albumYearSection.querySelectorAll(
                    '.album-year-photos img'
                )
            );

            currentGalleryName = 'Наш альбом';

        }


        // =====================================
        // 2. Фотография из раздела человека
        // =====================================

        else {

            const personSection =
                image.closest('.person-section');

            if (!personSection) {
                return;
            }

            // Берём все фотографии этого человека
            currentGalleryImages = Array.from(
                personSection.querySelectorAll(
                    '.year-photos img'
                )
            );


            // Получаем имя человека
            const personTitle =
                personSection.querySelector('h2');

            if (personTitle) {

                currentGalleryName =
                    personTitle.textContent.trim();

            } else {

                currentGalleryName = '';
            }
        }


        // Определяем индекс нажатой фотографии
        currentImageIndex =
            currentGalleryImages.indexOf(image);


        // Сбрасываем масштаб при открытии
        lightboxScale = 1;

        // Сбрасываем увеличение при новом открытии
        lightboxScale = 1;
        lightboxOffsetX = 0;
        lightboxOffsetY = 0;
        updateLightboxZoom();

        // Обновляем Lightbox
        updateLightbox();


        // Показываем Lightbox
        lightbox.classList.add('show');

        lightbox.setAttribute(
            'aria-hidden',
            'false'
        );


        // Запрещаем прокрутку страницы
        document.body.style.overflow = 'hidden';
    }


    // ================================
    // Закрытие
    // ================================

    function closeLightbox() {

        lightbox.classList.remove('show');

        lightbox.setAttribute(
            'aria-hidden',
            'true'
        );

        document.body.style.overflow = '';
    }


    // ================================
    // Предыдущая фотография
    // ================================

    function showPreviousImage() {

        if (
            currentGalleryImages.length === 0 ||
            lightboxAnimating
        ) {
            return;
        }

        currentImageIndex =
            (currentImageIndex - 1 + currentGalleryImages.length) %
            currentGalleryImages.length;

        const newImage =
            currentGalleryImages[currentImageIndex];


        // Обновляем счётчик
        const year = getPhotoYear(newImage);

        if (currentGalleryName === 'Наш альбом' || year) {

            lightboxCounter.textContent =
                `${currentGalleryName} · ${year} · ${currentImageIndex + 1} из ${currentGalleryImages.length}`;

        } else {

            lightboxCounter.textContent =
                `${currentGalleryName} · ${currentImageIndex + 1} из ${currentGalleryImages.length}`;
        }


        // Предыдущая:
        // старая фотография → вправо
        // новая фотография ← слева
        animateLightbox(
            'previous',
            newImage
        );
    }


    // ================================
    // Следующая фотография
    // ================================

    function showNextImage() {

        if (
            currentGalleryImages.length === 0 ||
            lightboxAnimating
        ) {
            return;
        }

        currentImageIndex =
            (currentImageIndex + 1) %
            currentGalleryImages.length;

        const newImage =
            currentGalleryImages[currentImageIndex];


        // Обновляем счётчик
        const year = getPhotoYear(newImage);

        if (currentGalleryName === 'Наш альбом' || year) {

            lightboxCounter.textContent =
                `${currentGalleryName} · ${year} · ${currentImageIndex + 1} из ${currentGalleryImages.length}`;

        } else {

            lightboxCounter.textContent =
                `${currentGalleryName} · ${currentImageIndex + 1} из ${currentGalleryImages.length}`;
        }


        // Следующая:
        // старая фотография ← влево
        // новая фотография → справа
        animateLightbox(
            'next',
            newImage
        );
    }


    // ================================
    // Клик по фотографиям
    // ================================

    const allGalleryImages = Array.from(
        document.querySelectorAll(
            '.year-photos img, .album-year-photos img'
        )
    );


    allGalleryImages.forEach((image) => {

        image.addEventListener('click', () => {
            openLightbox(image);
        });

    });


    // ================================
    // Кнопки
    // ================================

    lightboxClose.addEventListener(
        'click',
        closeLightbox
    );

    lightboxPrev.addEventListener(
        'click',
        showPreviousImage
    );

    lightboxNext.addEventListener(
        'click',
        showNextImage
    );


    // ================================
    // Клик по тёмному фону
    // ================================

    lightbox.addEventListener('click', (event) => {

        if (event.target === lightbox) {
            closeLightbox();
        }

    });


    // ================================
    // Клавиатура
    // ================================

    document.addEventListener('keydown', (event) => {

        if (!lightbox.classList.contains('show')) {
            return;
        }

        if (event.key === 'Escape') {
            closeLightbox();
        }

        if (event.key === 'ArrowLeft') {
            showPreviousImage();
        }

        if (event.key === 'ArrowRight') {
            showNextImage();
        }

    });


    // ================================
    // Управление фотографией на телефоне
    // ================================

    let touchStartX = 0;
    let touchStartY = 0;

    let touchStartDistance = 0;
    let touchStartScale = 1;

    let touchDragging = false;

    // Точка, вокруг которой происходит Zoom
    let pinchStartCenterX = 0;
    let pinchStartCenterY = 0;

    // Координата фотографии под этой точкой
    let pinchImagePointX = 0;
    let pinchImagePointY = 0;

    // --------------------------------
    // Начало касания
    // --------------------------------

    lightboxImage.addEventListener(
        'touchstart',
        (event) => {

            // Два пальца — начинаем Zoom
            if (event.touches.length === 2) {

                const dx =
                    event.touches[0].clientX -
                    event.touches[1].clientX;

                const dy =
                    event.touches[0].clientY -
                    event.touches[1].clientY;

                touchStartDistance =
                    Math.sqrt(dx * dx + dy * dy);

                touchStartScale =
                    lightboxScale;


                // Центр между двумя пальцами
                const centerX =
                    (
                        event.touches[0].clientX +
                        event.touches[1].clientX
                    ) / 2;

                const centerY =
                    (
                        event.touches[0].clientY +
                        event.touches[1].clientY
                    ) / 2;


                // Центр Lightbox
                const rect =
                    lightbox.getBoundingClientRect();

                pinchStartCenterX =
                    centerX -
                    (rect.left + rect.width / 2);

                pinchStartCenterY =
                    centerY -
                    (rect.top + rect.height / 2);


                // Какая точка фотографии сейчас
                // находится под пальцами
                pinchImagePointX =
                    (
                        pinchStartCenterX -
                        lightboxOffsetX
                    ) / lightboxScale;

                pinchImagePointY =
                    (
                        pinchStartCenterY -
                        lightboxOffsetY
                    ) / lightboxScale;


                touchDragging = false;

                return;
            }

            // Один палец
            if (event.touches.length === 1) {

                touchStartX =
                    event.touches[0].clientX;

                touchStartY =
                    event.touches[0].clientY;

                // При увеличении один палец
                // будет перемещать фотографию
                if (lightboxScale > 1) {

                    touchDragging = true;

                    lightboxImage.style.transition =
                        'none';
                }
            }

        },
        { passive: true }
    );


    // --------------------------------
    // Движение пальцев
    // --------------------------------

    lightboxImage.addEventListener(
        'touchmove',
        (event) => {

            // =================================
            // Два пальца — Zoom
            // =================================

            if (event.touches.length === 2) {

                event.preventDefault();


                const dx =
                    event.touches[0].clientX -
                    event.touches[1].clientX;

                const dy =
                    event.touches[0].clientY -
                    event.touches[1].clientY;

                const distance =
                    Math.sqrt(dx * dx + dy * dy);


                if (touchStartDistance === 0) {
                    return;
                }


                // Новый масштаб
                const scaleChange =
                    distance / touchStartDistance;


                lightboxScale =
                    touchStartScale * scaleChange;


                lightboxScale =
                    Math.max(
                        lightboxMinScale,
                        Math.min(
                            lightboxMaxScale,
                            lightboxScale
                        )
                    );


                // =================================
                // Центр между пальцами
                // =================================

                const centerX =
                    (
                        event.touches[0].clientX +
                        event.touches[1].clientX
                    ) / 2;

                const centerY =
                    (
                        event.touches[0].clientY +
                        event.touches[1].clientY
                    ) / 2;


                const rect =
                    lightbox.getBoundingClientRect();


                const currentCenterX =
                    centerX -
                    (rect.left + rect.width / 2);

                const currentCenterY =
                    centerY -
                    (rect.top + rect.height / 2);


                // =================================
                // Сохраняем выбранную точку
                // под пальцами
                // =================================

                lightboxOffsetX =
                    currentCenterX -
                    pinchImagePointX * lightboxScale;

                lightboxOffsetY =
                    currentCenterY -
                    pinchImagePointY * lightboxScale;


                updateLightboxZoom();

                return;
            }


            // ================================
            // Один палец + увеличенное фото
            // ================================

            if (
                event.touches.length === 1 &&
                lightboxScale > 1 &&
                touchDragging
            ) {

                event.preventDefault();

                const currentX =
                    event.touches[0].clientX;

                const currentY =
                    event.touches[0].clientY;

                const deltaX =
                    currentX - touchStartX;

                const deltaY =
                    currentY - touchStartY;

                lightboxOffsetX += deltaX;
                lightboxOffsetY += deltaY;

                touchStartX = currentX;
                touchStartY = currentY;

                updateLightboxZoom();
            }

        },
        { passive: false }
    );


    // --------------------------------
    // Окончание касания
    // --------------------------------

    lightboxImage.addEventListener(
        'touchend',
        (event) => {

            // Если остался один палец после
            // двух пальцев — продолжаем нормально
            if (event.touches.length === 1) {

                touchStartX =
                    event.touches[0].clientX;

                touchStartY =
                    event.touches[0].clientY;

                touchDragging =
                    lightboxScale > 1;

                touchStartDistance = 0;

                return;
            }

            // Два пальца закончились
            if (event.touches.length === 0) {

                touchStartDistance = 0;
                touchDragging = false;

                // Если вернулись к 1× —
                // полностью центрируем фото
                if (lightboxScale <= 1) {

                    lightboxScale = 1;
                    lightboxOffsetX = 0;
                    lightboxOffsetY = 0;

                    updateLightboxZoom();
                }
            }

        },
        { passive: true }
    );


    // --------------------------------
    // Отмена касания
    // --------------------------------

    lightboxImage.addEventListener(
        'touchcancel',
        () => {

            touchStartDistance = 0;
            touchDragging = false;

        },
        { passive: true }
    );

        // ================================
    // Zoom колесом мыши
    // ================================

    lightboxImage.addEventListener('wheel', (event) => {

        event.preventDefault();

        if (lightboxAnimating) {
            return;
        }

        const oldScale = lightboxScale;

        // Определяем направление колеса
        if (event.deltaY < 0) {
            lightboxScale += lightboxZoomStep;
        } else {
            lightboxScale -= lightboxZoomStep;
        }

        // Ограничиваем масштаб
        lightboxScale = Math.max(
            lightboxMinScale,
            Math.min(
                lightboxMaxScale,
                lightboxScale
            )
        );

        // Если масштаб фактически не изменился,
        // ничего не делаем
        if (lightboxScale === oldScale) {
            return;
        }

        // При 1× возвращаем фотографию в центр
        if (lightboxScale === 1) {

            lightboxOffsetX = 0;
            lightboxOffsetY = 0;

        } else {

            // Центр области просмотра
            const rect =
                lightbox.getBoundingClientRect();

            const cursorX =
                event.clientX -
                (rect.left + rect.width / 2);

            const cursorY =
                event.clientY -
                (rect.top + rect.height / 2);

            // Какая точка фотографии сейчас находится
            // под курсором
            const imagePointX =
                (cursorX - lightboxOffsetX) /
                oldScale;

            const imagePointY =
                (cursorY - lightboxOffsetY) /
                oldScale;

            // После изменения масштаба
            // оставляем эту точку под курсором
            lightboxOffsetX =
                cursorX -
                imagePointX * lightboxScale;

            lightboxOffsetY =
                cursorY -
                imagePointY * lightboxScale;
        }

        updateLightboxZoom();

    }, { passive: false });

    // ================================
    // Правая кнопка — сброс увеличения
    // ================================

    lightboxImage.addEventListener('contextmenu', (event) => {

        event.preventDefault();

        lightboxScale = 1;
        lightboxOffsetX = 0;
        lightboxOffsetY = 0;
        lightboxDragging = false;

        lightboxImage.style.cursor = '';
        updateLightboxZoom();
    });

    // ================================
    // Перемещение увеличенной фотографии
    // ================================

    lightboxImage.addEventListener('mousedown', (event) => {

        if (lightboxScale <= 1) {
            return;
        }

        if (event.button !== 0) {
            return;
        }

        event.preventDefault();

        lightboxDragging = true;

        lightboxDragStartX =
            event.clientX - lightboxOffsetX;

        lightboxDragStartY =
            event.clientY - lightboxOffsetY;

        lightboxImage.style.cursor = 'grabbing';
        lightboxImage.style.transition = 'none';
    });

    document.addEventListener('mousemove', (event) => {

        if (!lightboxDragging) {
            return;
        }

        lightboxOffsetX =
            event.clientX - lightboxDragStartX;

        lightboxOffsetY =
            event.clientY - lightboxDragStartY;

        updateLightboxZoom();
    });

    document.addEventListener('mouseup', () => {

        if (!lightboxDragging) {
            return;
        }

        lightboxDragging = false;

        lightboxImage.style.cursor = '';
    });

});

    

// =====================================
// Анимация появления при прокрутке
// =====================================

document.addEventListener('DOMContentLoaded', () => {

    const animatedElements =
        document.querySelectorAll(
            '.hero, ' +
            '.family-person, ' +
            '.person-intro, ' +
            '.year-gallery, ' +
            '.year-photos img, ' +
            '.person-back, ' +
            '.album-section, ' +
            '.album-folder, ' +
            '.album-year-section, ' +
            '.album-year-photos img'
        );


    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add('visible');

                    }

                });

            },
            {
                threshold: 0.12,
                rootMargin: '0px 0px -40px 0px'
            }
        );


    animatedElements.forEach((element) => {

        element.classList.add('reveal-on-scroll');
        observer.observe(element);

    });

});
// =====================================
// ПАРАЛЛАКС ГЛАВНОЙ СЕМЕЙНОЙ ФОТОГРАФИИ
// =====================================

document.addEventListener('DOMContentLoaded', () => {

    const hero = document.querySelector('.hero');
    const familyPhoto = document.querySelector('.family-photo');
    const familyPeople = document.querySelectorAll('.family-person');

    if (!hero || !familyPhoto || familyPeople.length === 0) {
        return;
    }


    let ticking = false;


    function updateFamilyParallax() {

        const rect = hero.getBoundingClientRect();
        const windowHeight = window.innerHeight;


        // Положение главного блока
        const progress =
            (windowHeight - rect.top) /
            (windowHeight + rect.height);

        const clampedProgress =
            Math.max(
                0,
                Math.min(1, progress)
            );


        // --------------------------------
        // Семейная фотография
        // --------------------------------

        // Смещение вверх/вниз
        const photoY =
            (clampedProgress - 0.5) * -55;


        // Очень лёгкое приближение
        const photoScale =
            1 +
            (clampedProgress - 0.5) * 0.025;


        familyPhoto.style.transform =
            `translate3d(0, ${photoY}px, 0) scale(${photoScale})`;


        // --------------------------------
        // Подписи членов семьи
        // --------------------------------

        familyPeople.forEach((person, index) => {

            // Чётные и нечётные подписи
            // двигаются чуть по-разному

            const direction =
                index % 2 === 0
                    ? 1
                    : -1;


            const personY =
                (clampedProgress - 0.5) *
                24 *
                direction;


            const personScale =
                1 +
                Math.abs(
                    clampedProgress - 0.5
                ) * 0.035;


            person.style.transform =
                `translate3d(0, ${personY}px, 0) scale(${personScale})`;

        });


        ticking = false;
    }


    function requestParallaxUpdate() {

        if (ticking) {
            return;
        }

        ticking = true;

        requestAnimationFrame(
            updateFamilyParallax
        );
    }


    window.addEventListener(
        'scroll',
        requestParallaxUpdate,
        {
            passive: true
        }
    );


    window.addEventListener(
        'resize',
        requestParallaxUpdate
    );


    updateFamilyParallax();

});
// =====================================
// СЕРДЕЧКО ПРИ КЛИКЕ МЫШКОЙ
// =====================================

document.addEventListener('click', (event) => {

    // Только обычный клик левой кнопкой мыши
    if (event.button !== 0) {
        return;
    }


    // Создаём сердечко
    const heart =
        document.createElement('span');

    heart.className =
        'click-heart';

    heart.textContent =
        '♥';


    // Точка клика
    heart.style.left =
        `${event.clientX}px`;

    heart.style.top =
        `${event.clientY}px`;


    // Добавляем на страницу
    document.body.appendChild(heart);


    // Удаляем после окончания анимации
    heart.addEventListener(
        'animationend',
        () => {
            heart.remove();
        },
        {
            once: true
        }
    );

});
    // =====================================
    // МОБИЛЬНАЯ ШАПКА
    // =====================================

    document.addEventListener('DOMContentLoaded', () => {

        if (window.innerWidth > 800) {
            return;
        }

        const header = document.querySelector('.site-header');
        const lightbox = document.getElementById('lightbox');

        if (!header) {
            return;
        }

        let headerTimer = null;
        let lastScrollY = window.scrollY;


        // =====================================
        // ПОКАЗАТЬ ШАПКУ
        // =====================================

        function showHeader() {

            clearTimeout(headerTimer);

            header.classList.remove('header-hidden');
        }


        // =====================================
        // СПРЯТАТЬ ШАПКУ
        // =====================================

        function hideHeader() {

            clearTimeout(headerTimer);

            header.classList.add('header-hidden');
        }


        // =====================================
        // ПОКАЗАТЬ НА 3 СЕКУНДЫ
        // =====================================

        function showHeaderForThreeSeconds() {

            // При открытом фото шапка не появляется
            if (
                lightbox &&
                lightbox.classList.contains('show')
            ) {
                return;
            }

            showHeader();

            clearTimeout(headerTimer);

            headerTimer = setTimeout(() => {

                hideHeader();

            }, 3000);
        }


        // =====================================
        // ОБЫЧНАЯ ПРОКРУТКА
        // =====================================

        window.addEventListener('scroll', () => {

        // Во время просмотра фотографии
        // шапкой не управляем
        if (
            lightbox &&
            lightbox.classList.contains('show')
        ) {
            lastScrollY = window.scrollY;
            return;
        }

        const currentScrollY = window.scrollY;


        // =====================================
        // САМОМ ВЕРХУ — ШАПКА ВСЕГДА ВИДНА
        // =====================================

        if (currentScrollY <= 5) {

            clearTimeout(headerTimer);

            header.classList.remove('header-hidden');

            lastScrollY = currentScrollY;

            return;
        }


        // =====================================
        // ПРОКРУТКА ВНИЗ — ПРЯЧЕМ
        // =====================================

        if (currentScrollY > lastScrollY + 3) {

            hideHeader();

        }


        // =====================================
        // ПРОКРУТКА ВВЕРХ — ПОКАЗЫВАЕМ НА 3 СЕКУНДЫ
        // =====================================

        else if (currentScrollY < lastScrollY - 3) {

            showHeaderForThreeSeconds();

        }

        lastScrollY = currentScrollY;

    }, { passive: true });


    // =====================================
    // LIGHTBOX
    // =====================================

    if (lightbox) {

        const observer =
            new MutationObserver(() => {

                // Открыли фотографию
                if (
                    lightbox.classList.contains('show')
                ) {

                    clearTimeout(headerTimer);

                    hideHeader();

                }

                // Закрыли фотографию
                else {

                    showHeader();

                    lastScrollY = window.scrollY;

                }

            });


        observer.observe(lightbox, {

            attributes: true,

            attributeFilter: ['class']

        });

    }


    // =====================================
    // НАЧАЛЬНОЕ СОСТОЯНИЕ
    // =====================================

    showHeader();

});

// =====================================
// МОБИЛЬНОЕ МЕНЮ
// =====================================

document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuButton =
        document.querySelector('.mobile-menu-button');

    const siteNav =
        document.querySelector('.site-header nav');

    if (!mobileMenuButton || !siteNav) {
        return;
    }

    mobileMenuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        siteNav.classList.toggle('mobile-menu-open');
    });

    siteNav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            siteNav.classList.remove('mobile-menu-open');
        });
    });

    document.addEventListener('click', (event) => {
        if (
            !siteNav.contains(event.target) &&
            !mobileMenuButton.contains(event.target)
        ) {
            siteNav.classList.remove('mobile-menu-open');
        }
    });

    window.addEventListener('scroll', () => {
        siteNav.classList.remove('mobile-menu-open');
    }, { passive: true });
});

