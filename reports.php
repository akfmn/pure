<?php
// api/reports.php - API для жалоб

require_once '../config.php';

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        // Создание жалобы
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['reporter_id']) || !isset($data['post_id'])) {
            throw new Exception('Missing required fields');
        }
        
        $reporterId = $data['reporter_id'];
        $postId = $data['post_id'];
        $reason = $data['reason'] ?? 'Нарушение правил';
        
        $sql = "INSERT INTO reports (reporter_id, post_id, reason) 
                VALUES (:reporter_id, :post_id, :reason)";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':reporter_id' => $reporterId,
            ':post_id' => $postId,
            ':reason' => $reason
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
