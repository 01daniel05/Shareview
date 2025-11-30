// ============================================
// ADMIN.JS - UI Integration Only
// ============================================

const API_BASE_URL = 'http://localhost:8080';

// ============================================
// UI TOGGLE FUNCTIONS
// ============================================
function toggleSidebar() {
    const sidebar = document.getElementById('leftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('leftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('active');
}

function switchTab(tabName, element) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    element.classList.add('active');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        closeSidebar();
    }

    // Load data for the tab
    loadTabData(tabName);
}

// ============================================
// FILTER FUNCTIONS
// ============================================
function filterUsers(status, element) {
    const buttons = document.querySelectorAll('#users-tab .filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    loadUsers(status);
}

function filterPosts(status, element) {
    const buttons = document.querySelectorAll('#posts-tab .filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    loadPosts(status);
}

// ============================================
// DATA LOADING FUNCTIONS (Backend Integration)
// ============================================
async function loadTabData(tabName) {
    switch(tabName) {
        case 'dashboard':
            await loadDashboardStats();
            break;
        case 'users':
            await loadUsers('all');
            break;
        case 'posts':
            await loadPosts('all');
            break;
        case 'comments':
            await loadComments();
            break;
        case 'reports':
            await loadReports();
            break;
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            updateDashboardUI(data);
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

async function loadUsers(status) {
    try {
        const url = status === 'all'
            ? `${API_BASE_URL}/admin/users`
            : `${API_BASE_URL}/admin/users?status=${status}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            const users = await response.json();
            updateUsersTable(users);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function loadPosts(status) {
    try {
        const url = status === 'all'
            ? `${API_BASE_URL}/admin/posts`
            : `${API_BASE_URL}/admin/posts?status=${status}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            const posts = await response.json();
            updatePostsTable(posts);
        }
    } catch (error) {
        console.error('Failed to load posts:', error);
    }
}

async function loadComments() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/comments`, {
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            const comments = await response.json();
            updateCommentsTable(comments);
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
    }
}

async function loadReports() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/reports`, {
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            const reports = await response.json();
            updateReportsTable(reports);
        }
    } catch (error) {
        console.error('Failed to load reports:', error);
    }
}

// ============================================
// USER ACTIONS
// ============================================
async function viewUser(userId) {
    window.location.href = `/admin/user/${userId}`;
}

async function banUser(userId) {
    if (!confirm('Are you sure you want to ban this user?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            alert('User banned successfully');
            loadUsers('all');
        }
    } catch (error) {
        alert('Failed to ban user');
    }
}

async function unbanUser(userId) {
    if (!confirm('Are you sure you want to unban this user?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/unban`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            alert('User unbanned successfully');
            loadUsers('all');
        }
    } catch (error) {
        alert('Failed to unban user');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            alert('User deleted successfully');
            loadUsers('all');
        }
    } catch (error) {
        alert('Failed to delete user');
    }
}

// ============================================
// POST ACTIONS
// ============================================
async function viewPost(postId) {
    window.location.href = `/post/${postId}`;
}

async function approvePost(postId) {
    if (!confirm('Approve this post for publication?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/posts/${postId}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            alert('Post approved successfully');
            loadPosts('all');
        }
    } catch (error) {
        alert('Failed to approve post');
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            alert('Post deleted successfully');
            loadPosts('all');
        }
    } catch (error) {
        alert('Failed to delete post');
    }
}

// ============================================
// COMMENT ACTIONS
// ============================================
async function viewComment(commentId) {
    alert('Viewing Comment ID: ' + commentId);
}

async function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            alert('Comment deleted successfully');
            loadComments();
        }
    } catch (error) {
        alert('Failed to delete comment');
    }
}

// ============================================
// REPORT ACTIONS
// ============================================
async function viewReport(reportId) {
    alert('Reviewing Report ID: ' + reportId);
}

async function dismissReport(reportId) {
    if (!confirm('Dismiss this report?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}/dismiss`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            alert('Report dismissed');
            loadReports();
        }
    } catch (error) {
        alert('Failed to dismiss report');
    }
}

async function removeContent(reportId) {
    if (!confirm('Remove the reported content?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}/remove-content`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getUserToken()}` }
        });

        if (response.ok) {
            alert('Content removed successfully');
            loadReports();
        }
    } catch (error) {
        alert('Failed to remove content');
    }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================
function updateDashboardUI(data) {
    // Update dashboard stats in UI
    // This would update the stat cards with real data
}

function updateUsersTable(users) {
    // Update users table with real data
    // This would populate the table rows
}

function updatePostsTable(posts) {
    // Update posts table with real data
}

function updateCommentsTable(comments) {
    // Update comments table with real data
}

function updateReportsTable(reports) {
    // Update reports table with real data
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getUserToken() {
    // For now, using userId as simple auth
    // In production, use JWT tokens
    return localStorage.getItem('userId');
}

function toggleNotifications() {
    alert('Notifications feature - Coming soon!');
}

function saveSettings() {
    alert('Settings saved successfully!');
}
function logout() {
    // Show confirmation modal
    showConfirmModal('Are you sure you want to logout?',() => {
        showLoadingModal("Logging out...");

        localStorage.clear();
        showTemporaryModal("Logged out successfully!");
        window.location.href = "/";
    });
}
// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('click', function(e) {
    const profileContainer = document.querySelector('.profile-container');
    const dropdown = document.getElementById('profileDropdown');

    if (profileContainer && !profileContainer.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('leftSidebar');
    const menuToggle = document.querySelector('.menu-toggle');

    if (window.innerWidth <= 1024 &&
        sidebar.classList.contains('active') &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)) {
        closeSidebar();
    }
});

// Load initial data on page load
window.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
});