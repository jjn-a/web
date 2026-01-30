<?php
/**
 * Authentication API
 * Handles login, registration, logout, and session management
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';

$is_cross_origin = !empty($origin) && 
    $origin !== 'http://' . $host && 
    $origin !== 'https://' . $host &&
    $origin !== 'http://localhost:80' &&
    $origin !== 'https://localhost:80';

if ($is_cross_origin) {
    if (strpos($origin, 'localhost') !== false || strpos($origin, '127.0.0.1') !== false) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Max-Age: 86400');
    exit(0);
}

define('DB_HOST', 'localhost');
define('DB_NAME', 'gym_one');
define('DB_USER', 'root');
define('DB_PASS', '');

ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.cookie_secure', 0);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
    $sessionFile = session_save_path() . '/sess_' . session_id();
    if (file_exists($sessionFile)) {
        chmod($sessionFile, 0666);
    }
}

// Define AUTH_INCLUDED AFTER session restoration to ensure session works properly
// This is especially important for admin_api.php which requires auth.php
define('AUTH_INCLUDED', true);

// Add no-cache headers for all API responses
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

function getDBConnection() {
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function isAdmin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }

    try {
        $pdo = getDBConnection();
        if (!$pdo) return null;

        $stmt = $pdo->prepare("SELECT id, username, email, first_name, last_name, full_name, role, phone, date_of_birth, height, created_at FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch();
    } catch (PDOException $e) {
        return null;
    }
}

function loginUser($username, $password) {
    try {
        $pdo = getDBConnection();
        if (!$pdo) {
            return ['success' => false, 'message' => 'Database connection failed'];
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if ($user && verifyPassword($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['first_name'] = $user['first_name'];
            $_SESSION['last_name'] = $user['last_name'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['login_time'] = time();
            $_SESSION['ip_address'] = $_SERVER['REMOTE_ADDR'] ?? '';

            unset($user['password']);

            if (function_exists('logActivity')) {
                try {
                    logActivity($user['id'], 'login', 'User logged in');
                } catch (Exception $e) {
                }
            }

            return ['success' => true, 'user' => $user];
        }
        return ['success' => false, 'message' => 'Invalid username or password'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Login failed'];
    }
}

function registerUser($username, $email, $password, $firstName, $lastName, $phone = '') {
    try {
        $pdo = getDBConnection();
        if (!$pdo) {
            return ['success' => false, 'message' => 'Database connection failed'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Invalid email format'];
        }

        if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
            return ['success' => false, 'message' => 'Username must be 3-30 characters and contain only letters, numbers, and underscores'];
        }

        if (strlen($password) < 8) {
            return ['success' => false, 'message' => 'Password must be at least 8 characters'];
        }

        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            return ['success' => false, 'message' => 'Username already exists'];
        }

        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            return ['success' => false, 'message' => 'Email already registered'];
        }

        $hashedPassword = hashPassword($password);
        $fullName = $firstName . ' ' . $lastName;
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password, first_name, last_name, full_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$username, $email, $hashedPassword, $firstName, $lastName, $fullName, $phone]);

        $userId = $pdo->lastInsertId();

        if (function_exists('logActivity')) {
            try {
                logActivity($userId, 'register', 'New user registered');
            } catch (Exception $e) {
            }
        }

        return ['success' => true, 'message' => 'Registration successful'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Registration failed'];
    }
}

function logoutUser() {
    $userId = $_SESSION['user_id'] ?? null;
    
    if ($userId && function_exists('logActivity')) {
        try {
            logActivity($userId, 'logout', 'User logged out');
        } catch (Exception $e) {
        }
    }

    $_SESSION['logged_out'] = true;
    session_destroy();
    
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    return ['success' => true, 'message' => 'Logged out successfully'];
}

function logActivity($userId, $action, $details = '') {
    try {
        $pdo = getDBConnection();
        if (!$pdo) return;

        $stmt = $pdo->query("SHOW TABLES LIKE 'activities_log'");
        if ($stmt->rowCount() == 0) {
            return;
        }

        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
        $stmt = $pdo->prepare("INSERT INTO activities_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)");
        $stmt->execute([$userId, $action, $details, $ipAddress]);
    } catch (Exception $e) {
    }
}

function getUserMembership($userId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT * FROM memberships WHERE user_id = ? AND status = 'active' ORDER BY end_date DESC LIMIT 1");
        $stmt->execute([$userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return null;
    }
}

function getUserUpcomingClasses($userId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            SELECT cb.id as booking_id, c.*, cb.booking_date, cb.status as booking_status
            FROM classes c
            INNER JOIN class_bookings cb ON c.id = cb.class_id
            WHERE cb.user_id = ? AND cb.booking_date >= CURDATE()
            ORDER BY cb.booking_date, c.start_time
            LIMIT 5
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
}

function getUserProgress($userId, $limit = 10) {
    try {
        $pdo = getDBConnection();
        $limit = (int)$limit;
        // Order by record_date DESC, then by id DESC to ensure consistent ordering
        $stmt = $pdo->prepare("SELECT * FROM progress WHERE user_id = ? ORDER BY record_date DESC, id DESC LIMIT $limit");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
}

function addProgressRecord($userId, $data) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            INSERT INTO progress (user_id, weight, height, body_fat_percentage, muscle_mass,
                                 chest, waist, hips, arms, thighs, notes, record_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $data['weight'] ?? null,
            $data['height'] ?? null,
            $data['body_fat'] ?? $data['body_fat_percentage'] ?? null,
            $data['muscle_mass'] ?? null,
            $data['chest'] ?? null,
            $data['waist'] ?? null,
            $data['hips'] ?? null,
            $data['arms'] ?? null,
            $data['thighs'] ?? null,
            $data['notes'] ?? null,
            $data['record_date'] ?? date('Y-m-d')
        ]);
        return ['success' => true, 'message' => 'Progress record added'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

function bookClass($userId, $classId, $date) {
    try {
        $pdo = getDBConnection();

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return ['success' => false, 'message' => 'Invalid date format'];
        }

        if (strtotime($date) < strtotime(date('Y-m-d'))) {
            return ['success' => false, 'message' => 'Cannot book classes for past dates'];
        }

        if ($date === date('Y-m-d')) {
            $stmt = $pdo->prepare("SELECT start_time FROM classes WHERE id = ?");
            $stmt->execute([$classId]);
            $class = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($class && strtotime($class['start_time']) <= strtotime(date('H:i:s'))) {
                return ['success' => false, 'message' => 'This class has already started'];
            }
        }

        $stmt = $pdo->prepare("SELECT id FROM class_bookings WHERE user_id = ? AND class_id = ? AND booking_date = ?");
        $stmt->execute([$userId, $classId, $date]);
        if ($stmt->fetch()) {
            return ['success' => false, 'message' => 'Already booked for this class'];
        }

        $stmt = $pdo->prepare("SELECT current_participants, max_participants FROM classes WHERE id = ?");
        $stmt->execute([$classId]);
        $class = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$class) {
            return ['success' => false, 'message' => 'Class not found'];
        }

        if ($class['current_participants'] >= $class['max_participants']) {
            return ['success' => false, 'message' => 'Class is full'];
        }

        $stmt = $pdo->prepare("INSERT INTO class_bookings (user_id, class_id, booking_date) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $classId, $date]);

        $stmt = $pdo->prepare("UPDATE classes SET current_participants = current_participants + 1 WHERE id = ?");
        $stmt->execute([$classId]);

        logActivity($userId, 'book_class', "Booked class ID: $classId for $date");

        return ['success' => true, 'message' => 'Class booked successfully'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

function cancelBooking($userId, $bookingId) {
    try {
        $pdo = getDBConnection();

        $stmt = $pdo->prepare("SELECT class_id FROM class_bookings WHERE id = ? AND user_id = ?");
        $stmt->execute([$bookingId, $userId]);
        $booking = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$booking) {
            return ['success' => false, 'message' => 'Booking not found'];
        }

        $stmt = $pdo->prepare("DELETE FROM class_bookings WHERE id = ? AND user_id = ?");
        $stmt->execute([$bookingId, $userId]);

        $stmt = $pdo->prepare("UPDATE classes SET current_participants = GREATEST(0, current_participants - 1) WHERE id = ?");
        $stmt->execute([$booking['class_id']]);

        logActivity($userId, 'cancel_booking', "Cancelled booking ID: $bookingId");

        return ['success' => true, 'message' => 'Booking cancelled'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

function getAvailableClasses($date = null) {
    try {
        $pdo = getDBConnection();
        $date = $date ?? date('Y-m-d');

        $dayMap = [
            'Monday' => 'Hënë',
            'Tuesday' => 'Martë',
            'Wednesday' => 'Mërkurë',
            'Thursday' => 'Enjte',
            'Friday' => 'Premte',
            'Saturday' => 'Shtunë',
            'Sunday' => 'Dielë'
        ];

        $englishDay = date('l', strtotime($date));
        $albanianDay = $dayMap[$englishDay] ?? $englishDay;

        $stmt = $pdo->prepare("
            SELECT c.*,
                   (SELECT COUNT(*) FROM class_bookings cb WHERE cb.class_id = c.id AND cb.booking_date = ? AND cb.status = 'booked') as booked_count
            FROM classes c
            WHERE LOWER(c.day_of_week) = LOWER(?) AND c.status = 'active'
            ORDER BY c.start_time
        ");
        $stmt->execute([$date, $albanianDay]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
}

function updateProfile($userId, $data) {
    try {
        $pdo = getDBConnection();

        $fields = [];
        $values = [];

        if (isset($data['full_name'])) {
            $fields[] = 'full_name = ?';
            $values[] = $data['full_name'];
        }
        if (isset($data['email'])) {
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return ['success' => false, 'message' => 'Invalid email format'];
            }
            $fields[] = 'email = ?';
            $values[] = $data['email'];
        }
        if (isset($data['phone'])) {
            $fields[] = 'phone = ?';
            $values[] = $data['phone'];
        }
        if (isset($data['date_of_birth'])) {
            $fields[] = 'date_of_birth = ?';
            $values[] = $data['date_of_birth'];
        }
        if (isset($data['height'])) {
            $fields[] = 'height = ?';
            $values[] = (float)$data['height'];
        }

        if (empty($fields)) {
            return ['success' => false, 'message' => 'No data to update'];
        }

        $values[] = $userId;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);

        logActivity($userId, 'update_profile', 'Profile updated');

        return ['success' => true, 'message' => 'Profile updated successfully'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

function changePassword($userId, $currentPassword, $newPassword) {
    try {
        $pdo = getDBConnection();

        $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }

        if (!verifyPassword($currentPassword, $user['password'])) {
            return ['success' => false, 'message' => 'Current password is incorrect'];
        }

        if (strlen($newPassword) < 8) {
            return ['success' => false, 'message' => 'New password must be at least 8 characters'];
        }

        $hashedPassword = hashPassword($newPassword);
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([$hashedPassword, $userId]);

        logActivity($userId, 'change_password', 'Password changed');

        return ['success' => true, 'message' => 'Password changed successfully'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

function deleteAccount($userId, $password) {
    try {
        $pdo = getDBConnection();

        $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }

        if (!verifyPassword($password, $user['password'])) {
            return ['success' => false, 'message' => 'Incorrect password'];
        }

        logActivity($userId, 'account_deleted', 'User account deleted');

        $stmt = $pdo->prepare("DELETE FROM class_bookings WHERE user_id = ?");
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare("DELETE FROM progress WHERE user_id = ?");
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare("DELETE FROM memberships WHERE user_id = ?");
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);

        $_SESSION = [];
        session_destroy();
        
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        return ['success' => true, 'message' => 'Your account has been permanently deleted'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Failed to delete account'];
    }
}

function submitContact($name, $email, $subject, $message, $phone = '') {
    try {
        // Trim whitespace and validate email with a more permissive regex
        $email = trim($email);
        $emailPattern = '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/';
        
        if (empty($email)) {
            return ['success' => false, 'message' => 'Email is required'];
        }
        
        if (!preg_match($emailPattern, $email)) {
            return ['success' => false, 'message' => 'Invalid email format'];
        }

        $pdo = getDBConnection();

        $stmt = $pdo->prepare("INSERT INTO contact_messages (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, 'new')");
        $stmt->execute([$name, $email, $phone, $subject, $message]);

        $messageId = $pdo->lastInsertId();

        if (isLoggedIn()) {
            logActivity($_SESSION['user_id'], 'contact_form', "Submitted contact message ID: $messageId");
        }

        return ['success' => true, 'message' => 'Thank you! Your message has been sent successfully.'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Failed to send message: ' . $e->getMessage()];
    }
}

function getUserNotifications($userId) {
    try {
        $pdo = getDBConnection();
        
        // Check if notifications table exists
        $stmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
        if ($stmt->rowCount() == 0) {
            return [];
        }

        $stmt = $pdo->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
}

function markNotificationsRead($userId) {
    try {
        $pdo = getDBConnection();
        
        // Check if notifications table exists
        $stmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
        if ($stmt->rowCount() == 0) {
            return ['success' => true];
        }

        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
        $stmt->execute([$userId]);
        
        return ['success' => true, 'message' => 'Notifications marked as read'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Failed to mark notifications as read'];
    }
}

function deleteNotification($userId, $notificationId) {
    try {
        $pdo = getDBConnection();
        
        // Check if notifications table exists
        $stmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
        if ($stmt->rowCount() == 0) {
            return ['success' => true, 'message' => 'No notifications to delete'];
        }

        // Verify the notification belongs to the user
        $stmt = $pdo->prepare("SELECT id FROM notifications WHERE id = ? AND user_id = ?");
        $stmt->execute([$notificationId, $userId]);
        if (!$stmt->fetch()) {
            return ['success' => false, 'message' => 'Notification not found'];
        }

        // Delete the notification
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?");
        $stmt->execute([$notificationId, $userId]);
        
        return ['success' => true, 'message' => 'Notification deleted'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Failed to delete notification: ' . $e->getMessage()];
    }
}

function deleteAllNotifications($userId) {
    try {
        $pdo = getDBConnection();
        
        // Check if notifications table exists
        $stmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
        if ($stmt->rowCount() == 0) {
            return ['success' => true, 'message' => 'No notifications to delete'];
        }

        // Delete all notifications for the user
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        return ['success' => true, 'message' => 'All notifications deleted'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Failed to delete notifications: ' . $e->getMessage()];
    }
}

function getUserGoals($userId) {
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT goal_weight, goal_body_fat, goal_muscle, goal_waist FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $result = $stmt->fetch();
        
        if ($result) {
            return [
                'success' => true,
                'goals' => [
                    'target_weight' => $result['goal_weight'] ?? null,
                    'target_body_fat' => $result['goal_body_fat'] ?? null,
                    'target_muscle' => $result['goal_muscle'] ?? null,
                    'target_waist' => $result['goal_waist'] ?? null
                ]
            ];
        }
        return ['success' => true, 'goals' => null];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Failed to get goals'];
    }
}

function updateUserGoals($userId, $data) {
    try {
        $pdo = getDBConnection();
        
        $fields = [];
        $values = [];
        
        if (isset($data['target_weight'])) {
            $fields[] = 'goal_weight = ?';
            $values[] = (float)$data['target_weight'];
        }
        // Accept both target_body_fat and target_bodyfat (for form compatibility)
        if (isset($data['target_body_fat'])) {
            $fields[] = 'goal_body_fat = ?';
            $values[] = (float)$data['target_body_fat'];
        } elseif (isset($data['target_bodyfat'])) {
            $fields[] = 'goal_body_fat = ?';
            $values[] = (float)$data['target_bodyfat'];
        }
        if (isset($data['target_muscle'])) {
            $fields[] = 'goal_muscle = ?';
            $values[] = (float)$data['target_muscle'];
        }
        if (isset($data['target_waist'])) {
            $fields[] = 'goal_waist = ?';
            $values[] = (float)$data['target_waist'];
        }
        
        if (empty($fields)) {
            return ['success' => false, 'message' => 'No goals to update'];
        }
        
        $values[] = $userId;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        
        return ['success' => true, 'message' => 'Goals updated successfully'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Failed to update goals: ' . $e->getMessage()];
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'] ?? '';

    switch ($action) {
        case 'login':
            $result = loginUser($_POST['username'] ?? '', $_POST['password'] ?? '');
            echo json_encode($result);
            break;

        case 'register':
            $result = registerUser(
                $_POST['username'] ?? '',
                $_POST['email'] ?? '',
                $_POST['password'] ?? '',
                $_POST['first_name'] ?? '',
                $_POST['last_name'] ?? '',
                $_POST['phone'] ?? ''
            );
            echo json_encode($result);
            break;

        case 'logout':
            $result = logoutUser();
            echo json_encode($result);
            break;

        case 'get_profile':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $user = getCurrentUser();
                if ($user) {
                    echo json_encode(['success' => true, 'user' => $user]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'User not found']);
                }
            }
            break;

        case 'update_profile':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = updateProfile($_SESSION['user_id'], $_POST);
                echo json_encode($result);
            }
            break;

        case 'change_password':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = changePassword($_SESSION['user_id'], $_POST['current_password'] ?? '', $_POST['new_password'] ?? '');
                echo json_encode($result);
            }
            break;

        case 'delete_account':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = deleteAccount($_SESSION['user_id'], $_POST['password'] ?? '');
                echo json_encode($result);
            }
            break;

        case 'get_membership':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $membership = getUserMembership($_SESSION['user_id']);
                echo json_encode(['success' => true, 'membership' => $membership]);
            }
            break;

        case 'get_upcoming_classes':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $classes = getUserUpcomingClasses($_SESSION['user_id']);
                echo json_encode(['success' => true, 'classes' => $classes]);
            }
            break;

        case 'get_available_classes':
            $date = $_POST['date'] ?? null;
            $classes = getAvailableClasses($date);
            echo json_encode(['success' => true, 'classes' => $classes]);
            break;

        case 'book_class':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = bookClass($_SESSION['user_id'], $_POST['class_id'] ?? 0, $_POST['date'] ?? '');
                echo json_encode($result);
            }
            break;

        case 'cancel_booking':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = cancelBooking($_SESSION['user_id'], $_POST['booking_id'] ?? 0);
                echo json_encode($result);
            }
            break;

        case 'add_progress':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = addProgressRecord($_SESSION['user_id'], $_POST);
                echo json_encode($result);
            }
            break;

        case 'get_progress':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $progress = getUserProgress($_SESSION['user_id']);
                echo json_encode(['success' => true, 'progress' => $progress]);
            }
            break;

        case 'submit_contact':
            $result = submitContact(
                $_POST['name'] ?? '',
                $_POST['email'] ?? '',
                $_POST['subject'] ?? '',
                $_POST['message'] ?? '',
                $_POST['phone'] ?? ''
            );
            echo json_encode($result);
            break;

        case 'get_notifications':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $notifications = getUserNotifications($_SESSION['user_id']);
                echo json_encode(['success' => true, 'notifications' => $notifications]);
            }
            break;

        case 'get_goals':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = getUserGoals($_SESSION['user_id']);
                echo json_encode($result);
            }
            break;

        case 'update_goals':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = updateUserGoals($_SESSION['user_id'], $_POST);
                echo json_encode($result);
            }
            break;

        case 'mark_notifications_read':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = markNotificationsRead($_SESSION['user_id']);
                echo json_encode($result);
            }
            break;

        case 'delete_notification':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $notificationId = $_POST['notification_id'] ?? 0;
                if (empty($notificationId)) {
                    echo json_encode(['success' => false, 'message' => 'Notification ID is required']);
                } else {
                    $result = deleteNotification($_SESSION['user_id'], $notificationId);
                    echo json_encode($result);
                }
            }
            break;

        case 'delete_all_notifications':
            if (!isLoggedIn()) {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            } else {
                $result = deleteAllNotifications($_SESSION['user_id']);
                echo json_encode($result);
            }
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    exit;
}

echo json_encode([
    'success' => false, 
    'message' => 'Auth API is working. Use POST method with action parameter.',
    'available_actions' => ['login', 'register', 'logout', 'get_profile', 'update_profile', 'change_password', 'delete_account', 'get_membership', 'get_upcoming_classes', 'get_available_classes', 'book_class', 'cancel_booking', 'add_progress', 'get_progress', 'submit_contact']
]);
exit;
