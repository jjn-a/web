const API_URL = 'auth.php';
const ADMIN_API_URL = 'admin_api.php';

let currentUser = null;
let isAdmin = false;
let selectedDate = new Date();
let showWeekViewMode = false;

function hidePageTransition() {
    const pageTransition = document.querySelector('.page-transition');
    if (pageTransition) {
        pageTransition.classList.add('hidden');
        setTimeout(() => {
            pageTransition.style.display = 'none';
            pageTransition.style.visibility = 'hidden';
            pageTransition.remove();
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    hidePageTransition();
    setTimeout(() => {
        const pageTransition = document.querySelector('.page-transition');
        if (pageTransition) {
            pageTransition.classList.add('hidden');
            pageTransition.style.display = 'none';
            pageTransition.remove();
        }
    }, 2000);
});

// Force hide page transition on load complete
window.addEventListener('load', function() {
    hidePageTransition();
    const pageTransition = document.querySelector('.page-transition');
    if (pageTransition) {
        pageTransition.style.display = 'none';
        pageTransition.remove();
    }
});

async function fetchAPI(url, data = {}) {
    const formData = new FormData();
    for (const key in data) {
        formData.append(key, data[key]);
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: { 
                'Cache-Control': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            console.error('API Error:', url, 'Status:', response.status);
            return { success: false, message: 'HTTP Error: ' + response.status };
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', url, text.substring(0, 200));
            return { success: false, message: 'Invalid response type: ' + contentType };
        }
        
        return await response.json();
    } catch (error) {
        console.error('Network error:', url, error.message);
        return { success: false, message: 'Network error: ' + error.message };
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    if (!timeString) return '';
    const parts = timeString.split(':');
    if (parts.length < 2) return '';
    let hours = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour = hours % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
}

function getInitials(name) {
    if (!name || typeof name !== 'string') return '--';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getTitleIcon(iconName) {
    const icons = {
        'dashboard': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
        'classes': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        'bookings': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        'progress': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
        'profile': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        'users': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        'messages': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    };
    return icons[iconName] || icons['dashboard'];
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    const colors = { success: '#4CAF50', error: '#F44336', warning: '#FFC107', info: '#2196F3' };
    toast.style.cssText = `position: fixed; bottom: 20px; right: 20px; padding: 16px 24px; border-radius: 8px; color: white; font-weight: 500; z-index: 3000; animation: slideIn 0.3s ease; background: ${colors[type] || colors.success};`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}

async function checkAuth() {
    console.log('checkAuth - fetching profile from:', API_URL);
    const result = await fetchAPI(API_URL, { action: 'get_profile' });
    console.log('checkAuth - result:', result);
    
    if (result.success && result.user) {
        currentUser = result.user;
        isAdmin = result.user.role === 'admin';
        console.log('checkAuth - user loaded:', currentUser);
        console.log('checkAuth - isAdmin:', isAdmin);
        updateUserMenu();
        const welcomeNameEl = document.getElementById('welcome-name');
        if (welcomeNameEl && currentUser) welcomeNameEl.textContent = (currentUser.full_name || '').split(' ')[0] || currentUser.username || 'Member';
        return true;
    }
    
    console.error('checkAuth - failed:', result.message || 'Unknown error');
    return false;
}

async function logout() {
    const result = await fetchAPI(API_URL, { action: 'logout' });
    if (result.success) window.location.href = 'signin.html';
}

function updateUserMenu() {
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');
    const dropdownUserNameEl = document.getElementById('dropdown-user-name');
    const dropdownUserEmailEl = document.getElementById('dropdown-user-email');
    const dropdownUserAvatarEl = document.getElementById('dropdown-user-avatar');
    const welcomeNameEl = document.getElementById('welcome-name');
    
    if (userNameEl) {
        userNameEl.textContent = currentUser?.full_name || 'Guest';
    }
    if (userRoleEl) {
        userRoleEl.textContent = isAdmin ? 'Administrator' : 'Member';
    }
    if (userAvatarEl) {
        userAvatarEl.textContent = currentUser?.full_name ? getInitials(currentUser.full_name) : '-';
    }
        if (welcomeNameEl && currentUser) {
            welcomeNameEl.textContent = (currentUser.full_name || '').split(' ')[0] || currentUser.username || 'Member';
        }
    
    // Update dropdown
    if (dropdownUserNameEl) {
        dropdownUserNameEl.textContent = currentUser?.full_name || 'Guest';
    }
    if (dropdownUserEmailEl) {
        dropdownUserEmailEl.textContent = currentUser?.email || 'guest@example.com';
    }
    if (dropdownUserAvatarEl) {
        dropdownUserAvatarEl.textContent = currentUser?.full_name ? getInitials(currentUser.full_name) : '-';
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function closeUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('active');
}

async function loadDashboardData() {
    await Promise.all([loadMembershipInfo(), loadUpcomingClasses(), loadRecentProgress(), loadUserStats()]);
}

async function loadUserStats() {
    const daysEl = document.getElementById('stat-days');
    const bookingsEl = document.getElementById('stat-bookings');
    if (currentUser && currentUser.created_at && daysEl) {
        const createdDate = new Date(currentUser.created_at);
        const today = new Date();
        const diffTime = Math.abs(today - createdDate);
        daysEl.textContent = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    const result = await fetchAPI(API_URL, { action: 'get_upcoming_classes' });
    if (bookingsEl) bookingsEl.textContent = (result.success && result.classes) ? result.classes.length : 0;
}


async function loadMembershipInfo() {
    const result = await fetchAPI(API_URL, { action: 'get_membership' });
    const container = document.getElementById('membership-info');
    if (container) {
        if (result.success && result.membership) {
            const m = result.membership;
            const daysLeft = Math.ceil((new Date(m.end_date) - new Date()) / (1000 * 60 * 60 * 24));
            
            // Determine membership class based on membership type
            const membershipType = (m.membership_type || '').toLowerCase();
            let membershipClass = '';
            if (membershipType.includes('vip')) {
                membershipClass = 'vip';
            } else if (membershipType.includes('premium')) {
                membershipClass = 'premium';
            } else if (membershipType.includes('basic')) {
                membershipClass = 'basic';
            }
            
            container.innerHTML = `<div class="membership-card ${membershipClass}"><div class="membership-type">${m.membership_type} Member</div><div class="membership-details"><div class="membership-detail"><span>Status</span><span class="badge badge-success">${m.status}</span></div><div class="membership-detail"><span>Expires</span>${formatDate(m.end_date)}</div><div class="membership-detail"><span>Days Left</span>${daysLeft > 0 ? daysLeft : 0}</div></div></div>`;
        } else {
            container.innerHTML = '<div class="empty-state"><p>No active membership found.</p><a href="offers.html" class="btn btn-primary" style="margin-top:12px;">View Plans</a></div>';
        }
    }
}

async function loadUpcomingClasses() {
    const result = await fetchAPI(API_URL, { action: 'get_upcoming_classes' });
    const container = document.getElementById('upcoming-classes');
    if (result.success && result.classes && result.classes.length > 0) {
        container.innerHTML = result.classes.map(cls => `<div class="class-item">
            <div class="class-time">${formatDate(cls.booking_date)}</div>
            <div class="class-info">
                <div class="class-name">${cls.name}</div>
                <div class="class-meta">${formatTime(cls.start_time)} - ${cls.instructor}</div>
            </div>
            <div class="class-action">
                <button class="btn btn-sm btn-danger" onclick="cancelClassBooking(${cls.booking_id})">Cancel</button>
            </div>
        </div>`).join('');
    } else if (container) {
        container.innerHTML = '<div class="empty-state"><p>No upcoming classes.</p><button class="btn btn-primary" onclick="switchToClassesSection()">Book a Class</button></div>';
    }
}

async function loadRecentProgress() {
    // Add cache-busting timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    console.log('loadRecentProgress - FETCHING with timestamp:', timestamp);
    
    // Always add a random parameter to ensure fresh data
    const result = await fetchAPI(API_URL, { action: 'get_progress', _t: timestamp, _r: Math.random() });
    
    console.log('loadRecentProgress - API result:', result);
    console.log('loadRecentProgress - success:', result.success);
    console.log('loadRecentProgress - progress count:', result.progress?.length || 0);
    
    const container = document.getElementById('recent-progress');
    const progressWeightEl = document.getElementById('progress-weight');
    const progressBodyFatEl = document.getElementById('progress-bodyfat');
    const progressBmiEl = document.getElementById('progress-bmi');
    
    console.log('loadRecentProgress - container exists:', !!container);
    console.log('loadRecentProgress - progressWeightEl exists:', !!progressWeightEl);
    console.log('loadRecentProgress - progressBodyFatEl exists:', !!progressBodyFatEl);
    console.log('loadRecentProgress - progressBmiEl exists:', !!progressBmiEl);
    
    // Store latest data globally so it can be used for BMI calculation
    let latestData = null;
    
    if (result.success && result.progress && result.progress.length > 0) {
        latestData = result.progress[0];
        const first = result.progress[result.progress.length - 1];
        
        console.log('loadRecentProgress - latest data:', latestData);
        console.log('loadRecentProgress - weight value:', latestData.weight, 'type:', typeof latestData.weight);
        console.log('loadRecentProgress - body_fat value:', latestData.body_fat_percentage, 'type:', typeof latestData.body_fat_percentage);
        
        // Update dashboard recent progress card
        container.innerHTML = `<div class="grid-2" style="gap:16px;">
            <div class="stat-card">
                <div class="stat-value">${latestData.weight || '-'} kg</div>
                <div class="stat-label">Weight</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${latestData.body_fat_percentage || '-'}%</div>
                <div class="stat-label">Body Fat</div>
            </div>
        </div>`;
        
        console.log('loadRecentProgress - Updated dashboard card with weight:', latestData.weight, 'body_fat:', latestData.body_fat_percentage);
        
        // Update progress section stats - ONLY if data exists AND elements exist
        if (progressWeightEl) {
            const weightValue = latestData.weight !== null && latestData.weight !== undefined && latestData.weight !== '' ? latestData.weight : '--';
            progressWeightEl.textContent = weightValue;
            console.log('loadRecentProgress - SET progress-weight to:', weightValue);
        } else {
            console.log('loadRecentProgress - progressWeightEl is NULL, cannot set value');
        }
        
        if (progressBodyFatEl) {
            const bfValue = latestData.body_fat_percentage !== null && latestData.body_fat_percentage !== undefined && latestData.body_fat_percentage !== '' ? latestData.body_fat_percentage + '<span class="stat-unit">%</span>' : '--%';
            progressBodyFatEl.innerHTML = bfValue;
            console.log('loadRecentProgress - SET progress-bodyfat to:', bfValue);
        } else {
            console.log('loadRecentProgress - progressBodyFatEl is NULL, cannot set value');
        }
        
        // Calculate and display BMI
        if (progressBmiEl) {
            console.log('loadRecentProgress - calculating BMI, currentUser.height:', currentUser?.height, 'weight:', latestData.weight);
            if (currentUser?.height && latestData.weight) {
                const heightM = currentUser.height / 100;
                const bmi = (latestData.weight / (heightM * heightM)).toFixed(1);
                progressBmiEl.textContent = bmi;
                console.log('loadRecentProgress - BMI calculated:', bmi);
            } else {
                progressBmiEl.textContent = '--';
                console.log('loadRecentProgress - BMI not calculated, missing height:', currentUser?.height, 'or weight:', latestData.weight);
            }
        }
        
        // Calculate and display trends
        const weightTrendEl = document.getElementById('weight-trend');
        const bodyFatTrendEl = document.getElementById('bodyfat-trend');
        
        if (latestData.weight && first.weight) {
            const weightChange = (latestData.weight - first.weight).toFixed(1);
            if (weightTrendEl) {
                weightTrendEl.innerHTML = `<span class="trend-value">${weightChange > 0 ? '+' : ''}${weightChange} kg</span>`;
                weightTrendEl.className = 'stat-trend ' + (weightChange <= 0 ? 'up' : 'down');
            }
        }
        
        if (latestData.body_fat_percentage && first.body_fat_percentage) {
            const bfChange = (latestData.body_fat_percentage - first.body_fat_percentage).toFixed(1);
            if (bodyFatTrendEl) {
                bodyFatTrendEl.innerHTML = `<span class="trend-value">${bfChange > 0 ? '+' : ''}${bfChange}%</span>`;
                bodyFatTrendEl.className = 'stat-trend ' + (bfChange <= 0 ? 'up' : 'down');
            }
        }
        
    } else if (container) {
        // Only show empty state if there's genuinely no data AND this is the first load
        // Don't overwrite existing data on refresh
        console.log('loadRecentProgress - No progress data found, result:', result);
        if (!latestData && !result.progress) {
            container.innerHTML = '<div class="empty-state"><p>No progress records yet.</p><button class="btn btn-primary" onclick="showModal(\'progress-modal\')">Add Progress</button></div>';
            
            // Also update progress section stats to show default values
            if (progressWeightEl) progressWeightEl.textContent = '--';
            if (progressBodyFatEl) progressBodyFatEl.textContent = '--%';
            if (progressBmiEl) progressBmiEl.textContent = '--';
        }
    }
}

function changeDay(delta) {
    selectedDate.setDate(selectedDate.getDate() + delta);
    updateDayDisplay();
    loadAvailableClasses();
}

let selectedBookingDate = new Date();

function changeBookingDay(delta) {
    selectedBookingDate.setDate(selectedBookingDate.getDate() + delta);
    updateBookingDayDisplay();
    // Only call if function exists (admin dashboard)
    if (typeof loadAdminBookings === 'function') {
        loadAdminBookings();
    }
}

function updateBookingDayDisplay() {
    const dayNavText = document.getElementById('booking-day-nav-text');
    const dayNavDate = document.getElementById('booking-day-nav-date');
    
    // Only update if elements exist (admin dashboard)
    if (!dayNavText || !dayNavDate) return;
    
    const today = new Date();
    if (selectedBookingDate.toDateString() === today.toDateString()) {
        dayNavText.textContent = 'Today';
    } else {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        if (selectedBookingDate.toDateString() === tomorrow.toDateString()) {
            dayNavText.textContent = 'Tomorrow';
        } else {
            dayNavText.textContent = selectedBookingDate.toLocaleDateString('en-US', { weekday: 'long' });
        }
    }
    
    dayNavDate.textContent = selectedBookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updateDayDisplay() {
    const dayNavText = document.getElementById('day-nav-text');
    const dayNavDate = document.getElementById('day-nav-date');
    const classDateInput = document.getElementById('class-date');
    
    if (dayNavText) {
        const today = new Date();
        if (selectedDate.toDateString() === today.toDateString()) {
            dayNavText.textContent = 'Today';
        } else {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            if (selectedDate.toDateString() === tomorrow.toDateString()) {
                dayNavText.textContent = 'Tomorrow';
            } else {
                dayNavText.textContent = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
            }
        }
    }
    
    if (dayNavDate) {
        dayNavDate.textContent = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    if (classDateInput) {
        classDateInput.value = selectedDate.toISOString().split('T')[0];
    }
}

function showWeekView() {
    showWeekViewMode = !showWeekViewMode;
    const btnWeekView = document.getElementById('btn-week-view');
    const weekViewContainer = document.getElementById('week-view-container');
    const availableClasses = document.getElementById('available-classes');
    
    if (btnWeekView) {
        if (showWeekViewMode) {
            btnWeekView.classList.add('active');
            loadWeekView();
        } else {
            btnWeekView.classList.remove('active');
            if (weekViewContainer) weekViewContainer.style.display = 'none';
            if (availableClasses) availableClasses.style.display = 'block';
        }
    }
}

async function loadWeekView() {
    const weekViewContainer = document.getElementById('week-view-container');
    const availableClasses = document.getElementById('available-classes');
    
    if (weekViewContainer) {
        weekViewContainer.style.display = 'block';
        if (availableClasses) availableClasses.style.display = 'none';
        
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        let html = '<div class="week-view-container">';
        
        // Get user's bookings for the week
        const bookingsResult = await fetchAPI(API_URL, { action: 'get_upcoming_classes' });
        const userBookings = bookingsResult.success && bookingsResult.classes ? bookingsResult.classes : [];
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
            const shortDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const isToday = currentDate.toDateString() === today.toDateString();
            
            const classesResult = await fetchAPI(API_URL, { action: 'get_available_classes', date: dateStr });
            
            // Count classes for this day
            const classesCount = classesResult.success && classesResult.classes ? classesResult.classes.length : 0;
            
            html += `<div class="week-day-card ${isToday ? 'today' : ''}">`;
            
            // Header with day name and date
            html += `<div class="week-day-header">`;
            html += `<div class="week-day-info">`;
            html += `<div class="week-day-badge">`;
            html += `<span class="day-name">${dayName.substring(0, 3)}</span>`;
            html += `<span class="day-num">${currentDate.getDate()}</span>`;
            html += `</div>`;
            html += `<div class="week-day-details">`;
            html += `<h4>${isToday ? 'Today' : dayName}</h4>`;
            html += `<p>${shortDate}</p>`;
            html += `</div>`;
            html += `</div>`;
            html += `<div class="week-day-count">${classesCount} ${classesCount === 1 ? 'class' : 'classes'}</div>`;
            html += `</div>`; // End header
            
            // Classes list
            html += `<div class="week-day-classes">`;
            
            if (classesResult.success && classesResult.classes && classesResult.classes.length > 0) {
                classesResult.classes.forEach(cls => {
                    const available = cls.max_participants - cls.booked_count;
                    
                    // Check if booked
                    const isBooked = userBookings.some(b => {
                        const bookingClassId = b.class_id !== undefined ? b.class_id : b.id;
                        return String(bookingClassId) === String(cls.id) && String(b.booking_date) === String(dateStr);
                    });
                    
                    // Check if ended
                    const classDateTime = new Date(`${dateStr} ${cls.start_time}`);
                    const hasEnded = classDateTime < new Date();
                    
                    html += `<div class="class-item">`;
                    html += `<div class="class-time">`;
                    html += `<span class="time">${formatTime(cls.start_time)}</span>`;
                    html += `<span class="duration">${cls.duration || '60 min'}</span>`;
                    html += `</div>`;
                    html += `<div class="class-info">`;
                    html += `<div class="class-name">${cls.name}</div>`;
                    html += `<div class="class-meta">`;
                    html += `<span class="class-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${cls.instructor}</span>`;
                    html += `<span class="class-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${cls.room || 'Main Hall'}</span>`;
                    html += `</div>`;
                    html += `</div>`;
                    html += `<div class="class-action">`;
                    
                    if (isBooked) {
                        const booking = userBookings.find(b => {
                            const bookingClassId = b.class_id !== undefined ? b.class_id : b.id;
                            return String(bookingClassId) === String(cls.id) && String(b.booking_date) === String(dateStr);
                        });
                        const bookingId = booking?.booking_id || booking?.id || 0;
                        html += `<span class="badge badge-success">${available} spots</span>`;
                        html += `<button class="btn btn-sm btn-danger" onclick="cancelClassBooking(${bookingId})">Cancel</button>`;
                    } else if (hasEnded) {
                        html += `<span class="badge badge-secondary">Ended</span>`;
                    } else if (available > 0) {
                        html += `<span class="badge badge-success">${available} spots</span>`;
                        html += `<button class="btn btn-sm btn-primary" onclick="bookClass(${cls.id}, '${dateStr}')">Book</button>`;
                    } else {
                        html += `<span class="badge badge-danger">Full</span>`;
                    }
                    
                    html += `</div>`;
                    html += `</div>`;
                });
            } else {
                html += `<div class="week-day-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <p>No classes scheduled</p>
                </div>`;
            }
            
            html += `</div>`; // End classes
            html += `</div>`; // End card
        }
        
        html += '</div>';
        weekViewContainer.innerHTML = html;
    }
}

async function loadAvailableClasses() {
    const dateInput = document.getElementById('class-date');
    let date = dateInput ? dateInput.value : null;
    if (!date) {
        selectedDate = new Date();
        date = selectedDate.toISOString().split('T')[0];
    } else {
        selectedDate = new Date(date);
    }
    updateDayDisplay();
    
    // Get user's bookings to check which classes are already booked
    const bookingsResult = await fetchAPI(API_URL, { action: 'get_upcoming_classes' });
    const userBookings = bookingsResult.success && bookingsResult.classes ? bookingsResult.classes : [];
    
    // Debug logging - check all data types
    console.log('=== DEBUG loadAvailableClasses ===');
    console.log('Looking for date:', date, 'type:', typeof date);
    console.log('User bookings count:', userBookings.length);
    if (userBookings.length > 0) {
        console.log('First booking:', userBookings[0]);
        console.log('First booking class_id:', userBookings[0].class_id, 'type:', typeof userBookings[0].class_id);
        console.log('First booking booking_date:', userBookings[0].booking_date, 'type:', typeof userBookings[0].booking_date);
    }
    
    const result = await fetchAPI(API_URL, { action: 'get_available_classes', date: date });
    const container = document.getElementById('available-classes');
    if (result.success && result.classes && result.classes.length > 0) {
        container.innerHTML = result.classes.map(cls => {
            const available = cls.max_participants - cls.booked_count;
            
            console.log(`\nChecking class: ${cls.name}`);
            console.log(`  cls.id: ${cls.id} (type: ${typeof cls.id})`);
            
            // Debug: log the comparison for each booking
            let isBooked = false;
            for (const booking of userBookings) {
                // Use 'id' instead of 'class_id' since API returns 'id' for the class reference
                const bookingClassId = booking.class_id !== undefined ? booking.class_id : booking.id;
                const classIdMatch = String(bookingClassId).trim() === String(cls.id).trim();
                const dateMatch = String(booking.booking_date).trim() === String(date).trim();
                const bookingDate = String(booking.booking_date).trim();
                const searchDate = String(date).trim();
                
                console.log(`  Booking - id: ${booking.id}, class_id: ${booking.class_id}, resolved_id: ${bookingClassId}, booking_date: "${bookingDate}"`);
                console.log(`  Comparison - classIdMatch: ${classIdMatch}, dateMatch: ${dateMatch} (searchDate: "${searchDate}")`);
                
                if (classIdMatch && dateMatch) {
                    isBooked = true;
                    console.log(`  ** MATCH FOUND! **`);
                    break;
                }
            }
            
            console.log(`  Final isBooked: ${isBooked}`);
            
            // Check if class has ended (compare date + start time against now)
            const classDateTime = new Date(`${date} ${cls.start_time}`);
            const now = new Date();
            const hasEnded = classDateTime < now;
            
            let actionHtml = '';
            
            if (isBooked) {
                // Get the booking_id from user's bookings
                const booking = userBookings.find(b => (String(b.class_id) === String(cls.id) || String(b.id) === String(cls.id)) && String(b.booking_date) === String(date));
                const bookingId = booking?.booking_id || booking?.id || 0;
                actionHtml = `<span class="badge badge-success">${available} spots</span><button class="btn btn-sm btn-danger" onclick="cancelClassBooking(${bookingId})">Cancel</button>`;
            } else if (hasEnded) {
                actionHtml = '<span class="badge badge-secondary">Ended</span>';
            } else if (available > 0) {
                actionHtml = `<span class="badge badge-success">${available} spots</span><button class="btn btn-sm btn-primary" onclick="bookClass(${cls.id}, '${date}')">Book</button>`;
            } else {
                actionHtml = '<span class="badge badge-danger">Full</span>';
            }
            
            return `<div class="class-item">
                <div class="class-time">${formatTime(cls.start_time)}</div>
                <div class="class-info">
                    <div class="class-name">${cls.name}</div>
                    <div class="class-meta">${cls.instructor} • ${cls.room}</div>
                </div>
                <div class="class-action">${actionHtml}</div>
            </div>`;
        }).join('');
    } else if (container) {
        container.innerHTML = '<div class="empty-state"><p>No classes available for this day.</p></div>';
    }
}

async function loadMyBookings() {
    const result = await fetchAPI(API_URL, { action: 'get_upcoming_classes' });
    const container = document.getElementById('my-bookings');
    if (result.success && result.classes && result.classes.length > 0) {
        container.innerHTML = '<div class="bookings-list">' + result.classes.map(cls => `<div class="booking-card-item">
            <div class="booking-card-main">
                <div class="booking-card-date">
                    <span class="booking-day-name">${formatDate(cls.booking_date).split(' ')[0]}</span>
                    <span class="booking-day-num">${formatDate(cls.booking_date).split(' ').slice(1).join(' ')}</span>
                </div>
                <div class="booking-card-info">
                    <div class="booking-card-name">${cls.name}</div>
                    <div class="booking-card-meta">
                        <span class="booking-time">${formatTime(cls.start_time)}</span>
                        <span class="booking-instructor">${cls.instructor}</span>
                    </div>
                </div>
                <div class="booking-card-status">
                    <span class="badge badge-success">${cls.booking_status}</span>
                </div>
                <div class="booking-card-action">
                    <button class="btn btn-sm btn-danger" onclick="cancelClassBooking(${cls.booking_id})">Cancel</button>
                </div>
            </div>
        </div>`).join('') + '</div>';
    } else if (container) {
        container.innerHTML = '<div class="empty-state"><h3>No Bookings Yet</h3><p>You haven\'t booked any classes yet.</p><button class="btn btn-primary" onclick="switchToClassesSection()">Browse Classes</button></div>';
    }
}

function switchToClassesSection() {
    document.querySelectorAll('.dashboard-section').forEach(sec => sec.style.display = 'none');
    const classesSection = document.getElementById('classes-section');
    if (classesSection) classesSection.style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const classesNav = document.querySelector('.nav-item[data-section="classes"]');
    if (classesNav) classesNav.classList.add('active');
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        const titleText = pageTitle.querySelector('.page-title-text');
        if (titleText) titleText.textContent = 'Classes';
        else pageTitle.textContent = 'Classes';
    }
    loadAvailableClasses();
}

async function bookClass(classId, date) {
    const result = await fetchAPI(API_URL, { action: 'book_class', class_id: classId, date: date });
    if (result.success) {
        showToast(result.message);
        loadAvailableClasses();
        loadUpcomingClasses();
        loadMyBookings();
        if (showWeekViewMode) loadWeekView();
    } else {
        showToast(result.message, 'error');
    }
}

async function cancelClassBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    const result = await fetchAPI(API_URL, { action: 'cancel_booking', booking_id: bookingId });
    if (result.success) {
        showToast(result.message);
        loadUpcomingClasses();
        loadMyBookings();
        loadAvailableClasses();
        if (showWeekViewMode) loadWeekView();
    } else {
        showToast(result.message, 'error');
    }
}

async function addProgressRecord(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const result = await fetchAPI(API_URL, { action: 'add_progress', ...data });
    if (result.success) {
        showToast(result.message);
        hideModal('progress-modal');
        form.reset();
        loadRecentProgress();
    } else {
        showToast(result.message, 'error');
    }
}

async function updateUserProfile(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const result = await fetchAPI(API_URL, { action: 'update_profile', ...data });
    if (result.success) {
        showToast(result.message);
        checkAuth();
    } else {
        showToast(result.message, 'error');
    }
}

async function changeUserPassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    const result = await fetchAPI(API_URL, { action: 'change_password', current_password: currentPassword, new_password: newPassword });
    if (result.success) { showToast(result.message); event.target.reset(); }
    else { showToast(result.message, 'error'); }
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) {
                navigateToSection(section);
            }
        });
    });
    
    // Close mobile menu when clicking on overlay
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            closeMobileMenu();
        });
    }
    
    // Close mobile menu when clicking on main content area on mobile
    document.addEventListener('click', (e) => {
        try {
            const sidebar = document.querySelector('.sidebar');
            const menuToggle = document.querySelector('.menu-toggle');
            
            if (!sidebar || !menuToggle) return;
            
            // Don't close if clicking the menu toggle button
            if (e.target === menuToggle || menuToggle.contains(e.target)) {
                return;
            }
            
            // Don't close if clicking inside the sidebar
            if (sidebar.contains(e.target)) {
                return;
            }
            
            // Close menu if it's open and click is elsewhere
            if (sidebar.classList.contains('active')) {
                closeMobileMenu();
            }
        } catch (error) {
            console.error('Error in click handler:', error);
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    const targetBtn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
}

function initNotifications() {
    const notificationBtn = document.querySelector('.notification-btn');
    const notificationDropdown = document.getElementById('notification-menu') || document.querySelector('.notification-menu');
    
        if (notificationBtn) {
        // Handle both click and touch events
        const toggleNotification = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (notificationDropdown) {
                notificationDropdown.classList.toggle('active');
                if (notificationDropdown.classList.contains('active')) {
                    loadNotifications();
                }
            }
        };
        notificationBtn.addEventListener('click', toggleNotification);
        notificationBtn.addEventListener('touchstart', toggleNotification, { passive: false });
    }
    
    // Stop propagation on notification menu clicks to prevent dropdown from closing
    if (notificationDropdown) {
        const stopPropagation = (e) => {
            e.stopPropagation();
        };
        
        notificationDropdown.addEventListener('click', stopPropagation);
        notificationDropdown.addEventListener('touchstart', stopPropagation, { passive: false });
        
        // Handle refresh button click
        if (notificationDropdown) {
            const refreshBtn = notificationDropdown.querySelector('.mark-read-btn');
            if (refreshBtn) {
                const handleRefresh = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    refreshNotifications();
                };
                refreshBtn.addEventListener('click', handleRefresh);
                refreshBtn.addEventListener('touchstart', handleRefresh, { passive: false });
            }

            // Handle mark all read button (second .mark-read-btn in header area)
            const markAllReadBtns = notificationDropdown.querySelectorAll('.mark-read-btn');
            if (markAllReadBtns.length > 1) {
                const markAllReadBtn = markAllReadBtns[1];
                const handleMarkAllRead = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    markAllNotificationsRead();
                };
                markAllReadBtn.addEventListener('click', handleMarkAllRead);
                markAllReadBtn.addEventListener('touchstart', handleMarkAllRead, { passive: false });
            }
        }
    }
    
    // Close dropdown when clicking/touching outside
    const closeNotification = (e) => {
        if (notificationDropdown && notificationDropdown.classList.contains('active')) {
            // If click is inside the menu or on the button, do nothing
            if (notificationBtn && notificationBtn.contains(e.target)) return;
            if (notificationDropdown.contains(e.target)) return;
            notificationDropdown.classList.remove('active');
        }
    };

    document.addEventListener('click', closeNotification);
    document.addEventListener('touchstart', closeNotification, { passive: true });
}

