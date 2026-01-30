<?php
/**
 * Admin API - Handles admin-only operations
 * STANDALONE FILE - Does NOT require auth.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires', '0');

// Session setup - MUST be before any output
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database connection
function getDBConnection() {
    try {
        $pdo = new PDO("mysql:host=localhost;dbname=gym_one", 'root', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}

// Check if user is logged in
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

// Check if user is admin
function isAdmin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function getDashboardStats() {
    $pdo = getDBConnection();
    if (!$pdo) return [];
    
    $stats = [];
    $stats['total_users'] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn();
    $stats['active_memberships'] = (int)$pdo->query("SELECT COUNT(*) FROM memberships WHERE status = 'active'")->fetchColumn();
    $stats['total_classes'] = (int)$pdo->query("SELECT COUNT(*) FROM classes WHERE status = 'active'")->fetchColumn();
    // Calculate monthly revenue based on memberships active in the current month
    // This sums up the amount for all paid memberships where the current month falls within the membership period
    $stats['monthly_revenue'] = (float)$pdo->query("
        SELECT COALESCE(SUM(amount), 0)
        FROM memberships
        WHERE payment_status = 'paid'
        AND start_date <= CURDATE()
        AND end_date >= CURDATE()
    ")->fetchColumn();
    
    return $stats;
}

function getAllUsers($limit = 50, $offset = 0, $search = '') {
    $pdo = getDBConnection();
    if (!$pdo) return [];
    
    $sql = "SELECT u.*, m.membership_type, m.status as membership_status, m.start_date as member_since 
            FROM users u 
            LEFT JOIN memberships m ON u.id = m.user_id AND m.status = 'active'
            WHERE u.role = 'user'";
    $params = [];
    
    if ($search) {
        $sql .= " AND (u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)";
        $params = ["%$search%", "%$search%", "%$search%"];
    }
    
    // Group by user to avoid duplicates if user has multiple memberships
    $sql .= " GROUP BY u.id";
    $sql .= " ORDER BY u.created_at DESC LIMIT $limit OFFSET $offset";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getActivityLog($limit = 100) {
    $pdo = getDBConnection();
    if (!$pdo) return [];
    
    $stmt = $pdo->prepare("SELECT al.*, u.username FROM activities_log al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT $limit");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getAllClasses() {
    $pdo = getDBConnection();
    if (!$pdo) return [];
    
    $stmt = $pdo->query("SELECT * FROM classes ORDER BY day_of_week, start_time");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getAllBookings($date = null) {
    $pdo = getDBConnection();
    if (!$pdo) return [];
    
    $sql = "SELECT cb.*, u.username, u.email, u.full_name, c.name as class_name, c.instructor, c.start_time, c.end_time FROM class_bookings cb JOIN users u ON cb.user_id = u.id JOIN classes c ON cb.class_id = c.id WHERE cb.status != 'cancelled'";
    
    if ($date) {
        $sql .= " AND cb.booking_date = ? ORDER BY cb.booking_date, c.start_time";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$date]);
    } else {
        $sql .= " ORDER BY cb.booking_date DESC, c.start_time DESC LIMIT 100";
        $stmt = $pdo->query($sql);
    }
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getAllMemberships() {
    $pdo = getDBConnection();
    if (!$pdo) return [];
    
    $stmt = $pdo->query("SELECT m.*, u.full_name, u.email FROM memberships m JOIN users u ON m.user_id = u.id ORDER BY m.created_at DESC");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/* Additional admin helper actions: manage users, classes, bookings, messages, memberships */
function adminDeleteUser($userId) {
    $pdo = getDBConnection();
    if (!$pdo) return false;
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("DELETE FROM class_bookings WHERE user_id = ?");
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare("DELETE FROM progress WHERE user_id = ?");
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare("DELETE FROM memberships WHERE user_id = ?");
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare("DELETE FROM activities_log WHERE user_id = ?");
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);

        $pdo->commit();
        return true;
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        return false;
    }
}

function adminDeleteClass($classId) {
    $pdo = getDBConnection();
    if (!$pdo) return false;
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("DELETE FROM class_bookings WHERE class_id = ?");
        $stmt->execute([$classId]);

        $stmt = $pdo->prepare("DELETE FROM classes WHERE id = ?");
        $stmt->execute([$classId]);

        $pdo->commit();
        return true;
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        return false;
    }
}

