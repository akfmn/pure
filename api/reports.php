<?php
// api/reports.php - API для жалоб

require_once '../config.php';

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        // Создание жалобы
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['reporter_id'])) {
            throw new Exception('Reporter ID required');
        }
        
        $reporterId = $data['reporter_id'];
        $postId = $data['post_id'] ?? null;
        $reportedUserId = $data['reported_user_id'] ?? null;
        $chatId = $data['chat_id'] ?? null;
        $reason = $data['reason'] ?? 'Нарушение правил';
        $type = $data['type'] ?? 'post'; // 'post', 'user' или 'chat'
        
        if (($type === 'user' || $type === 'chat') && !$reportedUserId) {
            throw new Exception('Reported user ID required');
        }
        
        if ($type === 'post' && !$postId) {
            throw new Exception('Post ID required');
        }
        
        $sql = "INSERT INTO reports (reporter_id, post_id, reported_user_id, chat_id, reason, type) 
                VALUES (:reporter_id, :post_id, :reported_user_id, :chat_id, :reason, :type)";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':reporter_id' => $reporterId,
            ':post_id' => $postId,
            ':reported_user_id' => $reportedUserId,
            ':chat_id' => $chatId,
            ':reason' => $reason,
            ':type' => $type
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Report submitted successfully'
        ]);
    } else {
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