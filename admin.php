<?php
// api/admin.php - API для админ-панели

require_once '../config.php';

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Проверка что пользователь админ
function checkAdmin($conn, $userId) {
    $sql = "SELECT role FROM users WHERE id = :id";
    $stmt = $conn->prepare($sql);
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();
    
    return $user && $user['role'] === 'admin';
}

try {
    $userId = $_GET['user_id'] ?? $_POST['user_id'] ?? null;
    
    if (!$userId) {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;
    }
    
    if (!$userId || !checkAdmin($conn, $userId)) {
        throw new Exception('Access denied');
    }
    
    switch($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'reports';
            
            if ($action === 'reports') {
                // Получить все жалобы
                $status = $_GET['status'] ?? 'all';
                
                $sql = "SELECT 
                            r.id,
                            r.reporter_id,
                            r.post_id,
                            r.reported_user_id,
                            r.chat_id,
                            r.reason,
                            r.type,
                            r.status,
                            r.created_at,
                            r.processed_at,
                            r.admin_comment,
                            reporter.name as reporter_name,
                            reporter.avatar as reporter_avatar,
                            reported.name as reported_name,
                            reported.avatar as reported_avatar,
                            p.text as post_text
                        FROM reports r
                        LEFT JOIN users reporter ON r.reporter_id = reporter.id
                        LEFT JOIN users reported ON r.reported_user_id = reported.id
                        LEFT JOIN posts p ON r.post_id = p.id";
                
                if ($status !== 'all') {
                    $sql .= " WHERE r.status = :status";
                }
                
                $sql .= " ORDER BY r.created_at DESC";
                
                $stmt = $conn->prepare($sql);
                if ($status !== 'all') {
                    $stmt->execute([':status' => $status]);
                } else {
                    $stmt->execute();
                }
                $reports = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true,
                    'reports' => $reports
                ]);
                
            } elseif ($action === 'stats') {
                // Статистика
                $statsSql = "SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM posts WHERE expires_at > NOW()) as active_posts,
                    (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
                    (SELECT COUNT(*) FROM chats) as total_chats,
                    (SELECT COUNT(*) FROM messages) as total_messages";
                $statsStmt = $conn->prepare($statsSql);
                $statsStmt->execute();
                $stats = $statsStmt->fetch();
                
                echo json_encode([
                    'success' => true,
                    'stats' => $stats
                ]);
                
            } elseif ($action === 'users') {
                // Список пользователей
                $sql = "SELECT id, name, email, avatar, city, country, role, created_at, last_active,
                        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts_count,
                        (SELECT COUNT(*) FROM reports WHERE reported_user_id = users.id) as reports_count
                        FROM users ORDER BY created_at DESC";
                $stmt = $conn->prepare($sql);
                $stmt->execute();
                $users = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true,
                    'users' => $users
                ]);
                
            } elseif ($action === 'chat_messages') {
                // Получить сообщения чата для просмотра
                $chatId = $_GET['chat_id'] ?? null;
                
                if (!$chatId) {
                    throw new Exception('Chat ID required');
                }
                
                // Получаем информацию о чате
                $chatSql = "SELECT c.*, 
                            u1.name as user1_name, u1.avatar as user1_avatar,
                            u2.name as user2_name, u2.avatar as user2_avatar
                            FROM chats c
                            JOIN users u1 ON c.user1_id = u1.id
                            JOIN users u2 ON c.user2_id = u2.id
                            WHERE c.id = :chat_id";
                $chatStmt = $conn->prepare($chatSql);
                $chatStmt->execute([':chat_id' => $chatId]);
                $chat = $chatStmt->fetch();
                
                // Получаем сообщения
                $msgSql = "SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
                           FROM messages m
                           JOIN users u ON m.sender_id = u.id
                           WHERE m.chat_id = :chat_id
                           ORDER BY m.created_at ASC";
                $msgStmt = $conn->prepare($msgSql);
                $msgStmt->execute([':chat_id' => $chatId]);
                $messages = $msgStmt->fetchAll();
                
                echo json_encode([
                    'success' => true,
                    'chat' => $chat,
                    'messages' => $messages
                ]);
            }
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $action = $data['action'] ?? '';
            
            if ($action === 'process_report') {
                // Обработать жалобу
                $reportId = $data['report_id'] ?? null;
                $status = $data['status'] ?? 'resolved';
                $comment = $data['comment'] ?? '';
                
                if (!$reportId) {
                    throw new Exception('Report ID required');
                }
                
                $sql = "UPDATE reports SET status = :status, admin_comment = :comment, processed_at = NOW() WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':status' => $status,
                    ':comment' => $comment,
                    ':id' => $reportId
                ]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Report processed'
                ]);
                
            } elseif ($action === 'ban_user') {
                // Заблокировать пользователя
                $targetUserId = $data['target_user_id'] ?? null;
                
                if (!$targetUserId) {
                    throw new Exception('Target user ID required');
                }
                
                $sql = "UPDATE users SET role = 'banned' WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $targetUserId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'User banned'
                ]);
                
            } elseif ($action === 'unban_user') {
                // Разблокировать пользователя
                $targetUserId = $data['target_user_id'] ?? null;
                
                if (!$targetUserId) {
                    throw new Exception('Target user ID required');
                }
                
                $sql = "UPDATE users SET role = 'user' WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $targetUserId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'User unbanned'
                ]);
                
            } elseif ($action === 'delete_post') {
                // Удалить пост
                $postId = $data['post_id'] ?? null;
                
                if (!$postId) {
                    throw new Exception('Post ID required');
                }
                
                $sql = "DELETE FROM posts WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $postId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Post deleted'
                ]);
                
            } elseif ($action === 'delete_user') {
                // Удалить пользователя
                $targetUserId = $data['target_user_id'] ?? null;
                
                if (!$targetUserId) {
                    throw new Exception('Target user ID required');
                }
                
                // Удаляем посты
                $conn->prepare("DELETE FROM posts WHERE user_id = :id")->execute([':id' => $targetUserId]);
                // Удаляем сообщения
                $conn->prepare("DELETE FROM messages WHERE sender_id = :id")->execute([':id' => $targetUserId]);
                // Удаляем чаты
                $conn->prepare("DELETE FROM chats WHERE user1_id = :id OR user2_id = :id2")->execute([':id' => $targetUserId, ':id2' => $targetUserId]);
                // Удаляем жалобы
                $conn->prepare("DELETE FROM reports WHERE reporter_id = :id OR reported_user_id = :id2")->execute([':id' => $targetUserId, ':id2' => $targetUserId]);
                // Удаляем пользователя
                $conn->prepare("DELETE FROM users WHERE id = :id")->execute([':id' => $targetUserId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'User deleted'
                ]);
            }
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