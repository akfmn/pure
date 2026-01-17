<?php
// api/auth.php - API для регистрации и авторизации

// Включаем отображение ошибок для отладки (УДАЛИТЕ В ПРОДАКШЕНЕ!)
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

require_once '../config.php';

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        $rawData = file_get_contents('php://input');
        $data = json_decode($rawData, true);
        
        // Логируем полученные данные
        error_log("Received data: " . print_r($data, true));
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Ошибка парсинга JSON: ' . json_last_error_msg());
        }
        
        $action = $data['action'] ?? '';
        
        if ($action === 'register') {
            // Регистрация нового пользователя
            if (!isset($data['username']) || !isset($data['password']) || 
                !isset($data['name']) || !isset($data['email']) || 
                !isset($data['gender']) || !isset($data['age']) || 
                !isset($data['country']) || !isset($data['city'])) {
                throw new Exception('Missing required fields');
            }
            
            $username = trim($data['username']);
            $password = $data['password'];
            $name = trim($data['name']);
            $email = trim($data['email']);
            $gender = $data['gender'];
            $age = intval($data['age']);
            $birthdate = isset($data['birthdate']) ? $data['birthdate'] : null;
            $country = trim($data['country']);
            $city = trim($data['city']);
            $avatar = isset($data['avatar']) ? $data['avatar'] : strtoupper(mb_substr($name, 0, 1));
            
            // Валидация
            if (strlen($username) < 3) {
                throw new Exception('Логин должен быть минимум 3 символа');
            }
            
            // Валидация логина - только английские буквы, цифры и _
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
                throw new Exception('Логин может содержать только английские буквы, цифры и символ подчеркивания');
            }
            
            if (strlen($password) < 6) {
                throw new Exception('Пароль должен быть минимум 6 символов');
            }
            
            // Валидация пароля - только английские буквы, цифры и спецсимволы
            if (!preg_match('/^[a-zA-Z0-9!@#$%^&*]+$/', $password)) {
                throw new Exception('Пароль может содержать только английские буквы, цифры и символы !@#$%^&*');
            }
            
            if ($age < 18) {
                throw new Exception('Вы должны быть старше 18 лет');
            }
            
            if (strlen($name) < 2) {
                throw new Exception('Имя должно быть минимум 2 символа');
            }
            
            // Валидация email
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Неверный формат email');
            }
            
            // Валидация пола
            if (!in_array($gender, ['male', 'female'])) {
                throw new Exception('Неверное значение пола');
            }
            
            // Проверка существования логина
            $checkSql = "SELECT id FROM users WHERE username = :username";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->execute([':username' => $username]);
            
            if ($checkStmt->fetch()) {
                throw new Exception('Этот логин уже занят');
            }
            
            // Проверка существования email
            $checkEmailSql = "SELECT id FROM users WHERE email = :email";
            $checkEmailStmt = $conn->prepare($checkEmailSql);
            $checkEmailStmt->execute([':email' => $email]);
            
            if ($checkEmailStmt->fetch()) {
                throw new Exception('Этот email уже используется');
            }
            
            // Хеширование пароля
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            
            // Создание пользователя
            $sql = "INSERT INTO users (username, password_hash, name, email, gender, age, birthdate, country, city, avatar) 
                    VALUES (:username, :password_hash, :name, :email, :gender, :age, :birthdate, :country, :city, :avatar)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':username' => $username,
                ':password_hash' => $passwordHash,
                ':name' => $name,
                ':email' => $email,
                ':gender' => $gender,
                ':age' => $age,
                ':birthdate' => $birthdate,
                ':country' => $country,
                ':city' => $city,
                ':avatar' => $avatar
            ]);
            
            $userId = $conn->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'user_id' => $userId,
                'message' => 'Регистрация успешна!'
            ]);
            
        } else if ($action === 'login') {
            // Вход пользователя
            if (!isset($data['username']) || !isset($data['password'])) {
                throw new Exception('Введите логин и пароль');
            }
            
            $username = trim($data['username']);
            $password = $data['password'];
            
            // Получение пользователя
            $sql = "SELECT id, username, password_hash, name, age, gender, birthdate, country, city, avatar, role, bio 
                    FROM users WHERE username = :username";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch();
            
            if (!$user) {
                throw new Exception('Неверный логин или пароль');
            }
            
            // Проверка пароля
            if (!password_verify($password, $user['password_hash'])) {
                throw new Exception('Неверный логин или пароль');
            }
            
            // Обновление последней активности
            $updateSql = "UPDATE users SET last_active = NOW() WHERE id = :id";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->execute([':id' => $user['id']]);
            
            unset($user['password_hash']); // Не отправляем хеш пароля
            
            echo json_encode([
                'success' => true,
                'user' => $user,
                'message' => 'Вход успешен!'
            ]);
            
        } else {
            throw new Exception('Unknown action');
        }
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch(Exception $e) {
    http_response_code(400);
    error_log("Auth API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}
?>