async function initUserDashboard() {
    const authenticated = await checkAuth();
    if (!authenticated) { window.location.href = 'signin.html'; return; }
    if (!isAdmin) document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    initNavigation();
    
    // Ensure dashboard section and nav item are active on load
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.classList.add('active');
    }
    
    // Set dashboard nav item as active
    const dashboardNav = document.querySelector('.nav-item[data-section="dashboard"]');
    if (dashboardNav) {
        dashboardNav.classList.add('active');
    }
    
    const lastSection = sessionStorage.getItem('user_last_section');
    if (lastSection && lastSection !== 'dashboard') {
        navigateToSection(lastSection);
    } else {
        loadDashboardData();
    }
    
    // Start user notification checks for class reminders
    startUserNotificationChecks();
    
    // Load goals on page load so progress bar works immediately
    loadProgressGoals();
    
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) dashboardContent.classList.add('visible');
}

async function initAdminDashboard() {
    console.log('=== initAdminDashboard START ===');
    
    const authenticated = await checkAuth();
    console.log('checkAuth result:', authenticated);
    console.log('currentUser:', currentUser);
    console.log('isAdmin:', isAdmin);
    
    if (!authenticated) {
        console.log('Not authenticated, redirecting to signin.html');
        window.location.href = 'signin.html';
        return;
    }
    
    if (!isAdmin) {
        console.log('User is not admin, redirecting to user_dashboard.html');
        window.location.href = 'user_dashboard.html';
        return;
    }
    
    console.log('Admin authenticated successfully, loading dashboard...');
    
    initNavigation();
    initSearch()
    startMessagesAutoRefresh();
    startNotificationBannerChecks();
    
    // Ensure dashboard section is visible on load
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.classList.add('active');
    }
    
    loadAdminDashboard();
    loadMessageCountForBadge();
    const adminHeader = document.querySelector('#admin-dashboard .dashboard-header');
    if (adminHeader) adminHeader.classList.add('visible');
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) dashboardContent.classList.add('visible');
    
    console.log('=== initAdminDashboard END ===');
}