function adminUpdateUser($data) {
    $pdo = getDBConnection();
    if (!$pdo) return ['success' => false, 'message' => 'DB error'];
    try {
        $fields = [];
        $values = [];
        if (isset($data['full_name'])) { $fields[] = 'full_name = ?'; $values[] = $data['full_name']; }
        if (isset($data['email'])) { $fields[] = 'email = ?'; $values[] = $data['email']; }
        if (isset($data['phone'])) { $fields[] = 'phone = ?'; $values[] = $data['phone']; }
        if (isset($data['role'])) { $fields[] = 'role = ?'; $values[] = $data['role']; }
        if (empty($fields)) return ['success' => false, 'message' => 'No fields to update'];
        $values[] = $data['user_id'];
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        return ['success' => true, 'message' => 'User updated'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Update failed'];
    }
}

function adminSaveClass($data) {
    $pdo = getDBConnection();
    if (!$pdo) return ['success' => false, 'message' => 'DB error'];
    try {
        if (!empty($data['id'])) {
            $stmt = $pdo->prepare("UPDATE classes SET name = ?, description = ?, instructor = ?, day_of_week = ?, room = ?, start_time = ?, end_time = ?, max_participants = ?, status = ? WHERE id = ?");
            $stmt->execute([
                $data['name'] ?? '', $data['description'] ?? '', $data['instructor'] ?? '', $data['day_of_week'] ?? '', $data['room'] ?? '', $data['start_time'] ?? '', $data['end_time'] ?? '', $data['max_participants'] ?? 20, $data['status'] ?? 'active', $data['id']
            ]);
            return ['success' => true, 'message' => 'Class updated'];
        } else {
            $stmt = $pdo->prepare("INSERT INTO classes (name, description, instructor, day_of_week, room, start_time, end_time, max_participants, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['name'] ?? '', $data['description'] ?? '', $data['instructor'] ?? '', $data['day_of_week'] ?? '', $data['room'] ?? '', $data['start_time'] ?? '', $data['end_time'] ?? '', $data['max_participants'] ?? 20, $data['status'] ?? 'active'
            ]);
            return ['success' => true, 'message' => 'Class created'];
        }
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Save failed'];
    }
}

function adminCancelBooking($bookingId) {
    $pdo = getDBConnection();
    if (!$pdo) return ['success' => false, 'message' => 'DB error'];
    try {
        $stmt = $pdo->prepare("SELECT id, class_id, status FROM class_bookings WHERE id = ?");
        $stmt->execute([$bookingId]);
        $b = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$b) return ['success' => false, 'message' => 'Booking not found'];

        // Update booking status
        $stmt = $pdo->prepare("UPDATE class_bookings SET status = 'cancelled' WHERE id = ?");
        $stmt->execute([$bookingId]);

        // Decrement participants if booking was active
        if ($b['status'] === 'booked' || $b['status'] === 'confirmed') {
            $stmt = $pdo->prepare("UPDATE classes SET current_participants = GREATEST(0, current_participants - 1) WHERE id = ?");
            $stmt->execute([$b['class_id']]);
        }

        return ['success' => true, 'message' => 'Booking cancelled'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Cancel failed'];
    }
}

