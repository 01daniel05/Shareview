// ==================== CONFIGURATION ====================
let API_BASE_URL;

if (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') {
    API_BASE_URL = 'http://localhost:8080';
    console.log('🔧 Running in LOCAL mode');
} else if (window.location.hostname.includes('railway.app')) {
    API_BASE_URL = 'https://shareview-production.up.railway.app';
    console.log('🚀 Running in PRODUCTION mode');
} else {
    API_BASE_URL = 'https://shareview-1.onrender.com';
    console.log('🌐 Using fallback URL');
}

const ADMIN_API = `${API_BASE_URL}/admin`;

// Global state management
let currentFilter = {
    users: 'all',
    posts: 'all',
    reports: 'pending'
};

let currentPage = {
    users: 0,
    posts: 0,
    comments: 0,
    reports: 0
};

const PAGE_SIZE = 10;

// ==================== API HELPER FUNCTIONS ====================

async function apiCall(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        // Add userId for authentication (admin check on backend)
        const userId = localStorage.getItem('userId');
        if (userId) {
            options.headers['userId'] = userId;
        }

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${ADMIN_API}${endpoint}`, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showTemporaryModal(`Error: ${error.message}`);
        throw error;
    }
}

// ==================== SIDEBAR & NAVIGATION ====================

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

document.addEventListener('click', (e) => {
    const profileContainer = document.querySelector('.profile-container');
    const dropdown = document.getElementById('profileDropdown');

    if (dropdown && !profileContainer.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

function toggleNotifications() {
    showTemporaryModal('Notifications feature coming soon!');
}

let currentActiveTab = null;

function switchTab(tabName, element) {
    // Don't reload if already on this tab
    if (currentActiveTab === tabName) {
        console.log(`Already on ${tabName} tab, skipping reload`);
        closeSidebar(); // Still close sidebar on mobile
        return;
    }

    currentActiveTab = tabName;

    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to the clicked menu item
    if (element) {
        element.classList.add('active');
    } else {
        // If no element passed, find it by matching the onclick attribute
        const matchingMenuItem = Array.from(document.querySelectorAll('.menu-item'))
            .find(item => item.getAttribute('onclick')?.includes(`'${tabName}'`));
        if (matchingMenuItem) {
            matchingMenuItem.classList.add('active');
        }
    }

    // Load data when switching tabs
    switch(tabName) {
        case 'dashboard':
            loadDashboardStats();
            loadActivityLogs();
            break;
        case 'users':
            loadUsers();
            break;
        case 'posts':
            loadPosts();
            break;
        case 'comments':
            loadComments();
            break;
        case 'reports':
            loadReports();
            break;
    }

    if (window.innerWidth <= 1024) {
        closeSidebar();
    }
}
// ==================== DASHBOARD ====================

let isLoadingDashboard = false;

async function loadDashboardStats() {
    if (isLoadingDashboard) {
        console.log('Dashboard already loading, skipping...');
        return;
    }

    try {
        isLoadingDashboard = true;
        showLoadingModal('Loading dashboard...');
        const response = await apiCall('/dashboard/stats');

        if (response.status === 'success') {
            updateDashboardUI(response.data);
        }

        hideLoadingModal();
        isLoadingDashboard = false;
    } catch (error) {
        hideLoadingModal();
        isLoadingDashboard = false;
        console.error('Failed to load dashboard stats:', error);
    }
}
function updateDashboardUI(data) {
    // Update stat cards
    if (document.getElementById('total-users')) {
        document.getElementById('total-users').textContent = data.users.total || 0;
    }
    if (document.getElementById('active-users')) {
        document.getElementById('active-users').textContent = data.users.active || 0;
    }
    if (document.getElementById('total-posts')) {
        document.getElementById('total-posts').textContent = data.posts.total || 0;
    }
    if (document.getElementById('flagged-posts')) {
        document.getElementById('flagged-posts').textContent = data.posts.flagged || 0;
    }
    if (document.getElementById('total-comments')) {
        document.getElementById('total-comments').textContent = data.comments || 0;
    }
    if (document.getElementById('pending-reports')) {
        document.getElementById('pending-reports').textContent = data.reports || 0;
    }
    // Add activity stats
    if (document.getElementById('today-activities')) {
        document.getElementById('today-activities').textContent = data.activities?.today || 0;
    }
}

// ==================== USER MANAGEMENT ====================

async function loadUsers(status = null, page = null) {
    try {
        const statusFilter = status !== null ? status : currentFilter.users;
        const pageNum = page !== null ? page : currentPage.users;

        // Show loading spinner
        const loadingDiv = document.getElementById('users-loading');
        const table = document.getElementById('users-table');

        if (loadingDiv) loadingDiv.style.display = 'block';
        if (table) table.style.display = 'none';

        const response = await apiCall(`/users?status=${statusFilter}&page=${pageNum}&size=${PAGE_SIZE}`);

        if (response.status === 'success') {
            displayUsers(response.users);
            updatePagination('users', response.currentPage, response.totalPages);
            currentPage.users = response.currentPage;

            // Hide loading, show table
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (table) table.style.display = 'table';
        }

    } catch (error) {
        console.error('Failed to load users:', error);
        // Show error and hide loading
        const loadingDiv = document.getElementById('users-loading');
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #f44336;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
                    <p style="margin-top: 10px;">Failed to load users: ${error.message}</p>
                    <button onclick="loadUsers()" class="btn-secondary" style="margin-top: 15px;">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}
function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No users found</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');

        // Handle null or undefined values safely
        const userStatus = user.status || 'UNKNOWN';
        const statusLower = userStatus;
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const email = user.email || '';
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';

        // Generate default avatar URL based on user's name
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + ' ' + lastName)}&background=667eea&color=fff&size=128`;

        row.setAttribute('data-status', statusLower);

        row.innerHTML = `
            <td>${user.id || ''}</td>
            <td>
                <div class="user-info">
                    <img src="${user.profilePicture || defaultAvatar}" 
                         alt="${firstName}" 
                         onerror="this.src='${defaultAvatar}'">
                    <span>${firstName} ${lastName}</span>
                </div>
            </td>
            <td>${email}</td>
            <td>${createdAt}</td>
            <td>
                <span class="status-badge status-${statusLower}">
                    ${userStatus}
                </span>
            </td>
            <td class="actions">
                <button class="action-btn btn-view" onclick="viewUser(${user.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                ${userStatus === 'ACTIVE' ? `
                    <button class="action-btn btn-ban" onclick="suspendUser(${user.id})" title="Suspend">
                        <i class="fas fa-ban"></i>
                    </button>
                ` : `
                    <button class="action-btn btn-edit" onclick="restoreUser(${user.id})" title="Restore">
                        <i class="fas fa-undo"></i>
                    </button>
                `}
                <button class="action-btn btn-delete" onclick="deleteUser(${user.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}function filterUsers(status, element) {
    currentFilter.users = status;
    currentPage.users = 0;

    const buttons = element.parentElement.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    loadUsers(status, 0);
}

async function viewUser(userId) {
    try {
        showLoadingModal('Loading user details...');
        const response = await apiCall(`/users/${userId}`);

        if (response.status === 'success') {
            displayUserDetails(response.data);
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Failed to load user details:', error);
    }
}

function displayUserDetails(data) {
    const user = data.user;
    const stats = data.stats;

    const modalHTML = `
        <div class="custom-modal-overlay" onclick="closeCustomModal()">
            <div class="custom-modal-content" onclick="event.stopPropagation()">
                <h3>User Details</h3>
                <div class="user-details">
                    <p><strong>ID:</strong> ${user.id}</p>
                    <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Gender:</strong> ${user.gender || 'Not specified'}</p>
                    <p><strong>Birth Date:</strong> ${user.bDate || 'Not specified'}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${user.status}">${user.status}</span></p>
                    <p><strong>Role:</strong> ${user.role}</p>
                    <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
                    <p><strong>Total Posts:</strong> ${stats.posts}</p>
                    <p><strong>Total Comments:</strong> ${stats.comments}</p>
                    ${user.suspensionReason ? `<p><strong>Suspension Reason:</strong> ${user.suspensionReason}</p>` : ''}
                    ${user.suspendedAt ? `<p><strong>Suspended At:</strong> ${new Date(user.suspendedAt).toLocaleString()}</p>` : ''}
                </div>
                <button onclick="closeCustomModal()" class="btn-primary">Close</button>
            </div>
        </div>
    `;

    const existingModal = document.querySelector('.custom-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeCustomModal() {
    const modal = document.querySelector('.custom-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

async function suspendUser(userId) {
    const reason = prompt('Please enter suspension reason:');
    if (!reason || reason.trim() === '') {
        showTemporaryModal('Suspension reason is required');
        return;
    }

    showConfirmModal(
        'Are you sure you want to suspend this user?',
        async () => {
            try {
                showLoadingModal('Suspending user...');
                const response = await apiCall(`/users/${userId}/suspend`, 'PUT', { reason: reason.trim() });

                if (response.status === 'success') {
                    showTemporaryModal('User suspended successfully');
                    loadUsers();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to suspend user:', error);
            }
        }
    );
}

async function restoreUser(userId) {
    showConfirmModal(
        'Are you sure you want to restore this user?',
        async () => {
            try {
                showLoadingModal('Restoring user...');
                const response = await apiCall(`/users/${userId}/restore`, 'PUT');

                if (response.status === 'success') {
                    showTemporaryModal('User restored successfully');
                    loadUsers();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to restore user:', error);
            }
        }
    );
}

async function deleteUser(userId) {
    showConfirmModal(
        'Are you sure you want to permanently delete this user? This action cannot be undone.',
        async () => {
            try {
                showLoadingModal('Deleting user...');
                const response = await apiCall(`/users/${userId}`, 'DELETE');

                if (response.status === 'success') {
                    showTemporaryModal('User deleted successfully');
                    loadUsers();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to delete user:', error);
            }
        }
    );
}

// ==================== POST MANAGEMENT ====================

async function loadPosts(status = null, page = null) {
    try {
        const statusFilter = status !== null ? status : currentFilter.posts;
        const pageNum = page !== null ? page : currentPage.posts;

        showLoadingModal('Loading posts...');
        const response = await apiCall(`/posts?status=${statusFilter}&page=${pageNum}&size=${PAGE_SIZE}`);

        if (response.status === 'success') {
            displayPosts(response.posts);
            updatePagination('posts', response.currentPage, response.totalPages);
            currentPage.posts = response.currentPage;
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Failed to load posts:', error);
    }
}

function displayPosts(posts) {
    const tbody = document.getElementById('posts-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (posts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No posts found</td></tr>';
        return;
    }

    posts.forEach(post => {
        const row = document.createElement('tr');
        row.setAttribute('data-status', post.status);

        row.innerHTML = `
            <td>${post.id}</td>
            <td>${post.title}</td>
            <td>${post.user.firstName} ${post.user.lastName}</td>
            <td>${new Date(post.createdAt).toLocaleDateString()}</td>
            <td>
                <span class="status-badge status-${post.status}">
                    ${post.status}
                </span>
            </td>
            <td class="actions">
                <button class="action-btn btn-view" onclick="viewPost(${post.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                ${post.status === 'PENDING' ? `
                    <button class="action-btn btn-edit" onclick="approvePost(${post.id})" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                ${post.status !== 'FLAGGED' ? `
                    <button class="action-btn btn-ban" onclick="flagPost(${post.id})" title="Flag">
                        <i class="fas fa-flag"></i>
                    </button>
                ` : ''}
                <button class="action-btn btn-delete" onclick="deletePost(${post.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function filterPosts(status, element) {
    currentFilter.posts = status;
    currentPage.posts = 0;

    const buttons = element.parentElement.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    loadPosts(status, 0);
}

