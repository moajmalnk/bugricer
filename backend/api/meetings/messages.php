<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../BaseAPI.php';
require_once __DIR__ . '/MeetingController.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new MeetingController();
    $input = $controller->getRequestData();
    $code = $input['code'] ?? '';
    $message = $input['message'] ?? '';
    $senderId = intval($input['senderId'] ?? 0);
    $senderName = $input['senderName'] ?? '';
    if ($code === '' || $message === '') { echo json_encode(['success' => false, 'message' => 'code and message required']); exit; }
    $response = $controller->sendMessage($code, $senderId, $senderName, $message);
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); exit; }

$code = $_GET['code'] ?? '';
$limit = intval($_GET['limit'] ?? 100);
if ($code === '') { echo json_encode(['success' => false, 'message' => 'code required']); exit; }
$controller = new MeetingController();
$response = $controller->getMessages($code, $limit);
echo json_encode($response);
exit;