async function loadAdminDashboard() {
    console.log('=== loadAdminDashboard START ===');
    
    // Load all dashboard data in parallel
    const promises = [
        loadAdminStats(),
        loadAdminUsers(),
        loadAdminClasses(),
        loadRecentUsers(),
        loadRecentActivity()
    ];
    
    try {
        const results = await Promise.allSettled(promises);
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error('Promise', index, 'rejected:', result.reason);
            } else {
                console.log('Promise', index, 'fulfilled');
            }
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
    
    console.log('=== loadAdminDashboard END ===');
}

async function loadAdminStats() {
    console.log('loadAdminStats - fetching from:', ADMIN_API_URL);
    const result = await fetchAPI(ADMIN_API_URL, { action: 'get_stats' });
    console.log('loadAdminStats - result:', result);
    
    // Handle all cases explicitly
    if (!result) {
        console.error('loadAdminStats - No response from server');
        document.getElementById('stat-users').textContent = 'Error';
        document.getElementById('stat-memberships').textContent = 'Error';
        document.getElementById('stat-classes').textContent = 'Error';
        document.getElementById('stat-revenue').textContent = '$Error';
        return;
    }
    
    if (!result.success) {
        console.error('loadAdminStats - API error:', result.message);
        if (result.debug) {
            console.error('Debug info:', result.debug);
        }
        document.getElementById('stat-users').textContent = '!';
        document.getElementById('stat-memberships').textContent = '!';
        document.getElementById('stat-classes').textContent = '!';
        document.getElementById('stat-revenue').textContent = '$!';
        return;
    }
    
    if (result.success) {
        const stats = result.stats;
        const statUsers = document.getElementById('stat-users');
        const statMemberships = document.getElementById('stat-memberships');
        const statClasses = document.getElementById('stat-classes');
        const statRevenue = document.getElementById('stat-revenue');
        if (statUsers) statUsers.textContent = stats.total_users || 0;
        if (statMemberships) statMemberships.textContent = stats.active_memberships || 0;
        if (statClasses) statClasses.textContent = stats.total_classes || 0;
        if (statRevenue) statRevenue.textContent = '$' + ((parseFloat(stats.monthly_revenue) || 0)).toFixed(2);
    }
}

async function loadAdminUsers(page = 1, search = '') {
    console.log('loadAdminUsers - fetching users, page:', page, 'search:', search);
    const result = await fetchAPI(ADMIN_API_URL, { action: 'get_users', limit: 1000, offset: (page - 1) * 1000, search: search });
    console.log('loadAdminUsers - result:', result);
    
    const container = document.getElementById('users-table-body');
    
    // Handle all cases explicitly
    if (!result) {
        console.error('loadAdminUsers - No response from server');
        if (container) container.innerHTML = '<div class="empty-state"><p>Connection error - no response from server</p></div>';
        return;
    }
    
    if (!result.success) {
        console.error('loadAdminUsers - API error:', result.message);
        if (result.debug) {
            console.error('Debug info:', result.debug);
        }
        if (container) container.innerHTML = '<div class="empty-state"><p>Error: ' + result.message + '</p></div>';
        return;
    }
    
    // Store all users globally for filtering/sorting
    window.allUsers = result.users || [];
    window.currentUserFilter = 'all';
    window.currentUserSearch = search || '';
    window.currentUserSort = 'newest';
    
    // Update filter counts
    updateUserFilterCounts();
    
    // Apply filters and render
    renderFilteredUsers();
}

function updateUserFilterCounts() {
    const users = window.allUsers || [];
    const counts = { all: 0, active: 0, inactive: 0 };
    
    users.forEach(user => {
        counts.all++;
        if (user.membership_status === 'active') {
            counts.active++;
        } else {
            counts.inactive++;
        }
    });
    
    // Update count badges
    document.getElementById('count-users-all').textContent = counts.all;
    document.getElementById('count-users-active').textContent = counts.active;
    document.getElementById('count-users-inactive').textContent = counts.inactive;
    document.getElementById('users-total-count').textContent = counts.all;
}

