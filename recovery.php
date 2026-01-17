<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$email = isset($_GET['email']) ? trim($_GET['email']) : '';

if (empty($email)) {
    echo json_encode(['error' => 'Email required']);
    exit();
}

require_once '../config.php';

try {
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("SELECT id, username, email, name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Generate new password
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $newPassword = substr(str_shuffle($chars), 0, 10);
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password
    $stmt2 = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $stmt2->execute([$hashedPassword, $user['id']]);
    
    // Send email
    $to = $user['email'];
    $subject = "=?UTF-8?B?" . base64_encode("Meet&Go - Восстановление пароля") . "?=";
    
    $message = "Здравствуйте, " . $user['name'] . "!\n\n";
    $message .= "Ваши данные для входа:\n\n";
    $message .= "Логин: " . $user['username'] . "\n";
    $message .= "Новый пароль: " . $newPassword . "\n\n";
    $message .= "Meet&Go";
    
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/plain; charset=UTF-8\r\n";
    $headers .= "From: Meet&Go <meetgo@kofpack.com>\r\n";
    
    @mail($to, $subject, $message, $headers);
    
    echo json_encode(['success' => true]);
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Server error']);
}
?>