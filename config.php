<?php
// config.php - Конфигурация подключения к базе данных

// ВАЖНО: Замените эти значения на свои данные от хостинга
define('DB_HOST', '127.0.0.1:3306');        // обычно localhost
define('DB_NAME', 'u960932074_pure_dating'); // имя вашей базы данных
define('DB_USER', 'u960932074_pure_dating');      // ваш пользователь MySQL
define('DB_PASS', ';Qa1YEzX');      // ваш пароль MySQL

// Создание подключения
function getDBConnection() {
    try {
        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $conn;
    } catch(PDOException $e) {
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database connection failed']);
        exit();
    }
}

// Установка заголовков для CORS (если фронтенд на другом домене)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