function renderFilteredUsers() {
    const container = document.getElementById('users-table-body');
    const users = window.allUsers || [];
    
    // Apply filter
    let filtered = users;
    if (window.currentUserFilter === 'active') {
        filtered = filtered.filter(u => u.membership_status === 'active');
    } else if (window.currentUserFilter === 'inactive') {
        filtered = filtered.filter(u => u.membership_status !== 'active');
    }
    
    // Apply search
    if (window.currentUserSearch) {
        const search = window.currentUserSearch.toLowerCase();
        filtered = filtered.filter(u => 
            (u.full_name && u.full_name.toLowerCase().includes(search)) ||
            (u.email && u.email.toLowerCase().includes(search)) ||
            (u.username && u.username.toLowerCase().includes(search))
        );
    }
    
    // Apply sorting
    filtered = sortUsersArray(filtered, window.currentUserSort);
    
    // Update visible count
    document.getElementById('users-visible-count').textContent = filtered.length;
    
    if (filtered.length > 0) {
        container.innerHTML = filtered.map(user => {
            const initials = (user.full_name || '').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || (user.username || '').substring(0,2).toUpperCase() || '--';
            const memberSince = user.member_since ? formatDate(user.member_since) : (user.created_at ? formatDate(user.created_at) : 'N/A');
            
            // Determine membership badge class
            const membershipBadgeClass = user.membership_status === 'active' ? 'badge-success' : 'badge-secondary';
            
            return `
                <div class="user-card-item">
                    <div class="user-avatar-badge">${initials}</div>
                    <div class="user-card-info">
                        <div class="user-card-name">${user.full_name}</div>
                        <div class="user-card-email">${user.email}</div>
                        <div class="user-card-meta">
                            <span class="user-card-meta-item membership-status">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                    <line x1="1" y1="10" x2="23" y2="10"/>
                                </svg>
                                <span class="badge ${membershipBadgeClass}">${user.membership_status || 'Inactive'}</span>
                            </span>
                            <span class="user-card-meta-item member-since">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                                <span class="member-since-text">Member since ${memberSince}</span>
                            </span>
                        </div>
                    </div>
                    <div class="user-card-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editUser(${user.id})">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } else if (container) {
        container.innerHTML = '<div class="empty-state"><p>No users found.</p></div>';
    }
}

function sortUsersArray(users, sortBy) {
    const sorted = [...users];
    
    switch (sortBy) {
        case 'newest':
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'name-asc':
            sorted.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
            break;
        case 'name-desc':
            sorted.sort((a, b) => (b.full_name || '').localeCompare(a.full_name || ''));
            break;
        case 'member-since-new':
            sorted.sort((a, b) => {
                const dateA = new Date(a.member_since || a.created_at || 0);
                const dateB = new Date(b.member_since || b.created_at || 0);
                return dateB - dateA;
            });
            break;
        case 'member-since-old':
            sorted.sort((a, b) => {
                const dateA = new Date(a.member_since || a.created_at || 0);
                const dateB = new Date(b.member_since || b.created_at || 0);
                return dateA - dateB;
            });
            break;
    }
    
    return sorted;
}

function filterUsers(filter) {
    window.currentUserFilter = filter;
    
    // Update active tab
    document.querySelectorAll('.users-filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });
    
    renderFilteredUsers();
}

function sortUsers() {
    const sortSelect = document.getElementById('user-sort');
    window.currentUserSort = sortSelect ? sortSelect.value : 'newest';
    renderFilteredUsers();
}

function initUserSearch() {
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                window.currentUserSearch = e.target.value.toLowerCase().trim();
                renderFilteredUsers();
            }, 300);
        });
    }
}

async function loadAdminClasses() {
    const result = await fetchAPI(ADMIN_API_URL, { action: 'get_classes' });
    const container = document.getElementById('admin-classes-container');
    if (result.success && result.classes && result.classes.length > 0) {
        container.innerHTML = result.classes.map(cls => `
            <div class="class-item">
                <div class="class-time-badge">
                    <span class="time">${formatTime(cls.start_time)}</span>
                </div>
                <div class="class-info">
                    <div class="class-name">${cls.name}</div>
                    <div class="class-meta">${cls.instructor} • ${cls.day_of_week}</div>
                </div>
                <div class="class-action">
                    <span class="badge badge-${cls.status === 'active' ? 'success' : 'secondary'}">${cls.status}</span>
                    <button class="btn btn-sm btn-secondary" onclick="editClass(${cls.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteClass(${cls.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } else if (container) {
        container.innerHTML = '<div class="empty-state"><p>No classes found.</p><button class="btn btn-primary" onclick="showModal(\'class-modal\')">Add Class</button></div>';
    }
}

async function loadAdminBookings() {
    // Format the date as YYYY-MM-DD for the API
    const year = selectedBookingDate.getFullYear();
    const month = String(selectedBookingDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedBookingDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const result = await fetchAPI(ADMIN_API_URL, { action: 'get_bookings', date: dateString });
    const container = document.getElementById('admin-bookings-container');
    if (result.success && result.bookings && result.bookings.length > 0) {
        container.innerHTML = result.bookings.map(booking => {
            // Check if class has ended
            const now = new Date();
            const bookingDate = new Date(booking.booking_date);
            const [endHour, endMin] = booking.end_time.split(':').map(Number);
            bookingDate.setHours(endHour, endMin, 0);
            
            const hasEnded = now >= bookingDate;
            const buttonLabel = hasEnded ? 'Ended' : 'Cancel';
            const buttonClass = hasEnded ? 'btn-secondary' : 'btn-danger';
            const buttonAction = hasEnded ? '' : `cancelAdminBooking(${booking.id})`;
            const buttonDisabled = hasEnded ? 'disabled' : '';
            
            return `
                <div class="booking-row">
                    <div class="booking-date">${formatDate(booking.booking_date)}</div>
                    <div class="booking-user">${booking.full_name}</div>
                    <div class="booking-class">${booking.class_name}</div>
                    <div class="booking-time">${formatTime(booking.start_time)}</div>
                    <div class="booking-status"><span class="badge badge-success">${booking.status}</span></div>
                    <div class="booking-actions"><button class="btn btn-sm ${buttonClass}" onclick="${buttonAction}" ${buttonDisabled}>${buttonLabel}</button></div>
                </div>
            `;
        }).join('');
    } else if (container) {
        container.innerHTML = '<div class="empty-state"><p>No bookings found.</p></div>';
    }
}

async function loadRecentUsers() {
    const result = await fetchAPI(ADMIN_API_URL, { action: 'get_users', limit: 5, offset: 0 });
    const container = document.getElementById('recent-users-body');
    if (result.success && result.users && result.users.length > 0) {
        container.innerHTML = result.users.slice(0, 5).map(user => {
            const initials = (user.full_name || '').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || (user.username || '').substring(0,2).toUpperCase() || '--';
            return `
                <div class="user-card-item">
                    <div class="user-avatar-badge">${initials}</div>
                    <div class="user-card-info">
                        <div class="user-card-name">${user.full_name}</div>
                        <div class="user-card-email">${user.email}</div>
                        <div class="user-card-meta">
                            <span class="user-card-meta-item">${formatDate(user.created_at)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

async function loadRecentActivity() {
    const result = await fetchAPI(ADMIN_API_URL, { action: 'get_activity_log', limit: 8 });
    const container = document.getElementById('activity-feed');
    if (result.success && result.log && result.log.length > 0) {
        container.innerHTML = result.log.slice(0, 8).map(item => `
            <div class="activity-item">
                <div class="activity-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <div class="activity-content">
                    <div class="activity-text"><strong>${item.username || 'System'}</strong> - ${item.action}</div>
                    <div class="activity-time">${formatDate(item.created_at)}</div>
                </div>
            </div>
        `).join('');
    } else if (container) {
        container.innerHTML = '<div class="empty-state"><p>No recent activity found.</p></div>';
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const result = await fetchAPI(ADMIN_API_URL, { action: 'delete_user', user_id: userId });
    if (result.success) { showToast(result.message); loadAdminUsers(); }
    else { showToast(result.message, 'error'); }
}

async function deleteClass(classId) {
    if (!confirm('Are you sure you want to delete this class?')) return;
    const result = await fetchAPI(ADMIN_API_URL, { action: 'delete_class', class_id: classId });
    if (result.success) { showToast(result.message); loadAdminClasses(); }
    else { showToast(result.message, 'error'); }
}

function editClass(classId) { showModal('class-modal'); }

function editUser(userId) {
    // Find user in the already loaded users array
    const user = window.allUsers ? window.allUsers.find(u => u.id === userId) : null;
    
    if (user) {
        // Populate the edit form with user data
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-user-fullname').value = user.full_name || '';
        document.getElementById('edit-user-email').value = user.email || '';
        document.getElementById('edit-user-phone').value = user.phone || '';
        document.getElementById('edit-user-dob').value = user.date_of_birth || '';
        document.getElementById('edit-user-role').value = user.role || 'user';
        
        // Show the edit modal
        showModal('user-modal');
    } else {
        // Fallback: fetch user data from API if not found in loaded users
        fetchAPI(ADMIN_API_URL, { action: 'get_users', limit: 1000, search: '' }).then(res => {
            if (res.success && res.users) {
                const foundUser = res.users.find(u => u.id === userId);
                if (foundUser) {
                    document.getElementById('edit-user-id').value = foundUser.id;
                    document.getElementById('edit-user-fullname').value = foundUser.full_name || '';
                    document.getElementById('edit-user-email').value = foundUser.email || '';
                    document.getElementById('edit-user-phone').value = foundUser.phone || '';
                    document.getElementById('edit-user-dob').value = foundUser.date_of_birth || '';
                    document.getElementById('edit-user-role').value = foundUser.role || 'user';
                    showModal('user-modal');
                }
            }
        });
    }
}

async function saveUser(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const result = await fetchAPI(ADMIN_API_URL, { action: 'update_user', ...data });
    if (result.success) { showToast(result.message); hideModal('user-modal'); loadAdminUsers(); }
    else { showToast(result.message, 'error'); }
}

async function saveClass(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const result = await fetchAPI(ADMIN_API_URL, { action: 'save_class', ...data });
    if (result.success) { showToast(result.message); hideModal('class-modal'); form.reset(); loadAdminClasses(); }
    else { showToast(result.message, 'error'); }
}

function initSearch() {
    initUserSearch();
}

function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('change', (e) => { sidebar.classList.toggle('active', e.target.checked); if (overlay) overlay.classList.toggle('active', e.target.checked); });
    }
    if (overlay) overlay.addEventListener('click', closeMobileMenu);
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

function closeMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (menuToggle) menuToggle.checked = false;
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) { overlay.classList.remove('active'); overlay.style.display = 'none'; }
}

let messageRefreshInterval = null;

function loadMessageCountForBadge() {
    fetchAPI(ADMIN_API_URL, { action: 'get_message_count', status: '' }).then(result => {
        if (result.success) {
            const navBadge = document.getElementById('message-count');
            if (navBadge) { navBadge.style.display = result.count > 0 ? 'inline-flex' : 'none'; navBadge.textContent = result.count; }
        }
    });
}

async function loadProfileData() {
    const result = await fetchAPI(API_URL, { action: 'get_profile' });
    if (result.success && result.user) {
        const user = result.user;
        const fullnameInput = document.getElementById('profile-fullname');
        const emailInput = document.getElementById('profile-email');
        const phoneInput = document.getElementById('profile-phone');
        const dobInput = document.getElementById('profile-dob');
        const heightInput = document.getElementById('profile-height');
        
        if (fullnameInput) fullnameInput.value = user.full_name || '';
        if (emailInput) emailInput.value = user.email || '';
        if (phoneInput) phoneInput.value = user.phone || '';
        if (dobInput) dobInput.value = user.date_of_birth || '';
        if (heightInput) heightInput.value = user.height || '';
        
        // Update currentUser with height for BMI calculation
        if (user.height) {
            currentUser.height = user.height;
        }
    }
}

async function deleteAccount(event) {
    event.preventDefault();
    const password = document.getElementById('delete-account-password').value;
    const confirmText = document.getElementById('delete-confirm-text').value;
    
    if (confirmText !== 'DELETE') {
        showToast('Please type "DELETE" to confirm account deletion', 'error');
        return;
    }
    
    const result = await fetchAPI(API_URL, { action: 'delete_account', password: password });
    if (result.success) {
        showToast(result.message);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } else {
        showToast(result.message, 'error');
    }
}

function showDeleteAccountModal() {
    showModal('delete-account-modal');
}

function hideDeleteAccountModal() {
    hideModal('delete-account-modal');
}

async function loadProgressHistory() {
    const result = await fetchAPI(API_URL, { action: 'get_progress' });
    const container = document.getElementById('progress-history');
    if (result.success && result.progress && result.progress.length > 0) {
        container.innerHTML = '<div class="progress-list">' + result.progress.map(p => `<div class="progress-item"><div class="progress-date">${formatDate(p.created_at)}</div><div class="progress-details"><div class="progress-detail"><span>Weight</span><span>${p.weight || '-'} kg</span></div><div class="progress-detail"><span>Body Fat</span><span>${p.body_fat_percentage || '-'}%</span></div><div class="progress-detail"><span>Muscle</span><span>${p.muscle_mass || '-'} kg</span></div><div class="progress-detail"><span>Waist</span><span>${p.waist || '-'} cm</span></div></div></div>`).join('') + '</div>';
    } else if (container) {
        container.innerHTML = '<div class="empty-state"><p>No progress records yet.</p></div>';
    }
}

function navigateToSection(sectionName) {
    closeMobileMenu();
    document.querySelectorAll('.dashboard-section').forEach(sec => {
        sec.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Ensure dashboard content is visible
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.classList.add('visible');
    }
    
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const targetNav = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    } else {
        // Fallback: ensure dashboard nav is active when no specific nav matches
        const dashboardNav = document.querySelector('.nav-item[data-section="dashboard"]');
        if (dashboardNav && sectionName === 'dashboard') {
            dashboardNav.classList.add('active');
        }
    }
    
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        const titles = {
            'dashboard': 'Dashboard',
            'classes': 'Classes',
            'bookings': 'My Bookings',
            'progress': 'Progress',
            'profile': 'Profile',
            'users': 'User Management',
            'memberships': 'Membership Management',
            'messages': 'Messages'
        };
        const newText = titles[sectionName] || 'Dashboard';
        const titleText = pageTitle.querySelector('.page-title-text');
        if (titleText) {
            titleText.textContent = newText;
        } else {
            pageTitle.innerHTML = getTitleIcon('dashboard') + '<span class="page-title-text">' + newText + '</span>';
        }
    }
    
    sessionStorage.setItem('user_last_section', sectionName);
    
    // Load section-specific data
    switch (sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'classes':
            loadAvailableClasses();
            break;
        case 'bookings':
            loadMyBookings();
            updateBookingDayDisplay();
            loadAdminBookings();
            // Dismiss notification banner when navigating to bookings
            dismissNewNotificationBanner(null);
            // Clear booking notification count immediately
            lastBookingCount = 0;
            previousBookingCount = 0;
            updateNotificationBannerList();
            break;
        case 'progress':
            loadRecentProgress();
            loadProgressHistory();
            loadProgressChart();
            updateBodyMeasurements();
            calculateBMI();
            // loadProgressGoals() already calls updateGoalProgress() internally
            loadProgressGoals();
            break;
        case 'profile':
            loadProfileData();
            break;
        case 'memberships':
            loadAdminMemberships();
            break;
        case 'messages':
            loadAdminMessages();
            startMessagesAutoRefresh();
            // Dismiss notification banner when navigating to messages
            dismissNewNotificationBanner(null);
            // Mark all messages as read and update badge
            if (isAdmin) {
                fetchAPI(ADMIN_API_URL, { action: 'mark_all_read' }).then(() => {
                    loadMessageCountForBadge();
                });
            }
            break;
    }
}

// Global variables for user dashboard notifications
let userTodayClasses = [];
let userTomorrowClasses = [];
let userNotificationInterval = null;
let userInitialCheckComplete = false;

function toggleNotificationDropdown() {
    const notificationMenu = document.getElementById('notification-menu');
    if (notificationMenu) {
        notificationMenu.classList.toggle('active');
        if (notificationMenu.classList.contains('active')) {
            loadNotifications();
        }
    }
}

// User dashboard notification banner functions (same as admin but adapted for class reminders)
function toggleNotificationBanner() {
    const dropdown = document.getElementById('notification-banner-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
        if (dropdown.classList.contains('active')) {
            if (isAdmin) {
                // Admin: update notification list
                updateNotificationBannerList();
            } else {
                // User: refresh class data and update list
                checkUserClassesForNotifications();
            }
        }
    }
}

function closeNotificationBanner() {
    const dropdown = document.getElementById('notification-banner-dropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

function openNotificationBannerFromBanner() {
    toggleNotificationBanner();
    dismissNewNotificationBanner(null);
}

function navigateToBookingsFromNotification() {
    // Dismiss the banner first
    dismissNewNotificationBanner(null);
    // Then navigate to bookings section
    navigateToSection('bookings');
}

// Navigate to messages and mark all as read
function navigateToMessagesAndMarkRead() {
    // Dismiss notification banner
    dismissNewNotificationBanner(null);
    // Close notification dropdown
    closeNotificationBanner();
    // Mark all messages as read
    if (isAdmin) {
        fetchAPI(ADMIN_API_URL, { action: 'mark_all_read' }).then(() => {
            // Update badge count
            loadMessageCountForBadge();
        });
    }
    // Navigate to messages section
    navigateToSection('messages');
}

// Navigate to bookings and clear notifications
function navigateToBookingsAndClear() {
    // Dismiss notification banner
    dismissNewNotificationBanner(null);
    // Close notification dropdown
    closeNotificationBanner();
    // Clear booking notification count immediately
    lastBookingCount = 0;
    previousBookingCount = 0;
    updateNotificationBannerList();
    // Navigate to bookings section
    navigateToSection('bookings');
}

function dismissNewNotificationBanner(event) {
    if (event) {
        event.stopPropagation();
    }
    const banner = document.getElementById('new-notification-banner');
    if (banner) {
        banner.classList.remove('active');
        setTimeout(() => {
            banner.style.display = 'none';
        }, 300);
    }
}

function showUserClassNotificationBanner(todayCount, tomorrowCount) {
    const banner = document.getElementById('new-notification-banner');
    const textEl = document.getElementById('new-notification-text');
    if (!banner || !textEl) return;
    
    let text = '';
    if (todayCount > 0 && tomorrowCount > 0) {
        text = `You have ${todayCount} class${todayCount === 1 ? '' : 'es'} today and ${tomorrowCount} class${tomorrowCount === 1 ? '' : 'es'} tomorrow!`;
    } else if (todayCount > 0) {
        text = `You have ${todayCount} class${todayCount === 1 ? '' : 'es'} today!`;
    } else if (tomorrowCount > 0) {
        text = `You have ${tomorrowCount} class${tomorrowCount === 1 ? '' : 'es'} tomorrow!`;
    }
    
    if (text) {
        textEl.textContent = text;
        banner.style.display = 'flex';
        setTimeout(() => {
            banner.classList.add('active');
        }, 10);
        
        // Auto dismiss after 10 seconds
        setTimeout(() => {
            banner.classList.remove('active');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
        }, 10000);
    }
}

function updateUserNotificationBannerList() {
    const listContainer = document.getElementById('notification-banner-list');
    const countBadge = document.getElementById('notification-total-count');
    if (!listContainer) return;
    
    const totalNotifications = userTodayClasses.length + userTomorrowClasses.length;
    
    // Update count badge
    if (countBadge) {
        countBadge.textContent = totalNotifications;
        countBadge.style.display = totalNotifications > 0 ? 'flex' : 'none';
    }
    
    if (totalNotifications === 0) {
        listContainer.innerHTML = `
            <div class="notification-banner-empty-full">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>No upcoming classes</p>
            </div>
        `;
        return;
    }
    
    let content = '';
    
    // Today's classes section
    if (userTodayClasses.length > 0) {
        content += `
            <div class="notification-banner-section notification-banner-clickable" onclick="navigateToSection('bookings'); closeNotificationBanner();">
                <div class="notification-banner-section-header">
                    <svg class="section-icon-booking" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="16" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>Today's Classes</span>
                    <span class="notification-badge notification-badge-booking">${userTodayClasses.length}</span>
                </div>
                <div class="notification-banner-section-desc">${userTodayClasses.length} ${userTodayClasses.length === 1 ? 'class' : 'classes'} scheduled for today</div>
            </div>
        `;
    }
    
    // Tomorrow's classes section
    if (userTomorrowClasses.length > 0) {
        content += `
            <div class="notification-banner-section notification-banner-clickable" onclick="navigateToSection('bookings'); closeNotificationBanner();">
                <div class="notification-banner-section-header">
                    <svg class="section-icon-booking" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="16" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>Tomorrow's Classes</span>
                    <span class="notification-badge notification-badge-booking">${userTomorrowClasses.length}</span>
                </div>
                <div class="notification-banner-section-desc">${userTomorrowClasses.length} ${userTomorrowClasses.length === 1 ? 'class' : 'classes'} scheduled for tomorrow</div>
            </div>
        `;
    }
    
    listContainer.innerHTML = content;
}

// Check for user's classes today and tomorrow
async function checkUserClassesForNotifications() {
    if (isAdmin) return; // Skip for admin dashboard
    
    try {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        console.log('Checking classes for today:', todayStr, 'tomorrow:', tomorrowStr);
        
        // Get all upcoming classes and filter client-side
        const result = await fetchAPI(API_URL, { action: 'get_upcoming_classes' });
        
        userTodayClasses = [];
        userTomorrowClasses = [];
        
        console.log('API result:', result);
        
        if (result.success && result.classes) {
            console.log('Total classes:', result.classes.length);
            
            // Filter classes for today
            userTodayClasses = result.classes.filter(cls => {
                const bookingDate = cls.booking_date ? cls.booking_date.split('T')[0] : cls.booking_date;
                const match = bookingDate === todayStr;
                if (match) console.log('Found today class:', cls.name);
                return match;
            });
            
            // Filter classes for tomorrow
            userTomorrowClasses = result.classes.filter(cls => {
                const bookingDate = cls.booking_date ? cls.booking_date.split('T')[0] : cls.booking_date;
                const match = bookingDate === tomorrowStr;
                if (match) console.log('Found tomorrow class:', cls.name);
                return match;
            });
        }
        
        console.log('Today classes:', userTodayClasses.length, 'Tomorrow classes:', userTomorrowClasses.length);
        
        // Update notification badge
        const totalClasses = userTodayClasses.length + userTomorrowClasses.length;
        const countBadge = document.getElementById('notification-total-count');
        if (countBadge) {
            countBadge.textContent = totalClasses;
            countBadge.style.display = totalClasses > 0 ? 'flex' : 'none';
        }
        
        // Update the notification list immediately
        updateUserNotificationBannerList();
        
        // Show notification banner if there are classes (only on first load)
        if (totalClasses > 0 && !userInitialCheckComplete) {
            showUserClassNotificationBanner(userTodayClasses.length, userTomorrowClasses.length);
            userInitialCheckComplete = true;
        }
        
    } catch (error) {
        console.error('Error checking user classes:', error);
    }
}

// Start periodic checks for user dashboard
function startUserNotificationChecks() {
    // Initial check
    checkUserClassesForNotifications();
    
    // Periodic checks every 5 minutes
    userNotificationInterval = setInterval(() => {
        checkUserClassesForNotifications();
    }, 300000); // 5 minutes
}

function stopUserNotificationChecks() {
    if (userNotificationInterval) {
        clearInterval(userNotificationInterval);
        userNotificationInterval = null;
    }
}

async function loadNotifications() {
    const container = document.getElementById('notification-list');
    if (!container) return;
    
    const result = await fetchAPI(API_URL, { action: 'get_notifications' });
    if (result.success && result.notifications && result.notifications.length > 0) {
        container.innerHTML = result.notifications.map(n => {
            const iconClass = n.type || 'system';
            const icons = {
                'class': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
                'message': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
                'booking': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
                'system': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            };
            return `<div class="notification-item ${n.is_read ? '' : 'unread'}" id="notification-${n.id}">
                <div class="notification-icon ${iconClass}">${icons[iconClass] || icons.system}</div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-message">${n.message || ''}</div>
                    <div class="notification-time">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${formatDate(n.created_at)}
                    </div>
                </div>
                <button class="notification-delete-btn" onclick="deleteNotification(${n.id})" title="Delete notification">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>`;
        }).join('');
        
        const badge = document.getElementById('notification-badge');
        const unreadCount = result.notifications.filter(n => !n.is_read).length;
        if (badge) {
            badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
            badge.textContent = unreadCount;
        }
    } else {
        container.innerHTML = '<div class="empty-notifications"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><p>No notifications yet</p></div>';
    }
}

// Delete a single notification
async function deleteNotification(notificationId) {
    if (!confirm('Are you sure you want to delete this notification?')) {
        return;
    }
    
    const result = await fetchAPI(API_URL, { action: 'delete_notification', notification_id: notificationId });
    
    if (result.success) {
        // Animate and remove the notification element
        const notificationEl = document.getElementById(`notification-${notificationId}`);
        if (notificationEl) {
            notificationEl.style.transition = 'all 0.3s ease';
            notificationEl.style.opacity = '0';
            notificationEl.style.transform = 'translateX(50px)';
            setTimeout(() => {
                notificationEl.remove();
                
                // Check if there are no more notifications
                const container = document.getElementById('notification-list');
                if (container && container.children.length === 0) {
                    container.innerHTML = '<div class="empty-notifications"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><p>No notifications yet</p></div>';
                }
            }, 300);
        }
        
        showToast('Notification deleted', 'success');
    } else {
        showToast('Failed to delete notification: ' + result.message, 'error');
    }
}

async function refreshNotifications() {
    const container = document.getElementById('notification-list');
    if (container) {
        container.innerHTML = '<div class="empty-notifications"><svg class="pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><p>Refreshing...</p></div>';
    }
    
    await loadNotifications();
    
    showToast('Notifications refreshed', 'info');
}

async function markAllNotificationsRead() {
    const result = await fetchAPI(API_URL, { action: 'mark_notifications_read' });
    if (result.success) {
        showToast('All notifications marked as read');
        loadNotifications();
    }
}

let showBookingWeekViewMode = false;

function showBookingWeekView() {
    showBookingWeekViewMode = !showBookingWeekViewMode;
    const btn = document.getElementById('btn-booking-week-view');
    const weekContainer = document.getElementById('booking-week-view-container');
    const bookingsContainer = document.getElementById('admin-bookings-container');
    
    if (btn) {
        if (showBookingWeekViewMode) {
            btn.classList.add('active');
            loadBookingWeekView();
        } else {
            btn.classList.remove('active');
            if (weekContainer) weekContainer.style.display = 'none';
            if (bookingsContainer) bookingsContainer.style.display = 'block';
        }
    }
}

async function loadBookingWeekView() {
    const weekContainer = document.getElementById('booking-week-view-container');
    const bookingsContainer = document.getElementById('admin-bookings-container');
    
    if (weekContainer) {
        weekContainer.style.display = 'block';
        if (bookingsContainer) bookingsContainer.style.display = 'none';
        
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        let html = '<div class="week-view-container">';
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
            const shortDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const isToday = currentDate.toDateString() === today.toDateString();
            
            const bookingsResult = await fetchAPI(ADMIN_API_URL, { action: 'get_bookings', date: dateStr });
            const dayBookings = bookingsResult.success && bookingsResult.bookings ? bookingsResult.bookings : [];
            
            html += `<div class="week-day-card ${isToday ? 'today' : ''}">`;
            
            // Header with day name and date
            html += `<div class="week-day-header">`;
            html += `<div class="week-day-info">`;
            html += `<div class="week-day-badge">`;
            html += `<span class="day-name">${dayName.substring(0, 3)}</span>`;
            html += `<span class="day-num">${currentDate.getDate()}</span>`;
            html += `</div>`;
            html += `<div class="week-day-details">`;
            html += `<h4>${isToday ? 'Today' : dayName}</h4>`;
            html += `<p>${shortDate}</p>`;
            html += `</div>`;
            html += `</div>`;
            html += `<div class="week-day-count">${dayBookings.length} ${dayBookings.length === 1 ? 'booking' : 'bookings'}</div>`;
            html += `</div>`; // End header
            
            // Bookings list
            html += `<div class="week-day-classes">`;
            
            if (dayBookings.length > 0) {
                const now = new Date();
                dayBookings.forEach(booking => {
                    // Check if class has ended
                    const bookingDate = new Date(dateStr);
                    const [endHour, endMin] = booking.end_time.split(':').map(Number);
                    bookingDate.setHours(endHour, endMin, 0);
                    
                    const hasEnded = now >= bookingDate;
                    const buttonLabel = hasEnded ? 'Ended' : 'Cancel';
                    const buttonClass = hasEnded ? 'btn-secondary' : 'btn-danger';
                    const buttonAction = hasEnded ? '' : `cancelAdminBooking(${booking.id})`;
                    const buttonDisabled = hasEnded ? 'disabled' : '';
                    
                    html += `<div class="class-item">`;
                    html += `<div class="class-time">`;
                    html += `<span class="time">${formatTime(booking.start_time)}</span>`;
                    html += `</div>`;
                    html += `<div class="class-info">`;
                    html += `<div class="class-name">${booking.class_name}</div>`;
                    html += `<div class="class-meta">`;
                    html += `<span class="class-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${booking.full_name}</span>`;
                    html += `</div>`;
                    html += `</div>`;
                    html += `<div class="class-action">`;
                    html += `<span class="badge badge-${booking.status === 'booked' ? 'success' : 'secondary'}">${booking.status}</span>`;
                    html += `<button class="btn btn-sm ${buttonClass}" onclick="${buttonAction}" ${buttonDisabled}>${buttonLabel}</button>`;
                    html += `</div>`;
                    html += `</div>`;
                });
            } else {
                html += `<div class="week-day-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <p>No bookings for this day</p>
                </div>`;
            }
            
            html += `</div>`; // End bookings
            html += `</div>`; // End card
        }
        
        html += '</div>';
        weekContainer.innerHTML = html;
    }
}

async function cancelAdminBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    const result = await fetchAPI(ADMIN_API_URL, { action: 'cancel_booking', booking_id: bookingId });
    if (result.success) {
        showToast(result.message);
        // Remove the booking element from DOM
        const bookingElements = document.querySelectorAll('.booking-row');
        bookingElements.forEach(el => {
            const cancelBtn = el.querySelector('button[onclick*="' + bookingId + '"]');
            if (cancelBtn) {
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.3s ease';
                setTimeout(() => el.remove(), 300);
            }
        });
        // Also remove from week view if open
        if (showBookingWeekViewMode) {
            const weekViewElements = document.querySelectorAll('.class-item');
            weekViewElements.forEach(el => {
                const btn = el.querySelector('button[onclick*="' + bookingId + '"]');
                if (btn) {
                    el.style.opacity = '0';
                    setTimeout(() => el.remove(), 300);
                }
            });
        }
    } else {
        showToast(result.message, 'error');
    }
}

