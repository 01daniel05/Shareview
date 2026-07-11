    // ============================================================
    //  CONFIGURATION
    // ============================================================
    let API_BASE_URL;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = 'http://localhost:8080';
    console.log('🔧 Running in LOCAL mode');
} else if (window.location.hostname.includes('railway.app')) {
    API_BASE_URL = 'https://shareview-backend-production.up.railway.app';
    console.log('🚀 Running in PRODUCTION mode');
} else {
    API_BASE_URL = 'https://shareview-1.onrender.com';
    console.log('🌐 Using fallback URL');
}
    const ADMIN_API = `${API_BASE_URL}/admin`;

    // ============================================================
    //  STATE
    // ============================================================
    let currentFilter = { users: 'all', reports: 'PENDING' };
    let currentPage = { users: 0, reports: 0 };
    const PAGE_SIZE = 10;
    let currentActiveTab = null;
    let isLoadingDashboard = false;

    // ============================================================
    //  DOM REFS
    // ============================================================
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    // ============================================================
    //  API HELPER
    // ============================================================
    async function apiCall(endpoint, method = 'GET', body = null) {
    try {
    const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
};
    const userId = localStorage.getItem('userId');
    if (userId) options.headers['userId'] = userId;
    if (body) options.body = JSON.stringify(body);

    const resp = await fetch(`${ADMIN_API}${endpoint}`, options);
    if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || 'Request failed');
}
    return await resp.json();
} catch (e) {
    console.error('API Error:', e);
    showTemporaryModal(`Error: ${e.message}`, 'error');
    throw e;
}
}

    // ============================================================
    //  SIDEBAR
    // ============================================================
    function toggleSidebar() {
    const sidebar = document.getElementById('leftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.contains('active');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = isOpen ? '' : 'hidden';
}

    function closeSidebar() {
    const sidebar = document.getElementById('leftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

    // Close sidebar on escape
    document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
    closeSidebar();
    closeCustomModal();
    closeConfirmModal();
}
});

    // ============================================================
    //  PROFILE DROPDOWN
    // ============================================================
    function toggleProfileDropdown() {
    document.getElementById('profileDropdown').classList.toggle('active');
}
    document.addEventListener('click', (e) => {
    const container = document.querySelector('.profile-container');
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && container && !container.contains(e.target)) {
    dropdown.classList.remove('active');
}
});

    // ============================================================
    //  MOBILE SEARCH TOGGLE
    // ============================================================
    let mobileSearchOpen = false;

    function toggleMobileSearch() {
    const container = document.getElementById('navSearchContainer');
    if (window.innerWidth <= 768) {
    mobileSearchOpen = !mobileSearchOpen;
    container.classList.toggle('mobile-visible', mobileSearchOpen);
    if (mobileSearchOpen) {
    const input = container.querySelector('input');
    setTimeout(() => input?.focus(), 100);
}
}
}

    // Hide mobile search on resize to desktop
    window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
    document.getElementById('navSearchContainer')?.classList.remove('mobile-visible');
    mobileSearchOpen = false;
}
    handleResize();
});

    // ============================================================
    //  NOTIFICATIONS
    // ============================================================
    function toggleNotifications() {
    showTemporaryModal('Notifications feature coming soon!', 'info');
}

    // ============================================================
    //  TAB SWITCHING
    // ============================================================
    function switchTab(tabName, element) {
    if (currentActiveTab === tabName) {
    closeSidebar();
    return;
}
    currentActiveTab = tabName;

    // Tabs
    $$('.tab-content').forEach(t => t.classList.remove('active'));
    const target = document.getElementById(`${tabName}-tab`);
    if (target) target.classList.add('active');

    // Menu items
    $$('.menu-item').forEach(m => m.classList.remove('active'));
    if (element) {
    element.classList.add('active');
} else {
    const match = Array.from(document.querySelectorAll('.menu-item'))
    .find(m => m.getAttribute('onclick')?.includes(`'${tabName}'`));
    if (match) match.classList.add('active');
}

    // Load data
    switch (tabName) {
    case 'dashboard':
    loadDashboardStats();
    loadActivityLogs();
    break;
    case 'users':
    loadUsers();
    break;
    case 'reports':
    loadReports();
    break;
    case 'settings':
    loadSettings();
    break;
}

    if (window.innerWidth <= 1024) closeSidebar();
}

    // ============================================================
    //  DASHBOARD
    // ============================================================
    async function loadDashboardStats() {
    if (isLoadingDashboard) return;
    try {
    isLoadingDashboard = true;
    const resp = await apiCall('/dashboard/stats');
    if (resp.status === 'success') {
    const d = resp.data;
    const el = document.getElementById('total-users');
    if (el) el.textContent = d.users?.total || 0;
    const el2 = document.getElementById('pending-reports');
    if (el2) el2.textContent = d.reports || 0;
}
} catch (e) { console.error(e); } finally { isLoadingDashboard = false; }
}

    // ============================================================
    //  USERS
    // ============================================================
    async function loadUsers(status = null, page = null) {
    const filter = status !== null ? status : currentFilter.users;
    const pg = page !== null ? page : currentPage.users;

    const loading = document.getElementById('users-loading');
    const wrapper = document.getElementById('usersTableWrapper');
    if (loading) loading.style.display = 'block';
    if (wrapper) wrapper.style.display = 'none';

    try {
    const resp = await apiCall(`/users?status=${filter}&page=${pg}&size=${PAGE_SIZE}`);
    if (resp.status === 'success') {
    displayUsers(resp.users || []);
    updatePagination('users', resp.currentPage || 0, resp.totalPages || 0);
    currentPage.users = resp.currentPage || 0;
    if (loading) loading.style.display = 'none';
    if (wrapper) wrapper.style.display = 'block';
}
} catch (e) {
    console.error(e);
    if (loading) {
    loading.innerHTML = `
                        <i class="fas fa-exclamation-triangle" style="color:#e65100;"></i>
                        <p style="color:#e65100;">Failed to load users</p>
                        <button onclick="loadUsers()" class="btn-secondary" style="margin-top:10px;" type="button">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    `;
    loading.style.display = 'block';
}
}
}

    function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!users || users.length === 0) {
    tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No users found</td></tr>';
    return;
}
    users.forEach(u => {
    const tr = document.createElement('tr');
    const status = u.status || 'UNKNOWN';
    const firstName = u.firstName || '';
    const lastName = u.lastName || '';
    const email = u.email || '';
    const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
    const defaultAvatar =
    `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName+' '+lastName)}&background=667eea&color=fff&size=128`;

    tr.innerHTML = `
                    <td>${u.id || ''}</td>
                    <td>
                        <div class="user-info">
                            <img src="${u.profilePicture || defaultAvatar}" alt="${firstName}" onerror="this.src='${defaultAvatar}'">
                            <span>${firstName} ${lastName}</span>
                        </div>
                    </td>
                    <td>${email}</td>
                    <td>${createdAt}</td>
                    <td><span class="status-badge status-${status.toUpperCase()}">${status}</span></td>
                    <td class="actions">
                        <button class="action-btn btn-view" onclick="viewUser(${u.id})" title="View" type="button"><i class="fas fa-eye"></i></button>
                        ${status === 'ACTIVE' || status === 'active' ? `
                            <button class="action-btn btn-ban" onclick="suspendUser(${u.id})" title="Suspend" type="button"><i class="fas fa-ban"></i></button>
                        ` : `
                            <button class="action-btn btn-edit" onclick="restoreUser(${u.id})" title="Restore" type="button"><i class="fas fa-undo"></i></button>
                        `}
                        <button class="action-btn btn-delete" onclick="deleteUser(${u.id})" title="Delete" type="button"><i class="fas fa-trash"></i></button>
                    </td>
                `;
    tbody.appendChild(tr);
});
}

    function filterUsers(status, el) {
    currentFilter.users = status;
    currentPage.users = 0;
    const parent = el.parentElement;
    parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    loadUsers(status, 0);
}

    // ============================================================
    //  REPORTS
    // ============================================================
    async function loadReports(status = null, page = null) {
    const filter = status !== null ? status : currentFilter.reports;
    const pg = page !== null ? page : currentPage.reports;

    const loading = document.getElementById('reports-loading');
    const wrapper = document.getElementById('reportsTableWrapper');
    if (loading) loading.style.display = 'block';
    if (wrapper) wrapper.style.display = 'none';

    try {
    const resp = await apiCall(`/reports?status=${filter}&page=${pg}&size=${PAGE_SIZE}`);
    if (resp.status === 'success') {
    displayReports(resp.reports || []);
    updatePagination('reports', resp.currentPage || 0, resp.totalPages || 0);
    currentPage.reports = resp.currentPage || 0;
    if (loading) loading.style.display = 'none';
    if (wrapper) wrapper.style.display = 'block';
}
} catch (e) {
    console.error(e);
    if (loading) {
    loading.innerHTML = `
                        <i class="fas fa-exclamation-triangle" style="color:#e65100;"></i>
                        <p style="color:#e65100;">Failed to load reports</p>
                        <button onclick="loadReports()" class="btn-secondary" style="margin-top:10px;" type="button">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    `;
    loading.style.display = 'block';
}
}
}

    function displayReports(reports) {
    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!reports || reports.length === 0) {
    tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No reports found</td></tr>';
    return;
}
    reports.forEach(r => {
    const tr = document.createElement('tr');
    const status = r.status || 'PENDING';
    tr.innerHTML = `
                    <td>${r.id || ''}</td>
                    <td>${r.post?.id || 'N/A'}</td>
                    <td>${r.user?.firstName || ''} ${r.user?.lastName || ''}</td>
                    <td>${r.reason || ''}</td>
                    <td>${r.reportedAt ? new Date(r.reportedAt).toLocaleDateString() : 'N/A'}</td>
                    <td class="actions">
                        <button class="action-btn btn-view" onclick="viewReport(${r.id})" title="View" type="button"><i class="fas fa-eye"></i></button>
                        ${status === 'PENDING' ? `
                            <button class="action-btn btn-edit" onclick="resolveReport(${r.id})" title="Resolve" type="button"><i class="fas fa-check"></i></button>
                            <button class="action-btn btn-ban" onclick="dismissReport(${r.id})" title="Dismiss" type="button"><i class="fas fa-times"></i></button>
                        ` : `
                            <span class="status-badge status-${status}">${status}</span>
                        `}
                    </td>
                `;
    tbody.appendChild(tr);
});
}

    function filterReports(status, el) {
    currentFilter.reports = status;
    currentPage.reports = 0;
    const parent = el.parentElement;
    parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    loadReports(status, 0);
}

    // ============================================================
    //  USER ACTIONS
    // ============================================================
    async function viewUser(userId) {
    try {
    showLoadingModal('Loading user details...');
    const resp = await apiCall(`/users/${userId}`);
    if (resp.status === 'success') {
    displayUserDetails(resp.data);
}
    hideLoadingModal();
} catch (e) { hideLoadingModal();
    console.error(e); }
}

    function displayUserDetails(data) {
    const u = data.user || {};
    const s = data.stats || {};
    const html = `
                <div class="user-details">
                    <p><strong>ID:</strong> ${u.id || ''}</p>
                    <p><strong>Name:</strong> ${u.firstName || ''} ${u.lastName || ''}</p>
                    <p><strong>Email:</strong> ${u.email || ''}</p>
                    <p><strong>Gender:</strong> ${u.gender || 'Not specified'}</p>
                    <p><strong>Birth Date:</strong> ${u.bDate || 'Not specified'}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${(u.status || 'UNKNOWN').toUpperCase()}">${u.status || 'UNKNOWN'}</span></p>
                    <p><strong>Role:</strong> ${u.role || 'USER'}</p>
                    <p><strong>Joined:</strong> ${u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'}</p>
                    <p><strong>Total Posts:</strong> ${s.posts || 0}</p>
                    <p><strong>Total Comments:</strong> ${s.comments || 0}</p>
                    ${u.suspensionReason ? `<p><strong>Suspension Reason:</strong> ${u.suspensionReason}</p>` : ''}
                    ${u.suspendedAt ? `<p><strong>Suspended At:</strong> ${new Date(u.suspendedAt).toLocaleString()}</p>` : ''}
                </div>
            `;
    showCustomModal('User Details', html);
}

    async function suspendUser(userId) {
    const reason = prompt('Enter suspension reason:');
    if (!reason || reason.trim() === '') {
    showTemporaryModal('Suspension reason is required', 'error');
    return;
}
    showConfirmModal('Suspend this user?', async () => {
    try {
    showLoadingModal('Suspending user...');
    const resp = await apiCall(`/users/${userId}/suspend`, 'PUT', { reason: reason.trim() });
    if (resp.status === 'success') {
    showTemporaryModal('User suspended successfully', 'success');
    loadUsers();
}
    hideLoadingModal();
} catch (e) { hideLoadingModal();
    console.error(e); }
});
}

    async function restoreUser(userId) {
    showConfirmModal('Restore this user?', async () => {
        try {
            showLoadingModal('Restoring user...');
            const resp = await apiCall(`/users/${userId}/restore`, 'PUT');
            if (resp.status === 'success') {
                showTemporaryModal('User restored successfully', 'success');
                loadUsers();
            }
            hideLoadingModal();
        } catch (e) { hideLoadingModal();
            console.error(e); }
    });
}

    async function deleteUser(userId) {
    showConfirmModal('Permanently delete this user? This cannot be undone.', async () => {
        try {
            showLoadingModal('Deleting user...');
            const resp = await apiCall(`/users/${userId}`, 'DELETE');
            if (resp.status === 'success') {
                showTemporaryModal('User deleted successfully', 'success');
                loadUsers();
            }
            hideLoadingModal();
        } catch (e) { hideLoadingModal();
            console.error(e); }
    });
}

    // ============================================================
    //  REPORT ACTIONS
    // ============================================================
    async function viewReport(reportId) {
    try {
    showLoadingModal('Loading report...');
    const resp = await apiCall(`/reports/${reportId}`);
    if (resp.status === 'success') {
    const r = resp.report || {};
    const html = `
                        <div class="report-details">
                            <p><strong>Report ID:</strong> ${r.id || ''}</p>
                            <p><strong>Status:</strong> <span class="status-badge status-${(r.status || 'PENDING').toUpperCase()}">${r.status || 'PENDING'}</span></p>
                            <p><strong>Reported By:</strong> ${r.user?.firstName || ''} ${r.user?.lastName || ''}</p>
                            <p><strong>Reported At:</strong> ${r.reportedAt ? new Date(r.reportedAt).toLocaleString() : 'N/A'}</p>
                            <p><strong>Reason:</strong> ${r.reason || ''}</p>
                            <hr style="margin:12px 0;border-color:#eee;">
                            <p><strong>Post ID:</strong> ${r.post?.id || 'N/A'}</p>
                            <p><strong>Post Title:</strong> ${r.post?.title || 'N/A'}</p>
                            <p><strong>Post Author:</strong> ${r.post?.user?.firstName || ''} ${r.post?.user?.lastName || ''}</p>
                            ${r.resolutionAction ? `<p><strong>Resolution Action:</strong> ${r.resolutionAction}</p>` : ''}
                            ${r.resolutionNotes ? `<p><strong>Resolution Notes:</strong> ${r.resolutionNotes}</p>` : ''}
                            ${r.resolvedAt ? `<p><strong>Resolved At:</strong> ${new Date(r.resolvedAt).toLocaleString()}</p>` : ''}
                        </div>
                    `;
    showCustomModal('Report Details', html);
}
    hideLoadingModal();
} catch (e) { hideLoadingModal();
    console.error(e); }
}

    async function resolveReport(reportId) {
    const action = prompt('Enter action (remove_content, warn_user, dismiss):');
    if (!action) return;
    const notes = prompt('Enter resolution notes (optional):') || '';
    showConfirmModal('Resolve this report?', async () => {
    try {
    showLoadingModal('Resolving...');
    const resp = await apiCall(`/reports/${reportId}/resolve`, 'PUT', { action: action.trim(),
    notes: notes.trim() });
    if (resp.status === 'success') {
    showTemporaryModal('Report resolved', 'success');
    loadReports();
}
    hideLoadingModal();
} catch (e) { hideLoadingModal();
    console.error(e); }
});
}

    async function dismissReport(reportId) {
    showConfirmModal('Dismiss this report?', async () => {
        try {
            showLoadingModal('Dismissing...');
            const resp = await apiCall(`/reports/${reportId}/dismiss`, 'PUT');
            if (resp.status === 'success') {
                showTemporaryModal('Report dismissed', 'success');
                loadReports();
            }
            hideLoadingModal();
        } catch (e) { hideLoadingModal();
            console.error(e); }
    });
}

    // ============================================================
    //  PAGINATION
    // ============================================================
    function updatePagination(type, currentPage, totalPages) {
    const container = document.getElementById(`${type}-pagination`);
    if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
}
    let html = '<div class="pagination">';
    if (currentPage > 0) {
    html +=
    `<button class="page-btn" onclick="changePage('${type}', ${currentPage - 1})" type="button"><i class="fas fa-chevron-left"></i></button>`;
}
    for (let i = 0; i < totalPages; i++) {
    if (i === currentPage) {
    html += `<button class="page-btn active" type="button">${i + 1}</button>`;
} else if (i === 0 || i === totalPages - 1 || (i >= currentPage - 1 && i <= currentPage + 1)) {
    html += `<button class="page-btn" onclick="changePage('${type}', ${i})" type="button">${i + 1}</button>`;
} else if (i === currentPage - 2 || i === currentPage + 2) {
    html += `<span class="page-ellipsis">…</span>`;
}
}
    if (currentPage < totalPages - 1) {
    html +=
    `<button class="page-btn" onclick="changePage('${type}', ${currentPage + 1})" type="button"><i class="fas fa-chevron-right"></i></button>`;
}
    html += '</div>';
    container.innerHTML = html;
}

    function changePage(type, page) {
    currentPage[type] = page;
    if (type === 'users') loadUsers(null, page);
    else if (type === 'reports') loadReports(null, page);
}

    // ============================================================
    //  ACTIVITY LOGS
    // ============================================================
    async function loadActivityLogs(page = 0) {
    const container = document.getElementById('activity-logs-container');
    if (!container) return;
    container.innerHTML = `
                <div class="activity-empty-state">
                    <i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--primary);"></i>
                    <h3>Loading activity logs...</h3>
                    <p>Please wait</p>
                </div>
            `;
    try {
    const resp = await apiCall(`/logs?page=${page}&size=10`);
    if (resp.status === 'success') {
    const logs = resp.logs || resp.data || [];
    displayActivityLogs(logs);
    const totalPages = resp.totalPages || 0;
    if (totalPages > 1) {
    updateLogsPagination(page, totalPages);
} else {
    document.getElementById('logs-pagination').innerHTML = '';
}
} else {
    container.innerHTML = `
                        <div class="activity-empty-state">
                            <i class="fas fa-exclamation-triangle" style="color:#ff9800;"></i>
                            <h3 style="color:#ff9800;">Failed to load</h3>
                            <p>Please try again</p>
                            <button onclick="loadActivityLogs()" class="btn-secondary" style="margin-top:12px;" type="button">
                                <i class="fas fa-sync-alt"></i> Retry
                            </button>
                        </div>
                    `;
}
} catch (e) {
    console.error(e);
    container.innerHTML = `
                    <div class="activity-empty-state">
                        <i class="fas fa-exclamation-circle" style="color:#c62828;"></i>
                        <h3 style="color:#c62828;">Error</h3>
                        <p>${e.message || 'Could not load activity logs'}</p>
                        <button onclick="loadActivityLogs()" class="btn-secondary" style="margin-top:12px;" type="button">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                `;
}
}

    function displayActivityLogs(logs) {
    const container = document.getElementById('activity-logs-container');
    if (!container) return;
    if (!logs || logs.length === 0) {
    container.innerHTML = `
                    <div class="activity-empty-state">
                        <i class="fas fa-history"></i>
                        <h3>No Activity Logs</h3>
                        <p>There are no activity logs to display.</p>
                    </div>
                `;
    return;
}
    let html = '';
    logs.forEach(log => {
    const ts = log.timestamp || log.createdAt || Date.now();
    const timestamp = new Date(ts).toLocaleString();
    const userInfo = log.userId ? `User ID: ${log.userId}` :
    (log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}` : 'System');
    const action = log.action || log.type || 'Activity';
    html += `
                    <div class="activity-log-item">
                        <div class="log-header">
                            <span class="log-action">${action}</span>
                            <span class="log-timestamp">${timestamp}</span>
                        </div>
                        <div class="log-description">${log.description || log.message || 'No description'}</div>
                        <div class="log-footer">
                            <span class="log-user">${userInfo}</span>
                            ${log.id ? `<span class="log-id">ID: ${log.id}</span>` : ''}
                        </div>
                    </div>
                `;
});
    container.innerHTML = html;
}

    function updateLogsPagination(currentPage, totalPages) {
    const container = document.getElementById('logs-pagination');
    if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }
    let html = '<div class="pagination">';
    if (currentPage > 0) {
    html +=
    `<button class="page-btn" onclick="loadActivityLogs(${currentPage - 1})" type="button"><i class="fas fa-chevron-left"></i></button>`;
}
    for (let i = 0; i < totalPages; i++) {
    if (i === currentPage) {
    html += `<button class="page-btn active" type="button">${i + 1}</button>`;
} else if (i === 0 || i === totalPages - 1 || (i >= currentPage - 1 && i <= currentPage + 1)) {
    html += `<button class="page-btn" onclick="loadActivityLogs(${i})" type="button">${i + 1}</button>`;
} else if (i === currentPage - 2 || i === currentPage + 2) {
    html += `<span class="page-ellipsis">…</span>`;
}
}
    if (currentPage < totalPages - 1) {
    html +=
    `<button class="page-btn" onclick="loadActivityLogs(${currentPage + 1})" type="button"><i class="fas fa-chevron-right"></i></button>`;
}
    html += '</div>';
    container.innerHTML = html;
}

    // ============================================================
    //  SETTINGS
    // ============================================================
    async function loadSettings() {
    const container = document.getElementById('settings-form');
    const loading = document.getElementById('settings-loading');
    if (!container) return;
    try {
    const resp = await apiCall('/settings');
    if (resp.status === 'success') {
    const s = resp.settings || {};
    container.innerHTML = `
                        <div style="display:grid; gap:16px;">
                            <div>
                                <label style="display:block;font-weight:600;margin-bottom:4px;font-size:14px;">Site Name</label>
                                <input type="text" id="site-name" value="${s.siteName || 'ShareView'}" style="width:100%;padding:10px 14px;border:2px solid #e0e4ea;border-radius:var(--radius-sm);font-size:14px;outline:none;transition:var(--transition);">
                            </div>
                            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                                <label style="font-weight:600;font-size:14px;">Maintenance Mode</label>
                                <input type="checkbox" id="maintenance-mode" ${s.maintenanceMode ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--primary);">
                            </div>
                            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                                <label style="font-weight:600;font-size:14px;">Registration Enabled</label>
                                <input type="checkbox" id="registration-enabled" ${s.registrationEnabled !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--primary);">
                            </div>
                            <div>
                                <label style="display:block;font-weight:600;margin-bottom:4px;font-size:14px;">Max Upload Size (bytes)</label>
                                <input type="number" id="max-upload-size" value="${s.maxUploadSize || 10485760}" style="width:100%;padding:10px 14px;border:2px solid #e0e4ea;border-radius:var(--radius-sm);font-size:14px;outline:none;transition:var(--transition);">
                            </div>
                            <button class="btn-primary" onclick="saveSettings()" type="button" style="justify-self:start;">
                                <i class="fas fa-save"></i> Save Settings
                            </button>
                        </div>
                    `;
}
} catch (e) { console.error(e); }
}

    async function saveSettings() {
    const settings = {
    siteName: document.getElementById('site-name')?.value || 'ShareView',
    maintenanceMode: document.getElementById('maintenance-mode')?.checked || false,
    registrationEnabled: document.getElementById('registration-enabled')?.checked !== false,
    maxUploadSize: parseInt(document.getElementById('max-upload-size')?.value) || 10485760,
};
    try {
    showLoadingModal('Saving...');
    const resp = await apiCall('/settings', 'PUT', settings);
    if (resp.status === 'success') {
    showTemporaryModal('Settings saved', 'success');
}
    hideLoadingModal();
} catch (e) { hideLoadingModal();
    console.error(e); }
}

    // ============================================================
    //  EXPORT USERS
    // ============================================================
    async function exportUsers() {
    try {
    showLoadingModal('Preparing export...');
    const resp = await apiCall('/users?status=all&page=0&size=1000');
    if (resp.status === 'success') {
    const data = resp.users || [];
    if (data.length === 0) {
    showTemporaryModal('No users to export', 'error');
    hideLoadingModal();
    return;
}
    const headers = Object.keys(data[0]);
    const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
    const v = row[h];
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return `"${String(v).replace(/"/g, '""')}"`;
}).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showTemporaryModal('Export started', 'success');
}
    hideLoadingModal();
} catch (e) { hideLoadingModal();
    console.error(e); }
}

    // ============================================================
    //  LOGOUT
    // ============================================================
    function logout() {
    showConfirmModal('Logout?', () => {
        showLoadingModal('Logging out...');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        setTimeout(() => {
            hideLoadingModal();
            window.location.href = '/';
        }, 800);
    });
}

    // ============================================================
    //  MODAL SYSTEM
    // ============================================================
    function showCustomModal(title, bodyHTML) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    container.innerHTML = `
                <div class="custom-modal-overlay" onclick="closeCustomModal()">
                    <div class="custom-modal-content" onclick="event.stopPropagation()">
                        <h3>${title}</h3>
                        ${bodyHTML}
                        <div class="modal-actions">
                            <button class="btn-primary" onclick="closeCustomModal()" type="button">Close</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.style.overflow = 'hidden';
}

    function closeCustomModal() {
    const container = document.getElementById('modalContainer');
    if (container) container.innerHTML = '';
    document.body.style.overflow = '';
}

    function showLoadingModal(message = 'Loading...') {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    container.innerHTML = `
                <div class="custom-modal-overlay" onclick="closeLoadingModal()">
                    <div class="custom-modal-content loading-content" onclick="event.stopPropagation()" style="max-width:360px;text-align:center;">
                        <div class="loading-spinner"></div>
                        <p style="color:#666;font-size:15px;">${message}</p>
                    </div>
                </div>
            `;
    document.body.style.overflow = 'hidden';
}

    function hideLoadingModal() {
    const container = document.getElementById('modalContainer');
    if (container && container.innerHTML.includes('loading-spinner')) {
    container.innerHTML = '';
    document.body.style.overflow = '';
}
}

    function closeLoadingModal() {
    // Only close if it's a loading modal (no other content)
    const container = document.getElementById('modalContainer');
    if (container && container.innerHTML.includes('loading-spinner')) {
    container.innerHTML = '';
    document.body.style.overflow = '';
}
}

    let confirmCallback = null;

    function showConfirmModal(message, onConfirm) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    confirmCallback = onConfirm;
    container.innerHTML = `
                <div class="custom-modal-overlay" onclick="closeConfirmModal()">
                    <div class="custom-modal-content confirm-content" onclick="event.stopPropagation()" style="max-width:420px;">
                        <div class="confirm-icon"><i class="fas fa-exclamation-circle"></i></div>
                        <div class="confirm-message">${message}</div>
                        <div class="modal-actions">
                            <button class="btn-secondary" onclick="closeConfirmModal()" type="button">Cancel</button>
                            <button class="btn-primary" onclick="executeConfirm()" type="button" style="background:#c62828;">Confirm</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.style.overflow = 'hidden';
}

    function closeConfirmModal() {
    const container = document.getElementById('modalContainer');
    if (container && container.innerHTML.includes('confirm-content')) {
    container.innerHTML = '';
    document.body.style.overflow = '';
    confirmCallback = null;
}
}

    function executeConfirm() {
    if (typeof confirmCallback === 'function') {
    const cb = confirmCallback;
    confirmCallback = null;
    closeConfirmModal();
    cb();
} else {
    closeConfirmModal();
}
}

    // ============================================================
    //  TEMPORARY TOAST NOTIFICATION
    // ============================================================
    function showTemporaryModal(message, type = 'info') {
    const existing = document.querySelector('.temp-modal');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = `temp-modal ${type}`;
    div.textContent = message;
    document.body.appendChild(div);

    // Auto dismiss after 4s
    const timer = setTimeout(() => {
    if (div.parentNode) div.remove();
}, 4000);

    // Dismiss on click
    div.addEventListener('click', () => {
    clearTimeout(timer);
    if (div.parentNode) div.remove();
});
}

    // ============================================================
    //  GLOBAL SEARCH
    // ============================================================
    let searchTimeout = null;

    document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
    searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const q = e.target.value.trim();
    if (q.length >= 2) {
    searchTimeout = setTimeout(() => performGlobalSearch(q), 500);
} else if (q.length === 0) {
    clearSearch();
}
});
    // Keyboard shortcut: Ctrl + /
    document.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey && ev.key === '/') {
    ev.preventDefault();
    searchInput.focus();
    searchInput.select();
}
});
}

    // Init
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    if (!userId || userRole !== 'ADMIN') {
    showTemporaryModal('Access denied. Redirecting...', 'error');
    setTimeout(() => window.location.href = '/login.html', 1500);
    return;
}

    loadDashboardStats();
    loadActivityLogs();
    loadSettings();

    // Auto-refresh dashboard every 5min
    setInterval(() => {
    const active = document.querySelector('.tab-content.active');
    if (active && active.id === 'dashboard-tab') {
    loadDashboardStats();
}
}, 5 * 60 * 1000);

    // Handle resize for sidebar
    handleResize();
});

    async function performGlobalSearch(query) {
    try {
    showLoadingModal('Searching...');
    const resp = await apiCall(`/users/search?query=${encodeURIComponent(query)}`);
    if (resp.status === 'success' && resp.users && resp.users.length > 0) {
    showSearchResults(resp.users);
} else {
    showTemporaryModal('No results found', 'info');
}
    hideLoadingModal();
} catch (e) {
    hideLoadingModal();
    console.error(e);
}
}

    function showSearchResults(users) {
    if (!users || users.length === 0) {
    showTemporaryModal('No users found', 'info');
    return;
}
    let items = users.map(u =>
    `<div class="search-result-item" onclick="viewUser(${u.id});closeCustomModal();" style="padding:10px 0;border-bottom:1px solid #f0f2f5;cursor:pointer;transition:background 0.2s;">
                    <div style="font-weight:600;color:#333;">${u.firstName || ''} ${u.lastName || ''}</div>
                    <div style="font-size:13px;color:#999;">${u.email || ''}</div>
                </div>`
    ).join('');

    const html = `
                <div style="max-height:300px;overflow-y:auto;">
                    ${items}
                </div>
                <div style="margin-top:12px;font-size:13px;color:#999;">${users.length} user(s) found</div>
            `;
    showCustomModal('Search Results', html);
}

    function clearSearch() {
    const input = document.getElementById('globalSearchInput');
    if (input) input.value = '';
    const active = document.querySelector('.tab-content.active');
    if (active) {
    const id = active.id;
    if (id === 'dashboard-tab') { loadDashboardStats();
    loadActivityLogs(); } else if (id === 'users-tab') loadUsers();
    else if (id === 'reports-tab') loadReports();
}
}

    // ============================================================
    //  RESPONSIVE HELPERS
    // ============================================================
    function handleResize() {
    const sidebar = document.getElementById('leftSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (window.innerWidth > 1024) {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}
    if (window.innerWidth > 768) {
    document.getElementById('navSearchContainer')?.classList.remove('mobile-visible');
    mobileSearchOpen = false;
}
}

    // ============================================================
    //  ERROR HANDLING
    // ============================================================
    window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
    showTemporaryModal('An unexpected error occurred', 'error');
});

    window.addEventListener('error', (e) => {
    console.error('JS error:', e.error);
    showTemporaryModal('A system error occurred', 'error');
});

    // ============================================================
    //  PAGE VISIBILITY
    // ============================================================
    document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
    const active = document.querySelector('.tab-content.active');
    if (active) {
    const id = active.id;
    if (id === 'dashboard-tab') { loadDashboardStats();
    loadActivityLogs(); } else if (id === 'users-tab') loadUsers();
    else if (id === 'reports-tab') loadReports();
}
}
});

    console.log('🚀 Admin dashboard fully loaded');