async function viewPost(postId) {
    try {
        showLoadingModal('Loading post details...');
        const response = await apiCall(`/posts/${postId}`);

        if (response.status === 'success') {
            displayPostDetails(response.post);
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Failed to load post details:', error);
    }
}

function displayPostDetails(post) {
    const modalHTML = `
        <div class="custom-modal-overlay" onclick="closeCustomModal()">
            <div class="custom-modal-content" onclick="event.stopPropagation()" style="max-width: 800px;">
                <h3>Post Details</h3>
                <div class="post-details">
                    <p><strong>ID:</strong> ${post.id}</p>
                    <p><strong>Title:</strong> ${post.title}</p>
                    <p><strong>Author:</strong> ${post.user.firstName} ${post.user.lastName}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${post.status}">${post.status}</span></p>
                    <p><strong>Created:</strong> ${new Date(post.createdAt).toLocaleString()}</p>
                    <p><strong>Likes:</strong> ${post.likesCount}</p>
                    <p><strong>Comments:</strong> ${post.commentsCount}</p>
                    ${post.flagReason ? `<p><strong>Flag Reason:</strong> ${post.flagReason}</p>` : ''}
                    <p><strong>Content:</strong></p>
                    <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        ${post.content}
                    </div>
                    ${post.imageUrls ? `<p><strong>Images:</strong> ${post.imageUrls.split(',').length}</p>` : ''}
                    ${post.documentUrls ? `<p><strong>Documents:</strong> ${post.documentUrls.split(',').length}</p>` : ''}
                    ${post.videoUrls ? `<p><strong>Videos:</strong> ${post.videoUrls.split(',').length}</p>` : ''}
                </div>
                <button onclick="closeCustomModal()" class="btn-primary">Close</button>
            </div>
        </div>
    `;

    const existingModal = document.querySelector('.custom-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function approvePost(postId) {
    showConfirmModal(
        'Approve this post for publication?',
        async () => {
            try {
                showLoadingModal('Approving post...');
                const response = await apiCall(`/posts/${postId}/approve`, 'PUT');

                if (response.status === 'success') {
                    showTemporaryModal('Post approved successfully');
                    loadPosts();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to approve post:', error);
            }
        }
    );
}

async function flagPost(postId) {
    const reason = prompt('Please enter reason for flagging this post:');
    if (!reason || reason.trim() === '') {
        showTemporaryModal('Flag reason is required');
        return;
    }

    showConfirmModal(
        'Are you sure you want to flag this post?',
        async () => {
            try {
                showLoadingModal('Flagging post...');
                const response = await apiCall(`/posts/${postId}/flag`, 'PUT', { reason: reason.trim() });

                if (response.status === 'success') {
                    showTemporaryModal('Post flagged successfully');
                    loadPosts();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to flag post:', error);
            }
        }
    );
}

async function deletePost(postId) {
    showConfirmModal(
        'Are you sure you want to delete this post? This action cannot be undone.',
        async () => {
            try {
                showLoadingModal('Deleting post...');
                const response = await apiCall(`/posts/${postId}`, 'DELETE');

                if (response.status === 'success') {
                    showTemporaryModal('Post deleted successfully');
                    loadPosts();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to delete post:', error);
            }
        }
    );
}

// ==================== COMMENT MANAGEMENT ====================

async function loadComments(page = null) {
    try {
        const pageNum = page !== null ? page : currentPage.comments;

        showLoadingModal('Loading comments...');
        const response = await apiCall(`/comments?page=${pageNum}&size=${PAGE_SIZE}`);

        if (response.status === 'success') {
            displayComments(response.comments);
            updatePagination('comments', response.currentPage, response.totalPages);
            currentPage.comments = response.currentPage;
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Failed to load comments:', error);
    }
}

function displayComments(comments) {
    const tbody = document.querySelector('#comments-tab .data-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (comments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No comments found</td></tr>';
        return;
    }

    comments.forEach(comment => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${comment.id}</td>
            <td>${comment.user.firstName} ${comment.user.lastName}</td>
            <td>${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}</td>
            <td>${new Date(comment.createdAt).toLocaleDateString()}</td>
            <td class="actions">
                <button class="action-btn btn-view" onclick="viewComment(${comment.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteComment(${comment.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

async function viewComment(commentId) {
    try {
        showLoadingModal('Loading comment details...');
        const response = await apiCall(`/comments/${commentId}`);

        if (response.status === 'success') {
            displayCommentDetails(response.comment);
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Failed to load comment details:', error);
    }
}

function displayCommentDetails(comment) {
    const modalHTML = `
        <div class="custom-modal-overlay" onclick="closeCustomModal()">
            <div class="custom-modal-content" onclick="event.stopPropagation()">
                <h3>Comment Details</h3>
                <div class="comment-details">
                    <p><strong>ID:</strong> ${comment.id}</p>
                    <p><strong>Author:</strong> ${comment.user.firstName} ${comment.user.lastName}</p>
                    <p><strong>Post ID:</strong> ${comment.post.id}</p>
                    <p><strong>Post Title:</strong> ${comment.post.title}</p>
                    <p><strong>Created:</strong> ${new Date(comment.createdAt).toLocaleString()}</p>
                    <p><strong>Content:</strong></p>
                    <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        ${comment.content}
                    </div>
                </div>
                <button onclick="closeCustomModal()" class="btn-primary">Close</button>
            </div>
        </div>
    `;

    const existingModal = document.querySelector('.custom-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function deleteComment(commentId) {
    showConfirmModal(
        'Are you sure you want to delete this comment?',
        async () => {
            try {
                showLoadingModal('Deleting comment...');
                const response = await apiCall(`/comments/${commentId}`, 'DELETE');

                if (response.status === 'success') {
                    showTemporaryModal('Comment deleted successfully');
                    loadComments();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to delete comment:', error);
            }
        }
    );
}

// ==================== REPORT MANAGEMENT ====================

async function loadReports(status = null, page = null) {
    try {
        const statusFilter = status !== null ? status : currentFilter.reports;
        const pageNum = page !== null ? page : currentPage.reports;

        showLoadingModal('Loading reports...');
        const response = await apiCall(`/reports?status=${statusFilter}&page=${pageNum}&size=${PAGE_SIZE}`);

        if (response.status === 'success') {
            displayReports(response.reports);
            updatePagination('reports', response.currentPage, response.totalPages);
            currentPage.reports = response.currentPage;
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Failed to load reports:', error);
    }
}

function displayReports(reports) {
    const tbody = document.querySelector('#reports-tab .data-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No reports found</td></tr>';
        return;
    }

    reports.forEach(report => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${report.id}</td>
            <td>${report.post.id}</td>
            <td>${report.user.firstName} ${report.user.lastName}</td>
            <td>${report.reason}</td>
            <td>${new Date(report.reportedAt).toLocaleDateString()}</td>
            <td class="actions">
                <button class="action-btn btn-view" onclick="viewReport(${report.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                ${report.status === 'PENDING' ? `
                    <button class="action-btn btn-edit" onclick="resolveReport(${report.id})" title="Resolve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn btn-ban" onclick="dismissReport(${report.id})" title="Dismiss">
                        <i class="fas fa-times"></i>
                    </button>
                ` : `
                    <span class="status-badge status-${report.status}">${report.status}</span>
                `}
            </td>
        `;

        tbody.appendChild(row);
    });
}

async function viewReport(reportId) {
    try {
        showLoadingModal('Loading report details...');
        const response = await apiCall(`/reports/${reportId}`);

        if (response.status === 'success') {
            displayReportDetails(response.report);
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Failed to load report details:', error);
    }
}

function displayReportDetails(report) {
    const modalHTML = `
        <div class="custom-modal-overlay" onclick="closeCustomModal()">
            <div class="custom-modal-content" onclick="event.stopPropagation()">
                <h3>Report Details</h3>
                <div class="report-details">
                    <p><strong>Report ID:</strong> ${report.id}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${report.status}">${report.status}</span></p>
                    <p><strong>Reported By:</strong> ${report.user.firstName} ${report.user.lastName}</p>
                    <p><strong>Reported At:</strong> ${new Date(report.reportedAt).toLocaleString()}</p>
                    <p><strong>Reason:</strong> ${report.reason}</p>
                    <hr>
                    <p><strong>Post ID:</strong> ${report.post.id}</p>
                    <p><strong>Post Title:</strong> ${report.post.title}</p>
                    <p><strong>Post Author:</strong> ${report.post.user.firstName} ${report.post.user.lastName}</p>
                    ${report.resolutionAction ? `<p><strong>Resolution Action:</strong> ${report.resolutionAction}</p>` : ''}
                    ${report.resolutionNotes ? `<p><strong>Resolution Notes:</strong> ${report.resolutionNotes}</p>` : ''}
                    ${report.resolvedAt ? `<p><strong>Resolved At:</strong> ${new Date(report.resolvedAt).toLocaleString()}</p>` : ''}
                </div>
                <button onclick="closeCustomModal()" class="btn-primary">Close</button>
            </div>
        </div>
    `;

    const existingModal = document.querySelector('.custom-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function resolveReport(reportId) {
    const action = prompt('Enter action (remove_content, warn_user, or dismiss):');
    if (!action) return;

    const notes = prompt('Enter resolution notes (optional):') || '';

    showConfirmModal(
        'Resolve this report?',
        async () => {
            try {
                showLoadingModal('Resolving report...');
                const response = await apiCall(`/reports/${reportId}/resolve`, 'PUT', {
                    action: action.trim(),
                    notes: notes.trim()
                });

                if (response.status === 'success') {
                    showTemporaryModal('Report resolved successfully');
                    loadReports();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to resolve report:', error);
            }
        }
    );
}

async function dismissReport(reportId) {
    showConfirmModal(
        'Dismiss this report as resolved?',
        async () => {
            try {
                showLoadingModal('Dismissing report...');
                const response = await apiCall(`/reports/${reportId}/dismiss`, 'PUT');

                if (response.status === 'success') {
                    showTemporaryModal('Report dismissed successfully');
                    loadReports();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to dismiss report:', error);
            }
        }
    );
}

function removeContent(reportId) {
    // Alias for resolveReport with remove_content action
    showConfirmModal(
        'Remove the reported content and resolve this report?',
        async () => {
            try {
                showLoadingModal('Removing content...');
                const response = await apiCall(`/reports/${reportId}/resolve`, 'PUT', {
                    action: 'remove_content',
                    notes: 'Content removed by admin'
                });

                if (response.status === 'success') {
                    showTemporaryModal('Content removed and report resolved');
                    loadReports();
                }

                hideLoadingModal();
            } catch (error) {
                hideLoadingModal();
                console.error('Failed to remove content:', error);
            }
        }
    );
}

// ==================== PAGINATION ====================

function updatePagination(type, currentPage, totalPages) {
    const paginationId = `${type}-pagination`;
    const paginationContainer = document.getElementById(paginationId);

    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';

    // Previous button
    if (currentPage > 0) {
        html += `<button onclick="changePage('${type}', ${currentPage - 1})" class="page-btn">
                    <i class="fas fa-chevron-left"></i>
                 </button>`;
    }

    // Page numbers
    for (let i = 0; i < totalPages; i++) {
        if (i === currentPage) {
            html += `<button class="page-btn active">${i + 1}</button>`;
        } else if (i === 0 || i === totalPages - 1 || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button onclick="changePage('${type}', ${i})" class="page-btn">${i + 1}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }

    // Next button
    if (currentPage < totalPages - 1) {
        html += `<button onclick="changePage('${type}', ${currentPage + 1})" class="page-btn">
                    <i class="fas fa-chevron-right"></i>
                 </button>`;
    }

    html += '</div>';
    paginationContainer.innerHTML = html;
}

function changePage(type, page) {
    currentPage[type] = page;

    switch(type) {
        case 'users':
            loadUsers(null, page);
            break;
        case 'posts':
            loadPosts(null, page);
            break;
        case 'comments':
            loadComments(page);
            break;
        case 'reports':
            loadReports(null, page);
            break;
    }
}

// ==================== SETTINGS ====================

async function saveSettings() {
    const settings = {
        siteName: document.getElementById('site-name')?.value || 'ShareView',
        maintenanceMode: document.getElementById('maintenance-mode')?.checked || false,
        registrationEnabled: document.getElementById('registration-enabled')?.checked || true,
        maxUploadSize: document.getElementById('max-upload-size')?.value || 10485760
    };

    try {
        showLoadingModal('Saving settings...');
        const response = await apiCall('/settings', 'PUT', settings);

        if (response.status === 'success') {
            showTemporaryModal('Settings saved successfully');
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Failed to save settings:', error);
    }
}

async function loadSettings() {
    try {
        const response = await apiCall('/settings');

        if (response.status === 'success') {
            const settings = response.settings;

            if (document.getElementById('site-name')) {
                document.getElementById('site-name').value = settings.siteName || '';
            }
            if (document.getElementById('maintenance-mode')) {
                document.getElementById('maintenance-mode').checked = settings.maintenanceMode || false;
            }
            if (document.getElementById('registration-enabled')) {
                document.getElementById('registration-enabled').checked = settings.registrationEnabled !== false;
            }
            if (document.getElementById('max-upload-size')) {
                document.getElementById('max-upload-size').value = settings.maxUploadSize || 10485760;
            }
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// ==================== LOGOUT ====================

function logout() {
    showConfirmModal(
        'Are you sure you want to logout?',
        () => {
            showLoadingModal('Logging out...');

            // Clear localStorage
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userId');
            localStorage.removeItem('userRole');

            setTimeout(() => {
                hideLoadingModal();
                window.location.href = '/';
            }, 1000);
        }
    );
}

// ==================== SEARCH ====================

let searchTimeout;
async function searchUsers() {
    const query = document.getElementById('user-search')?.value.trim();

    if (!query || query.length < 2) {
        loadUsers();
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            showLoadingModal('Searching...');
            const response = await apiCall(`/users/search?query=${encodeURIComponent(query)}`);

            if (response.status === 'success') {
                displayUsers(response.users);
            }

            hideLoadingModal();
        } catch (error) {
            hideLoadingModal();
            console.error('Search failed:', error);
        }
    }, 500);
}


// ==================== ACTIVITY LOGS ====================

async function loadActivityLogs(page = 0) {
    try {
        const container = document.getElementById('activity-logs-container');
        if (!container) return;

        // Clear any existing content first
        container.innerHTML = '';

        // Add loading spinner
        const spinner = document.createElement('div');
        spinner.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; margin: 0 auto 20px; animation: spin 1s linear infinite;"></div>
                <p style="color: #666; font-size: 14px;">Loading activity logs...</p>
            </div>
        `;
        container.appendChild(spinner);

        // Call API
        const response = await apiCall(`/logs?page=${page}&size=10`);

        if (response.status === 'success') {
            // Clear spinner and display results
            container.innerHTML = '';
            displayActivityLogs(response.logs || response.data || []);

            // Only add pagination if we have multiple pages
            if (response.totalPages > 1) {
                updateLogsPagination(page, response.totalPages);
            }
        } else {
            container.innerHTML = `
                <div class="activity-empty-state">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff9800; margin-bottom: 15px;"></i>
                    <h3 style="color: #ff9800; margin-bottom: 8px;">Failed to Load Activity Logs</h3>
                    <p style="color: #aaa; font-size: 14px;">Unable to load activity logs. Please try again.</p>
                    <button onclick="loadActivityLogs()" class="btn-secondary" style="margin-top: 15px;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }

    } catch (error) {
        console.error('Failed to load activity logs:', error);
        const container = document.getElementById('activity-logs-container');
        if (container) {
            container.innerHTML = `
                <div class="activity-empty-state">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #f44336; margin-bottom: 15px;"></i>
                    <h3 style="color: #f44336; margin-bottom: 8px;">Error Loading Activity Logs</h3>
                    <p style="color: #aaa; font-size: 14px;">${error.message || 'An unexpected error occurred'}</p>
                    <button onclick="loadActivityLogs()" class="btn-secondary" style="margin-top: 15px;">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}
function displayActivityLogs(logs) {
    const container = document.getElementById('activity-logs-container');
    if (!container) return;

    if (!logs || logs.length === 0) {
        container.innerHTML = `
            <div class="activity-empty-state">
                <i class="fas fa-history" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                <h3 style="color: #999; margin-bottom: 8px;">No Activity Logs Found</h3>
                <p style="color: #aaa; font-size: 14px;">There are no activity logs to display at this time.</p>
                <button onclick="loadActivityLogs()" class="btn-secondary" style="margin-top: 15px;">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    logs.forEach(log => {
        const timestamp = new Date(log.timestamp || log.createdAt || Date.now()).toLocaleString();
        const userInfo = log.userId ? `User ID: ${log.userId}` : (log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System');
        const actionType = getActionType(log.action || log.type || 'UNKNOWN');

        html += `
            <div class="activity-log-item">
                <div class="log-header">
                    <span class="log-action" style="background: ${actionType.color}">
                        ${log.action || log.type || 'Activity'}
                    </span>
                    <span class="log-timestamp">${timestamp}</span>
                </div>
                <div class="log-description">${log.description || log.message || 'No description available'}</div>
                <div class="log-footer">
                    <span class="log-user">${userInfo}</span>
                    ${log.id ? `<span class="log-id">ID: ${log.id}</span>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Helper function to determine action type colors
function getActionType(action) {
    const actionUpper = action.toUpperCase();

    if (actionUpper.includes('USER')) {
        if (actionUpper.includes('CREATE') || actionUpper.includes('REGISTER')) {
            return { color: '#d4edda' }; // Green
        } else if (actionUpper.includes('SUSPEND') || actionUpper.includes('BAN') || actionUpper.includes('DELETE')) {
            return { color: '#f8d7da' }; // Red
        } else if (actionUpper.includes('UPDATE') || actionUpper.includes('EDIT')) {
            return { color: '#e3f2fd' }; // Blue
        }
    } else if (actionUpper.includes('POST')) {
        if (actionUpper.includes('CREATE')) {
            return { color: '#e8f5e9' }; // Light green
        } else if (actionUpper.includes('DELETE')) {
            return { color: '#ffebee' }; // Light red
        } else if (actionUpper.includes('FLAG') || actionUpper.includes('REPORT')) {
            return { color: '#fff3cd' }; // Yellow
        } else if (actionUpper.includes('APPROVE')) {
            return { color: '#d4edda' }; // Green
        }
    } else if (actionUpper.includes('COMMENT')) {
        if (actionUpper.includes('CREATE')) {
            return { color: '#e3f2fd' }; // Blue
        } else if (actionUpper.includes('DELETE')) {
            return { color: '#ffebee' }; // Red
        }
    } else if (actionUpper.includes('REPORT')) {
        if (actionUpper.includes('CREATE')) {
            return { color: '#fff3e0' }; // Orange
        } else if (actionUpper.includes('RESOLVE')) {
            return { color: '#d4edda' }; // Green
        } else if (actionUpper.includes('DISMISS')) {
            return { color: '#f5f5f5' }; // Gray
        }
    } else if (actionUpper.includes('LOGIN')) {
        return { color: '#e3f2fd' }; // Blue
    } else if (actionUpper.includes('LOGOUT')) {
        return { color: '#f5f5f5' }; // Gray
    }

    return { color: '#f0f0f0' }; // Default gray
}

// Pagination helper for activity logs
function updateLogsPagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('logs-pagination');
    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';

    // Previous button
    if (currentPage > 0) {
        html += `<button onclick="loadActivityLogs(${currentPage - 1})" class="page-btn">
                    <i class="fas fa-chevron-left"></i>
                 </button>`;
    }

    // Page numbers
    for (let i = 0; i < totalPages; i++) {
        if (i === currentPage) {
            html += `<button class="page-btn active">${i + 1}</button>`;
        } else if (i === 0 || i === totalPages - 1 || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button onclick="loadActivityLogs(${i})" class="page-btn">${i + 1}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }

    // Next button
    if (currentPage < totalPages - 1) {
        html += `<button onclick="loadActivityLogs(${currentPage + 1})" class="page-btn">
                    <i class="fas fa-chevron-right"></i>
                 </button>`;
    }

    html += '</div>';
    paginationContainer.innerHTML = html;
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin dashboard initialized');

    // Check authentication
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId || userRole !== 'ADMIN') {
        showTemporaryModal('Access denied. Redirecting to login...');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
        return;
    }

    // Load initial data
    loadDashboardStats();
    loadSettings();

    // Setup search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    performGlobalSearch(query);
                }, 500);
            } else if (query.length === 0) {
                // Clear search and reload current tab
                clearSearch();
            }
        });
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl + / to focus search
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-box input');
            if (searchInput) searchInput.focus();
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            closeCustomModal();
            closeConfirmModal();
            const loadingModal = document.querySelector('.custom-modal-overlay.loading');
            if (loadingModal) loadingModal.remove();
        }
    });

    // Auto-refresh dashboard every 5 minutes
    setInterval(() => {
        const currentTab = document.querySelector('.tab-content.active');
        if (currentTab && currentTab.id === 'dashboard-tab') {
            loadDashboardStats();
        }
    }, 5 * 60 * 1000);
});

async function performGlobalSearch(query) {
    try {
        showLoadingModal('Searching...');

        // Try users first
        let response = await apiCall(`/users/search?query=${encodeURIComponent(query)}`);

        if (response.status === 'success' && response.users.length > 0) {
            showSearchResults('users', response.users);
        } else {
            // Try posts
            response = await apiCall(`/posts/search?query=${encodeURIComponent(query)}`);

            if (response.status === 'success' && response.posts.length > 0) {
                showSearchResults('posts', response.posts);
            } else {
                showTemporaryModal('No results found');
            }
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Search failed:', error);
    }
}

function showSearchResults(type, results) {
    const modalHTML = `
        <div class="custom-modal-overlay" onclick="closeCustomModal()">
            <div class="custom-modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <h3 style="margin-bottom: 15px;">Search Results (${results.length} found)</h3>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${results.map((item, index) => `
                        <div class="search-result-item" onclick="viewSearchResult('${type}', ${item.id})" 
                             style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;">
                            <div style="font-weight: 500; margin-bottom: 5px;">
                                ${type === 'users' ? `${item.firstName} ${item.lastName}` : item.title}
                            </div>
                            <div style="font-size: 13px; color: #666;">
                                ${type === 'users' ? item.email : `By ${item.user.firstName} ${item.user.lastName}`}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="closeCustomModal()" class="btn-primary" style="margin-top: 20px; padding: 10px 20px;">
                    Close
                </button>
            </div>
        </div>
    `;

    const existingModal = document.querySelector('.custom-modal-overlay');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function viewSearchResult(type, id) {
    closeCustomModal();

    switch(type) {
        case 'users':
            switchTab('users');
            setTimeout(() => viewUser(id), 100);
            break;
        case 'posts':
            switchTab('posts');
            setTimeout(() => viewPost(id), 100);
            break;
    }
}

function clearSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) searchInput.value = '';

    // Reload current tab
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        switch(activeTab.id) {
            case 'dashboard-tab':
                loadDashboardStats();
                break;
            case 'users-tab':
                loadUsers();
                break;
            case 'posts-tab':
                loadPosts();
                break;
            case 'comments-tab':
                loadComments();
                break;
            case 'reports-tab':
                loadReports();
                break;
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showTemporaryModal('No data to export');
        return;
    }

    try {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const cell = row[header];
                if (cell === null || cell === undefined) return '';
                if (typeof cell === 'object') return JSON.stringify(cell);
                return `"${String(cell).replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showTemporaryModal('Export started');
    } catch (error) {
        console.error('Export failed:', error);
        showTemporaryModal('Export failed');
    }
}

async function exportUsers() {
    try {
        showLoadingModal('Preparing export...');
        const response = await apiCall('/users?status=all&page=0&size=1000');

        if (response.status === 'success') {
            exportToCSV(response.users, 'users');
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Export failed:', error);
    }
}

async function exportPosts() {
    try {
        showLoadingModal('Preparing export...');
        const response = await apiCall('/posts?status=all&page=0&size=1000');

        if (response.status === 'success') {
            exportToCSV(response.posts, 'posts');
        }

        hideLoadingModal();
    } catch (error) {
        hideLoadingModal();
        console.error('Export failed:', error);
    }
}

// ==================== ERROR HANDLING ====================

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showTemporaryModal('An unexpected error occurred');
});

window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
    showTemporaryModal('A system error occurred');
});

// ==================== RESPONSIVE BEHAVIOR ====================

function handleResize() {
    const sidebar = document.getElementById('leftSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (window.innerWidth > 1024) {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
}

window.addEventListener('resize', handleResize);
handleResize(); // Initial check

// ==================== PAGE VISIBILITY ====================

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Refresh data when page becomes visible again
        const currentTab = document.querySelector('.tab-content.active');
        if (currentTab) {
            switch(currentTab.id) {
                case 'dashboard-tab':
                    loadDashboardStats();
                    break;
                case 'users-tab':
                    loadUsers();
                    break;
                case 'posts-tab':
                    loadPosts();
                    break;
                case 'reports-tab':
                    loadReports();
                    break;
            }
        }
    }
});

// Initialize on load
console.log('Admin JavaScript loaded successfully');