async function loadAdminMemberships() {
    const result = await fetchAPI(ADMIN_API_URL, { action: 'get_memberships' });
    const container = document.getElementById('memberships-table-body');
    
    // Store memberships globally for filtering
    window.allMemberships = result.success && result.memberships ? result.memberships : [];
    window.currentMembershipFilter = 'all';
    window.currentMembershipSearch = '';
    window.currentMembershipStatus = 'all';
    
    // Update filter counts
    updateMembershipFilterCounts();
    
    // Apply filters and render
    renderFilteredMemberships();
}

function updateMembershipFilterCounts() {
    const counts = { all: 0, vip: 0, premium: 0, basic: 0 };
    const memberships = window.allMemberships || [];
    
    memberships.forEach(m => {
        const type = (m.membership_type || '').toLowerCase();
        if (type.includes('vip')) counts.vip++;
        else if (type.includes('premium')) counts.premium++;
        else if (type.includes('basic')) counts.basic++;
    });
    counts.all = memberships.length;
    
    // Update count badges
    const allCount = document.getElementById('count-membership-all');
    const vipCount = document.getElementById('count-membership-vip');
    const premiumCount = document.getElementById('count-membership-premium');
    const basicCount = document.getElementById('count-membership-basic');
    
    if (allCount) allCount.textContent = counts.all;
    if (vipCount) vipCount.textContent = counts.vip;
    if (premiumCount) premiumCount.textContent = counts.premium;
    if (basicCount) basicCount.textContent = counts.basic;
}

function renderFilteredMemberships() {
    const container = document.getElementById('memberships-table-body');
    const memberships = window.allMemberships || [];
    
    // Apply filters
    let filtered = memberships;
    
    // Filter by type
    if (window.currentMembershipFilter && window.currentMembershipFilter !== 'all') {
        filtered = filtered.filter(m => {
            const type = (m.membership_type || '').toLowerCase();
            return type.includes(window.currentMembershipFilter);
        });
    }
    
    // Filter by status
    if (window.currentMembershipStatus && window.currentMembershipStatus !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        filtered = filtered.filter(m => {
            if (window.currentMembershipStatus === 'active') {
                return m.status === 'active';
            } else if (window.currentMembershipStatus === 'inactive') {
                return m.status !== 'active';
            } else if (window.currentMembershipStatus === 'expired') {
                const endDate = new Date(m.end_date);
                return endDate < today;
            }
            return true;
        });
    }
    
    // Filter by search query
    if (window.currentMembershipSearch) {
        const search = window.currentMembershipSearch.toLowerCase();
        filtered = filtered.filter(m => 
            (m.full_name && m.full_name.toLowerCase().includes(search)) ||
            (m.email && m.email.toLowerCase().includes(search)) ||
            (m.membership_type && m.membership_type.toLowerCase().includes(search))
        );
    }
    
    if (filtered.length > 0) {
        container.innerHTML = filtered.map(m => {
            // Determine membership class based on type
            const membershipType = (m.membership_type || '').toLowerCase();
            let cardClass = 'basic';
            let typeIcon = '💎';
            if (membershipType.includes('vip')) {
                cardClass = 'vip';
                typeIcon = '👑';
            } else if (membershipType.includes('premium')) {
                cardClass = 'premium';
                typeIcon = '⭐';
            }
            
            // Calculate duration
            let duration = '';
            if (m.start_date && m.end_date) {
                const start = new Date(m.start_date);
                const end = new Date(m.end_date);
                const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
                if (months >= 12) {
                    duration = (months / 12).toFixed(1).replace(/\.0$/, '') + ' years';
                } else if (months > 0) {
                    duration = months + ' months';
                }
            }
            
            const initials = (m.full_name || '').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '--';
            
            return `
                <div class="admin-membership-card ${cardClass}">
                    <div class="membership-card-header">
                        <div class="membership-type-badge">
                            <span class="type-icon">${typeIcon}</span>
                            <span class="type-text">${m.membership_type || 'Member'}</span>
                        </div>
                        <span class="badge badge-${m.status === 'active' ? 'success' : 'secondary'}">${m.status}</span>
                    </div>
                    <div class="membership-card-body">
                        <div class="member-info">
                            <div class="member-avatar">${initials}</div>
                            <div class="member-details">
                                <div class="member-name">${m.full_name || 'Unknown User'}</div>
                                <div class="member-email">${m.email || ''}</div>
                            </div>
                        </div>
                        <div class="amount-info">
                            <div class="amount-value">${m.amount ? '$' + parseFloat(m.amount).toFixed(2) : '$0.00'}</div>
                            ${duration ? `<div class="amount-duration">${duration}</div>` : ''}
                        </div>
                    </div>
                    <div class="membership-card-footer">
                        <div class="membership-dates">
                            <span class="date-label">Duration</span>
                            <span class="date-range">${formatDate(m.start_date)} → ${formatDate(m.end_date)}</span>
                        </div>
                        <div class="membership-actions">
                            <button class="btn btn-sm btn-secondary" onclick="editMembership(${m.id})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteMembership(${m.id})">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = '<div class="empty-state"><p>No memberships found matching your filters.</p></div>';
    }
}

function filterMemberships() {
    const searchInput = document.getElementById('membership-search');
    window.currentMembershipSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
    renderFilteredMemberships();
}

function filterMembershipsByType(type) {
    window.currentMembershipFilter = type;
    
    // Update active tab
    document.querySelectorAll('.membership-filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === type) {
            tab.classList.add('active');
        }
    });
    
    renderFilteredMemberships();
}

function filterMembershipsByStatus() {
    const statusSelect = document.getElementById('membership-status-filter');
    window.currentMembershipStatus = statusSelect ? statusSelect.value : 'all';
    renderFilteredMemberships();
}

async function saveMembership(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const result = await fetchAPI(ADMIN_API_URL, { action: 'save_membership', ...data });
    if (result.success) {
        showToast(result.message);
        hideModal('membership-modal');
        form.reset();
        loadAdminMemberships();
    } else {
        showToast(result.message, 'error');
    }
}

async function deleteMembership(membershipId) {
    if (!confirm('Are you sure you want to delete this membership?')) return;
    const result = await fetchAPI(ADMIN_API_URL, { action: 'delete_membership', membership_id: membershipId });
    if (result.success) {
        showToast(result.message);
        loadAdminMemberships();
    } else {
        showToast(result.message, 'error');
    }
}

function editMembership(membershipId) {
    // First, load users for the dropdown
    fetchAPI(ADMIN_API_URL, { action: 'get_users_for_membership' }).then(usersResult => {
        const userSelect = document.getElementById('membership-user');
        
        // Populate user dropdown
        if (userSelect && usersResult.success && usersResult.users) {
            // Keep the first placeholder option
            userSelect.innerHTML = '<option value="">Select a user...</option>';
            
            // Add all users as options
            usersResult.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.full_name} (${user.email})`;
                userSelect.appendChild(option);
            });
        }
        
        // Then fetch membership details
        return fetchAPI(ADMIN_API_URL, { action: 'get_memberships', id: membershipId });
    }).then(res => {
        if (res.success && res.memberships) {
            const membership = res.memberships.find(m => m.id === membershipId);
            if (membership) {
                document.getElementById('membership-id').value = membership.id;
                document.getElementById('membership-user').value = membership.user_id;
                document.getElementById('membership-type').value = membership.membership_type;
                document.getElementById('membership-amount').value = membership.amount;
                document.getElementById('membership-start').value = membership.start_date;
                document.getElementById('membership-end').value = membership.end_date;
                document.getElementById('membership-status').value = membership.status;
                document.getElementById('membership-payment').value = membership.payment_status;
                
                // Calculate and set the duration dropdown based on existing membership
                if (membership.start_date && membership.end_date) {
                    const startDate = new Date(membership.start_date);
                    const endDate = new Date(membership.end_date);
                    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
                    
                    // Set the closest matching duration option
                    const durationSelect = document.getElementById('membership-duration');
                    if (durationSelect && monthsDiff > 0) {
                        durationSelect.value = Math.max(1, monthsDiff);
                    }
                }
                
                showModal('membership-modal');
            }
        }
    });
}


function updateEndDateFromDuration() {
    const startDateInput = document.getElementById('membership-start');
    const durationSelect = document.getElementById('membership-duration');
    const endDateInput = document.getElementById('membership-end');
    const amountInput = document.getElementById('membership-amount');
    const typeSelect = document.getElementById('membership-type');
    
    if (!startDateInput || !durationSelect || !endDateInput) return;
    
    const startDate = new Date(startDateInput.value);
    const durationMonths = parseInt(durationSelect.value);
    
    if (!isNaN(startDate.getTime()) && durationMonths > 0) {
        // Calculate end date by adding months to start date
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + durationMonths);
        
        // Format as YYYY-MM-DD
        const year = endDate.getFullYear();
        const month = String(endDate.getMonth() + 1).padStart(2, '0');
        const day = String(endDate.getDate()).padStart(2, '0');
        endDateInput.value = `${year}-${month}-${day}`;
    }
    
    // Also update price based on duration and type
    if (amountInput && typeSelect) {
        calculateMembershipPrice();
    }
}

// Calculate membership price based on type and duration
function calculateMembershipPrice() {
    const typeSelect = document.getElementById('membership-type');
    const durationSelect = document.getElementById('membership-duration');
    const amountInput = document.getElementById('membership-amount');
    
    if (!typeSelect || !durationSelect || !amountInput) return;
    
    const type = typeSelect.value;
    const durationMonths = parseInt(durationSelect.value);
    
    // Base prices per month
    const basePrices = {
        'basic': 30,
        'premium': 50,
        'vip': 80
    };
    
    // Multipliers for longer durations (discounts)
    const multipliers = {
        1: 1.0,   // Full price
        2: 0.98,  // 2% discount
        3: 0.95,  // 5% discount
        6: 0.90,  // 10% discount
        12: 0.85  // 15% discount
    };
    
    const basePrice = basePrices[type] || basePrices['basic'];
    const multiplier = multipliers[durationMonths] || 1.0;
    const price = (basePrice * durationMonths * multiplier).toFixed(2);
    
    amountInput.value = price;
}

async function loadAdminMessages() {
    const container = document.getElementById('messages-container');
    const refreshBtn = document.getElementById('refresh-messages-btn');
    
    // Add loading state to button
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
    }
    
    const result = await fetchAPI(ADMIN_API_URL, { action: 'get_messages', limit: 100 });
    
    // Remove loading state
    if (refreshBtn) {
        refreshBtn.classList.remove('loading');
    }
    
    if (result.success && result.messages && result.messages.length > 0) {
        // Store all messages globally for filtering
        window.allMessages = result.messages;
        window.currentFilter = 'all';
        window.currentSearch = '';
        
        // Calculate counts
        const unreadCount = result.messages.filter(m => m.status !== 'read' && m.status !== 'replied').length;
        const readCount = result.messages.filter(m => m.status === 'read').length;
        const repliedCount = result.messages.filter(m => m.status === 'replied').length;
        
        // Update filter counts
        updateFilterCounts(result.messages.length, unreadCount, readCount, repliedCount);
        
        // Render messages
        renderMessages(result.messages);
    } else if (container) {
        container.innerHTML = `
            <div class="messages-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <h3>No Messages Yet</h3>
                <p>You haven't received any messages from users or visitors yet.</p>
            </div>
        `;
        
        // Update filter counts to show zeros
        updateFilterCounts(0, 0, 0, 0);
    }
}

function updateFilterCounts(total, unread, read, replied) {
    const countAll = document.getElementById('count-all');
    const countUnread = document.getElementById('count-unread');
    const countRead = document.getElementById('count-read');
    const countReplied = document.getElementById('count-replied');
    
    if (countAll) countAll.textContent = total;
    if (countUnread) countUnread.textContent = unread;
    if (countRead) countRead.textContent = read;
    if (countReplied) countReplied.textContent = replied;
}

