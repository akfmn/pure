<?php
// api/users.php - API для работы с пользователями

require_once '../config.php';

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch($method) {
        case 'GET':
            // Получение информации о пользователе
            $action = $_GET['action'] ?? null;
            $userId = $_GET['id'] ?? $_GET['user_id'] ?? null;
            
            if ($action === 'get_profile' && $userId) {
                // Получение полного профиля пользователя
                $sql = "SELECT id, name, age, gender, avatar, city, country, bio,
                        TIMESTAMPDIFF(MINUTE, last_active, NOW()) as minutes_inactive
                        FROM users WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $userId]);
                $user = $stmt->fetch();
                
                if (!$user) {
                    throw new Exception('User not found');
                }
                
                // Определяем онлайн статус (активен в последние 5 минут)
                $user['is_online'] = ($user['minutes_inactive'] !== null && $user['minutes_inactive'] <= 5);
                unset($user['minutes_inactive']);
                
                echo json_encode([
                    'success' => true,
                    'user' => $user
                ]);
            } elseif ($userId) {
                // Конкретный пользователь
                $sql = "SELECT id, name, age, avatar, created_at FROM users WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $userId]);
                $user = $stmt->fetch();
                
                if (!$user) {
                    throw new Exception('User not found');
                }
                
                echo json_encode([
                    'success' => true,
                    'user' => $user
                ]);
            } else {
                // Все пользователи
                $sql = "SELECT id, name, age, avatar FROM users ORDER BY last_active DESC";
                $stmt = $conn->prepare($sql);
                $stmt->execute();
                $users = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true,
                    'users' => $users
                ]);
            }
            break;
            
        case 'POST':
            // Обработка различных действий
            $data = json_decode(file_get_contents('php://input'), true);
            $action = $data['action'] ?? 'create';
            
            if ($action === 'update_activity') {
                // Обновление времени последней активности
                if (!isset($data['user_id'])) {
                    throw new Exception('User ID required');
                }
                
                $userId = $data['user_id'];
                
                $sql = "UPDATE users SET last_active = NOW() WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $userId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Activity updated'
                ]);
            }
            else if ($action === 'change_password') {
                // Изменение пароля
                if (!isset($data['user_id']) || !isset($data['current_password']) || !isset($data['new_password'])) {
                    throw new Exception('Missing required fields');
                }
                
                $userId = $data['user_id'];
                $currentPassword = $data['current_password'];
                $newPassword = $data['new_password'];
                
                // Валидация нового пароля
                if (strlen($newPassword) < 6) {
                    throw new Exception('Новый пароль должен быть минимум 6 символов');
                }
                
                if (!preg_match('/^[a-zA-Z0-9!@#$%^&*]+$/', $newPassword)) {
                    throw new Exception('Пароль может содержать только английские буквы, цифры и символы !@#$%^&*');
                }
                
                // Получаем текущий хеш пароля
                $sql = "SELECT password_hash FROM users WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $userId]);
                $user = $stmt->fetch();
                
                if (!$user) {
                    throw new Exception('Пользователь не найден');
                }
                
                // Проверяем текущий пароль
                if (!password_verify($currentPassword, $user['password_hash'])) {
                    throw new Exception('Неверный текущий пароль');
                }
                
                // Хешируем новый пароль
                $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
                
                // Обновляем пароль
                $updateSql = "UPDATE users SET password_hash = :password_hash WHERE id = :id";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->execute([
                    ':password_hash' => $newPasswordHash,
                    ':id' => $userId
                ]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Пароль успешно изменён'
                ]);
                
            } else {
                // Создание нового пользователя (старая логика)
                if (!isset($data['name']) || !isset($data['age'])) {
                    throw new Exception('Missing required fields');
                }
                
                $name = $data['name'];
                $age = $data['age'];
                $avatar = $data['avatar'] ?? '👤';
                
                $sql = "INSERT INTO users (name, age, avatar) VALUES (:name, :age, :avatar)";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':name' => $name,
                    ':age' => $age,
                    ':avatar' => $avatar
                ]);
                
                $userId = $conn->lastInsertId();
                
                echo json_encode([
                    'success' => true,
                    'user_id' => $userId,
                    'message' => 'User created successfully'
                ]);
            }
            break;
            
        case 'PUT':
            // Обновление профиля пользователя
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['id'])) {
                throw new Exception('User ID required');
            }
            
            $updates = [];
            $params = [':id' => $data['id']];
            
            if (isset($data['name'])) {
                $updates[] = "name = :name";
                $params[':name'] = $data['name'];
            }
            if (isset($data['age'])) {
                $updates[] = "age = :age";
                $params[':age'] = $data['age'];
            }
            if (isset($data['birthdate'])) {
                $updates[] = "birthdate = :birthdate";
                $params[':birthdate'] = $data['birthdate'];
            }
            if (isset($data['country'])) {
                $updates[] = "country = :country";
                $params[':country'] = $data['country'];
            }
            if (isset($data['city'])) {
                $updates[] = "city = :city";
                $params[':city'] = $data['city'];
            }
            if (isset($data['avatar'])) {
                $updates[] = "avatar = :avatar";
                $params[':avatar'] = $data['avatar'];
            }
            if (isset($data['latitude'])) {
                $updates[] = "latitude = :latitude";
                $params[':latitude'] = $data['latitude'];
            }
            if (isset($data['longitude'])) {
                $updates[] = "longitude = :longitude";
                $params[':longitude'] = $data['longitude'];
            }
            if (isset($data['bio'])) {
                $updates[] = "bio = :bio";
                $params[':bio'] = $data['bio'];
            }
            
            if (empty($updates)) {
                throw new Exception('No fields to update');
            }
            
            $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode([
                'success' => true,
                'message' => 'User updated successfully'
            ]);
            break;
            
        case 'DELETE':
            // Удаление аккаунта
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['user_id']) || !isset($data['password'])) {
                throw new Exception('User ID and password required');
            }
            
            $userId = $data['user_id'];
            $password = $data['password'];
            
            // Получаем текущий хеш пароля пользователя
            $sql = "SELECT password_hash FROM users WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $stmt->execute([':id' => $userId]);
            $user = $stmt->fetch();
            
            if (!$user) {
                throw new Exception('Пользователь не найден');
            }
            
            // Проверяем пароль
            if (!password_verify($password, $user['password_hash'])) {
                throw new Exception('Неверный пароль');
            }
            
            // Удаляем все посты пользователя
            $deletePostsSql = "DELETE FROM posts WHERE user_id = :user_id";
            $deletePostsStmt = $conn->prepare($deletePostsSql);
            $deletePostsStmt->execute([':user_id' => $userId]);
            
            // Удаляем пользователя
            $deleteUserSql = "DELETE FROM users WHERE id = :id";
            $deleteUserStmt = $conn->prepare($deleteUserSql);
            $deleteUserStmt->execute([':id' => $userId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Аккаунт успешно удалён'
            ]);
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch(Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>