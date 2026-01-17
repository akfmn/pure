<?php
// api/posts.php - API для работы с постами

require_once '../config.php';

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch($method) {
        case 'GET':
            // Получение всех активных постов
            $filter = $_GET['filter'] ?? 'nearby';
            $userId = $_GET['user_id'] ?? null;
            
            $sql = "SELECT 
                        p.id,
                        p.text,
                        p.duration,
                        p.photo,
                        p.created_at,
                        p.expires_at,
                        p.latitude as post_latitude,
                        p.longitude as post_longitude,
                        u.id as user_id,
                        u.name,
                        u.age,
                        u.gender,
                        u.avatar,
                        u.city,
                        u.country,
                        u.latitude,
                        u.longitude,
                        u.last_active,
                        u.created_at as user_created_at,
                        TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) as minutes_since_active,
                        IF(TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) <= 5, 1, 0) as is_online,
                        GREATEST(0, TIMESTAMPDIFF(MINUTE, NOW(), p.expires_at)) as minutes_left,
                        TIMESTAMPDIFF(MINUTE, p.created_at, NOW()) as minutes_ago,
                        DATE_FORMAT(p.expires_at, '%Y-%m-%dT%H:%i:%s') as expires_at_iso
                    FROM posts p
                    JOIN users u ON p.user_id = u.id
                    WHERE p.expires_at > NOW()";
            
            // Фильтр по конкретному пользователю
            if ($userId) {
                $sql .= " AND p.user_id = :user_id";
            }
            
            $sql .= " ORDER BY p.created_at DESC";
            
            $stmt = $conn->prepare($sql);
            if ($userId) {
                $stmt->execute([':user_id' => $userId]);
            } else {
                $stmt->execute();
            }
            $posts = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'posts' => $posts,
                'server_time' => date('Y-m-d\TH:i:s')
            ]);
            break;
            
        case 'POST':
            // Создание нового поста
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['user_id']) || !isset($data['text'])) {
                throw new Exception('Missing required fields');
            }
            
            $userId = $data['user_id'];
            $text = $data['text'];
            $photo = $data['photo'] ?? null; // Base64 фото или null
            $latitude = $data['latitude'] ?? null;
            $longitude = $data['longitude'] ?? null;
            
            // Принимаем длительность в минутах
            if (isset($data['duration_minutes'])) {
                $durationMinutes = intval($data['duration_minutes']);
                $durationHours = ceil($durationMinutes / 60); // Сохраняем часы для совместимости
            } else if (isset($data['duration'])) {
                // Старый формат - часы
                $durationHours = intval($data['duration']);
                $durationMinutes = $durationHours * 60;
            } else {
                throw new Exception('Duration not specified');
            }
            
            $sql = "INSERT INTO posts (user_id, text, duration, photo, latitude, longitude, expires_at) 
                    VALUES (:user_id, :text, :duration, :photo, :latitude, :longitude, DATE_ADD(NOW(), INTERVAL :duration_minutes MINUTE))";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':user_id' => $userId,
                ':text' => $text,
                ':duration' => $durationHours,
                ':photo' => $photo,
                ':latitude' => $latitude,
                ':longitude' => $longitude,
                ':duration_minutes' => $durationMinutes
            ]);
            
            $postId = $conn->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'post_id' => $postId,
                'message' => 'Post created successfully'
            ]);
            break;
            
        case 'DELETE':
            // Удаление поста
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['post_id']) || !isset($data['user_id'])) {
                throw new Exception('Post ID and User ID required');
            }
            
            $postId = $data['post_id'];
            $userId = $data['user_id'];
            
            // Проверяем, что пост принадлежит пользователю
            $checkSql = "SELECT user_id FROM posts WHERE id = :id";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->execute([':id' => $postId]);
            $post = $checkStmt->fetch();
            
            if (!$post) {
                throw new Exception('Объявление не найдено');
            }
            
            if ($post['user_id'] != $userId) {
                throw new Exception('Вы не можете удалить чужое объявление');
            }
            
            // Удаляем пост
            $sql = "DELETE FROM posts WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $stmt->execute([':id' => $postId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Объявление удалено'
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