function renderMessages(messages) {
    const container = document.getElementById('messages-container');
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="messages-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <h3>No Messages Found</h3>
                <p>No messages match your current filter or search criteria.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="messages-cards-container">
            ${messages.map((msg, index) => renderMessageCard(msg, index)).join('')}
        </div>
    `;
}

function renderMessageCard(msg, index) {
    const initials = (msg.name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    const statusClass = msg.status === 'replied' ? 'replied' : (msg.status === 'read' ? 'read' : 'unread');
    const statusLabel = msg.status === 'replied' ? 'Replied' : (msg.status === 'read' ? 'Read' : 'New');
    const timeAgo = getTimeAgo(msg.created_at);
    
    return `
        <div class="message-card-modern ${statusClass}" onclick="viewAdminMessage(${msg.id})" style="animation-delay: ${index * 0.05}s">
            <div class="message-card-avatar">
                <span class="avatar-initials">${initials}</span>
                <span class="status-dot ${statusClass}"></span>
            </div>
            <div class="message-card-content">
                <div class="message-card-header">
                    <div class="message-sender-info">
                        <span class="message-sender-name">${escapeHtml(msg.name)}</span>
                        <span class="message-sender-email">${escapeHtml(msg.email)}</span>
                    </div>
                    <div class="message-meta-right">
                        <span class="message-time">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            ${timeAgo}
                        </span>
                        <span class="message-status-badge ${statusClass.toLowerCase()}">${statusLabel}</span>
                    </div>
                </div>
                <div class="message-card-subject">
                    <span class="priority-indicator ${msg.status !== 'read' ? '' : 'normal'}"></span>
                    ${escapeHtml(msg.subject || 'No Subject')}
                </div>
                <div class="message-card-preview">${escapeHtml(msg.message.substring(0, 150))}${msg.message.length > 150 ? '...' : ''}</div>
                <div class="message-card-actions">
                    <button class="message-action-btn" onclick="event.stopPropagation(); viewAdminMessage(${msg.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                    </button>
                    <button class="message-action-btn danger" onclick="event.stopPropagation(); deleteMessageFromList(${msg.id}, event)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getTimeAgo(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d ago`;
    } else {
        return formatDate(dateString);
    }
}

function filterMessages(filter) {
    window.currentFilter = filter;
    
    // Update active tab
    document.querySelectorAll('.message-filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });
    
    // Filter messages
    applyFilters();
}

function searchMessages(query) {
    window.currentSearch = query.toLowerCase().trim();
    applyFilters();
}

function clearMessageSearch() {
    const searchInput = document.getElementById('message-search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    window.currentSearch = '';
    applyFilters();
}

function applyFilters() {
    if (!window.allMessages) return;
    
    let filteredMessages = window.allMessages;
    
    // Apply status filter
    if (window.currentFilter === 'unread') {
        filteredMessages = filteredMessages.filter(m => m.status !== 'read' && m.status !== 'replied');
    } else if (window.currentFilter === 'read') {
        filteredMessages = filteredMessages.filter(m => m.status === 'read');
    } else if (window.currentFilter === 'replied') {
        filteredMessages = filteredMessages.filter(m => m.status === 'replied');
    }
    
    // Apply search filter
    if (window.currentSearch) {
        filteredMessages = filteredMessages.filter(m => 
            (m.name && m.name.toLowerCase().includes(window.currentSearch)) ||
            (m.email && m.email.toLowerCase().includes(window.currentSearch)) ||
            (m.subject && m.subject.toLowerCase().includes(window.currentSearch)) ||
            (m.message && m.message.toLowerCase().includes(window.currentSearch))
        );
    }
    
    // Render filtered messages
    renderMessages(filteredMessages);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function deleteMessageFromList(messageId, event) {
    // Stop propagation to prevent opening the message
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
        return;
    }
    
    fetchAPI(ADMIN_API_URL, {
        action: 'delete_message',
        message_id: messageId
    }).then(result => {
        if (result.success) {
            showToast('Message deleted successfully');
            
            // Remove from allMessages
            if (window.allMessages) {
                window.allMessages = window.allMessages.filter(m => m.id !== messageId);
                
                // Recalculate counts
                const unreadCount = window.allMessages.filter(m => m.status !== 'read' && m.status !== 'replied').length;
                const readCount = window.allMessages.filter(m => m.status === 'read').length;
                const repliedCount = window.allMessages.filter(m => m.status === 'replied').length;
                updateFilterCounts(window.allMessages.length, unreadCount, readCount, repliedCount);
                
                // Reapply filters to update the view
                applyFilters();
                loadMessageCountForBadge();
            }
        } else {
            showToast('Failed to delete message: ' + result.message, 'error');
        }
    });
}

async function deleteMessageFromList(messageId, event) {
    // Stop propagation to prevent opening the message
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
        return;
    }
    
    const result = await fetchAPI(ADMIN_API_URL, {
        action: 'delete_message',
        message_id: messageId
    });
    
    if (result.success) {
        showToast('Message deleted successfully');
        
        // Remove the message row from the DOM with animation
        const messageRow = document.querySelector(`.message-row button[onclick*="deleteMessageFromList(${messageId}"]`)?.closest('.message-row');
        if (messageRow) {
            messageRow.style.transition = 'all 0.3s ease';
            messageRow.style.opacity = '0';
            messageRow.style.transform = 'translateX(100px)';
            setTimeout(() => {
                messageRow.remove();
                // Refresh the message list to update counts
                loadAdminMessages();
                loadMessageCountForBadge();
            }, 300);
        } else {
            // Fallback - just reload the messages
            loadAdminMessages();
            loadMessageCountForBadge();
        }
    } else {
        showToast('Failed to delete message: ' + result.message, 'error');
    }
}

// Auto-refresh messages - consolidated interval
let messagesAutoRefreshInterval = null;

function startMessagesAutoRefresh() {
    // Clear any existing intervals to prevent duplicates
    stopMessagesAutoRefresh();
    
    // Use a single interval for messages and badge count
    messagesAutoRefreshInterval = setInterval(() => {
        const messagesSection = document.getElementById('messages-section');
        if (messagesSection && messagesSection.classList.contains('active')) {
            loadAdminMessages();
        }
        // Always update badge count
        loadMessageCountForBadge();
    }, 5000); // 5 second interval for balance between responsiveness and performance
}

function stopMessagesAutoRefresh() {
    if (messagesAutoRefreshInterval) {
        clearInterval(messagesAutoRefreshInterval);
        messagesAutoRefreshInterval = null;
    }
}

function viewAdminMessage(messageId) {
    fetchAPI(ADMIN_API_URL, { action: 'get_messages', id: messageId }).then(res => {
        if (res.success && res.messages && res.messages.length > 0) {
            const msg = res.messages[0];
            
            // Populate message details
            document.getElementById('msg-from').textContent = msg.name;
            document.getElementById('msg-email').textContent = msg.email;
            document.getElementById('msg-subject').textContent = msg.subject;
            document.getElementById('msg-date').textContent = formatDate(msg.created_at);
            
            // Status badge
            const statusEl = document.getElementById('msg-status');
            statusEl.innerHTML = `<span class="badge badge-${msg.status === 'read' ? 'success' : (msg.status === 'replied' ? 'info' : 'warning')}">${msg.status}</span>`;
            
            // Message body
            document.getElementById('msg-body').textContent = msg.message || msg.message_text;
            
            // Set up reply form
            document.getElementById('reply-message-id').value = msg.id;
            document.getElementById('reply-to-email').value = msg.email;
            document.getElementById('reply-to').value = msg.email;
            document.getElementById('reply-subject').value = 'Re: ' + (msg.subject || 'No Subject');
            document.getElementById('reply-body').value = '';
            
            // Mark as read
            fetchAPI(ADMIN_API_URL, { action: 'update_message', id: messageId, status: 'read' });
            
            // Show modal
            showModal('message-modal');
        } else {
            showToast('Failed to load message details', 'error');
        }
    });
}

async function sendMessageReply(event) {
    event.preventDefault();
    
    const messageId = document.getElementById('reply-message-id').value;
    const toEmail = document.getElementById('reply-to-email').value;
    const subject = document.getElementById('reply-subject').value;
    const replyBody = document.getElementById('reply-body').value;
    
    const result = await fetchAPI(ADMIN_API_URL, {
        action: 'reply_message',
        message_id: messageId,
        to_email: toEmail,
        subject: subject,
        reply: replyBody
    });
    
    if (result.success) {
        showToast('Reply sent successfully!');
        
        // Update message status to replied
        fetchAPI(ADMIN_API_URL, { action: 'update_message', id: messageId, status: 'replied' });
        
        hideModal('message-modal');
        loadAdminMessages();
        loadMessageCountForBadge();
    } else {
        showToast('Failed to send reply: ' + result.message, 'error');
    }
}

async function deleteAdminMessage() {
    const messageId = document.getElementById('reply-message-id').value;
    
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
        return;
    }
    
    const result = await fetchAPI(ADMIN_API_URL, {
        action: 'delete_message',
        message_id: messageId
    });
    
    if (result.success) {
        showToast('Message deleted successfully');
        hideModal('message-modal');
        loadAdminMessages();
        loadMessageCountForBadge();
    } else {
        showToast('Failed to delete message: ' + result.message, 'error');
    }
}

async function loadMessages(page = 1, search = '') {
    const result = await fetchAPI(ADMIN_API_URL, { action: 'get_messages', limit: 10, offset: (page - 1) * 10, search: search });
    const container = document.getElementById('messages-list');
    if (result.success && result.messages && result.messages.length > 0) {
        container.innerHTML = '<div class="admin-messages-container">' + result.messages.map(msg => `<div class="message-item" onclick="viewMessage(${msg.id})"><div class="message-header"><div class="message-from">${msg.name} (${msg.email})</div><div class="message-date">${formatDate(msg.created_at)}</div></div><div class="message-subject">${msg.subject}</div><div class="message-preview">${msg.message.substring(0, 100)}...</div><div class="message-status"><span class="badge badge-${msg.status === 'read' ? 'success' : 'warning'}">${msg.status}</span></div></div>`).join('') + '</div>';
    } else if (container) {
        container.innerHTML = '<div class="empty-state"><p>No messages found.</p></div>';
    }
}

function viewMessage(messageId) {
    fetchAPI(ADMIN_API_URL, { action: 'get_messages', id: messageId }).then(res => {
        if (res.success && res.messages) {
            const msg = res.messages.find(m => m.id === messageId);
            if (msg) {
                document.getElementById('message-content').innerHTML = `<div class="message-detail"><div class="message-header"><strong>From:</strong> ${msg.name} (${msg.email})</div><div class="message-header"><strong>Subject:</strong> ${msg.subject}</div><div class="message-header"><strong>Date:</strong> ${formatDate(msg.created_at)}</div><hr><div class="message-body">${msg.message}</div></div>`;
                
                // Mark as read
                fetchAPI(ADMIN_API_URL, { action: 'update_message', id: messageId, status: 'read' });
                
                showModal('message-modal');
            }
        }
    });
}

function refreshMessages() {
    loadMessages();
}

// Export functions for use in HTML onload handlers
window.initUserDashboard = initUserDashboard;
window.initAdminDashboard = initAdminDashboard;

// Export notification banner functions for global use
window.toggleNotificationBanner = toggleNotificationBanner;
window.closeNotificationBanner = closeNotificationBanner;
window.openNotificationBannerFromBanner = openNotificationBannerFromBanner;
window.navigateToBookingsFromNotification = navigateToBookingsFromNotification;
window.navigateToMessagesAndMarkRead = navigateToMessagesAndMarkRead;
window.navigateToBookingsAndClear = navigateToBookingsAndClear;
window.dismissNewNotificationBanner = dismissNewNotificationBanner;
window.refreshNotificationBanner = refreshNotificationBanner;
window.updateNotificationBannerList = updateNotificationBannerList;

// Global click handler to close dropdowns when clicking anywhere on screen
document.addEventListener('click', function(e) {
    const userDropdown = document.getElementById('user-dropdown');
    const notificationMenu = document.getElementById('notification-menu');
    const userMenu = document.querySelector('.user-menu');
    const notificationBtn = document.querySelector('.notification-banner-trigger');
    const notificationDropdown = document.getElementById('notification-banner-dropdown');
    
    // Close user dropdown if clicking outside
    if (userDropdown && userDropdown.classList.contains('active')) {
        if (!userMenu || !userMenu.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    }
    
    // Close notification dropdown if clicking outside (for user dashboard new banner)
    if (notificationDropdown && notificationDropdown.classList.contains('active')) {
        if (!notificationBtn || !notificationBtn.contains(e.target)) {
            if (!notificationDropdown.contains(e.target)) {
                notificationDropdown.classList.remove('active');
            }
        }
    }
    
    // Close notification dropdown if clicking inside notification menu
    if (notificationMenu && notificationMenu.classList.contains('active')) {
        if (!notificationBtn || !notificationBtn.contains(e.target)) {
            if (!notificationMenu.contains(e.target)) {
                notificationMenu.classList.remove('active');
            }
        }
    }
});

// Close modal when clicking on the overlay (outside the modal content)
document.addEventListener('click', function(e) {
    // Check if clicked element is a modal overlay
    if (e.target.classList.contains('modal-overlay')) {
        const modalId = e.target.id;
        hideModal(modalId);
    }
});

// ==========================================
// Admin Notification Banner System
// ==========================================

let lastMessageCount = 0;
let lastBookingCount = 0;
let previousMessageCount = 0;
let previousBookingCount = 0;
let notificationBannerInterval = null;

// Refresh notification banner (works for both admin and user dashboards)
function refreshNotificationBanner(event) {
    if (event) {
        event.stopPropagation();
    }
    
    const listContainer = document.getElementById('notification-banner-list');
    const refreshBtn = document.querySelector('.notification-refresh-btn');
    
    if (refreshBtn) {
        refreshBtn.classList.add('loading');
    }
    
    if (listContainer) {
        listContainer.innerHTML = `
            <div class="notification-refreshing">
                <svg class="pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"/>
                </svg>
                <span>Refreshing...</span>
            </div>
        `;
    }
    
    if (isAdmin) {
        // Admin dashboard: refresh messages and bookings
        
        // Store previous counts before checking
        previousMessageCount = lastMessageCount;
        previousBookingCount = lastBookingCount;
        
        // Check both messages and bookings
        Promise.all([checkForNewMessages(false), checkForNewBookings(false)]).then(() => {
            if (refreshBtn) {
                refreshBtn.classList.remove('loading');
            }
            updateNotificationBannerList();
            
            // Check if there are new notifications
            const newMessages = lastMessageCount - previousMessageCount;
            const newBookings = lastBookingCount - previousBookingCount;
            
            if (newMessages > 0 || newBookings > 0) {
                showNewNotificationBanner();
            } else if (listContainer) {
                // Even if no new notifications, show current state
                updateNotificationBannerList();
            }
        });
    } else {
        // User dashboard: refresh class notifications
        checkUserClassesForNotifications().then(() => {
            if (refreshBtn) {
                refreshBtn.classList.remove('loading');
            }
        showToast('Class schedule refreshed', 'info');
        });
    }
}

// Clear all notifications
async function clearNotifications(event) {
    if (event) {
        event.stopPropagation();
    }
    
    // Confirm before clearing
    if (!confirm('Are you sure you want to clear all notifications?')) {
        return;
    }
    
    const clearBtn = event ? event.currentTarget : document.querySelector('.notification-refresh-btn:last-child');
    if (clearBtn) {
        clearBtn.classList.add('loading');
    }
    
    const listContainer = document.getElementById('notification-banner-list');
    const countBadge = document.getElementById('notification-total-count');
    
    try {
        if (isAdmin) {
            // For admin: mark all messages as read and clear local counts
            const result = await fetchAPI(ADMIN_API_URL, { action: 'mark_all_read' });
            
            if (result.success) {
                // Clear local counts
                lastMessageCount = 0;
                lastBookingCount = 0;
                
                // Update the notification list
                if (listContainer) {
                    listContainer.innerHTML = `
                        <div class="notification-banner-empty-full">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                            <p>All notifications cleared</p>
                        </div>
                    `;
                }
                
                // Update badge
                if (countBadge) {
                    countBadge.textContent = '0';
                    countBadge.style.display = 'none';
                }
                
                showToast('All notifications cleared', 'success');
            } else {
                showToast('Failed to clear notifications', 'error');
            }
        } else {
            // For user: clear class notification counts
            userTodayClasses = [];
            userTomorrowClasses = [];
            
            if (listContainer) {
                listContainer.innerHTML = `
                    <div class="notification-banner-empty-full">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        <p>No upcoming classes</p>
                    </div>
                `;
            }
            
            if (countBadge) {
                countBadge.textContent = '0';
                countBadge.style.display = 'none';
            }
            
            showToast('Class notifications cleared', 'success');
        }
    } catch (error) {
        console.error('Error clearing notifications:', error);
        showToast('Error clearing notifications', 'error');
    }
    
    if (clearBtn) {
        clearBtn.classList.remove('loading');
    }
}

function updateNotificationBannerList() {
    const listContainer = document.getElementById('notification-banner-list');
    const countBadge = document.getElementById('notification-total-count');
    if (!listContainer) return;
    
    const totalMessages = lastMessageCount;
    const totalBookings = lastBookingCount;
    const totalNotifications = totalMessages + totalBookings;
    
    // Update count badge
    if (countBadge) {
        countBadge.textContent = totalNotifications;
        countBadge.style.display = totalNotifications > 0 ? 'flex' : 'none';
    }
    
    if (totalNotifications === 0) {
        listContainer.innerHTML = `
            <div class="notification-banner-empty-full">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>No new notifications</p>
            </div>
        `;
        return;
    }
    
    let content = '';
    
    // Messages section (clickable)
    if (totalMessages > 0) {
        content += `
            <div class="notification-banner-section notification-banner-clickable" onclick="navigateToMessagesAndMarkRead()">
                <div class="notification-banner-section-header">
                    <svg class="section-icon-message" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>Messages</span>
                    <span class="notification-badge notification-badge-message">${totalMessages}</span>
                </div>
                <div class="notification-banner-section-desc">${totalMessages} ${totalMessages === 1 ? 'unread message' : 'unread messages'}</div>
            </div>
        `;
    }
    
    // Bookings section (clickable)
    if (totalBookings > 0) {
        content += `
            <div class="notification-banner-section notification-banner-clickable" onclick="navigateToBookingsAndClear()">
                <div class="notification-banner-section-header">
                    <svg class="section-icon-booking" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="16" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>Bookings</span>
                    <span class="notification-badge notification-badge-booking">${totalBookings}</span>
                </div>
                <div class="notification-banner-section-desc">${totalBookings} ${totalBookings === 1 ? 'new booking for today' : 'new bookings for today'}</div>
            </div>
        `;
    }
    
    listContainer.innerHTML = content;
}

async function checkForNewMessages(showBanner = true) {
    if (!isAdmin) return;
    
    try {
        const result = await fetchAPI(ADMIN_API_URL, { action: 'get_message_count' });
        if (result.success) {
            previousMessageCount = lastMessageCount;
            lastMessageCount = result.count || 0;
            
            // Update the count badge
            const countBadge = document.getElementById('notification-total-count');
            if (countBadge) {
                const total = lastMessageCount + lastBookingCount;
                countBadge.textContent = total;
                countBadge.style.display = total > 0 ? 'flex' : 'none';
            }
            
            // Show banner if new messages arrived
            if (showBanner && lastMessageCount > previousMessageCount) {
                showNewNotificationBanner();
            }
        }
    } catch (error) {
        console.error('Error checking for new messages:', error);
    }
}

async function checkForNewBookings(showBanner = true) {
    if (!isAdmin) return;
    
    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const result = await fetchAPI(ADMIN_API_URL, { action: 'get_bookings', date: dateStr });
        
        if (result.success && result.bookings) {
            previousBookingCount = lastBookingCount;
            lastBookingCount = result.bookings.filter(b => b.status === 'booked').length;
            
            // Update the count badge
            const countBadge = document.getElementById('notification-total-count');
            if (countBadge) {
                const total = lastMessageCount + lastBookingCount;
                countBadge.textContent = total;
                countBadge.style.display = total > 0 ? 'flex' : 'none';
            }
            
            // Show banner if new bookings arrived
            if (showBanner && lastBookingCount > previousBookingCount) {
                showNewNotificationBanner();
            }
        }
    } catch (error) {
        console.error('Error checking for new bookings:', error);
    }
}