function adminGetMessages($limit = 50, $offset = 0, $search = '', $id = null) {
    $pdo = getDBConnection();
    if (!$pdo) return [];
    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM contact_messages WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    // Cast limit and offset to integers for safety
    $limit = (int)$limit;
    $offset = (int)$offset;
    
    $sql = "SELECT * FROM contact_messages";
    $params = [];
    if ($search) {
        $sql .= " WHERE name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?";
        $params = ["%$search%", "%$search%", "%$search%", "%$search%"];
    }
    // Use integer casting directly in SQL to avoid PDO integer parameter issues
    $sql .= " ORDER BY created_at DESC LIMIT " . $limit . " OFFSET " . $offset;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function adminUpdateMessage($id, $status) {
    $pdo = getDBConnection();
    if (!$pdo) return false;
    try {
        $stmt = $pdo->prepare("UPDATE contact_messages SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

function adminDeleteMessage($id) {
    $pdo = getDBConnection();
    if (!$pdo) return ['success' => false, 'message' => 'Database error'];
    try {
        $stmt = $pdo->prepare("DELETE FROM contact_messages WHERE id = ?");
        $stmt->execute([$id]);
        return ['success' => true, 'message' => 'Message deleted successfully'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Error: ' . $e->getMessage()];
    }
}

function adminMarkAllMessagesRead() {
    $pdo = getDBConnection();
    if (!$pdo) return ['success' => false, 'message' => 'Database error'];
    try {
        $stmt = $pdo->prepare("UPDATE contact_messages SET status = 'read' WHERE status != 'read' AND status != 'replied'");
        $stmt->execute();
        $affected = $stmt->rowCount();
        return ['success' => true, 'message' => "$affected messages marked as read"];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Error: ' . $e->getMessage()];
    }
}

function adminReplyMessage($messageId, $toEmail, $subject, $reply) {
    $pdo = getDBConnection();
    if (!$pdo) return ['success' => false, 'message' => 'Database error'];
    
    try {
        // Get the original message for context
        $stmt = $pdo->prepare("SELECT name, email, subject, message FROM contact_messages WHERE id = ?");
        $stmt->execute([$messageId]);
        $originalMsg = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$originalMsg) {
            return ['success' => false, 'message' => 'Original message not found'];
        }
        
        // Build email content
        $adminEmail = 'admin@gymone.com';
        $adminName = 'Gym One Admin';
        
        $headers = "From: $adminName <$adminEmail>\r\n";
        $headers .= "Reply-To: $adminEmail\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        $fullSubject = $subject ?: 'Re: ' . ($originalMsg['subject'] ?? 'Contact Form Message');
        
        // Include original message in reply
        $emailBody = "Dear " . ($originalMsg['name'] ?? 'Valued Customer') . ",\n\n";
        $emailBody .= "Thank you for contacting us. Here is our response:\n\n";
        $emailBody .= "----------------------------------------\n";
        $emailBody .= $reply . "\n";
        $emailBody .= "----------------------------------------\n\n";
        $emailBody .= "Original Message:\n";
        $emailBody .= "Subject: " . ($originalMsg['subject'] ?? 'No Subject') . "\n";
        $emailBody .= "Message: " . ($originalMsg['message'] ?? '') . "\n\n";
        $emailBody .= "Best regards,\n";
        $emailBody .= "Gym One Team\n";
        
        // Send email
        $mailSent = mail($toEmail, $fullSubject, $emailBody, $headers);
        
        if ($mailSent) {
            // Update message status to replied
            $stmt = $pdo->prepare("UPDATE contact_messages SET status = 'replied' WHERE id = ?");
            $stmt->execute([$messageId]);
            
            // Log the reply
            if (isset($_SESSION['user_id'])) {
                $stmt = $pdo->prepare("INSERT INTO activities_log (user_id, action, details, created_at) VALUES (?, ?, ?, NOW())");
                $stmt->execute([$_SESSION['user_id'], 'replied_to_message', 'Replied to message from: ' . $toEmail]);
            }
            
            return ['success' => true, 'message' => 'Reply sent successfully'];
        } else {
            return ['success' => false, 'message' => 'Failed to send email'];
        }
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Error: ' . $e->getMessage()];
    }
}

function adminSaveMembership($data) {
    $pdo = getDBConnection();
    if (!$pdo) return ['success' => false, 'message' => 'DB error'];
    try {
        if (!empty($data['id'])) {
            $stmt = $pdo->prepare("UPDATE memberships SET user_id = ?, membership_type = ?, amount = ?, start_date = ?, end_date = ?, status = ?, payment_status = ? WHERE id = ?");
            $stmt->execute([
                $data['user_id'], $data['membership_type'], $data['amount'], $data['start_date'], $data['end_date'], $data['status'], $data['payment_status'], $data['id']
            ]);
            return ['success' => true, 'message' => 'Membership updated'];
        } else {
            $stmt = $pdo->prepare("INSERT INTO memberships (user_id, membership_type, amount, start_date, end_date, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['user_id'], $data['membership_type'], $data['amount'], $data['start_date'], $data['end_date'], $data['status'], $data['payment_status']
            ]);
            return ['success' => true, 'message' => 'Membership created'];
        }
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Save failed'];
    }
}

function adminDeleteMembership($membershipId) {
    $pdo = getDBConnection();
    if (!$pdo) return false;
    try {
        $stmt = $pdo->prepare("DELETE FROM memberships WHERE id = ?");
        $stmt->execute([$membershipId]);
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

function getAllUsersSimple() {
    $pdo = getDBConnection();
    if (!$pdo) return [];
    
    $stmt = $pdo->query("SELECT id, full_name, email FROM users WHERE role = 'user' ORDER BY full_name");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Main request handling
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];
    
    // Check admin access
    if (!isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => 'Not logged in']);
        exit;
    }
    if (!isAdmin()) {
        echo json_encode(['success' => false, 'message' => 'Admin access required']);
        exit;
    }
    
    switch ($action) {
        case 'get_stats':
            $stats = getDashboardStats();
            echo json_encode(['success' => true, 'stats' => $stats]);
            break;
            
        case 'get_users':
            $users = getAllUsers($_POST['limit'] ?? 50, $_POST['offset'] ?? 0, $_POST['search'] ?? '');
            echo json_encode(['success' => true, 'users' => $users]);
            break;
            
        case 'get_classes':
            $classes = getAllClasses();
            echo json_encode(['success' => true, 'classes' => $classes]);
            break;
            
        case 'get_bookings':
            $bookings = getAllBookings($_POST['date'] ?? null);
            echo json_encode(['success' => true, 'bookings' => $bookings]);
            break;
            
        case 'get_memberships':
            $memberships = getAllMemberships();
            echo json_encode(['success' => true, 'memberships' => $memberships]);
            break;
            
        case 'get_activity_log':
            $log = getActivityLog($_POST['limit'] ?? 100);
            echo json_encode(['success' => true, 'log' => $log]);
            break;
            
        case 'get_message_count':
            $pdo = getDBConnection();
            $count = $pdo ? (int)$pdo->query("SELECT COUNT(*) FROM contact_messages WHERE status = 'new'")->fetchColumn() : 0;
            echo json_encode(['success' => true, 'count' => $count]);
            break;

        /* Admin management actions */
        case 'delete_user':
            $userId = $_POST['user_id'] ?? 0;
            if ($userId && adminDeleteUser($userId)) echo json_encode(['success' => true, 'message' => 'User deleted']);
            else echo json_encode(['success' => false, 'message' => 'Failed to delete user']);
            break;

        case 'delete_class':
            $classId = $_POST['class_id'] ?? 0;
            if ($classId && adminDeleteClass($classId)) echo json_encode(['success' => true, 'message' => 'Class deleted']);
            else echo json_encode(['success' => false, 'message' => 'Failed to delete class']);
            break;

        case 'update_user':
            $res = adminUpdateUser($_POST);
            echo json_encode($res);
            break;

        case 'save_class':
            $res = adminSaveClass($_POST);
            echo json_encode($res);
            break;

        case 'cancel_booking':
            $bookingId = $_POST['booking_id'] ?? 0;
            $res = adminCancelBooking($bookingId);
            echo json_encode($res);
            break;

        case 'get_messages':
            $id = $_POST['id'] ?? null;
            $limit = $_POST['limit'] ?? 50;
            $offset = $_POST['offset'] ?? 0;
            $search = $_POST['search'] ?? '';
            $messages = adminGetMessages($limit, $offset, $search, $id);
            echo json_encode(['success' => true, 'messages' => $messages]);
            break;

        case 'update_message':
            $id = $_POST['id'] ?? 0;
            $status = $_POST['status'] ?? '';
            $ok = adminUpdateMessage($id, $status);
            echo json_encode(['success' => $ok]);
            break;

        case 'delete_message':
            $messageId = $_POST['message_id'] ?? 0;
            $result = adminDeleteMessage($messageId);
            echo json_encode($result);
            break;

        case 'reply_message':
            $messageId = $_POST['message_id'] ?? 0;
            $toEmail = $_POST['to_email'] ?? '';
            $subject = $_POST['subject'] ?? '';
            $reply = $_POST['reply'] ?? '';
            $result = adminReplyMessage($messageId, $toEmail, $subject, $reply);
            echo json_encode($result);
            break;

        case 'save_membership':
            $res = adminSaveMembership($_POST);
            echo json_encode($res);
            break;

        case 'delete_membership':
            $membershipId = $_POST['membership_id'] ?? 0;
            $ok = adminDeleteMembership($membershipId);
            echo json_encode(['success' => $ok]);
            break;

        case 'get_users_for_membership':
            $users = getAllUsersSimple();
            echo json_encode(['success' => true, 'users' => $users]);
            break;
            
        case 'mark_all_read':
            $result = adminMarkAllMessagesRead();
            echo json_encode($result);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Admin API. Use POST method with action parameter.']);

