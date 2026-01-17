<?php
// api/chats.php - API для чатов

require_once '../config.php';

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';
            $userId = $_GET['user_id'] ?? null;
            
            if (!$userId) {
                throw new Exception('User ID required');
            }
            
            if ($action === 'list') {
                // Получить список всех чатов пользователя
                $sql = "SELECT 
                            c.id as chat_id,
                            c.updated_at,
                            CASE 
                                WHEN c.user1_id = :user_id THEN c.user2_id 
                                ELSE c.user1_id 
                            END as other_user_id,
                            u.name as other_user_name,
                            u.avatar as other_user_avatar,
                            u.last_active,
                            IF(TIMESTAMPDIFF(MINUTE, u.last_active, NOW()) <= 5, 1, 0) as is_online,
                            (SELECT message FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                            (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                            (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND sender_id != :user_id2 AND is_read = 0) as unread_count
                        FROM chats c
                        JOIN users u ON (CASE WHEN c.user1_id = :user_id3 THEN c.user2_id ELSE c.user1_id END) = u.id
                        WHERE c.user1_id = :user_id4 OR c.user2_id = :user_id5
                        ORDER BY c.updated_at DESC";
                
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':user_id' => $userId,
                    ':user_id2' => $userId,
                    ':user_id3' => $userId,
                    ':user_id4' => $userId,
                    ':user_id5' => $userId
                ]);
                $chats = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true,
                    'chats' => $chats
                ]);
                
            } elseif ($action === 'messages') {
                // Получить сообщения конкретного чата
                $chatId = $_GET['chat_id'] ?? null;
                $otherUserId = $_GET['other_user_id'] ?? null;
                
                // Если передан other_user_id, ищем существующий чат (не создаём)
                if ($otherUserId && !$chatId) {
                    $chatId = findChat($conn, $userId, $otherUserId);
                }
                
                // Если чат не найден - возвращаем пустой результат (новый чат)
                if (!$chatId) {
                    // Получаем информацию о собеседнике
                    $otherUserSql = "SELECT id, name, avatar, 
                                     IF(TIMESTAMPDIFF(MINUTE, last_active, NOW()) <= 5, 1, 0) as is_online
                                     FROM users WHERE id = :id";
                    $otherUserStmt = $conn->prepare($otherUserSql);
                    $otherUserStmt->execute([':id' => $otherUserId]);
                    $otherUser = $otherUserStmt->fetch();
                    
                    echo json_encode([
                        'success' => true,
                        'chat_id' => null,
                        'other_user' => $otherUser,
                        'messages' => [],
                        'is_blocked' => false,
                        'blocked_by_me' => false,
                        'is_new_chat' => true
                    ]);
                    break;
                }
                
                // Получаем сообщения
                $sql = "SELECT 
                            m.id,
                            m.sender_id,
                            m.message,
                            m.reply_to_id,
                            m.is_read,
                            m.created_at,
                            u.name as sender_name,
                            u.avatar as sender_avatar,
                            rm.message as reply_message,
                            rm.sender_id as reply_sender_id,
                            ru.name as reply_sender_name
                        FROM messages m
                        JOIN users u ON m.sender_id = u.id
                        LEFT JOIN messages rm ON m.reply_to_id = rm.id
                        LEFT JOIN users ru ON rm.sender_id = ru.id
                        WHERE m.chat_id = :chat_id
                        ORDER BY m.created_at ASC";
                
                $stmt = $conn->prepare($sql);
                $stmt->execute([':chat_id' => $chatId]);
                $messages = $stmt->fetchAll();
                
                // Отмечаем сообщения как прочитанные (только входящие для текущего пользователя)
                $markRead = $_GET['mark_read'] ?? '1'; // По умолчанию отмечаем
                if ($markRead === '1') {
                    $updateSql = "UPDATE messages SET is_read = 1 
                                  WHERE chat_id = :chat_id AND sender_id != :user_id AND is_read = 0";
                    $updateStmt = $conn->prepare($updateSql);
                    $updateStmt->execute([':chat_id' => $chatId, ':user_id' => $userId]);
                }
                
                // Получаем информацию о собеседнике
                $chatSql = "SELECT 
                                CASE WHEN user1_id = :user_id THEN user2_id ELSE user1_id END as other_user_id
                            FROM chats WHERE id = :chat_id";
                $chatStmt = $conn->prepare($chatSql);
                $chatStmt->execute([':user_id' => $userId, ':chat_id' => $chatId]);
                $chatInfo = $chatStmt->fetch();
                
                $otherUserSql = "SELECT id, name, avatar, 
                                 IF(TIMESTAMPDIFF(MINUTE, last_active, NOW()) <= 5, 1, 0) as is_online
                                 FROM users WHERE id = :id";
                $otherUserStmt = $conn->prepare($otherUserSql);
                $otherUserStmt->execute([':id' => $chatInfo['other_user_id']]);
                $otherUser = $otherUserStmt->fetch();
                
                // Проверяем статус блокировки
                $blockCheckSql = "SELECT blocker_id FROM user_blocks WHERE 
                                  (blocker_id = :user_id AND blocked_id = :other_id) OR
                                  (blocker_id = :other_id2 AND blocked_id = :user_id2)
                                  LIMIT 1";
                $blockCheckStmt = $conn->prepare($blockCheckSql);
                $blockCheckStmt->execute([
                    ':user_id' => $userId,
                    ':other_id' => $chatInfo['other_user_id'],
                    ':other_id2' => $chatInfo['other_user_id'],
                    ':user_id2' => $userId
                ]);
                $blockInfo = $blockCheckStmt->fetch();
                
                $isBlocked = $blockInfo ? true : false;
                $blockedByMe = $blockInfo && $blockInfo['blocker_id'] == $userId;
                
                echo json_encode([
                    'success' => true,
                    'chat_id' => $chatId,
                    'other_user' => $otherUser,
                    'messages' => $messages,
                    'is_blocked' => $isBlocked,
                    'blocked_by_me' => $blockedByMe
                ]);
            }
            break;
            
        case 'POST':
            // Отправить сообщение
            $data = json_decode(file_get_contents('php://input'), true);
            
            $senderId = $data['sender_id'] ?? null;
            $receiverId = $data['receiver_id'] ?? null;
            $chatId = $data['chat_id'] ?? null;
            $text = $data['text'] ?? null;
            $replyToId = $data['reply_to_id'] ?? null;
            $action = $data['action'] ?? null;
            
            // Действие блокировки
            if ($action === 'block') {
                $blockerId = $data['blocker_id'] ?? null;
                $blockedId = $data['blocked_id'] ?? null;
                
                if (!$blockerId || !$blockedId) {
                    throw new Exception('Blocker ID and Blocked ID required');
                }
                
                $sql = "INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (:blocker_id, :blocked_id)";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':blocker_id' => $blockerId, ':blocked_id' => $blockedId]);
                
                echo json_encode(['success' => true, 'message' => 'User blocked']);
                break;
            }
            
            // Действие разблокировки
            if ($action === 'unblock') {
                $blockerId = $data['blocker_id'] ?? null;
                $blockedId = $data['blocked_id'] ?? null;
                
                if (!$blockerId || !$blockedId) {
                    throw new Exception('Blocker ID and Blocked ID required');
                }
                
                $sql = "DELETE FROM user_blocks WHERE blocker_id = :blocker_id AND blocked_id = :blocked_id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':blocker_id' => $blockerId, ':blocked_id' => $blockedId]);
                
                echo json_encode(['success' => true, 'message' => 'User unblocked']);
                break;
            }
            
            if (!$senderId || !$text) {
                throw new Exception('Sender ID and text required');
            }
            
            // Если нет chat_id, создаем чат
            if (!$chatId && $receiverId) {
                $chatId = createChat($conn, $senderId, $receiverId);
            }
            
            if (!$chatId) {
                throw new Exception('Chat ID or receiver ID required');
            }
            
            // Получаем ID получателя из чата
            $chatSql = "SELECT CASE WHEN user1_id = :sender_id THEN user2_id ELSE user1_id END as receiver_id FROM chats WHERE id = :chat_id";
            $chatStmt = $conn->prepare($chatSql);
            $chatStmt->execute([':sender_id' => $senderId, ':chat_id' => $chatId]);
            $chatInfo = $chatStmt->fetch();
            $actualReceiverId = $chatInfo['receiver_id'];
            
            // Проверяем блокировку в обе стороны
            $blockSql = "SELECT id FROM user_blocks WHERE 
                         (blocker_id = :receiver_id AND blocked_id = :sender_id) OR
                         (blocker_id = :sender_id2 AND blocked_id = :receiver_id2)";
            $blockStmt = $conn->prepare($blockSql);
            $blockStmt->execute([
                ':receiver_id' => $actualReceiverId, 
                ':sender_id' => $senderId,
                ':sender_id2' => $senderId,
                ':receiver_id2' => $actualReceiverId
            ]);
            
            if ($blockStmt->fetch()) {
                throw new Exception('Вы не можете отправлять сообщения этому пользователю');
            }
            
            // Вставляем сообщение
            $sql = "INSERT INTO messages (chat_id, sender_id, message, reply_to_id, is_read) VALUES (:chat_id, :sender_id, :message, :reply_to_id, 0)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':chat_id' => $chatId,
                ':sender_id' => $senderId,
                ':message' => $text,
                ':reply_to_id' => $replyToId
            ]);
            
            $messageId = $conn->lastInsertId();
            
            // Обновляем время последнего сообщения в чате
            $updateSql = "UPDATE chats SET updated_at = NOW() WHERE id = :chat_id";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->execute([':chat_id' => $chatId]);
            
            echo json_encode([
                'success' => true,
                'message_id' => $messageId,
                'chat_id' => $chatId
            ]);
            break;
            
        case 'DELETE':
            // Удалить чат
            $data = json_decode(file_get_contents('php://input'), true);
            
            $chatId = $data['chat_id'] ?? null;
            $userId = $data['user_id'] ?? null;
            
            if (!$chatId || !$userId) {
                throw new Exception('Chat ID and User ID required');
            }
            
            // Проверяем что пользователь участник чата
            $checkSql = "SELECT id FROM chats WHERE id = :chat_id AND (user1_id = :user_id OR user2_id = :user_id2)";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->execute([':chat_id' => $chatId, ':user_id' => $userId, ':user_id2' => $userId]);
            
            if (!$checkStmt->fetch()) {
                throw new Exception('Chat not found or access denied');
            }
            
            // Удаляем сообщения
            $deleteMsgSql = "DELETE FROM messages WHERE chat_id = :chat_id";
            $deleteMsgStmt = $conn->prepare($deleteMsgSql);
            $deleteMsgStmt->execute([':chat_id' => $chatId]);
            
            // Удаляем чат
            $deleteChatSql = "DELETE FROM chats WHERE id = :chat_id";
            $deleteChatStmt = $conn->prepare($deleteChatSql);
            $deleteChatStmt->execute([':chat_id' => $chatId]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Chat deleted'
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

// Функция для поиска существующего чата между двумя пользователями
function findChat($conn, $user1, $user2) {
    // Упорядочиваем ID для консистентности
    $minId = min($user1, $user2);
    $maxId = max($user1, $user2);
    
    // Ищем существующий чат
    $sql = "SELECT id FROM chats WHERE user1_id = :min_id AND user2_id = :max_id";
    $stmt = $conn->prepare($sql);
    $stmt->execute([':min_id' => $minId, ':max_id' => $maxId]);
    $chat = $stmt->fetch();
    
    if ($chat) {
        return $chat['id'];
    }
    
    return null;
}

// Функция для создания чата между двумя пользователями
function createChat($conn, $user1, $user2) {
    // Упорядочиваем ID для консистентности
    $minId = min($user1, $user2);
    $maxId = max($user1, $user2);
    
    // Сначала проверяем существует ли уже
    $existingId = findChat($conn, $user1, $user2);
    if ($existingId) {
        return $existingId;
    }
    
    // Создаем новый чат
    $sql = "INSERT INTO chats (user1_id, user2_id) VALUES (:user1, :user2)";
    $stmt = $conn->prepare($sql);
    $stmt->execute([':user1' => $minId, ':user2' => $maxId]);
    
    return $conn->lastInsertId();
}
?>