function showNewNotificationBanner() {
    const banner = document.getElementById('new-notification-banner');
    const textEl = document.getElementById('new-notification-text');
    if (!banner || !textEl) return;
    
    const newMessages = lastMessageCount - previousMessageCount;
    const newBookings = lastBookingCount - previousBookingCount;
    const totalNew = newMessages + newBookings;
    
    if (totalNew <= 0) return;
    
    let text = '';
    if (newMessages > 0 && newBookings > 0) {
        text = `${newMessages} new ${newMessages === 1 ? 'message' : 'messages'} and ${newBookings} new ${newBookings === 1 ? 'booking' : 'bookings'}!`;
    } else if (newMessages > 0) {
        text = `${newMessages} new ${newMessages === 1 ? 'message' : 'messages'} received!`;
    } else if (newBookings > 0) {
        text = `${newBookings} new ${newBookings === 1 ? 'booking' : 'bookings'} for today!`;
    }
    
    textEl.textContent = text;
    banner.style.display = 'flex';
    setTimeout(() => {
        banner.classList.add('active');
    }, 10);
    
    // Auto dismiss after 8 seconds
    setTimeout(() => {
        banner.classList.remove('active');
        setTimeout(() => {
            banner.style.display = 'none';
        }, 300);
    }, 8000);
}

function startNotificationBannerChecks() {
    // Initial check
    checkForNewMessages();
    checkForNewBookings();
    
    // Store initial counts as previous after 1 second
    setTimeout(() => {
        previousMessageCount = lastMessageCount;
        previousBookingCount = lastBookingCount;
    }, 1000);
    
    // Periodic checks every 15 seconds
    notificationBannerInterval = setInterval(() => {
        checkForNewMessages();
        checkForNewBookings();
    }, 15000);
}

function stopNotificationBannerChecks() {
    if (notificationBannerInterval) {
        clearInterval(notificationBannerInterval);
        notificationBannerInterval = null;
    }
}

// ==========================================
// Modern Progress Page Functions
// ==========================================

// Progress chart data storage
let progressChartData = {
    labels: [],
    weight: [],
    bodyFat: [],
    muscleMass: []
};

// Load and render progress chart
async function loadProgressChart() {
    const container = document.getElementById('progress-chart-container');
    const noDataEl = document.getElementById('chart-no-data');
    
    // Fetch progress data
    const result = await fetchAPI(API_URL, { action: 'get_progress' });
    
    if (result.success && result.progress && result.progress.length > 0) {
        // Process data for chart
        const sortedProgress = result.progress.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        progressChartData.labels = sortedProgress.map(p => formatDate(p.created_at));
        progressChartData.weight = sortedProgress.map(p => p.weight || null);
        progressChartData.bodyFat = sortedProgress.map(p => p.body_fat_percentage || null);
        progressChartData.muscleMass = sortedProgress.map(p => p.muscle_mass || null);
        
        // Render chart
        if (container) {
            container.innerHTML = renderSimpleChart();
        }
        
        // Hide no-data message, show chart
        if (noDataEl) {
            noDataEl.style.display = 'none';
        }
        if (container) {
            container.style.display = 'block';
        }
        
        // Update stats
        updateProgressStats(sortedProgress);
    } else if (container && noDataEl) {
        // Show no-data message when there's no progress data
        container.innerHTML = '';
        container.style.display = 'none';
        noDataEl.style.display = 'flex';
    }
}

// Render simple line chart using CSS/SVG
function renderSimpleChart() {
    const weightData = progressChartData.weight.filter(v => v !== null);
    const bodyFatData = progressChartData.bodyFat.filter(v => v !== null);
    
    if (weightData.length === 0 && bodyFatData.length === 0) {
        return '';
    }
    
    // Find min/max values with proper padding
    const allWeights = weightData.filter(v => v !== null);
    const allBodyFat = bodyFatData.filter(v => v !== null);
    
    const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) + 5 : 100;
    const minWeight = allWeights.length > 0 ? Math.min(...allWeights) - 5 : 50;
    const weightRange = maxWeight - minWeight || 1;
    
    const maxBodyFat = allBodyFat.length > 0 ? Math.max(...allBodyFat) + 2 : 30;
    const minBodyFat = allBodyFat.length > 0 ? Math.min(...allBodyFat) - 2 : 10;
    const bodyFatRange = maxBodyFat - minBodyFat || 1;
    
    const height = 200;
    const width = 600; // Increased width for better aspect ratio
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Generate weight line path
    let weightPath = '';
    let weightPoints = [];
    progressChartData.weight.forEach((val, i) => {
        if (val !== null) {
            const x = padding + (i / Math.max(progressChartData.labels.length - 1, 1)) * chartWidth;
            const y = padding + (1 - (val - minWeight) / weightRange) * chartHeight;
            // Clamp y to stay within viewBox
            const clampedY = Math.max(padding, Math.min(height - padding, y));
            weightPoints.push({ x, y: clampedY, val, label: progressChartData.labels[i] });
        }
    });
    
    if (weightPoints.length > 1) {
        weightPath = 'M ' + weightPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
    } else if (weightPoints.length === 1) {
        weightPath = `M ${weightPoints[0].x.toFixed(1)},${weightPoints[0].y.toFixed(1)}`;
    }
    
    // Generate body fat line path
    let bodyFatPath = '';
    let bodyFatPoints = [];
    progressChartData.bodyFat.forEach((val, i) => {
        if (val !== null) {
            const x = padding + (i / Math.max(progressChartData.labels.length - 1, 1)) * chartWidth;
            const y = padding + (1 - (val - minBodyFat) / bodyFatRange) * chartHeight;
            // Clamp y to stay within viewBox
            const clampedY = Math.max(padding, Math.min(height - padding, y));
            bodyFatPoints.push({ x, y: clampedY, val });
        }
    });
    
    if (bodyFatPoints.length > 1) {
        bodyFatPath = 'M ' + bodyFatPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
    } else if (bodyFatPoints.length === 1) {
        bodyFatPath = `M ${bodyFatPoints[0].x.toFixed(1)},${bodyFatPoints[0].y.toFixed(1)}`;
    }
    
    return `
        <div class="chart-wrapper">
            <div class="chart-svg-container">
                <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="progress-chart">
                    <!-- Grid lines -->
                    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#e0e0e0" stroke-width="1"/>
                    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#e0e0e0" stroke-width="1"/>
                    
                    <!-- Y-axis labels -->
                    <text x="${padding - 5}" y="${padding}" fill="#666" font-size="10" text-anchor="end" dominant-baseline="middle">${maxWeight.toFixed(0)}</text>
                    <text x="${padding - 5}" y="${height - padding}" fill="#666" font-size="10" text-anchor="end" dominant-baseline="middle">${minWeight.toFixed(0)}</text>
                    
                    <!-- Weight line -->
                    ${weightPath ? `<path d="${weightPath}" fill="none" stroke="#81F7E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
                    
                    <!-- Body fat line -->
                    ${bodyFatPath ? `<path d="${bodyFatPath}" fill="none" stroke="#FF6B6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
                    
                    <!-- Data points -->
                    ${weightPoints.map(p => `
                        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#81F7E5" class="chart-dot">
                            <title>${p.label}: ${p.val} kg</title>
                        </circle>
                    `).join('')}
                    
                    ${bodyFatPoints.map(p => {
                        const labelIndex = progressChartData.bodyFat.indexOf(p.val);
                        return `
                        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#FF6B6B" class="chart-dot">
                            <title>${progressChartData.labels[labelIndex]}: ${p.val}%</title>
                        </circle>
                    `}).join('')}
                </svg>
            </div>
            <div class="chart-legend">
                <div class="legend-item">
                    <span class="legend-color" style="background: #81F7E5;"></span>
                    <span>Weight (kg)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #FF6B6B;"></span>
                    <span>Body Fat (%)</span>
                </div>
            </div>
        </div>
    `;
}

// Update progress statistics
function updateProgressStats(sortedProgress) {
    if (sortedProgress.length === 0) return;
    
    const latest = sortedProgress[sortedProgress.length - 1];
    const first = sortedProgress[0];
    
    // Weight change
    const weightChange = latest.weight && first.weight ? (latest.weight - first.weight).toFixed(1) : null;
    const weightChangeEl = document.getElementById('weight-change');
    if (weightChangeEl) {
        if (weightChange !== null) {
            weightChangeEl.textContent = (weightChange > 0 ? '+' : '') + weightChange + ' kg';
            weightChangeEl.className = 'stat-change ' + (weightChange <= 0 ? 'up' : 'down');
        } else {
            weightChangeEl.textContent = '--';
            weightChangeEl.className = 'stat-change';
        }
    }
    
    // Body fat change
    const bodyFatChange = latest.body_fat_percentage && first.body_fat_percentage ? (latest.body_fat_percentage - first.body_fat_percentage).toFixed(1) : null;
    const bodyFatChangeEl = document.getElementById('bodyfat-change');
    if (bodyFatChangeEl) {
        if (bodyFatChange !== null) {
            bodyFatChangeEl.textContent = (bodyFatChange > 0 ? '+' : '') + bodyFatChange + '%';
            bodyFatChangeEl.className = 'stat-change ' + (bodyFatChange <= 0 ? 'up' : 'down');
        } else {
            bodyFatChangeEl.textContent = '--';
            bodyFatChangeEl.className = 'stat-change';
        }
    }
    
    // Total records
    const totalRecordsEl = document.getElementById('total-records');
    if (totalRecordsEl) {
        totalRecordsEl.textContent = sortedProgress.length;
    }
    
    // Days tracked
    const firstDate = new Date(first.created_at);
    const lastDate = new Date(latest.created_at);
    const daysTracked = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const daysTrackedEl = document.getElementById('days-tracked');
    if (daysTrackedEl) {
        daysTrackedEl.textContent = daysTracked + ' days';
    }
}

// Load progress goals from API and populate form
async function loadProgressGoals() {
    const targetWeightInput = document.getElementById('target-weight');
    const targetBodyFatInput = document.getElementById('target-bodyfat');
    
    const result = await fetchAPI(API_URL, { action: 'get_goals' });
    
    if (result.success && result.goals) {
        if (targetWeightInput && result.goals.target_weight) {
            targetWeightInput.value = result.goals.target_weight;
        }
        if (targetBodyFatInput && result.goals.target_body_fat) {
            targetBodyFatInput.value = result.goals.target_body_fat;
        }
    }
    
    // Also update goal progress display
    await updateGoalProgress();
}

// Save progress goals
async function saveProgressGoals(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const result = await fetchAPI(API_URL, { action: 'update_goals', ...data });
    
    if (result.success) {
        showToast('Goals updated successfully!');
        hideModal('goals-modal');
        loadProgressGoals();
    } else {
        showToast(result.message, 'error');
    }
}

