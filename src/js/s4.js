// Определение базового URL для папки фреймворка
// Define base URL for framework folder
const baseUrl = document.currentScript.src.substring(0, document.currentScript.src.lastIndexOf('js/'))

// Асинхронная загрузка скрипта
// Asynchronous script loading
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = url
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
    })
}

// Сет для кэширования загруженных CSS файлов
// Set for caching downloaded CSS files
const loadedLinks = new Set()

// Загрузка карты зависимостей из JSON
// Load dependency map from JSON
async function loadDependencyMap(url) {
    try {
        const response = await fetch(url)
        if (!response.ok)
            throw new Error(`Ошибка загрузки JSON | Loading error JSON: ${response.statusText}`)
        const data = await response.json()
        return data
    } catch (error) {
        console.error('Ошибка при загрузке или парсинге dependencyMap | Error loading or parsing dependencyMap:', error)
        // Возвращаем значения по умолчанию в случае ошибки или отсутствия JSON
        // Return default values ​​in case of error or missing JSON
        return {
            "desktop": {
                "landscape": [{"desktop": "landscape"}],
                "portrait": [{"desktop": "portrait"}]
            },
            "tablet": {
                "landscape": [{"tablet": "landscape"}],
                "portrait": [{"tablet": "portrait"}]
            },
            "mobile": {
                "landscape": [{"mobile": "landscape"}],
                "portrait": [{"mobile": "portrait"}]
            }
        }
    }
}

// Функция для загрузки CSS файлов
// Function for loading CSS files
function loadLink(href, id = '') {
    if (loadedLinks.has(href))
        console.log(`Пропуск: "${href}" уже загружен | Skip: "${href}" is already loaded.`)
    else {
        // Создание нового <link> элемента
        // Create a new <link> element
        const link = document.createElement('link')
        link.id = id
        link.href = href
        link.rel = 'stylesheet'
        link.type = 'text/css'
        document.head.appendChild(link)
    
        // Добавление href в кэш
        // Add href to cache
        loadedLinks.add(href)
    }
}

// Функция для сравнения зависимостей
// Function for comparing dependencies
function areDependenciesEqual(dep1, dep2) {
    return Object.keys(dep1)[0] === Object.keys(dep2)[0] &&
           Object.values(dep1)[0] === Object.values(dep2)[0]
}

// Объединенная функция для загрузки и удаления CSS файлов
// Combined function for loading and removing CSS files
function updateLinks(currentDepends, allDependencies) {
    // Загружаем стили зависимостей
    // Load dependency styles
    currentDepends.forEach(obj => {
        const [key] = Object.keys(obj)
        loadLink(`${baseUrl}css/${key}/${obj[key]}.css`, `${key}/${obj[key]}`)
    })
    
    // Загружаем themes.css для текущего типа устройства
    // Load themes.css for the current device type
    loadLink(`${baseUrl}css/${device.type}/themes.css`, `${device.type}/themes`)

    // Удаляем неиспользуемые стили
    // Remove unused styles
    allDependencies.forEach(obj => {
        const [key] = Object.keys(obj)
        const element = document.getElementById(`${key}/${obj[key]}`)
        if (element && !currentDepends.some(dep => areDependenciesEqual(dep, obj))) {
            element.remove()
            loadedLinks.delete(`${baseUrl}css/${key}/${obj[key]}.css`)
        }
    })
    
}

// Функция для проверки и установки темы
// Function for checking and setting the theme
function setThemeBasedOnPreference() {
    // Получаем текущую установленную тему
    // Getting the currently installed theme
    const currentTheme = document.documentElement.getAttribute('theme')
    
    // Если тема уже установлена и не равна 'dark' или 'light', прерываем выполнение функции
    // If the theme is already set and is not 'dark' or 'light', abort the function
    if (currentTheme && currentTheme !== 'dark' && currentTheme !== 'light')
        return;

    // Собираем информацию, предпочитает ли пользователь тёмную тему или светлую
    // Getting information on whether the user prefers a dark or light theme
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)')
    const prefersLightScheme = window.matchMedia('(prefers-color-scheme: light)')
  
    // В зависимости от предпочтений пользователя на корневом элементе <html> устанавливается атрибут [theme=dark] или [theme=light]
    // Depending on the user's preferences, the [theme=dark] or [theme=light] attribute is set on the root <html> element
    if (prefersDarkScheme.matches)
        document.documentElement.setAttribute('theme', 'dark')
    else if (prefersLightScheme.matches)
        document.documentElement.setAttribute('theme', 'light')
    else {
        // Если тема не выбрана, задется значение по умолчанию - light
        // If the theme is not selected, set the default value - light
        document.documentElement.setAttribute('theme', 'light')
    }
}

// Функция управления загрузкой CSS в зависимости от устройства и ориентации
// Function to control CSS loading depending on device and orientation
async function S4() {

    // Установка темы при загрузке страницы
    // Set theme on page load
    setThemeBasedOnPreference()
    
    // Следить за изменениями предпочтений темы
    // Track changes in theme preferences
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setThemeBasedOnPreference)
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', setThemeBasedOnPreference)

    // Добавление тега <style> со списком слоев стилей
    // Adding a <style> tag with a list of style layers
    document.head.appendChild(Object.assign(document.createElement('style'), {
        textContent: `@layer themes, elements, utilities;`
    }))

    try {
        // Загружаем ключевой скрипт current-device
        // Load the current-device key script
        await loadScript(`${baseUrl}js/current-device.min.js`)
        console.info(`Скрипт current-device загружен успешно | The current-device script loaded successfully`)

        // Загрузка dependencyMap из JSON с обработкой ошибок
        const dependencyMap = await loadDependencyMap(`${baseUrl}dependency-map.json`)

        // Проверяем, что объект device определен после загрузки скрипта
        // Check that the device object is defined after loading the script
        if (!device)
            throw new Error('Объект device не определен | The device object is not defined')

        // После загрузки скрипта инициализируем переменные
        // After loading the script, initialize the variables
        let type = device.type,
            orientation = device.orientation,
            currentDepends = dependencyMap[type]?.[orientation] || []

        // Применяем стили
        // Apply styles
        updateLinks(currentDepends, Object.values(dependencyMap).flatMap(device => Object.values(device).flat()))

        loadLink(`${baseUrl}css/elements.css`, 'css/elements')

        // Обновление стилей при изменении ориентации устройства
        // Update styles when device orientation changes
        device.onChangeOrientation(async newOrientation => {
            if (orientation !== newOrientation) {
                orientation = newOrientation
                currentDepends = dependencyMap[type]?.[orientation] || []
                updateLinks(currentDepends, Object.values(dependencyMap).flatMap(device => Object.values(device).flat()))
            }
        })
    } catch (error) {
        console.error('Ошибка при загрузке скрипта или инициализации устройства | Error loading script or initializing device:', error)
    }
}