// Export progress data as CSV
function exportProgressData() {
    const result = window.allProgressData || [];
    if (result.length === 0) {
        showToast('No progress data to export', 'warning');
        return;
    }
    
    let csv = 'Date,Weight (kg),Body Fat (%),Muscle Mass (kg),Waist (cm),Notes\n';
    result.forEach(p => {
        csv += `${p.created_at},${p.weight || ''},${p.body_fat_percentage || ''},${p.muscle_mass || ''},${p.waist || ''},${(p.notes || '').replace(/,/g, ';')}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Progress data exported successfully!');
}

// Initialize progress page
async function initProgressPage() {
    await loadProgressChart();
    await loadProgressHistory();
    await loadProgressGoals();
}

// Export for global use
window.initProgressPage = initProgressPage;
window.loadProgressChart = loadProgressChart;
window.loadProgressGoals = loadProgressGoals;
window.saveProgressGoals = saveProgressGoals;
window.exportProgressData = exportProgressData;

// ==========================================
// Progress Page Missing Functions
// ==========================================

// Add quick progress record
async function addQuickProgress(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const result = await fetchAPI(API_URL, { action: 'add_progress', ...data });
    
    if (result.success) {
        showToast('Progress record added successfully!');
        form.reset();
        loadRecentProgress();
        loadProgressHistory();
        loadProgressChart();
        updateGoalProgress();
    } else {
        showToast(result.message, 'error');
    }
}

// Save goals
async function saveGoals(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const result = await fetchAPI(API_URL, { action: 'update_goals', ...data });
    
    if (result.success) {
        showToast('Goals updated successfully!');
        updateGoalProgress();
    } else {
        showToast(result.message, 'error');
    }
}

// Update goal progress display
async function updateGoalProgress() {
    console.log('updateGoalProgress - START');
    
    // Get target values from form inputs
    const targetWeightInput = document.getElementById('target-weight');
    const targetBodyFatInput = document.getElementById('target-bodyfat');
    
    let targetWeight = targetWeightInput ? parseFloat(targetWeightInput.value) || 0 : 0;
    let targetBodyFat = targetBodyFatInput ? parseFloat(targetBodyFatInput.value) || 0 : 0;
    
    console.log('updateGoalProgress - targetWeight:', targetWeight, 'targetBodyFat:', targetBodyFat);
    
    // If targets not in form, fetch from API
    if (targetWeight === 0 && targetBodyFat === 0) {
        const goalsResult = await fetchAPI(API_URL, { action: 'get_goals' });
        
        if (goalsResult.success && goalsResult.goals) {
            targetWeight = parseFloat(goalsResult.goals.target_weight) || 0;
            targetBodyFat = parseFloat(goalsResult.goals.target_body_fat) || 0;
            
            // Update form inputs if values exist
            if (targetWeightInput && targetWeight > 0) targetWeightInput.value = targetWeight;
            if (targetBodyFatInput && targetBodyFat > 0) targetBodyFatInput.value = targetBodyFat;
            
            console.log('updateGoalProgress - fetched from API, targetWeight:', targetWeight, 'targetBodyFat:', targetBodyFat);
        }
    }
    
    // Get current progress
    const result = await fetchAPI(API_URL, { action: 'get_progress' });
    
    // Get DOM elements
    const progressFill = document.getElementById('goal-progress-fill');
    const progressText = document.getElementById('goal-percentage-text');
    const goalRemaining = document.getElementById('goal-remaining');
    const goalProgressValue = document.getElementById('goal-progress');
    const goalStatusEl = document.getElementById('goal-status');
    
    console.log('updateGoalProgress - DOM elements:', {
        progressFill: !!progressFill,
        progressText: !!progressText,
        goalRemaining: !!goalRemaining,
        goalProgressValue: !!goalProgressValue,
        goalStatusEl: !!goalStatusEl
    });
    
    // Check if goals are set
    const hasWeightGoal = targetWeight > 0;
    const hasBodyFatGoal = targetBodyFat > 0;
    const hasAnyGoal = hasWeightGoal || hasBodyFatGoal;
    
    console.log('updateGoalProgress - hasWeightGoal:', hasWeightGoal, 'hasBodyFatGoal:', hasBodyFatGoal, 'hasAnyGoal:', hasAnyGoal);
    
    // If no progress data exists
    if (!result.success || !result.progress || result.progress.length === 0) {
        console.log('updateGoalProgress - No progress data found');
        
        if (hasAnyGoal) {
            // Goals are set but no progress yet - show 0% with informative message
            console.log('updateGoalProgress - Goals set but no progress, showing 0%');
            
            if (progressFill) progressFill.style.width = '0%';
            if (progressText) progressText.textContent = '0%';
            if (goalProgressValue) goalProgressValue.innerHTML = '0<span class="stat-unit">%</span>';
            
            if (goalRemaining) {
                if (hasWeightGoal && hasBodyFatGoal) {
                    goalRemaining.textContent = 'Start tracking to see progress';
                } else if (hasWeightGoal) {
                    goalRemaining.textContent = targetWeight + ' kg target set';
                } else if (hasBodyFatGoal) {
                    goalRemaining.textContent = targetBodyFat + '% target set';
                }
            }
            
            if (goalStatusEl) {
                goalStatusEl.textContent = 'Start tracking progress';
                goalStatusEl.style.color = 'var(--text-muted)';
            }
        } else {
            // No goals set either
            console.log('updateGoalProgress - No goals set');
            
            if (progressFill) progressFill.style.width = '0%';
            if (progressText) progressText.textContent = '0%';
            if (goalProgressValue) goalProgressValue.innerHTML = '0<span class="stat-unit">%</span>';
            
            if (goalRemaining) {
                goalRemaining.textContent = 'Set a goal to start';
            }
            
            if (goalStatusEl) {
                goalStatusEl.textContent = 'Set a goal';
                goalStatusEl.style.color = 'var(--text-muted)';
            }
        }
        
        console.log('updateGoalProgress - END (no progress data)');
        return;
    }
    
    // Progress data exists - calculate progress
    const latest = result.progress[0]; // Most recent
    const first = result.progress[result.progress.length - 1]; // First record
    
    const currentWeight = parseFloat(latest.weight) || 0;
    const initialWeight = parseFloat(first.weight) || currentWeight;
    const currentBodyFat = parseFloat(latest.body_fat_percentage) || 0;
    const initialBodyFat = parseFloat(first.body_fat_percentage) || currentBodyFat;
    
    console.log('updateGoalProgress - currentWeight:', currentWeight, 'initialWeight:', initialWeight);
    console.log('updateGoalProgress - currentBodyFat:', currentBodyFat, 'initialBodyFat:', initialBodyFat);
    
    // Calculate weight progress percentage
    let weightProgress = 0;
    if (hasWeightGoal && currentWeight > 0 && initialWeight > 0) {
        const totalToLose = initialWeight - targetWeight;
        const lostSoFar = initialWeight - currentWeight;
        
        console.log('updateGoalProgress - totalToLose:', totalToLose, 'lostSoFar:', lostSoFar);
        
        if (totalToLose > 0 && lostSoFar >= 0) {
            weightProgress = (lostSoFar / totalToLose) * 100;
            weightProgress = Math.min(100, Math.max(0, weightProgress));
            console.log('updateGoalProgress - weightProgress:', weightProgress);
        } else if (currentWeight <= targetWeight) {
            weightProgress = 100;
            console.log('updateGoalProgress - weight goal reached');
        }
    }
    
    // Calculate body fat progress percentage
    let bodyFatProgress = 0;
    if (hasBodyFatGoal && currentBodyFat > 0 && initialBodyFat > 0) {
        const totalToLose = initialBodyFat - targetBodyFat;
        const lostSoFar = initialBodyFat - currentBodyFat;
        
        console.log('updateGoalProgress - body fat totalToLose:', totalToLose, 'lostSoFar:', lostSoFar);
        
        if (totalToLose > 0 && lostSoFar >= 0) {
            bodyFatProgress = (lostSoFar / totalToLose) * 100;
            bodyFatProgress = Math.min(100, Math.max(0, bodyFatProgress));
            console.log('updateGoalProgress - bodyFatProgress:', bodyFatProgress);
        } else if (currentBodyFat <= targetBodyFat) {
            bodyFatProgress = 100;
            console.log('updateGoalProgress - body fat goal reached');
        }
    }
    
    // Calculate average progress - only average goals that are set
    let avgProgress = 0;
    let goalsCount = 0;
    
    if (hasWeightGoal) {
        avgProgress += weightProgress;
        goalsCount++;
    }
    
    if (hasBodyFatGoal) {
        avgProgress += bodyFatProgress;
        goalsCount++;
    }
    
    // If both goals are set, average them; otherwise use the single goal progress
    if (goalsCount > 0) {
        avgProgress = avgProgress / goalsCount;
    }
    
    console.log('updateGoalProgress - avgProgress:', avgProgress, 'goalsCount:', goalsCount);
    
    // Update display
    if (progressFill) {
        progressFill.style.width = avgProgress + '%';
        console.log('updateGoalProgress - Set progress bar width to:', avgProgress + '%');
    }
    if (progressText) {
        progressText.textContent = Math.round(avgProgress) + '%';
        console.log('updateGoalProgress - Set progress text to:', Math.round(avgProgress) + '%');
    }
    if (goalProgressValue) {
        goalProgressValue.innerHTML = Math.round(avgProgress) + '<span class="stat-unit">%</span>';
        console.log('updateGoalProgress - Set goal progress value');
    }
    
    if (goalRemaining) {
        if (hasWeightGoal) {
            const remainingWeight = currentWeight - targetWeight;
            if (remainingWeight > 0.1) {
                goalRemaining.textContent = remainingWeight.toFixed(1) + ' kg remaining';
            } else if (remainingWeight <= 0.1 && remainingWeight >= -0.1) {
                goalRemaining.textContent = 'Weight goal reached!';
            } else {
                goalRemaining.textContent = 'Below target weight!';
            }
        } else if (hasBodyFatGoal) {
            const remainingBodyFat = currentBodyFat - targetBodyFat;
            if (remainingBodyFat > 0.1) {
                goalRemaining.textContent = remainingBodyFat.toFixed(1) + '% remaining';
            } else if (remainingBodyFat <= 0.1 && remainingBodyFat >= -0.1) {
                goalRemaining.textContent = 'Body fat goal reached!';
            } else {
                goalRemaining.textContent = 'Below target body fat!';
            }
        } else {
            goalRemaining.textContent = 'Set goals to track progress';
        }
    }
    
    // Update status text
    if (goalStatusEl) {
        if (!hasAnyGoal) {
            goalStatusEl.textContent = 'Set a goal';
            goalStatusEl.style.color = 'var(--text-muted)';
        } else if (avgProgress >= 100) {
            goalStatusEl.textContent = 'Goals reached!';
            goalStatusEl.style.color = 'var(--success-color)';
        } else if (avgProgress > 0) {
            goalStatusEl.textContent = 'Working towards goals';
            goalStatusEl.style.color = 'var(--text-secondary)';
        } else {
            goalStatusEl.textContent = 'Start tracking progress';
            goalStatusEl.style.color = 'var(--text-muted)';
        }
        console.log('updateGoalProgress - Set goal status:', goalStatusEl.textContent);
    }
    
    console.log('updateGoalProgress - END');
}

// Filter history by time period
function filterHistory(days) {
    const container = document.getElementById('progress-history-container');
    if (!container) return;
    
    if (days === 'all') {
        loadProgressHistory();
        return;
    }
    
    // Filter existing data
    const allProgress = window.allProgressData || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    const filtered = allProgress.filter(p => new Date(p.created_at) >= cutoffDate);
    
    if (filtered.length > 0) {
        container.innerHTML = renderProgressHistoryTable(filtered);
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <h3>No Records Found</h3>
                <p>No progress records in the selected time period.</p>
            </div>
        `;
    }
}

// Render progress history table
function renderProgressHistoryTable(progressData) {
    const sortedProgress = progressData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return `
        <table class="progress-history-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>Body Fat</th>
                    <th>Muscle Mass</th>
                    <th>Waist</th>
                    <th>Chest</th>
                </tr>
            </thead>
            <tbody>
                ${sortedProgress.map(p => `
                    <tr>
                        <td data-label="Date">${formatDate(p.created_at)}</td>
                        <td data-label="Weight"><span>${p.weight || '-'}<span class="unit">kg</span></span></td>
                        <td data-label="Body Fat"><span>${p.body_fat_percentage || '-'}<span class="unit">%</span></span></td>
                        <td data-label="Muscle Mass"><span>${p.muscle_mass || '-'}<span class="unit">kg</span></span></td>
                        <td data-label="Waist"><span>${p.waist || '-'}<span class="unit">cm</span></span></td>
                        <td data-label="Chest"><span>${p.chest || '-'}<span class="unit">cm</span></span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Store all progress data globally
window.allProgressData = [];

// Enhanced loadProgressHistory with table rendering
async function loadProgressHistory() {
    const result = await fetchAPI(API_URL, { action: 'get_progress' });
    const container = document.getElementById('progress-history-container');
    
    // Store globally for filtering
    window.allProgressData = result.success && result.progress ? result.progress : [];
    
    if (result.success && result.progress && result.progress.length > 0) {
        const sortedProgress = result.progress.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        container.innerHTML = renderProgressHistoryTable(sortedProgress);
    } else if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <h3>No Progress Records</h3>
                <p>Start tracking your fitness journey by adding your first progress record.</p>
                <button class="btn btn-primary" onclick="showModal('progress-modal')">Add Progress</button>
            </div>
        `;
    }
}

// Update body measurements display
async function updateBodyMeasurements() {
    const result = await fetchAPI(API_URL, { action: 'get_progress' });
    
    if (result.success && result.progress && result.progress.length > 0) {
        const latest = result.progress[0]; // Most recent
        const first = result.progress[result.progress.length - 1]; // First record
        
        // Update measurements (database uses 'arms' and 'thighs', not 'arm' and 'thigh')
        const measurements = [
            { id: 'measure-waist', value: latest.waist, change: latest.waist && first.waist ? latest.waist - first.waist : null, unit: 'cm' },
            { id: 'measure-chest', value: latest.chest, change: latest.chest && first.chest ? latest.chest - first.chest : null, unit: 'cm' },
            { id: 'measure-hips', value: latest.hips, change: latest.hips && first.hips ? latest.hips - first.hips : null, unit: 'cm' },
            { id: 'measure-arms', value: latest.arms, change: latest.arms && first.arms ? latest.arms - first.arms : null, unit: 'cm' },
            { id: 'measure-thighs', value: latest.thighs, change: latest.thighs && first.thighs ? latest.thighs - first.thighs : null, unit: 'cm' },
            { id: 'measure-muscle', value: latest.muscle_mass, change: latest.muscle_mass && first.muscle_mass ? latest.muscle_mass - first.muscle_mass : null, unit: 'kg' }
        ];
        
        measurements.forEach(m => {
            const valueEl = document.getElementById(m.id);
            const changeEl = document.getElementById(m.id + '-change');
            
            if (valueEl) {
                valueEl.innerHTML = m.value ? m.value + `<span class="measurement-unit">${m.unit}</span>` : `--<span class="measurement-unit">${m.unit}</span>`;
            }
            
            if (changeEl && m.change !== null) {
                const sign = m.change > 0 ? '+' : '';
                changeEl.textContent = `${sign}${m.change.toFixed(1)} ${m.unit}`;
                changeEl.style.color = m.change <= 0 ? 'var(--success-color)' : 'var(--text-muted)';
            } else if (changeEl) {
                changeEl.textContent = '--';
            }
        });
    }
}

// Calculate BMI
async function calculateBMI() {
    const result = await fetchAPI(API_URL, { action: 'get_progress' });
    const bmiEl = document.getElementById('progress-bmi');
    const bmiStatusEl = document.getElementById('bmi-status');
    
    if (!bmiEl || !bmiStatusEl) return;
    
    if (result.success && result.progress && result.progress.length > 0) {
        const latest = result.progress[0];
        
        if (latest.weight && latest.height && currentUser?.height) {
            const heightM = currentUser.height / 100;
            const bmi = (latest.weight / (heightM * heightM)).toFixed(1);
            bmiEl.textContent = bmi;
            
            // BMI categories
            let status = '';
            let statusClass = '';
            if (bmi < 18.5) {
                status = 'Underweight';
                statusClass = '#FFC107';
            } else if (bmi < 25) {
                status = 'Normal';
                statusClass = '#4CAF50';
            } else if (bmi < 30) {
                status = 'Overweight';
                statusClass = '#FF9800';
            } else {
                status = 'Obese';
                statusClass = '#F44336';
            }
            
            bmiStatusEl.textContent = status;
            bmiStatusEl.style.color = statusClass;
        } else {
            bmiEl.textContent = '--';
            bmiStatusEl.textContent = 'Add height in profile';
        }
    }
}

// Initialize progress page data
async function initProgressPageData() {
    await loadProgressHistory();
    await loadProgressChart();
    await updateBodyMeasurements();
    await calculateBMI();
    await updateGoalProgress();
}

// Export additional functions
window.addQuickProgress = addQuickProgress;
window.saveGoals = saveGoals;
window.filterHistory = filterHistory;
window.updateGoalProgress = updateGoalProgress;
window.initProgressPageData = initProgressPageData;
window.updateBodyMeasurements = updateBodyMeasurements;
window.calculateBMI = calculateBMI;
