// ============================================
// API BASE URL
// ============================================

let API_BASE_URL;

if (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') {
    API_BASE_URL = 'http://localhost:8080';
    console.log(' Running in LOCAL mode');
} else if (window.location.hostname.includes('railway.app')) {
    API_BASE_URL = 'https://shareview-backend-production.up.railway.app';
    console.log(' Running in PRODUCTION mode');
} else {
    API_BASE_URL = 'https://shareview-1.onrender.com';
    console.log(' Using fallback URL');
}

// ============================================
// UI TOGGLE FUNCTIONS
// ============================================

function activateMobileSearch() {
    if (window.innerWidth <= 912) {
        document.body.classList.add('mobile-search-active');
        const input = document.querySelector('.search-box input');
        if (input) input.focus();
    }
}

function deactivateMobileSearch() {
    document.body.classList.remove('mobile-search-active');
}

function toggleCreatePost() {
    const form = document.getElementById('createPostForm');
    const newsFeed = document.getElementById('newsFeed');
    const profilePage = document.getElementById('profilePage');
    const feed = document.querySelector('.feed');
    if (!form) return;

    form.classList.toggle('active');
    document.getElementById('reviewerCreatorContainer')?.classList.add('hidden');
    if (form.classList.contains('active')) {
        if (profilePage && profilePage.classList.contains('active')) {
            profilePage.classList.remove('active');
            profilePage.dataset.wasOpen = 'true';
        }
        feed?.classList.remove('hidden');
        form.style.display = 'block';
        if (newsFeed) newsFeed.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        form.style.display = 'none';
        if (newsFeed) newsFeed.style.display = 'block';
        if (profilePage && profilePage.dataset.wasOpen === 'true') {
            feed?.classList.add('hidden');
            profilePage.classList.add('active');
            delete profilePage.dataset.wasOpen;
        }
    }
}

function toggleProfileDropdown(event) {
    if (event) {
        event.stopPropagation();
    }
    const dropdown = document.getElementById('profileDropdown');
    if (!dropdown) {
        console.error('Profile dropdown element not found');
        return;
    }
    const isActive = dropdown.classList.toggle('active');
    console.log('Dropdown toggled:', isActive);
    const profilePic = event ? event.currentTarget : document.querySelector('.profile-pic');
    if (profilePic) {
        profilePic.classList.toggle('active', isActive);
    }
}

function toggleLeftSidebar() {
    const left = document.getElementById('leftSidebar');
    if (!left) return;
    left.classList.toggle('hidden');
}

function toggleRightSidebar() {
    const right = document.getElementById('rightSidebar');
    if (!right) return;
    right.classList.toggle('hidden');
}

function showFeed() {
    document.querySelector('.feed')?.classList.remove('hidden');
    document.getElementById('profilePage')?.classList.remove('active');
    document.getElementById('reviewerCreatorContainer')?.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showProfile(event) {
    event && event.preventDefault && event.preventDefault();
    document.querySelector('.feed')?.classList.add('hidden');
    document.getElementById('profilePage')?.classList.add('active');
    document.getElementById('reviewerCreatorContainer')?.classList.add('hidden');
    document.getElementById('profileDropdown')?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadUserProfile().then(() => {
        loadProfileContent('posts').catch(error => {
            console.error('Failed to load user posts:', error);
            showTemporaryModal('Failed to load posts');
        });
    }).catch(error => {
        console.error('Failed to load user profile:', error);
        showTemporaryModal('Failed to load profile');
    });
}

function openSavedPosts(event) {
    event.preventDefault();
    showProfile(event);
    setTimeout(() => {
        const savedTabBtn = document.querySelector('.profile-tab[data-tab="saved"]')
            || document.querySelector('.profile-tab:nth-child(2)');
        if (savedTabBtn) {
            savedTabBtn.click();
            setTimeout(() => {
                const savedContent = document.getElementById('savedContent');
                if (savedContent) {
                    savedContent.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 100);
        }
    }, 150);
}

function backHome(event) {
    if (event) event.preventDefault();
    document.querySelector('.feed')?.classList.remove('hidden');
    document.getElementById('profilePage')?.classList.remove('active');
    document.getElementById('reviewerCreatorContainer')?.classList.add('hidden');
    document.getElementById('profileDropdown')?.classList.remove('active');
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    const homeMenuItem = document.querySelector('.menu-item[data-tab="newsFeed"]');
    if (homeMenuItem) {
        homeMenuItem.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadPosts().then(() => {
    }).catch(error => {
        console.error('Failed to refresh feed:', error);
    });
}

function openLikedPosts(event) {
    event.preventDefault();
    showProfile(event);
    setTimeout(() => {
        const likedTabBtn = document.querySelector('.profile-tab[data-tab="liked"]')
            || document.querySelector('.profile-tab:nth-child(3)');
        if (likedTabBtn) {
            likedTabBtn.click();
            setTimeout(() => {
                const likedContent = document.getElementById('likedContent');
                if (likedContent) {
                    likedContent.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 100);
        }
    }, 150);
}

function switchProfileTab(e, tabName) {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.profile-content').forEach(c => c.classList.remove('active'));
    e.currentTarget.classList.add('active');
    const map = { 'posts': 'postsContent', 'saved': 'savedContent', 'liked': 'likedContent' };
    const id = map[tabName];
    if (id) {
        const contentElement = document.getElementById(id);
        if (contentElement) {
            contentElement.classList.add('active');
            contentElement.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-loader-alt bx-spin'></i>
                    <div class="empty-state-text">Loading ${tabName}...</div>
                </div>
            `;
        }
    }
    setTimeout(() => {
        loadProfileContent(tabName).catch(error => {
            console.error('Failed to load profile content:', error);
            showTemporaryModal('Failed to load ' + tabName + ' content');
        });
    }, 50);
}

// ============================================
// POST MANAGEMENT – FILE UPLOAD & COMPRESSION
// ============================================

let selectedFiles = {
    images: [],
    documents: [],
    videos: []
};

const FILE_LIMITS = {
    IMAGE: 5 * 1024 * 1024,
    DOCUMENT: 10 * 1024 * 1024,
    VIDEO: 50 * 1024 * 1024,
    TOTAL: 100 * 1024 * 1024
};

const COMPRESSION_SETTINGS = {
    IMAGE: { maxWidth: 1200, quality: 0.7 },
    VIDEO: { maxWidth: 1280, maxBitrate: 2000000 }
};

function handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            if (!validateFileSize(file, 'image')) return;
            await processImageFile(file);
        }
    };
    input.click();
}

function handleDocumentUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.zip,.rar';
    input.multiple = true;
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            if (!validateFileSize(file, 'document')) return;
            await processDocumentFile(file);
        }
    };
    input.click();
}

function handleVideoUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.multiple = true;
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            if (!validateFileSize(file, 'video')) return;
            await processVideoFile(file);
        }
    };
    input.click();
}

function validateFileSize(file, type) {
    const maxSize = FILE_LIMITS[type.toUpperCase()];
    if (file.size > maxSize) {
        showTemporaryModal(`${file.name} is too large (max ${maxSize / 1024 / 1024}MB)`);
        return false;
    }
    const totalSize = calculateTotalFileSize() + file.size;
    if (totalSize > FILE_LIMITS.TOTAL) {
        showTemporaryModal(`Total files would exceed 100MB limit. Current: ${(calculateTotalFileSize() / 1024 / 1024).toFixed(1)}MB`);
        return false;
    }
    return true;
}

function showFilePreview(type, file, compressionInfo = null) {
    let previewContainer = document.querySelector('.file-preview-container');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.className = 'file-preview-container';
        previewContainer.innerHTML = `
            <div class="preview-carousel-wrapper">
                <button class="preview-carousel-btn prev-btn" onclick="scrollPreviewCarousel(-1)">
                    <i class='bx bx-chevron-left'></i>
                </button>
                <div class="file-previews-scroll">
                    <div class="file-previews-inner"></div>
                </div>
                <button class="preview-carousel-btn next-btn" onclick="scrollPreviewCarousel(1)">
                    <i class='bx bx-chevron-right'></i>
                </button>
            </div>
            <div class="total-size-indicator">
                Total: ${formatFileSize(calculateTotalFileSize())} / 100MB
            </div>
        `;
        const mediaUpload = document.querySelector('.media-upload');
        mediaUpload.after(previewContainer);
    }
    const previewsInner = previewContainer.querySelector('.file-previews-inner');
    const previewId = `preview-${type}-${Date.now()}`;
    const preview = document.createElement('div');
    preview.id = previewId;
    preview.className = 'file-preview-item';
    preview.dataset.filename = file.name;
    if (type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <div class="preview-image-wrapper">
                    <img src="${e.target.result}" alt="Preview" class="preview-image">
                    <button class="remove-file-btn" onclick="removeFile('${type}', \`${file.name.replace(/`/g, '\\`')}\`)">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="file-info">
                    <span class="file-name" title="${file.name}">${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                    ${compressionInfo ? `<span class="compression-badge">Compressed (${compressionInfo.savings}%)</span>` : ''}
                </div>
            `;
            previewsInner.appendChild(preview);
            updatePreviewCarouselControls();
            updateTotalSizeIndicator();
        };
        reader.readAsDataURL(file);
    } else if (type === 'video') {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <div class="preview-video-wrapper">
                    <video src="${e.target.result}" class="preview-video" controls></video>
                    <button class="remove-file-btn" onclick="removeFile('${type}', \`${file.name.replace(/`/g, '\\`')}\`)">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="file-info">
                    <span class="file-name" title="${file.name}">${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                    ${compressionInfo ? `<span class="compression-badge">Compressed (${compressionInfo.savings}%)</span>` : ''}
                </div>
            `;
            previewsInner.appendChild(preview);
            updatePreviewCarouselControls();
            updateTotalSizeIndicator();
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = `
            <div class="preview-document">
                <div class="preview-document-icon">
                    <i class='bx bx-file'></i>
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
                <button class="remove-file-btn" onclick="removeFile('${type}', \`${file.name.replace(/`/g, '\\`')}\`)">
                    <i class='bx bx-x'></i>
                </button>
            </div>
        `;
        previewsInner.appendChild(preview);
        updatePreviewCarouselControls();
        updateTotalSizeIndicator();
    }
}

function scrollPreviewCarousel(direction) {
    const scrollContainer = document.querySelector('.file-previews-scroll');
    if (!scrollContainer) return;
    const scrollAmount = 180;
    scrollContainer.scrollLeft += direction * scrollAmount;
    setTimeout(() => {
        updatePreviewCarouselControls();
    }, 100);
}

function updatePreviewCarouselControls() {
    const scrollContainer = document.querySelector('.file-previews-scroll');
    const prevBtn = document.querySelector('.preview-carousel-btn.prev-btn');
    const nextBtn = document.querySelector('.preview-carousel-btn.next-btn');
    if (!scrollContainer || !prevBtn || !nextBtn) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    if (scrollLeft <= 10) {
        prevBtn.style.opacity = '0';
        prevBtn.style.pointerEvents = 'none';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'auto';
    }
    if (scrollLeft >= scrollWidth - clientWidth - 10) {
        nextBtn.style.opacity = '0';
        nextBtn.style.pointerEvents = 'none';
    } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    }
}

function removeFile(type, filename) {
    if (type === 'image') {
        selectedFiles.images = selectedFiles.images.filter(item => item.file.name !== filename);
    } else if (type === 'document') {
        selectedFiles.documents = selectedFiles.documents.filter(item => item.file.name !== filename);
    } else if (type === 'video') {
        selectedFiles.videos = selectedFiles.videos.filter(item => item.file.name !== filename);
    }
    const preview = document.querySelector(`[data-filename="${filename}"]`);
    if (preview) {
        preview.style.transition = 'opacity 0.3s, transform 0.3s';
        preview.style.opacity = '0';
        preview.style.transform = 'scale(0.8)';
        setTimeout(() => {
            preview.remove();
            updatePreviewCarouselControls();
            updateTotalSizeIndicator();
            const previewContainer = document.querySelector('.file-preview-container');
            if (previewContainer && previewContainer.querySelectorAll('.file-preview-item').length === 0) {
                previewContainer.remove();
            }
        }, 300);
    }
}

function updateTotalSizeIndicator() {
    const indicator = document.querySelector('.total-size-indicator');
    if (indicator) {
        const totalSize = calculateTotalFileSize();
        const percentage = (totalSize / FILE_LIMITS.TOTAL) * 100;
        indicator.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 600;">Total Size:</span>
                <span style="font-weight: 600; color: ${percentage > 80 ? '#dc3545' : percentage > 60 ? '#ffc107' : '#28a745'};">
                    ${formatFileSize(totalSize)} / 100MB
                </span>
            </div>
            <div class="size-progress">
                <div class="size-progress-bar" style="width: ${Math.min(percentage, 100)}%; background: ${percentage > 80 ? '#dc3545' : percentage > 60 ? '#ffc107' : '#28a745'};"></div>
            </div>
        `;
    }
}

function detectLinks(text) {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[^\s]{2,})/g;
    return text.replace(urlRegex, (url) => {
        let href = url;
        if (!url.startsWith('http')) {
            href = 'https://' + url;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="content-link">${url}</a>`;
    });
}

async function processImageFile(file) {
    try {
        console.log(`Processing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        let processedFile = file;
        let compressionInfo = null;
        if (file.size > FILE_LIMITS.IMAGE) {
            showLoadingModal(`Compressing ${file.name}...`);
            const result = await compressImage(file);
            processedFile = result.file;
            compressionInfo = result.info;
            hideLoadingModal();
            const savings = ((file.size - processedFile.size) / file.size * 100).toFixed(1);
            console.log(`Image compressed: ${savings}% savings`);
        }
        selectedFiles.images.push({
            file: processedFile,
            originalSize: file.size,
            compressedSize: processedFile.size,
            compressionInfo: compressionInfo
        });
        showFilePreview('image', processedFile, compressionInfo);
    } catch (error) {
        console.error('Error processing image:', error);
        showTemporaryModal(`Failed to process ${file.name}`);
    }
}

async function processDocumentFile(file) {
    try {
        console.log(`Processing document: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        if (file.size > FILE_LIMITS.DOCUMENT) {
            showTemporaryModal(`${file.name} is too large (max ${FILE_LIMITS.DOCUMENT / 1024 / 1024}MB)`);
            return;
        }
        selectedFiles.documents.push({
            file: file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionInfo: null
        });
        showFilePreview('document', file, null);
    } catch (error) {
        console.error('Error processing document:', error);
        showTemporaryModal(`Failed to process ${file.name}`);
    }
}

async function processVideoFile(file) {
    try {
        console.log(`Processing video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        let processedFile = file;
        let compressionInfo = null;
        if (file.size > FILE_LIMITS.VIDEO) {
            showLoadingModal(`Compressing ${file.name}... This may take a while.`);
            const result = await compressVideo(file);
            processedFile = result.file;
            compressionInfo = result.info;
            hideLoadingModal();
            const savings = ((file.size - processedFile.size) / file.size * 100).toFixed(1);
            console.log(`Video compressed: ${savings}% savings`);
        }
        selectedFiles.videos.push({
            file: processedFile,
            originalSize: file.size,
            compressedSize: processedFile.size,
            compressionInfo: compressionInfo
        });
        showFilePreview('video', processedFile, compressionInfo);
    } catch (error) {
        console.error('Error processing video:', error);
        showTemporaryModal(`Failed to process ${file.name}`);
    }
}

async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let { width, height } = img;
                if (width > COMPRESSION_SETTINGS.IMAGE.maxWidth) {
                    height = (height * COMPRESSION_SETTINGS.IMAGE.maxWidth) / width;
                    width = COMPRESSION_SETTINGS.IMAGE.maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    const savings = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
                    resolve({
                        file: compressedFile,
                        info: {
                            savings: savings,
                            originalWidth: img.width,
                            originalHeight: img.height,
                            compressedWidth: width,
                            compressedHeight: height
                        }
                    });
                }, 'image/jpeg', COMPRESSION_SETTINGS.IMAGE.quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function compressVideo(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = function() {
            const savings = 0;
            resolve({
                file: file,
                info: {
                    savings: savings,
                    duration: video.duration,
                    originalSize: file.size
                }
            });
            URL.revokeObjectURL(video.src);
        };
        video.onerror = () => {
            resolve({
                file: file,
                info: { savings: 0, originalSize: file.size }
            });
        };
    });
}

async function submitPost() {
    const title = document.querySelector('#createPostForm input[type="text"]').value;
    const content = document.querySelector('#createPostForm textarea').value;
    const userId = localStorage.getItem('userId');
    if (!title || !content) {
        showTemporaryModal('Please fill in all fields');
        return;
    }
    const totalSize = calculateTotalFileSize();
    if (totalSize > FILE_LIMITS.TOTAL) {
        showTemporaryModal(`Total file size too large (${(totalSize / 1024 / 1024).toFixed(1)}MB). Maximum is 100MB.`);
        return;
    }
    try {
        toggleCreatePost();
        showFeed();
        showUploadingModal();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('userId', userId);
        selectedFiles.images.forEach(item => formData.append('images', item.file));
        selectedFiles.documents.forEach(item => formData.append('documents', item.file));
        selectedFiles.videos.forEach(item => formData.append('videos', item.file));
        const response = await uploadWithProgress(formData);
        const data = await response.json();
        hideUploadingModal();
        if (response.ok && data.status === 'success') {
            showSuccessModal('Post uploaded successfully!');
            resetPostForm();
            await loadPosts();
        } else {
            showErrorModal(data.message || 'Failed to create post');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        hideUploadingModal();
        showErrorModal('Error uploading post. Please try again.');
    }
}

function uploadWithProgress(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                updateUploadProgress(percentComplete);
            }
        });
        xhr.addEventListener('load', () => {
            resolve({
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                json: () => Promise.resolve(JSON.parse(xhr.responseText))
            });
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
        xhr.open('POST', `${API_BASE_URL}/posts/multiple`);
        xhr.send(formData);
    });
}

function showUploadingModal() {
    const existingModal = document.querySelector('.upload-progress-modal');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.className = 'upload-progress-modal active';
    modal.innerHTML = `
        <div class="upload-progress-content">
            <div class="upload-icon">
                <i class='bx bx-cloud-upload bx-fade-up'></i>
            </div>
            <h3 class="upload-title">Uploading Your Post...</h3>
            <p class="upload-message">Please wait while we upload your files</p>
            
            <div class="upload-progress-container">
                <div class="upload-progress-bar">
                    <div class="upload-progress-fill" id="uploadProgressFill"></div>
                </div>
                <div class="upload-progress-text" id="uploadProgressText">0%</div>
            </div>

            <div class="upload-details">
                <div class="upload-detail-item">
                    <i class='bx bx-image'></i>
                    <span>${selectedFiles.images.length} Images</span>
                </div>
                <div class="upload-detail-item">
                    <i class='bx bx-file'></i>
                    <span>${selectedFiles.documents.length} Documents</span>
                </div>
                <div class="upload-detail-item">
                    <i class='bx bx-video'></i>
                    <span>${selectedFiles.videos.length} Videos</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function updateUploadProgress(percent) {
    const progressFill = document.getElementById('uploadProgressFill');
    const progressText = document.getElementById('uploadProgressText');
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${Math.round(percent)}%`;
}

function hideUploadingModal() {
    const modal = document.querySelector('.upload-progress-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

function showSuccessModal(message) {
    const modal = document.createElement('div');
    modal.className = 'notification-modal success active';
    modal.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon success">
                <i class='bx bx-check-circle'></i>
            </div>
            <h3 class="notification-title">Success!</h3>
            <p class="notification-message">${message}</p>
            <button class="notification-btn" onclick="closeNotificationModal(this)">
                Got it!
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => closeNotificationModal(modal.querySelector('.notification-btn')), 3000);
}

function showErrorModal(message) {
    const modal = document.createElement('div');
    modal.className = 'notification-modal error active';
    modal.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon error">
                <i class='bx bx-error-circle'></i>
            </div>
            <h3 class="notification-title">Upload Failed</h3>
            <p class="notification-message">${message}</p>
            <button class="notification-btn" onclick="closeNotificationModal(this)">
                Try Again
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeNotificationModal(button) {
    const modal = button.closest('.notification-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

function resetPostForm() {
    document.querySelector('#createPostForm input[type="text"]').value = '';
    document.querySelector('#createPostForm textarea').value = '';
    selectedFiles = { images: [], documents: [], videos: [] };
    const previewContainer = document.querySelector('.file-preview-container');
    if (previewContainer) previewContainer.remove();
}

function calculateTotalFileSize() {
    let total = 0;
    selectedFiles.images.forEach(item => total += item.file.size);
    selectedFiles.documents.forEach(item => total += item.file.size);
    selectedFiles.videos.forEach(item => total += item.file.size);
    return total;
}

// ============================================
// POST RENDERING & CAROUSEL
// ============================================

function renderPosts(posts) {
    const newsFeed = document.getElementById('newsFeed');
    if (!newsFeed) return;
    localStorage.setItem('cachedPosts', JSON.stringify(posts));
    newsFeed.innerHTML = posts.map(post => {
        console.log('Post data:', {
            id: post.id,
            title: post.title,
            documentUrlList: post.documentUrlList,
            imageUrlList: post.imageUrlList,
            videoUrlList: post.videoUrlList
        });
        return `
        <article class="post-card" data-post-id="${post.id}">
            <header class="post-header">
                <div class="post-avatar">${getUserInitials(post.user)}</div>
                <div class="post-info">
                    <div class="post-author">${post.user.firstName} ${post.user.lastName}</div>
                    <div class="post-time">${formatTime(post.createdAt)}</div>
                </div>
                <i class='bx bx-dots-horizontal-rounded post-menu' onclick="togglePostMenu(event, ${post.id}, ${post.user.id})"></i>
            </header>

            <div class="post-content">
                ${renderPostBody(post)}
            </div>

            <div class="post-stats">
                <span>${post.likesCount || 0} Likes</span>
                <span>${post.commentsCount || 0} Comments</span>
            </div>

            <div class="post-actions">
                <button class="post-action-btn like-btn" onclick="toggleLike(${post.id}, this)">
                    <i class='bx bx-like'></i> Like
                </button>
                <button class="post-action-btn" onclick="toggleComments(${post.id})">
                    <i class='bx bx-comment'></i> Comment
                </button>
                <button class="post-action-btn">
                    <i class='bx bx-share-alt'></i> Share
                </button>
                <button class="post-action-btn save-btn" onclick="toggleSave(${post.id}, this)">
                    <i class='bx bx-bookmark'></i> Save
                </button>
            </div>
        </article>
    `}).join('');
    initializePostCarousels();
    posts.forEach(post => {
        if (post.id) loadPostStatus(post.id);
    });
}

function renderFilesCarousel(post) {
    const allFiles = [
        ...(post.imageUrlList || []).map(url => ({ type: 'image', url })),
        ...(post.documentUrlList || []).map(url => ({ type: 'document', url })),
        ...(post.videoUrlList || []).map(url => ({ type: 'video', url }))
    ];
    if (allFiles.length === 0) return '';
    return `
        <div class="post-files-carousel">
            <div class="carousel-container">
                <button class="carousel-nav-btn prev" onclick="scrollPostCarousel(this, -1)">
                    <i class='bx bx-chevron-left'></i>
                </button>
                
                <div class="carousel-viewport">
                    <div class="carousel-track">
                        ${allFiles.map((file, index) => `
                            <div class="carousel-slide" data-index="${index}">
                                ${renderFileItem(file, post)}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <button class="carousel-nav-btn next" onclick="scrollPostCarousel(this, 1)">
                    <i class='bx bx-chevron-right'></i>
                </button>
            </div>
            
            ${allFiles.length > 1 ? `
                <div class="carousel-indicators">
                    ${allFiles.map((_, index) => `
                        <button class="indicator" onclick="goToSlide(this, ${index})"></button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

let currentPlayingVideo = null;
let currentMaximizedVideo = null;

function handleVideoClick(event, videoElement) {
    event.stopPropagation();
    if (currentPlayingVideo && currentPlayingVideo !== videoElement) {
        currentPlayingVideo.pause();
        const otherContainer = currentPlayingVideo.closest('.media-container');
        if (otherContainer) {
            otherContainer.classList.remove('video-playing');
            const otherPlayBtn = otherContainer.querySelector('.video-play-btn i');
            if (otherPlayBtn) {
                otherPlayBtn.className = 'bx bx-play';
            }
        }
    }
    if (videoElement.paused) {
        videoElement.play().then(() => {
            const container = videoElement.closest('.media-container');
            if (container) {
                container.classList.add('video-playing');
                const playBtn = container.querySelector('.video-play-btn i');
                if (playBtn) {
                    playBtn.className = 'bx bx-pause';
                }
            }
            currentPlayingVideo = videoElement;
        }).catch(error => {
            console.error('Error playing video:', error);
            showTemporaryModal('Error playing video');
        });
    } else {
        videoElement.pause();
        const container = videoElement.closest('.media-container');
        if (container) {
            container.classList.remove('video-playing');
            const playBtn = container.querySelector('.video-play-btn i');
            if (playBtn) {
                playBtn.className = 'bx bx-play';
            }
        }
        currentPlayingVideo = null;
    }
}



function showFeedSkeleton() {
    const newsFeed = document.getElementById('newsFeed');
    if (!newsFeed) return;
    newsFeed.innerHTML = `
        <div class="post-skeleton">
            <div class="skeleton-header">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-info">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
            <div class="skeleton-content">
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
            </div>
        </div>
    `;
}

function closeDownloadPermission() {
    const modal = document.querySelector('.download-permission-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
    document.removeEventListener('keydown', handleDownloadPermissionKeydown);
}

function handleDownloadPermissionKeydown(e) {
    if (e.key === 'Escape') {
        closeDownloadPermission();
    }
}


function initializePostCarousels() {
    document.querySelectorAll('.post-files-carousel').forEach(carousel => {
        const track = carousel.querySelector('.carousel-track');
        if (!track) return;
        initializeCarouselMedia(carousel);
        initializeVideoPlayers();
        track.addEventListener('scroll', () => {
            updateCarouselNavigation(carousel);
            pauseVideosOnScroll(carousel);
        });
        if (isTouchDevice()) {
            initializeCarouselTouchEvents(carousel);
        }
        initializeCarouselArrows(carousel);
        updateCarouselNavigation(carousel);
    });
}

function initializeCarouselMedia(carousel) {
    const slides = carousel.querySelectorAll('.carousel-slide');
    slides.forEach(slide => {
        const images = slide.querySelectorAll('img');
        const videos = slide.querySelectorAll('video');
        images.forEach(img => {
            img.onload = function() {
                detectMediaOrientation(img);
            };
            if (img.complete) {
                detectMediaOrientation(img);
            }
        });
        videos.forEach(video => {
            video.setAttribute('preload', 'metadata');
            video.addEventListener('loadstart', () => {
                video.parentElement.classList.add('video-loading');
            });
            video.addEventListener('loadeddata', () => {
                video.parentElement.classList.remove('video-loading');
                detectMediaOrientation(video);
            });
            video.addEventListener('ended', () => {
                const container = video.closest('.media-container');
                if (container) {
                    container.classList.remove('video-playing');
                    const playBtn = container.querySelector('.video-play-btn i');
                    if (playBtn) {
                        playBtn.className = 'bx bx-play';
                    }
                }
                currentPlayingVideo = null;
            });
            video.addEventListener('error', () => {
                video.parentElement.classList.remove('video-loading');
                console.error('Error loading video:', video.src);
            });
        });
    });
}

function detectMediaOrientation(media) {
    const container = media.closest('.media-container');
    if (!container) return;
    const isImage = media.tagName.toLowerCase() === 'img';
    let width, height;
    if (isImage) {
        width = media.naturalWidth;
        height = media.naturalHeight;
    } else {
        width = media.videoWidth;
        height = media.videoHeight;
    }
    container.classList.remove('media-landscape', 'media-portrait');
    if (width > height) {
        container.classList.add('media-landscape');
    } else {
        container.classList.add('media-portrait');
    }
}

function pauseVideosOnScroll(carousel) {
    const track = carousel.querySelector('.carousel-track');
    const viewport = carousel.querySelector('.carousel-viewport');
    if (!track || !viewport) return;
    const viewportRect = viewport.getBoundingClientRect();
    const videos = carousel.querySelectorAll('video');
    videos.forEach(video => {
        const videoRect = video.getBoundingClientRect();
        const isVisible = (
            videoRect.top >= viewportRect.top &&
            videoRect.bottom <= viewportRect.bottom &&
            videoRect.left >= viewportRect.left &&
            videoRect.right <= viewportRect.right
        );
        if (!isVisible && !video.paused) {
            video.pause();
            const container = video.closest('.media-container');
            if (container) {
                container.classList.remove('video-playing');
                const playBtn = container.querySelector('.video-play-btn i');
                if (playBtn) {
                    playBtn.className = 'bx bx-play';
                }
            }
            if (currentPlayingVideo === video) {
                currentPlayingVideo = null;
            }
        }
    });
}

function initializeCarouselTouchEvents(carousel) {
    let startX = 0;
    let isSwiping = false;
    let touchStartTime = 0;
    const track = carousel.querySelector('.carousel-track');
    if (!track) return;
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isSwiping = true;
        touchStartTime = Date.now();
        carousel.classList.add('touch-active');
        const prevBtn = carousel.querySelector('.prev');
        const nextBtn = carousel.querySelector('.next');
        if (prevBtn) prevBtn.style.opacity = '1';
        if (nextBtn) nextBtn.style.opacity = '1';
        const video = e.target.closest('video');
        if (video) {
            e.stopPropagation();
        }
    });
    carousel.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        const videoControls = e.target.closest('.video-controls-overlay');
        if (videoControls) {
            isSwiping = false;
        }
    });
    carousel.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        isSwiping = false;
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;
        const swipeThreshold = 50;
        const tapThreshold = 200;
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                carousel.querySelector('.next')?.click();
            } else {
                carousel.querySelector('.prev')?.click();
            }
        }
        setTimeout(() => {
            if (!carousel.matches(':hover')) {
                carousel.classList.remove('touch-active');
            }
        }, 2000);
    });
}

function scrollPostCarousel(button, direction) {
    if (isAnimating) return;
    const carousel = button.closest('.post-files-carousel');
    pauseVideosInCarousel(carousel);
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    if (!track || slides.length === 0) return;
    const slideWidth = slides[0].offsetWidth + 16;
    const currentScroll = track.scrollLeft;
    const maxScroll = track.scrollWidth - track.clientWidth;
    let newScroll = currentScroll + (direction * slideWidth);
    newScroll = Math.max(0, Math.min(newScroll, maxScroll));
    isAnimating = true;
    track.style.scrollBehavior = 'smooth';
    track.scrollTo({ left: newScroll, behavior: 'smooth' });
    setTimeout(() => {
        updateCarouselNavigation(carousel);
        isAnimating = false;
        track.style.scrollBehavior = 'auto';
    }, animationDuration);
    button.style.transform = 'translateY(-50%) scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'translateY(-50%) scale(1)';
    }, 150);
}

function pauseVideosInCarousel(carousel) {
    const videos = carousel.querySelectorAll('video');
    videos.forEach(video => {
        if (!video.paused) {
            video.pause();
            const container = video.closest('.media-container');
            if (container) {
                container.classList.remove('video-playing');
                const playBtn = container.querySelector('.video-play-btn i');
                if (playBtn) {
                    playBtn.className = 'bx bx-play';
                }
            }
        }
    });
    if (currentPlayingVideo && carousel.contains(currentPlayingVideo)) {
        currentPlayingVideo = null;
    }
}

function goToSlide(button, index) {
    if (isAnimating) return;
    const carousel = button.closest('.post-files-carousel');
    pauseVideosInCarousel(carousel);
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    if (!track || slides.length === 0) return;
    const slideWidth = slides[0].offsetWidth + 16;
    isAnimating = true;
    track.style.scrollBehavior = 'smooth';
    track.scrollTo({ left: index * slideWidth, behavior: 'smooth' });
    setTimeout(() => {
        updateCarouselNavigation(carousel);
        isAnimating = false;
        track.style.scrollBehavior = 'auto';
    }, animationDuration);
    button.style.transform = 'scale(1.4)';
    setTimeout(() => {
        button.style.transform = 'scale(1.2)';
    }, 200);
}

let isAnimating = false;
const animationDuration = 400;

function isTouchDevice() {
    return (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0));
}

function updateCarouselNavigation(carousel) {
    const track = carousel.querySelector('.carousel-track');
    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const indicators = carousel.querySelectorAll('.indicator');
    if (!track || !prevBtn || !nextBtn) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    const slideWidth = slides[0]?.offsetWidth + 16 || 1;
    const currentIndex = Math.round(scrollLeft / slideWidth);
    prevBtn.style.opacity = scrollLeft > 10 ? '1' : '0.5';
    nextBtn.style.opacity = scrollLeft < scrollWidth - clientWidth - 10 ? '1' : '0.5';
    slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === currentIndex);
    });
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentIndex);
    });
}

function initializeCarouselArrows(carousel) {
    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');
    if (!prevBtn || !nextBtn) return;
    if (isTouchDevice()) {
        prevBtn.style.opacity = '0';
        nextBtn.style.opacity = '0';
    } else {
        prevBtn.style.opacity = '0';
        nextBtn.style.opacity = '0';
        carousel.addEventListener('mouseenter', () => {
            prevBtn.style.opacity = '1';
            nextBtn.style.opacity = '1';
        });
        carousel.addEventListener('mouseleave', () => {
            prevBtn.style.opacity = '0';
            nextBtn.style.opacity = '0';
        });
    }
}

function renderFileItem(file, post) {
    const fullUrl = file.url;
    const filename = getFileNameFromUrl(file.url);
    const postTitle = escapeJsString(post.title);
    const author = escapeJsString(`${post.user.firstName} ${post.user.lastName}`);

    switch (file.type) {
        case 'image':
            return `
                <div class="media-container" onclick="recordRecentVisit(${post.id}, '${postTitle}', '${author}', 'image', '${fullUrl}'); previewFile('${fullUrl}', 'image', '${filename}')">
                    <img src="${fullUrl}" alt="${filename}" class="post-file-image" loading="lazy">
                </div>
            `;
        case 'video':
            return `
                <div class="media-container">
                    <video class="post-file-video" preload="metadata"
                           onclick="recordRecentVisit(${post.id}, '${postTitle}', '${author}', 'video', ''); handleVideoClick(event, this)">
                        <source src="${fullUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-controls-overlay" onclick="recordRecentVisit(${post.id}, '${postTitle}', '${author}', 'video', ''); previewFile('${fullUrl}', 'video', '${filename}')">
                        <button class="video-play-btn">
                            <i class='bx bx-play'></i>
                        </button>
                    </div>
                </div>
            `;
        case 'document':
            return `
                <div class="post-file-document" onclick="recordRecentVisit(${post.id}, '${postTitle}', '${author}', 'document', ''); previewFile('${fullUrl}', 'document', '${filename}')">
                    <i class='bx bx-file'></i>
                    <div class="document-info">
                        <div class="document-name">${filename}</div>
                        <div class="document-type">Document</div>
                    </div>
                    <button class="download-btn" onclick="event.stopPropagation(); requestDownloadPermission('${fullUrl}', '${filename}')">
                        <i class='bx bx-download'></i>
                    </button>
                </div>
            `;
        default:
            return '';
    }
}

function initializeVideoPlayers() {
    document.querySelectorAll('video').forEach(video => {
        video.onclick = null;
        video.addEventListener('click', function(e) {
            handleVideoClick(e, this);
        });
        video.addEventListener('ended', function() {
            const container = this.closest('.media-container');
            if (container) {
                container.classList.remove('video-playing');
                const playBtn = container.querySelector('.video-play-btn i');
                if (playBtn) {
                    playBtn.className = 'bx bx-play';
                }
            }
            if (currentPlayingVideo === this) {
                currentPlayingVideo = null;
            }
        });
    });
}


// ============================================
// POST INTERACTION (Like, Save, Comments)
// ============================================
const likesInProgress = new Set();
const savesInProgress = new Set();
async function toggleLike(postId, button) {
    // Prevent rapid multiple clicks
    if (likesInProgress.has(postId)) {
        return;
    }
    likesInProgress.add(postId);

    const userId = localStorage.getItem('userId');
    if (!userId) {
        showTemporaryModal('Please log in to like posts');
        likesInProgress.delete(postId);
        return;
    }

    const postCard = button.closest('.post-card');
    const likesSpan = postCard.querySelector('.post-stats span:first-child');
    const currentLikes = parseInt(likesSpan.textContent) || 0;
    const isCurrentlyLiked = button.classList.contains('active');

    // Optimistic UI update
    if (isCurrentlyLiked) {
        button.innerHTML = '<i class="bx bx-like"></i> Like';
        button.classList.remove('active');
        likesSpan.textContent = `${currentLikes - 1} Likes`;
    } else {
        button.innerHTML = '<i class="bx bxs-like"></i> Liked';
        button.classList.add('active');
        likesSpan.textContent = `${currentLikes + 1} Likes`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: parseInt(userId) })
        });
        const data = await response.json();

        if (response.ok && data.status === 'success') {
            // Sync with server's actual count
            likesSpan.textContent = `${data.likesCount} Likes`;
            updateAllPostInstances(postId, { likesCount: data.likesCount, isLiked: data.isLiked });
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.classList.contains('active')) {
                await updateProfileStats(userId);
            }
        } else {
            // Revert optimistic change
            revertLike(postCard, isCurrentlyLiked, currentLikes);
            showTemporaryModal(data.message || 'Failed to like post');
        }
    } catch (error) {
        revertLike(postCard, isCurrentlyLiked, currentLikes);
        showTemporaryModal('Error liking post');
    } finally {
        likesInProgress.delete(postId);
    }
}
async function toggleSave(postId, button) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showTemporaryModal('Please log in to save posts');
        return;
    }

    // --- Optimistic update ---
    const isCurrentlySaved = button.classList.contains('active');
    if (isCurrentlySaved) {
        button.innerHTML = '<i class="bx bx-bookmark"></i> Save';
        button.classList.remove('active');
    } else {
        button.innerHTML = '<i class="bx bxs-bookmark"></i> Saved';
        button.classList.add('active');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: parseInt(userId) })
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
            // Update all instances
            updateAllPostInstances(postId, { isSaved: data.isSaved });
            // Update profile stats if profile page is open
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.classList.contains('active')) {
                await updateProfileStats(userId);
            }
        } else {
            // Revert optimistic change
            revertSave(button, isCurrentlySaved);
            showTemporaryModal(data.message || 'Failed to save post');
        }
    } catch (error) {
        revertSave(button, isCurrentlySaved);
        showTemporaryModal('Error saving post');
    }
}

function updateAllPostInstances(postId, updates) {
    const allPostInstances = document.querySelectorAll(`[data-post-id="${postId}"]`);
    allPostInstances.forEach(postCard => {
        if (updates.likesCount !== undefined) {
            const likesSpan = postCard.querySelector('.post-stats span:first-child');
            if (likesSpan) {
                likesSpan.textContent = `${updates.likesCount} Likes`;
            }
        }
        if (updates.isLiked !== undefined) {
            const likeBtns = postCard.querySelectorAll('.like-btn');
            likeBtns.forEach(btn => updateLikeButton(btn, updates.isLiked));
        }
        if (updates.isSaved !== undefined) {
            const saveBtns = postCard.querySelectorAll('.save-btn');
            saveBtns.forEach(btn => updateSaveButton(btn, updates.isSaved));
        }
    });
}

async function toggleComments(postId) {
    let postCard;
    if (event) {
        postCard = event.target.closest('[data-post-id]');
    }
    if (!postCard) {
        postCard = document.querySelector(`[data-post-id="${postId}"]`);
    }
    if (!postCard) {
        console.error('Post card not found for ID:', postId);
        return;
    }
    let commentsSection = postCard.querySelector('.comments-section');
    if (commentsSection) {
        commentsSection.remove();
        return;
    }
    commentsSection = document.createElement('div');
    commentsSection.className = 'comments-section';
    commentsSection.innerHTML = `
        <div class="comments-header">
            <h4>Comments</h4>
            <button class="close-comments-btn" onclick="toggleComments(${postId})">
                <i class='bx bx-x'></i>
            </button>
        </div>
        <div class="comments-list" id="commentsList${postId}">
            <div class="loading-comments">Loading comments...</div>
        </div>
        <div class="comment-input-container">
            <div class="comment-avatar">${getUserInitials({
        firstName: localStorage.getItem('firstName'),
        lastName: localStorage.getItem('lastName')
    })}</div>
            <input type="text" class="comment-input" placeholder="Write a comment..."
                   id="commentInput${postId}"
                   onkeypress="handleCommentKeyPress(event, ${postId})">
            <button class="send-comment-btn" onclick="sendComment(${postId})">
                <i class='bx bx-send'></i>
            </button>
        </div>
    `;
    const postActions = postCard.querySelector('.post-actions');
    if (postActions) {
        postActions.after(commentsSection);
    } else {
        postCard.appendChild(commentsSection);
    }
    await loadComments(postId);
}

async function loadComments(postId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/comments/post/${postId}`);
        if (response.ok) {
            const data = await response.json();
            renderComments(postId, data.comments || []);
        } else {
            renderComments(postId, []);
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        renderComments(postId, []);
    }
}

function renderComments(postId, comments) {
    const commentsList = document.getElementById(`commentsList${postId}`);
    if (!commentsList) return;
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="empty-comments">
                <i class='bx bx-message-square-dots'></i>
                <p>No comments yet. Be the first to comment!</p>
            </div>
        `;
        return;
    }
    commentsList.innerHTML = comments.map(comment => `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-avatar">${getUserInitials(comment.user)}</div>
            <div class="comment-content">
                <div class="comment-author">${comment.user.firstName} ${comment.user.lastName}</div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
                <div class="comment-time">${formatTime(comment.createdAt)}</div>
            </div>
        </div>
    `).join('');
}

async function sendComment(postId) {
    const input = document.getElementById(`commentInput${postId}`);
    if (!input) return;
    const content = input.value.trim();
    if (!content) {
        showTemporaryModal('Please enter a comment');
        return;
    }
    const userId = localStorage.getItem('userId');

    // --- Optimistic: create a temporary comment object ---
    const tempComment = {
        id: 'temp-' + Date.now(),
        user: { firstName: localStorage.getItem('firstName') || 'You', lastName: '' },
        content: content,
        createdAt: new Date().toISOString()
    };

    // Add to UI immediately
    const commentsList = document.getElementById(`commentsList${postId}`);
    if (commentsList) {
        const empty = commentsList.querySelector('.empty-comments');
        if (empty) empty.remove();
        const commentHtml = `
            <div class="comment-item temp-comment" data-comment-id="${tempComment.id}">
                <div class="comment-avatar">${getUserInitials(tempComment.user)}</div>
                <div class="comment-content">
                    <div class="comment-author">${tempComment.user.firstName} ${tempComment.user.lastName}</div>
                    <div class="comment-text">${escapeHtml(tempComment.content)}</div>
                    <div class="comment-time">Just now</div>
                </div>
            </div>
        `;
        commentsList.insertAdjacentHTML('afterbegin', commentHtml);
    }

    // Update comment count optimistically
    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    const commentsSpan = postCard?.querySelector('.post-stats span:nth-child(2)');
    const currentCount = parseInt(commentsSpan?.textContent?.match(/\d+/)?.[0] || 0);
    if (commentsSpan) {
        commentsSpan.textContent = `${currentCount + 1} Comments`;
    }

    input.value = '';

    try {
        const response = await fetch(`${API_BASE_URL}/api/comments/post/${postId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content, userId: userId })
        });
        const data = await response.json();
        if (response.ok && data.status === 'success' && data.comment) {
            // Replace temp comment with real one (update ID and time)
            const tempElement = commentsList.querySelector(`[data-comment-id="${tempComment.id}"]`);
            if (tempElement) {
                tempElement.dataset.commentId = data.comment.id;
                // Optionally update timestamp if needed
                const timeEl = tempElement.querySelector('.comment-time');
                if (timeEl) timeEl.textContent = formatTime(data.comment.createdAt);
            }
            // Update profile stats if profile page is open
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.classList.contains('active')) {
                await updateProfileStats(userId);
            }
        } else {
            // Server failed – remove the optimistic comment
            const tempElement = commentsList.querySelector(`[data-comment-id="${tempComment.id}"]`);
            if (tempElement) tempElement.remove();
            // Decrement comment count
            if (commentsSpan) {
                const current = parseInt(commentsSpan.textContent.match(/\d+/)?.[0] || 1) - 1;
                commentsSpan.textContent = `${current} Comments`;
            }
            showTemporaryModal(data.message || 'Failed to add comment');
        }
    } catch (error) {
        // Network error – remove optimistic comment
        const tempElement = commentsList?.querySelector(`[data-comment-id="${tempComment.id}"]`);
        if (tempElement) tempElement.remove();
        if (commentsSpan) {
            const current = parseInt(commentsSpan.textContent.match(/\d+/)?.[0] || 1) - 1;
            commentsSpan.textContent = `${current} Comments`;
        }
        showTemporaryModal('Error adding comment');
    }
}

function handleCommentKeyPress(event, postId) {
    if (event.key === 'Enter') {
        sendComment(postId);
    }
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

async function updateUserProfileCard() {
    const userId = localStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        if (response.ok) {
            const user = await response.json();
            const userAvatar = document.querySelector('.user-avatar');
            const profilePic = document.querySelector('.profile-pic');
            const userName = document.querySelector('.user-name');
            const userEmail = document.querySelector('.user-email');
            if (userAvatar) userAvatar.textContent = getUserInitials(user);
            if (profilePic) profilePic.textContent = getUserInitials(user);
            if (userName) userName.textContent = `${user.firstName} ${user.lastName}`;
            if (userEmail) userEmail.textContent = user.email;
            updateProfilePage(user);
        }
    } catch (error) {
        console.error('Failed to load user profile:', error);
    }
}

async function loadUserProfile() {
    const userId = localStorage.getItem('userId');
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        if (response.ok) {
            const user = await response.json();
            updateProfilePage(user);
            await updateProfileStats(userId);
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        throw error;
    }
}

async function updateProfileStats(userId) {
    try {
        const postsResponse = await fetch(`${API_BASE_URL}/users/${userId}/posts`);
        let postsCount = 0;
        if (postsResponse.ok) {
            const posts = await postsResponse.json();
            postsCount = posts.length;
        }
        const likedResponse = await fetch(`${API_BASE_URL}/users/${userId}/liked-posts`);
        let likedCount = 0;
        if (likedResponse.ok) {
            const liked = await likedResponse.json();
            likedCount = liked.length;
        }
        const statItems = document.querySelectorAll('.stat-item');
        if (statItems.length >= 4) {
            statItems[0].querySelector('.stat-number').textContent = postsCount;
            statItems[3].querySelector('.stat-number').textContent = likedCount;
        }
    } catch (error) {
        console.error('Failed to update profile stats:', error);
    }
}

async function loadProfileContent(tabName) {
    const userId = localStorage.getItem('userId');
    let endpoint = '';
    switch (tabName) {
        case 'posts':
            endpoint = `/users/${userId}/posts`;
            break;
        case 'saved':
            endpoint = `/users/${userId}/saved-posts`;
            break;
        case 'liked':
            endpoint = `/users/${userId}/liked-posts`;
            break;
    }
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (response.ok) {
            const data = await response.json();
            renderProfileContent(tabName, data);
            setTimeout(() => {
                refreshAllProfilePostsStatus();
            }, 500);
        } else {
            console.error(`Failed to load ${tabName}:`, response.status);
            renderProfileContent(tabName, []);
        }
    } catch (error) {
        console.error(`Failed to load ${tabName}:`, error);
        renderProfileContent(tabName, []);
    }
}

function getFileNameFromUrl(url) {
    if (!url) return 'Unknown File';
    if (url.includes('cloudinary.com')) {
        const parts = url.split('/');
        return parts[parts.length - 1];
    }
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/^\d+_/, '');
}

function renderProfileContent(tabName, data) {
    const contentId = tabName === 'posts' ? 'postsContent' :
        tabName === 'saved' ? 'savedContent' : 'likedContent';
    const container = document.getElementById(contentId);
    if (!container) return;
    if (data.length === 0) {
        const emptyMessages = {
            'posts': {
                icon: 'grid-alt',
                text: 'No posts yet',
                subtext: 'Start sharing your thoughts!'
            },
            'saved': {
                icon: 'bookmark',
                text: 'No saved posts yet',
                subtext: 'Posts you save will appear here'
            },
            'liked': {
                icon: 'like',
                text: 'No liked posts yet',
                subtext: 'Posts you like will appear here'
            }
        };
        const message = emptyMessages[tabName];
        container.innerHTML = `
            <div class="empty-state">
                <i class='bx bx-${message.icon}'></i>
                <div class="empty-state-text">${message.text}</div>
                <div class="empty-state-subtext">${message.subtext}</div>
            </div>
        `;
    } else {
        renderPostsToContainer(container, data);
    }
}

function renderPostsToContainer(container, posts) {
    container.innerHTML = posts.map(post => `
        <article class="post-card" data-post-id="${post.id}">
            <header class="post-header">
                <div class="post-avatar">${getUserInitials(post.user)}</div>
                <div class="post-info">
                    <div class="post-author">${post.user.firstName} ${post.user.lastName}</div>
                    <div class="post-time">${formatTime(post.createdAt)}</div>
                </div>
                <i class='bx bx-dots-horizontal-rounded post-menu' onclick="togglePostMenu(event, ${post.id}, ${post.user.id})"></i>
            </header>

            <div class="post-content">
                ${renderPostBody(post)}
            </div>

            <div class="post-stats">
                <span>${post.likesCount || 0} Likes</span>
                <span>${post.commentsCount || 0} Comments</span>
            </div>

            <div class="post-actions">
                <button class="post-action-btn like-btn" onclick="event.preventDefault(); toggleLike(${post.id}, this);">
                    <i class='bx bx-like'></i> Like
                </button>
                <button class="post-action-btn" onclick="event.preventDefault(); toggleComments(${post.id});">
                    <i class='bx bx-comment'></i> Comment
                </button>
                <button class="post-action-btn">
                    <i class='bx bx-share-alt'></i> Share
                </button>
                <button class="post-action-btn save-btn" onclick="event.preventDefault(); toggleSave(${post.id}, this);">
                    <i class='bx bx-bookmark'></i> Save
                </button>
            </div>
        </article>
    `).join('');
    initializePostCarousels();
    posts.forEach(post => {
        if (post.id) {
            loadPostStatus(post.id);
        }
    });
}

// ============================================
// POST MENU (Edit, Delete, Report)
// ============================================

function togglePostMenu(event, postId, postUserId) {
    event.stopPropagation();
    document.querySelectorAll('.post-menu-dropdown').forEach(menu => menu.remove());
    const currentUserId = parseInt(localStorage.getItem('userId'));
    const isOwnPost = currentUserId === postUserId;
    const dropdown = document.createElement('div');
    dropdown.className = 'post-menu-dropdown';
    if (isOwnPost) {
        dropdown.innerHTML = `
            <div class="post-menu-item" onclick="editPost(event, ${postId})">
                <i class='bx bx-edit'></i>
                <span>Edit Post</span>
            </div>
            <div class="post-menu-item" onclick="deletePost(event, ${postId})">
                <i class='bx bx-trash'></i>
                <span>Delete Post</span>
            </div>
        `;
    } else {
        dropdown.innerHTML = `
            <div class="post-menu-item" onclick="reportPost(event, ${postId})">
                <i class='bx bx-flag'></i>
                <span>Report</span>
            </div>
        `;
    }
    const menuIcon = event.currentTarget;
    const postCard = menuIcon.closest('.post-card');
    const postHeader = postCard.querySelector('.post-header');
    console.log('Menu icon:', menuIcon);
    console.log('Found post card:', postCard);
    if (!postCard) {
        console.error('Could not find post card from menu icon');
        return;
    }
    postHeader.style.position = 'relative';
    dropdown.style.position = 'absolute';
    dropdown.style.right = '0';
    dropdown.style.top = '100%';
    dropdown.style.zIndex = '100';
    postHeader.appendChild(dropdown);
    setTimeout(() => {
        document.addEventListener('click', closePostMenus);
    }, 0);
}

function closePostMenus() {
    document.querySelectorAll('.post-menu-dropdown').forEach(menu => menu.remove());
    document.removeEventListener('click', closePostMenus);
}

async function editPost(event, postId) {
    event.stopPropagation();
    closePostMenus();
    try {
        let postCard = event.target.closest('.post-card') || document.querySelector(`[data-post-id="${postId}"]`);
        if (!postCard) {
            showTemporaryModal('Could not find post data');
            return;
        }
        const cachedPosts = JSON.parse(localStorage.getItem('cachedPosts') || '[]');
        const postData = cachedPosts.find(p => p.id === postId);
        if (!postData) {
            showTemporaryModal('Post data not found');
            return;
        }
        const reviewerData = parseReviewerPostContent(postData.content);
        if (reviewerData) {
            showEditReviewerDescriptionModal(postId, reviewerData);
            return;
        }
        const titleElement = postCard.querySelector('.post-title');
        const contentElement = postCard.querySelector('.post-text');
        if (!titleElement || !contentElement) {
            showTemporaryModal('Could not load post content');
            return;
        }
        const title = titleElement.textContent || '';
        const content = contentElement.textContent || '';
        const post = {
            id: postId,
            title: title,
            content: content,
            imageUrl: postCard.querySelector('.post-file-image')?.src || null,
            documentUrl: postCard.querySelector('.post-file-document') ? 'document-attached' : null,
            videoUrl: postCard.querySelector('.post-file-video')?.src || null
        };
        showEditPostForm(post);
    } catch (error) {
        console.error('Error loading post for editing:', error);
        showTemporaryModal('Error loading post for editing');
    }
}

function showEditReviewerDescriptionModal(postId, reviewerData) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content edit-post-modal">
            <div class="modal-header">
                <h3>Edit Reviewer Description</h3>
                <button class="close-modal" onclick="closeEditModal()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="editReviewerDescription">Description</label>
                    <textarea id="editReviewerDescription" rows="4">${escapeHtml(reviewerData.description || '')}</textarea>
                    <small style="color:#999; font-size:12px;">Only the description will be updated. The reviewer content and source file remain unchanged.</small>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeEditModal()">Cancel</button>
                <button type="button" class="btn-primary" onclick="submitEditReviewerDescription(${postId})">Update Description</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitEditReviewerDescription(postId) {
    const description = document.getElementById('editReviewerDescription').value.trim();
    const cachedPosts = JSON.parse(localStorage.getItem('cachedPosts') || '[]');
    const post = cachedPosts.find(p => p.id === postId);
    if (!post) {
        showTemporaryModal('Post not found');
        return;
    }
    const reviewerData = parseReviewerPostContent(post.content);
    if (!reviewerData) {
        showTemporaryModal('Invalid reviewer data');
        return;
    }
    reviewerData.description = description || null;
    const content = post.content.split(REVIEWER_POST_MARKER)[0] + REVIEWER_POST_MARKER + JSON.stringify(reviewerData);
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: post.title,
                content: content,
                userId: localStorage.getItem('userId')
            })
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
            showTemporaryModal('Reviewer description updated!');
            closeEditModal();
            await loadPosts();
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.classList.contains('active')) {
                await loadProfileContent('posts');
            }
        } else {
            showTemporaryModal(data.message || 'Failed to update description');
        }
    } catch (error) {
        console.error('Error updating reviewer description:', error);
        showTemporaryModal('Error updating description');
    }
}

function showEditPostForm(post) {
    const editModal = document.createElement('div');
    editModal.className = 'modal-overlay active';
    editModal.innerHTML = `
        <div class="modal-content edit-post-modal">
            <div class="modal-header">
                <h3>Edit Post</h3>
                <button class="close-modal" onclick="closeEditModal()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="editPostTitle">Title</label>
                    <input type="text" id="editPostTitle" value="${escapeHtml(post.title)}" placeholder="Enter post title">
                </div>
                <div class="form-group">
                    <label for="editPostContent">Content</label>
                    <textarea id="editPostContent" placeholder="What's on your mind?" rows="5">${escapeHtml(post.content)}</textarea>
                </div>
                ${post.imageUrl ? `
                    <div class="current-media">
                        <label>Current Image:</label>
                        <img src="${post.imageUrl}" alt="Current post image" class="current-media-preview">
                    </div>
                ` : ''}
                ${post.documentUrl ? `
                    <div class="current-media">
                        <label>Current Document:</label>
                        <div class="document-preview">
                            <i class='bx bx-file'></i>
                            <span>Document attached</span>
                        </div>
                    </div>
                ` : ''}
                ${post.videoUrl ? `
                    <div class="current-media">
                        <label>Current Video:</label>
                        <div class="video-preview">
                            <i class='bx bx-video'></i>
                            <span>Video attached</span>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeEditModal()">Cancel</button>
                <button type="button" class="btn-primary" onclick="submitEditPost(${post.id})">Update Post</button>
            </div>
        </div>
    `;
    document.body.appendChild(editModal);
}

function closeEditModal() {
    const modal = document.querySelector('.modal-overlay.active');
    if (modal) {
        modal.remove();
    }
}

async function submitEditPost(postId) {
    const title = document.getElementById('editPostTitle').value;
    const content = document.getElementById('editPostContent').value;
    if (!title || !content) {
        showTemporaryModal('Please fill in all fields');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                content: content,
                userId: localStorage.getItem('userId')
            })
        });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
            showTemporaryModal('Post updated successfully!');
            closeEditModal();
            await loadPosts();
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.classList.contains('active')) {
                await loadProfileContent('posts');
            }
        } else {
            showTemporaryModal(data.message || 'Failed to update post');
        }
    } catch (error) {
        console.error('Error updating post:', error);
        showTemporaryModal('Error updating post');
    }
}

async function deletePost(event, postId) {
    event.stopPropagation();
    closePostMenus();
    showConfirmModal('Are you sure you want to delete this post?', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'userId': localStorage.getItem('userId')
                }
            });
            const data = await response.json();
            if (response.ok && data.status === 'success') {
                showTemporaryModal('Post deleted successfully!');
                document.querySelectorAll(`[data-post-id="${postId}"]`).forEach(post => {
                    post.style.transition = 'opacity 0.3s, transform 0.3s';
                    post.style.opacity = '0';
                    post.style.transform = 'translateY(-20px)';
                    setTimeout(() => post.remove(), 300);
                });
                const profilePage = document.getElementById('profilePage');
                if (profilePage && profilePage.classList.contains('active')) {
                    const userId = localStorage.getItem('userId');
                    await updateProfileStats(userId);
                }
            } else {
                showTemporaryModal(data.message || 'Failed to delete post');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            showTemporaryModal('Error deleting post');
        }
    });
}

// ============================================
// REPORT POST WITH REASON SELECTION
// ============================================

function reportPost(event, postId) {
    event.stopPropagation();
    closePostMenus();
    showReportReasonModal(postId);
}

function showReportReasonModal(postId) {
    // Remove any existing report modal
    document.querySelector('.report-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'report-modal active';
    modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.7) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 99999 !important;
        backdrop-filter: blur(4px) !important;
    `;

    const reasons = [
        { value: 'spam', label: 'Spam or misleading' },
        { value: 'harassment', label: 'Harassment or bullying' },
        { value: 'inappropriate', label: 'Inappropriate content' },
        { value: 'hate_speech', label: 'Hate speech or discrimination' },
        { value: 'violence', label: 'Violent or harmful content' },
        { value: 'other', label: 'Other' }
    ];

    let selectedReason = reasons[0].value;

    modal.innerHTML = `
        <div class="report-modal-content" style="
            background: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            position: relative;
            z-index: 100000;
            animation: modalSlideIn 0.3s ease;
        ">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; font-size:20px; color:#1e293b;">Report Post</h3>
                <button class="report-close-btn" onclick="this.closest('.report-modal').remove()" style="
                    background:none; border:none; font-size:24px; cursor:pointer; color:#94a3b8;
                ">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <p style="color:#64748b; margin-bottom:20px;">Please select a reason for reporting this post:</p>
            <div class="report-reasons-list" style="display:flex; flex-direction:column; gap:10px; margin-bottom:24px;">
                ${reasons.map(r => `
                    <button class="report-reason-btn" data-value="${r.value}" style="
                        padding:12px 16px;
                        border:2px solid #e2e8f0;
                        border-radius:10px;
                        background:white;
                        cursor:pointer;
                        text-align:left;
                        font-size:14px;
                        transition: all 0.2s;
                        color: #334155;
                        ${r.value === selectedReason ? 'border-color: #4f46e5; background: #eef2ff;' : ''}
                    ">
                        ${r.label}
                    </button>
                `).join('')}
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button class="report-cancel-btn" onclick="this.closest('.report-modal').remove()" style="
                    padding:10px 20px;
                    border:none;
                    border-radius:8px;
                    font-weight:600;
                    background:#f1f5f9;
                    color:#64748b;
                    cursor:pointer;
                ">
                    Cancel
                </button>
                <button class="report-submit-btn" style="
                    padding:10px 24px;
                    border:none;
                    border-radius:8px;
                    font-weight:600;
                    background:#ef4444;
                    color:white;
                    cursor:pointer;
                    display:flex;
                    align-items:center;
                    gap:6px;
                ">
                    <i class='bx bx-flag'></i> Report
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Reason selection
    const reasonBtns = modal.querySelectorAll('.report-reason-btn');
    reasonBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            reasonBtns.forEach(b => {
                b.style.borderColor = '#e2e8f0';
                b.style.background = 'white';
            });
            this.style.borderColor = '#4f46e5';
            this.style.background = '#eef2ff';
            selectedReason = this.dataset.value;
        });
    });

    // Submit
    const submitBtn = modal.querySelector('.report-submit-btn');
    submitBtn.addEventListener('click', async function() {
        // Disable button to prevent double submit
        this.disabled = true;
        this.textContent = 'Submitting...';

        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                showTemporaryModal('Please log in to report posts.');
                modal.remove();
                return;
            }

            const response = await fetch(`${API_BASE_URL}/posts/${postId}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: parseInt(userId),
                    reason: selectedReason
                })
            });

            const data = await response.json();
            modal.remove();

            if (response.ok && data.status === 'success') {
                showTemporaryModal('Post reported. Thank you for helping keep our community safe.');
            } else {
                showTemporaryModal(data.message || 'Failed to report post. Please try again.');
            }
        } catch (error) {
            console.error('Error reporting post:', error);
            showTemporaryModal('Error reporting post. Please try again.');
            modal.remove();
        }
    });

    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });

    // Close on Escape key
    const closeHandler = function(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeHandler);
        }
    };
    document.addEventListener('keydown', closeHandler);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function updateProfilePage(user) {
    const profileName = document.querySelector('.profile-name');
    const profileUsername = document.querySelector('.profile-username');
    const profileBio = document.querySelector('.profile-bio');
    const profileMainAvatar = document.querySelector('.profile-main-avatar');
    if (profileName) profileName.textContent = `${user.firstName} ${user.lastName}`;
    if (profileUsername) profileUsername.textContent = `@${user.email.split('@')[0]} • ${user.email}`;
    if (profileBio && user.bio) profileBio.textContent = user.bio;
    if (profileMainAvatar) profileMainAvatar.textContent = getUserInitials(user);
}

async function loadPostStatus(id) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.log('No user ID found for loading post status');
        return;
    }
    try {
        console.log(`Loading post status for post ${id}, user ${userId}`);
        const response = await fetch(`${API_BASE_URL}/posts/${id}/status`, {
            headers: { 'userId': userId }
        });
        console.log(`Status response for post ${id}:`, response.status);
        if (response.ok) {
            const status = await response.json();
            console.log(`Post ${id} status:`, status);
            updatePostUI(id, status);
        } else {
            console.error(`Failed to load status for post ${id}:`, response.status);
            updatePostUI(id, { isLiked: false, isSaved: false, likesCount: 0 });
        }
    } catch (error) {
        console.error('Failed to load post status:', error);
        updatePostUI(id, { isLiked: false, isSaved: false, likesCount: 0 });
    }
}

function updatePostUI(postId, status) {
    const postCards = document.querySelectorAll(`[data-post-id="${postId}"]`);
    console.log(`Updating UI for post ${postId}, found ${postCards.length} instances`);
    postCards.forEach((postCard, index) => {
        const likeBtn = postCard.querySelector('.like-btn');
        const saveBtn = postCard.querySelector('.save-btn');
        const likesSpan = postCard.querySelector('.post-stats span:first-child');
        console.log(`Instance ${index + 1}: likeBtn=${!!likeBtn}, saveBtn=${!!saveBtn}, likesSpan=${!!likesSpan}`);
        if (likeBtn) {
            updateLikeButton(likeBtn, status.isLiked);
            console.log(`Updated like button for post ${postId}: ${status.isLiked}`);
        }
        if (saveBtn) {
            updateSaveButton(saveBtn, status.isSaved);
            console.log(`Updated save button for post ${postId}: ${status.isSaved}`);
        }
        if (likesSpan && status.likesCount !== undefined) {
            likesSpan.textContent = `${status.likesCount} Likes`;
            console.log(`Updated likes count for post ${postId}: ${status.likesCount}`);
        }
    });
}

function updateLikeButton(button, isLiked) {
    if (!button) {
        console.warn('Like button not found for update');
        return;
    }
    const icon = button.querySelector('i');
    if (!icon) {
        console.warn('Icon not found in like button');
        return;
    }
    if (isLiked) {
        icon.classList.remove('bx-like');
        icon.classList.add('bxs-like');
        button.classList.add('active');
        button.innerHTML = '<i class="bx bxs-like"></i> Liked';
    } else {
        icon.classList.remove('bxs-like');
        icon.classList.add('bx-like');
        button.classList.remove('active');
        button.innerHTML = '<i class="bx bx-like"></i> Like';
    }
    console.log(`Like button updated: isLiked=${isLiked}`);
}

function updateSaveButton(button, isSaved) {
    if (!button) {
        console.warn('Save button not found for update');
        return;
    }
    const icon = button.querySelector('i');
    if (!icon) {
        console.warn('Icon not found in save button');
        return;
    }
    if (isSaved) {
        icon.classList.remove('bx-bookmark');
        icon.classList.add('bxs-bookmark');
        button.classList.add('active');
        button.innerHTML = '<i class="bx bxs-bookmark"></i> Saved';
    } else {
        icon.classList.remove('bxs-bookmark');
        icon.classList.add('bx-bookmark');
        button.classList.remove('active');
        button.innerHTML = '<i class="bx bx-bookmark"></i> Save';
    }
    console.log(`Save button updated: isSaved=${isSaved}`);
}

async function refreshAllProfilePostsStatus() {
    const profilePosts = document.querySelectorAll('#postsContent .post-card, #savedContent .post-card, #likedContent .post-card');
    console.log(`Refreshing status for ${profilePosts.length} profile posts`);
    for (const post of profilePosts) {
        const postId = post.getAttribute('data-post-id');
        if (postId) {
            await loadPostStatus(postId);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

function getUserInitials(user) {
    if (!user) return '??';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatTime(timestamp) {
    if (!timestamp) return 'Just now';

    const date = new Date(timestamp);
    const now = new Date();

    // Check if date is valid
    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }

    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function loadPosts() {
    showFeedSkeleton();
    try {
        const response = await fetch(`${API_BASE_URL}/posts`);
        if (response.ok) {
            const posts = await response.json();
            renderPosts(posts);
            await updateUserProfileCard();
        } else {
            loadOfflinePosts();
        }
    } catch (error) {
        console.error('Failed to load posts:', error);
        loadOfflinePosts();
    }
}

function loadOfflinePosts() {
    const cachedPosts = localStorage.getItem('cachedPosts');
    if (cachedPosts) {
        const posts = JSON.parse(cachedPosts);
        renderPosts(posts);
        showTemporaryModal('Showing offline content');
    } else {
        document.getElementById('newsFeed').innerHTML = `
            <div class="empty-state">
                <i class='bx bx-wifi-off'></i>
                <div class="empty-state-text">No internet connection</div>
                <div class="empty-state-subtext">Please check your connection and try again</div>
            </div>
        `;
    }
}

function initResponsiveSidebars() {
    const left = document.getElementById('leftSidebar');
    const right = document.getElementById('rightSidebar');
    if (!left || !right) return;
    if (window.innerWidth <= 1024) {
        left.classList.add('hidden');
        right.classList.add('hidden');
    } else {
        left.classList.remove('hidden');
        right.classList.remove('hidden');
    }
}

function logout() {
    showConfirmModal('Are you sure you want to logout?', () => {
        showLoadingModal("Logging out...");
        localStorage.clear();
        showTemporaryModal("Logged out successfully!");
        window.location.href = "/";
    });
}

// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================

document.addEventListener('click', (e) => {
    const profileContainer = document.querySelector('.profile-container');
    const dropdown = document.getElementById('profileDropdown');
    if (!profileContainer || !dropdown) return;
    if (!profileContainer.contains(e.target)) {
        dropdown.classList.remove('active');
    }
    if (window.innerWidth <= 1400) {
        const leftSidebar = document.getElementById('leftSidebar');
        const rightSidebar = document.getElementById('rightSidebar');
        const toggleLeftBtn = document.getElementById('toggleLeftSidebarBtn');
        const toggleRightBtn = document.getElementById('toggleRightSidebarBtn');
        if (leftSidebar && !leftSidebar.classList.contains('hidden')) {
            if (!leftSidebar.contains(e.target) && !toggleLeftBtn.contains(e.target)) {
                leftSidebar.classList.add('hidden');
            }
        }
        if (rightSidebar && !rightSidebar.classList.contains('hidden')) {
            if (!rightSidebar.contains(e.target) && !toggleRightBtn.contains(e.target)) {
                rightSidebar.classList.add('hidden');
            }
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') deactivateMobileSearch();
});

document.addEventListener('DOMContentLoaded', () => {
    initResponsiveSidebars();
    renderRecentVisitedSidebar();
    loadPosts().catch(error => {
        console.error('Failed to load posts:', error);
    });
    updateUserProfileCard().catch(error => {
        console.error('Failed to update profile card:', error);
    });
    const submitBtn = document.querySelector('.submit-post-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitPost);
    }
    document.addEventListener('scroll', (e) => {
        if (e.target.classList && e.target.classList.contains('file-previews-scroll')) {
            updatePreviewCarouselControls();
        }
    }, true);
    window.addEventListener('online', () => {
        showTemporaryModal('Connection restored');
        loadPosts().catch(error => {
            console.error('Failed to load posts:', error);
        });
    });
    window.addEventListener('offline', () => {
        showTemporaryModal('You are currently offline');
    });
});

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initResponsiveSidebars, 120);
});

// ============================================
// DOWNLOAD PERMISSION
// ============================================

function requestDownloadPermission(fileUrl, filename) {
    const modal = document.createElement('div');
    modal.className = 'download-permission-modal active';
    modal.innerHTML = `
        <div class="download-permission-content">
            <div class="download-permission-title">
                <i class='bx bx-download'></i>
                Download File
            </div>
            <div class="download-permission-message">
                Are you sure you want to download this file?
            </div>
            <div class="download-permission-filename">
                <i class='bx bx-file'></i>
                ${filename}
            </div>
            <div class="download-permission-buttons">
                <button class="download-permission-btn download-permission-cancel" onclick="closeDownloadPermission()">
                    Cancel
                </button>
                <button class="download-permission-btn download-permission-confirm" onclick="confirmDownload('${fileUrl}', '${filename}')">
                    <i class='bx bx-download'></i>
                    Download
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDownloadPermission();
        }
    });
    document.addEventListener('keydown', handleDownloadPermissionKeydown);
}

function confirmDownload(fileUrl, filename) {
    closeDownloadPermission();
    setTimeout(() => {
        executeDownload(fileUrl, filename);
    }, 100);
}

async function executeDownload(url, filename) {
    const loadingModal = document.querySelector('.upload-progress-modal');
    if (!loadingModal) {
        showLoadingModal('Downloading file...');
    }
    try {
        let cleanUrl = url;
        if (cleanUrl.includes('cloudinary.com')) {
            const separator = cleanUrl.includes('?') ? '&' : '?';
            cleanUrl = `${cleanUrl}${separator}fl_attachment`;
        }
        const downloadUrl = `${API_BASE_URL}/api/download?url=${encodeURIComponent(cleanUrl)}&filename=${encodeURIComponent(filename)}`;
        console.log('Requesting download from:', downloadUrl);
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: { 'Accept': '*/*' }
        });
        if (!response.ok) {
            let errorMessage = `Download failed (${response.status})`;
            try {
                const errorData = await response.text();
                if (errorData) {
                    errorMessage += `: ${errorData}`;
                }
            } catch (e) {}
            throw new Error(errorMessage);
        }
        const blob = await response.blob();
        let finalFilename = filename;
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                finalFilename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        if (!finalFilename.includes('.') && filename.includes('.')) {
            const ext = filename.split('.').pop();
            finalFilename = `${finalFilename}.${ext}`;
        }
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = finalFilename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        }, 2000);
        hideLoadingModal();
        hideUploadingModal();
        showTemporaryModal(`Downloaded`);
    } catch (error) {
        console.error('Download error:', error);
        hideLoadingModal();
        hideUploadingModal();
        showTemporaryModal('Download failed: ' + error.message);
    }
}

// ============================================
// REVIEWER STATE & CREATOR
// ============================================

let reviewerState = {
    type: null,
    flashcards: [],
    quizQuestions: [],
    style: null,
    difficulty: null,
    sourceFileName: null,
    sourceFileType: null,
    sourceFileUrl: null,
    sourceFileData: null
};

function openReviewerCreator(event) {
    if (event) event.preventDefault();
    document.getElementById('profileDropdown')?.classList.remove('active');
    document.querySelector('.feed')?.classList.add('hidden');
    document.getElementById('profilePage')?.classList.remove('active');
    document.getElementById('createPostForm')?.classList.remove('active');
    let reviewerContainer = document.getElementById('reviewerCreatorContainer');
    if (!reviewerContainer) {
        reviewerContainer = document.createElement('div');
        reviewerContainer.id = 'reviewerCreatorContainer';
        reviewerContainer.className = 'reviewer-creator-container';
        const feed = document.querySelector('.feed');
        if (feed && feed.parentElement) {
            feed.parentElement.appendChild(reviewerContainer);
        } else {
            document.body.appendChild(reviewerContainer);
        }
    }
    reviewerContainer.classList.remove('hidden');
    reviewerContainer.innerHTML = `
        <div class="reviewer-header">
            <button class="reviewer-back-btn" onclick="closeReviewerCreator()">
                <i class='bx bx-arrow-back'></i>
            </button>
            <div>
                <h2>Create Reviewer</h2>
                <p>Choose what type of reviewer you want to make.</p>
            </div>
        </div>

        <div class="reviewer-type-grid">
            <button class="reviewer-type-card" data-type="flashcards" onclick="selectReviewerType('flashcards')">
                <i class='bx bx-card'></i>
                <h3>Flashcards</h3>
                <p>Create question and answer cards.</p>
            </button>
        
            <button class="reviewer-type-card" data-type="quiz" onclick="selectReviewerType('quiz')">
                <i class='bx bx-question-mark'></i>
                <h3>Quiz</h3>
                <p>Create multiple choice questions.</p>
            </button>
        </div>
        <div id="reviewerFormArea"></div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeReviewerCreator() {
    document.getElementById('reviewerCreatorContainer')?.classList.add('hidden');
    const profilePage = document.getElementById('profilePage');
    const feed = document.querySelector('.feed');
    if (profilePage && profilePage.classList.contains('active')) {
        feed?.classList.add('hidden');
        profilePage.classList.add('active');
    } else {
        feed?.classList.remove('hidden');
    }
}

function renderFlashcardCreator() {
    const area = document.getElementById('reviewerFormArea');
    area.innerHTML = `
        <div class="reviewer-form">
            <div class="reviewer-form-header">
                <h3>Flashcard Reviewer</h3>
                <p>Create cards manually or review your auto-generated cards.</p>
            </div>

            <div class="reviewer-input-grid">
                <input id="flashcard-question" type="text" placeholder="Question or key term">
                <textarea id="flashcard-answer" placeholder="Answer or explanation"></textarea>
            </div>

            <button onclick="addFlashcard()" class="reviewer-primary-btn">
                <i class='bx bx-plus'></i>
                Add Flashcard
            </button>
            
            <button onclick="startStudyFromReviewer()" class="reviewer-primary-btn" style="background:#16a34a;">
                <i class='bx bx-play-circle'></i> Start Studying
            </button>
            
            <div id="flashcardList" class="reviewer-list"></div>

            <button onclick="saveReviewer()" class="reviewer-save-btn">
                <i class='bx bx-save'></i>
                Save Reviewer
            </button>
        </div>
    `;
    renderFlashcardList();
}

function startStudyFromReviewer() {
    const type = reviewerState.type;
    const items = type === 'flashcards' ? reviewerState.flashcards : reviewerState.quizQuestions;
    if (!items || items.length === 0) {
        showTemporaryModal('No items to study yet.');
        return;
    }
    const meta = {
        style: reviewerState.style || null,
        difficulty: reviewerState.difficulty || null,
        sourceFileName: reviewerState.sourceFileName || null,
        sourceFileType: reviewerState.sourceFileType || null,
        sourceFileUrl: reviewerState.sourceFileUrl || null
    };
    startStudySession(type, items, { meta });
}

function addFlashcard() {
    const question = document.getElementById('flashcard-question').value.trim();
    const answer = document.getElementById('flashcard-answer').value.trim();
    if (!question || !answer) {
        showTemporaryModal('Please fill in both question and answer.');
        return;
    }
    reviewerState.flashcards.push({ question, answer });
    document.getElementById('flashcard-question').value = '';
    document.getElementById('flashcard-answer').value = '';
    renderFlashcardList();
}

function renderFlashcardList() {
    const list = document.getElementById('flashcardList');
    if (!list) return;
    if (reviewerState.flashcards.length === 0) {
        list.innerHTML = `
            <div class="reviewer-empty-state">
                <i class='bx bx-card'></i>
                <p>No flashcards yet.</p>
            </div>
        `;
        return;
    }
    list.innerHTML = reviewerState.flashcards.map((card, index) => `
        <div class="flashcard-wrapper">
            <div class="flashcard" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-face flashcard-front">
                    <div class="flashcard-label">Question</div>
                    <div class="flashcard-text">${card.question}</div>
                    <div class="flashcard-hint">Click to reveal answer</div>
                </div>

                <div class="flashcard-face flashcard-back">
                    <div class="flashcard-label">Answer</div>
                    <div class="flashcard-text">${card.answer}</div>
                    <div class="flashcard-hint">Click to hide answer</div>
                </div>
            </div>

            <button class="flashcard-delete-btn" onclick="event.stopPropagation(); removeFlashcard(${index})">
                <i class='bx bx-trash'></i>
            </button>
        </div>
    `).join('');
}

function removeFlashcard(index) {
    reviewerState.flashcards.splice(index, 1);
    renderFlashcardList();
}

function renderQuizCreator() {
    const area = document.getElementById('reviewerFormArea');
    area.innerHTML = `
        <div class="reviewer-form">
            <h3>Quiz Reviewer</h3>

            <input id="quiz-question" type="text" placeholder="Question">
            <input id="quiz-option-a" type="text" placeholder="Option A">
            <input id="quiz-option-b" type="text" placeholder="Option B">
            <input id="quiz-option-c" type="text" placeholder="Option C">
            <input id="quiz-option-d" type="text" placeholder="Option D">

            <select id="quiz-correct-answer">
                <option value="">Select correct answer</option>
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
            </select>

            <button onclick="addQuizQuestion()" class="reviewer-primary-btn">
                Add Question
            </button>
            
            <button onclick="startStudyFromReviewer()" class="reviewer-primary-btn" style="background:#16a34a;">
                <i class='bx bx-play-circle'></i> Start Quiz
            </button>
            
            <div id="quizQuestionList" class="reviewer-list"></div>

            <button onclick="saveReviewer()" class="reviewer-save-btn">
                Save Reviewer
            </button>
        </div>
    `;
    renderQuizQuestionList();
}

function renderQuizQuestionList() {
    const list = document.getElementById('quizQuestionList');
    if (!list) return;
    list.innerHTML = reviewerState.quizQuestions.map((item, index) => `
        <div class="reviewer-item">
            <strong>${index + 1}. ${item.question}</strong>
            <p>A. ${item.options.A}</p>
            <p>B. ${item.options.B}</p>
            <p>C. ${item.options.C}</p>
            <p>D. ${item.options.D}</p>
            <p><b>Correct:</b> ${item.correctAnswer}</p>
            <button onclick="removeQuizQuestion(${index})">
                <i class='bx bx-trash'></i>
            </button>
        </div>
    `).join('');
}
function addQuizQuestion() {
    const question = document.getElementById('quiz-question').value.trim();
    const optionA = document.getElementById('quiz-option-a').value.trim();
    const optionB = document.getElementById('quiz-option-b').value.trim();
    const optionC = document.getElementById('quiz-option-c').value.trim();
    const optionD = document.getElementById('quiz-option-d').value.trim();
    const correctAnswer = document.getElementById('quiz-correct-answer').value;
    if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        showTemporaryModal('Please complete all quiz fields.');
        return;
    }
    reviewerState.quizQuestions.push({
        question,
        options: { A: optionA, B: optionB, C: optionC, D: optionD },
        correctAnswer
    });
    renderQuizCreator();
}

function removeQuizQuestion(index) {
    reviewerState.quizQuestions.splice(index, 1);
    renderQuizQuestionList();
}

async function saveReviewerFromSession() {
    if (!studySession) {
        showTemporaryModal('No study session active.');
        return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
        showTemporaryModal('Please log in to save reviewers.');
        return;
    }

    const meta = studySession.meta || {};

    showDescriptionPromptModal(async (description) => {
        const payload = {
            userId: parseInt(userId),
            type: studySession.type,
            items: studySession.originalItems,
            style: meta.style || null,
            difficulty: meta.difficulty || null,
            sourceFileName: meta.sourceFileName || null,
            sourceFileType: meta.sourceFileType || null,
            sourceFileUrl: meta.sourceFileUrl || null,
            description: description || 'No description provided'
        };

        try {
            showLoadingModal('Saving reviewer...');
            const response = await fetch(`${API_BASE_URL}/reviewer/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            hideLoadingModal();

            if (response.ok && data.status === 'success') {
                showTemporaryModal('Reviewer saved to your profile!');
                closeStudySession();
            } else {
                showTemporaryModal(data.message || 'Failed to save reviewer.');
            }
        } catch (error) {
            hideLoadingModal();
            console.error('Error saving reviewer:', error);
            showTemporaryModal('Server error while saving reviewer.');
        }
    });
}

function saveReviewer() {
    if (!reviewerState.type) {
        showTemporaryModal('Please select a reviewer type.');
        return;
    }
    const items = reviewerState.type === 'flashcards' ? reviewerState.flashcards : reviewerState.quizQuestions;
    if (items.length === 0) {
        showTemporaryModal('Please add at least one item.');
        return;
    }

    showDescriptionPromptModal(async (description) => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            showTemporaryModal('Please log in to save reviewers.');
            return;
        }

        const payload = {
            userId: parseInt(userId),
            type: reviewerState.type,
            items: items,
            style: reviewerState.style || null,
            difficulty: reviewerState.difficulty || null,
            sourceFileName: reviewerState.sourceFileName || null,
            sourceFileType: reviewerState.sourceFileType || null,
            sourceFileUrl: reviewerState.sourceFileUrl || null,
            description: description || 'No description provided'
        };

        try {
            showLoadingModal('Saving reviewer...');
            const response = await fetch(`${API_BASE_URL}/reviewer/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            hideLoadingModal();

            if (response.ok && data.status === 'success') {
                showTemporaryModal('Reviewer saved successfully!');
                // Reset state and close creator
                reviewerState = {
                    type: null, flashcards: [], quizQuestions: [], style: null,
                    difficulty: null, sourceFileName: null, sourceFileType: null,
                    sourceFileUrl: null, sourceFileData: null
                };
                closeReviewerCreator();
            } else {
                showTemporaryModal(data.message || 'Failed to save reviewer.');
            }
        } catch (error) {
            hideLoadingModal();
            console.error('Error saving reviewer:', error);
            showTemporaryModal('Server error while saving reviewer.');
        }
    });
}
// ============================================
// REVIEWER SHARING (Newsfeed)
// ============================================

const REVIEWER_POST_MARKER = '__SHAREVIEW_REVIEWER__';

async function shareReviewerFromSession() {
    const type = studySession.type;
    const items = studySession.originalItems;
    const meta = studySession.meta || {};
    const title = 'Reviewer';

    showDescriptionPromptModalForShare(async (description) => {
        const styleLabel = ({
            definition: 'Definition Focused',
            conceptual: 'Conceptual',
            exam: 'Exam Style',
            identification: 'Identification'
        })[meta.style] || 'Conceptual';

        let sourceInfo = '';
        if (meta.sourceFileName) {
            sourceInfo = `\nSource file: ${meta.sourceFileName}`;
        } else {
            sourceInfo = '\nGenerated manually';
        }

        const descriptionText = description ? `\nDescription: ${description}` : '';

        const previewText = `📚 ${type === 'flashcards' ? 'Flashcard' : 'Quiz'} Reviewer (${items.length} items)
Style: ${styleLabel}${meta.difficulty ? ' • Difficulty: ' + meta.difficulty : ''}${sourceInfo}${descriptionText}

Tap "Start Studying" below to try it yourself!`;

        const payload = {
            type,
            items,
            style: meta.style || null,
            difficulty: meta.difficulty || null,
            sourceFileName: meta.sourceFileName || null,
            sourceFileType: meta.sourceFileType || null,
            sourceFileUrl: meta.sourceFileUrl || reviewerState.sourceFileUrl || null,
            generatedManually: !meta.sourceFileName,
            description: description || null
        };

        const content = `${previewText}\n\n${REVIEWER_POST_MARKER}${JSON.stringify(payload)}`;

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('userId', localStorage.getItem('userId'));

        try {
            showLoadingModal('Sharing to newsfeed...');
            const response = await fetch(`${API_BASE_URL}/posts/multiple`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            hideLoadingModal();
            if (response.ok && data.status === 'success') {
                showTemporaryModal('Reviewer shared to your newsfeed!');
                closeStudySession();
                await loadPosts();
            } else {
                showTemporaryModal(data.message || 'Failed to share reviewer.');
            }
        } catch (error) {
            hideLoadingModal();
            console.error('Error sharing reviewer:', error);
            showTemporaryModal('Server error while sharing reviewer.');
        }
    });
}

function showDescriptionPromptModalForShare(onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal active';
    modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.7) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 99999 !important;
        backdrop-filter: blur(4px) !important;
    `;
    modal.innerHTML = `
        <div class="confirm-content" style="
            background: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            position: relative;
            z-index: 100000;
            animation: modalSlideIn 0.3s ease;
        ">
            <div class="confirm-title" style="text-align:center; font-size:20px; font-weight:600; color:#1e293b; margin-bottom:8px;">
                <i class='bx bx-share-alt' style="color:#4f46e5; font-size:24px;"></i>
                Share Reviewer
            </div>
            <div class="confirm-message" style="text-align:center; color:#64748b; margin-bottom:16px;">
                Add a description so others know what this reviewer is about.
            </div>
            <textarea id="shareReviewerDescriptionInput" 
                      placeholder="e.g., Midterm reviewer for Chapter 3 - Cell Biology" 
                      style="width:100%; min-height:80px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:16px; font-family:inherit; font-size:14px; resize:vertical; box-sizing:border-box;"
                      onfocus="this.style.borderColor='#4f46e5'; this.style.boxShadow='0 0 0 3px rgba(79,70,229,0.1)'"
                      onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"></textarea>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button class="confirm-btn confirm-cancel" onclick="this.closest('.confirm-modal').remove()" 
                        style="padding:10px 20px; border:none; border-radius:8px; font-weight:600; cursor:pointer; background:#f1f5f9; color:#64748b; transition:all 0.2s;"
                        onmouseover="this.style.background='#e2e8f0'"
                        onmouseout="this.style.background='#f1f5f9'">
                    Cancel
                </button>
                <button class="confirm-btn confirm-ok" id="confirmShareReviewerBtn" 
                        style="padding:10px 24px; border:none; border-radius:8px; font-weight:600; cursor:pointer; background:#4f46e5; color:white; transition:all 0.2s; display:flex; align-items:center; gap:6px;"
                        onmouseover="this.style.background='#4338ca'"
                        onmouseout="this.style.background='#4f46e5'">
                    <i class='bx bx-share-alt'></i> Share
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const textarea = modal.querySelector('#shareReviewerDescriptionInput');
    if (textarea) {
        setTimeout(() => textarea.focus(), 100);
    }
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            modal.querySelector('#confirmShareReviewerBtn').click();
        }
    });
    modal.querySelector('#confirmShareReviewerBtn').onclick = () => {
        const description = document.getElementById('shareReviewerDescriptionInput').value.trim();
        modal.remove();
        onConfirm(description);
    };
}

// ============================================
// REVIEWER POST RENDERING & STUDY FROM POST
// ============================================

window._reviewerPostsCache = window._reviewerPostsCache || {};

function parseReviewerPostContent(content) {
    if (!content || !content.includes(REVIEWER_POST_MARKER)) return null;
    try {
        const idx = content.indexOf(REVIEWER_POST_MARKER);
        const jsonStr = content.substring(idx + REVIEWER_POST_MARKER.length);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Failed to parse reviewer post payload:', e);
        return null;
    }
}

function renderPostBody(post) {
    const reviewerData = parseReviewerPostContent(post.content);
    if (reviewerData) {
        window._reviewerPostsCache[post.id] = reviewerData;
        let sourceFileUrl = reviewerData.sourceFileUrl || null;
        if (!sourceFileUrl) {
            const allFiles = [
                ...(post.documentUrlList || []),
                ...(post.imageUrlList || []),
                ...(post.videoUrlList || [])
            ];
            if (reviewerData.sourceFileName && allFiles.length > 0) {
                for (const url of allFiles) {
                    if (getFileNameFromUrl(url) === reviewerData.sourceFileName) {
                        sourceFileUrl = url;
                        break;
                    }
                }
            }
        }
        if (sourceFileUrl) {
            reviewerData.sourceFileUrl = sourceFileUrl;
            window._reviewerPostsCache[post.id].sourceFileUrl = sourceFileUrl;
        }
        const styleLabel = ({
            definition: 'Definition Focused',
            conceptual: 'Conceptual',
            exam: 'Exam style',
            identification: 'Identification'
        })[reviewerData.style] || 'Conceptual';
        const typeLabel = reviewerData.type === 'flashcards' ? 'Flashcards' : 'Quiz';
        const typeIcon = reviewerData.type === 'flashcards' ? 'bx-card' : 'bx-question-mark';
        const hasFileUrl = !!sourceFileUrl;
        return `

            <div class="reviewer-card">
                <div class="reviewer-card-top">
                    <div class="reviewer-icon"><i class='bx ${typeIcon}'></i></div>
                    <div class="reviewer-meta">
                        <div class="reviewer-title">${typeLabel} Reviewer</div>
                        <div class="reviewer-sub">${reviewerData.items.length} items · ${styleLabel}${reviewerData.difficulty ? ' · ' + escapeHtml(reviewerData.difficulty) : ''}</div>
                    </div>
                </div>

                ${reviewerData.description ? `
                    <p class="reviewer-desc">${escapeHtml(reviewerData.description)}</p>
                ` : ''}

                <div class="reviewer-card-footer">
                    ${reviewerData.sourceFileName ? `
                        <button class="reviewer-file-chip ${hasFileUrl ? '' : 'disabled'}"
                                onclick="event.stopPropagation(); ${hasFileUrl ? `downloadSourceFile(${post.id})` : ''}"
                                title="${escapeHtml(reviewerData.sourceFileName)}"
                                ${hasFileUrl ? '' : 'disabled'}>
                            <i class='bx bx-file'></i>
                            <span>${escapeHtml(truncateFilename(reviewerData.sourceFileName, 16))}</span>
                            ${hasFileUrl ? `<i class='bx bx-download reviewer-file-chip-icon'></i>` : ''}
                        </button>
                    ` : `
                        <span class="reviewer-manual-tag">Manually created</span>
                    `}

                    <button class="reviewer-study-btn" onclick="startStudyFromPost(${post.id})">
                        Study <i class='bx bx-right-arrow-alt'></i>
                    </button>
                </div>
            </div>
            ${renderFilesCarousel(post)}
        `;
    }
    return `
        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        <div class="post-text">${detectLinks(escapeHtml(post.content))}</div>
        ${renderFilesCarousel(post)}
    `;
}

function startStudyFromPost(postId) {
    const reviewerData = window._reviewerPostsCache[postId];
    if (!reviewerData) {
        showTemporaryModal('Could not load this reviewer.');
        return;
    }
    const meta = {
        style: reviewerData.style,
        difficulty: reviewerData.difficulty,
        sourceFileName: reviewerData.sourceFileName,
        sourceFileType: reviewerData.sourceFileType,
        sourceFileData: reviewerData.sourceFileData,
        sourceFileUrl: reviewerData.sourceFileUrl || null,
        description: reviewerData.description
    };
    startStudySession(reviewerData.type, reviewerData.items, { meta });
}

// ============================================
// REVIEWER FILE UPLOAD & GENERATION
// ============================================

let uploadedReviewerText = "";

function selectReviewerType(type) {
    reviewerState.type = type;
    document.querySelectorAll('.reviewer-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    const selectedCard = document.querySelector(`.reviewer-type-card[data-type="${type}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    renderReviewerUploadStep(type);
}

function renderReviewerUploadStep(type) {
    const area = document.getElementById('reviewerFormArea');
    const label = type === 'flashcards' ? 'Flashcards' : 'Quiz';
    const fileDisplay = reviewerState.sourceFileName ? `
        <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:#f1f5f9; border-radius:8px; margin-top:8px;">
            <i class='bx bx-file' style="color:#4f46e5;"></i>
            <span style="font-weight:500;">${escapeHtml(reviewerState.sourceFileName)}</span>
            <span style="font-size:12px; color:#64748b;">(${(reviewerState.sourceFileData?.size / 1024).toFixed(1)} KB)</span>
            <button onclick="clearUploadedFile()" style="margin-left:auto; background:none; border:none; color:#ef4444; cursor:pointer; font-size:18px;">
                <i class='bx bx-x'></i>
            </button>
        </div>
    ` : '';
    area.innerHTML = `
        <div class="reviewer-form">
            <div class="reviewer-form-header">
                <h3>Auto Create ${label}</h3>
                <p>Upload notes or paste text, then let AI create your reviewer.</p>
            </div>

            <input 
                id="reviewer-file-upload" 
                type="file" 
                accept=".txt,.pdf,.docx"
                onchange="handleReviewerFileUpload(event)"
            >

            ${fileDisplay}

            <textarea 
                id="reviewer-source-text" 
                placeholder="Paste your reviewer notes here, or upload a .txt, .pdf, or .docx file..."
            >${uploadedReviewerText || ''}</textarea>

            <select id="reviewer-difficulty">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
            </select>

            <input 
                id="reviewer-count" 
                type="number" 
                min="5" 
                max="50" 
                value="10"
                placeholder="Number of items"
            >

            <select id="reviewer-style">
                <option value="definition">Definition focused</option>
                <option value="conceptual" selected>Conceptual</option>
                <option value="exam">Exam style</option>
                <option value="identification">Identification</option>
            </select>

            <button onclick="autoGenerateReviewer()" class="reviewer-primary-btn">
                <i class='bx bx-sparkles'></i>
                Auto Generate ${label}
            </button>

            <button onclick="${type === 'flashcards' ? 'renderFlashcardCreator()' : 'renderQuizCreator()'}" class="reviewer-save-btn">
                Create Manually
            </button>
        </div>
    `;
}

function clearUploadedFile() {
    reviewerState.sourceFileName = null;
    reviewerState.sourceFileType = null;
    reviewerState.sourceFileData = null;
    uploadedReviewerText = "";
    document.getElementById('reviewer-source-text').value = "";
    document.getElementById('reviewer-file-upload').value = "";
    renderReviewerUploadStep(reviewerState.type);
}

async function handleReviewerFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    reviewerState.sourceFileName = file.name;
    reviewerState.sourceFileType = file.type;
    reviewerState.sourceFileData = file;
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedReviewerText = e.target.result;
            document.getElementById('reviewer-source-text').value = uploadedReviewerText;
            showTemporaryModal('Text file uploaded successfully!');
        };
        reader.readAsText(file);
        return;
    }
    if (fileName.endsWith('.pdf') || fileName.endsWith('.docx')) {
        const formData = new FormData();
        formData.append('file', file);
        showLoadingModal('Uploading file...');
        try {
            const response = await fetch(`${API_BASE_URL}/reviewer/extract-text`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            hideLoadingModal();
            if (response.ok && data.status === 'success') {
                reviewerState.sourceFileUrl = data.fileUrl;
                reviewerState.sourceFileName = data.fileName || file.name;
                reviewerState.sourceFileType = data.fileType || file.type;
                uploadedReviewerText = data.text || '';
                document.getElementById('reviewer-source-text').value = uploadedReviewerText;
                console.log('✅ File uploaded to Cloudinary:', reviewerState.sourceFileUrl);
                showTemporaryModal('File uploaded successfully!');
            } else {
                showTemporaryModal(data.message || 'Failed to extract text.');
            }
        } catch (error) {
            hideLoadingModal();
            console.error('File extraction error:', error);
            showTemporaryModal('Server error while reading file.');
        }
        return;
    }
    showTemporaryModal('Please upload a .txt, .pdf, or .docx file.');
}

async function autoGenerateReviewer() {
    const sourceText = document.getElementById('reviewer-source-text').value.trim();
    const difficulty = document.getElementById('reviewer-difficulty')?.value || 'medium';
    const count = Number(document.getElementById('reviewer-count')?.value || 10);
    const style = document.getElementById('reviewer-style')?.value || 'conceptual';
    if (!sourceText) {
        showTemporaryModal('Please upload or paste reviewer content first.');
        return;
    }
    if (!reviewerState.type) {
        showTemporaryModal('Please select reviewer type first.');
        return;
    }
    reviewerState.style = style;
    reviewerState.difficulty = difficulty;
    showLoadingModal('Creating reviewer with AI...');
    try {
        const response = await fetch(`${API_BASE_URL}/reviewer/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: reviewerState.type,
                sourceText,
                difficulty,
                count,
                style,
                sourceFileUrl: reviewerState.sourceFileUrl,
                sourceFileName: reviewerState.sourceFileName,
                sourceFileType: reviewerState.sourceFileType
            })
        });
        const data = await response.json();
        hideLoadingModal();
        if (!response.ok || data.status !== 'success') {
            showTemporaryModal(data.message || 'Failed to generate reviewer.');
            return;
        }
        if (reviewerState.type === 'flashcards') {
            reviewerState.flashcards = data.items;
            renderFlashcardCreator();
            showTemporaryModal('Flashcards generated!');
        } else if (reviewerState.type === 'quiz') {
            reviewerState.quizQuestions = data.items;
            renderQuizCreator();
            showTemporaryModal('Quiz generated!');
        }
    } catch (error) {
        hideLoadingModal();
        console.error('AI reviewer generation error:', error);
        showTemporaryModal('Server error while generating reviewer.');
    }
}

// ============================================
// RECENTLY VISITED POSTS
// ============================================

function escapeJsString(str) {
    return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function recordRecentVisit(postId, title, author, type, thumbnailUrl) {
    let recent = JSON.parse(localStorage.getItem('recentlyVisitedPosts') || '[]');
    recent = recent.filter(item => item.postId !== postId);
    recent.unshift({
        postId,
        title,
        author,
        type,
        thumbnailUrl,
        visitedAt: new Date().toISOString()
    });
    recent = recent.slice(0, 10);
    localStorage.setItem('recentlyVisitedPosts', JSON.stringify(recent));
    renderRecentVisitedSidebar();
}

function removeRecentVisit(event, postId) {
    event.stopPropagation();
    let recent = JSON.parse(localStorage.getItem('recentlyVisitedPosts') || '[]');
    recent = recent.filter(item => item.postId !== postId);
    localStorage.setItem('recentlyVisitedPosts', JSON.stringify(recent));
    renderRecentVisitedSidebar();
}

function goToPost(postId) {
    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    if (postCard) {
        postCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        postCard.style.transition = 'box-shadow 0.3s';
        postCard.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.4)';
        setTimeout(() => { postCard.style.boxShadow = ''; }, 1500);
    } else {
        showTemporaryModal('That post isn\'t currently loaded — try scrolling the feed or reloading it.');
    }
}

function renderRecentVisitedSidebar() {
    const container = document.getElementById('recentPostsCard');
    if (!container) return;
    const recent = JSON.parse(localStorage.getItem('recentlyVisitedPosts') || '[]');
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="sidebar-header"><div class="section-title">Recent Posts Visited</div></div>
            <div class="empty-state">
                <i class='bx bx-history'></i>
                <div class="empty-state-text">No posts visited yet</div>
                <div class="empty-state-subtext">Files you open will show up here</div>
            </div>
        `;
        return;
    }
    const iconForType = { image: 'bx-image', video: 'bx-video', document: 'bx-file' };
    container.innerHTML = `
        <div class="sidebar-header"><div class="section-title">Recent Posts Visited</div></div>
        ${recent.map(item => `
            <div class="recent-post-item" onclick="goToPost(${item.postId})">
                <button class="remove-post-btn" onclick="removeRecentVisit(event, ${item.postId})">
                    <i class='bx bx-x'></i>
                </button>
                ${item.type === 'image' && item.thumbnailUrl
        ? `<img src="${item.thumbnailUrl}" class="recent-post-thumb" style="object-fit:cover;" alt="">`
        : `<div class="recent-post-thumb"><i class='bx ${iconForType[item.type] || 'bx-file'}'></i></div>`
    }
                <div class="recent-post-info">
                    <div class="recent-post-title">${escapeHtml(item.title)}</div>
                    <div class="recent-post-author">By ${escapeHtml(item.author)}</div>
                    <div class="recent-post-time">Visited ${formatTime(item.visitedAt)}</div>
                </div>
            </div>
        `).join('')}
    `;
}

// ============================================
// STUDY SESSION
// ============================================

let studySession = null;

function startStudySession(type, items, options = {}) {
    const { resetOriginal = true, meta = null } = options;
    if (!items || items.length === 0) {
        showTemporaryModal('No items to study yet.');
        return;
    }
    let preservedMeta = meta || {};
    if (!preservedMeta.sourceFileUrl && reviewerState.sourceFileUrl) {
        preservedMeta.sourceFileUrl = reviewerState.sourceFileUrl;
        preservedMeta.sourceFileName = reviewerState.sourceFileName;
        preservedMeta.sourceFileType = reviewerState.sourceFileType;
    }
    studySession = {
        type,
        originalItems: resetOriginal ? items.slice() : (studySession ? studySession.originalItems : items.slice()),
        items: items.slice(),
        index: 0,
        results: [],
        flipped: false,
        selectedOption: null,
        locked: false,
        meta: preservedMeta
    };
    openStudyModal();
    renderStudyCard();
}

function openStudyModal() {
    if (document.getElementById('studySessionModal')) return;
    const modal = document.createElement('div');
    modal.id = 'studySessionModal';
    modal.className = 'study-session-modal active';
    modal.innerHTML = `
        <div class="study-session-content">
            <div class="study-header">
                <div class="study-progress" id="studyProgressText"></div>
                <button class="study-close-btn" onclick="closeStudySession()"><i class='bx bx-x'></i></button>
            </div>
            <div class="study-stack" id="studyStack"></div>
            <div class="study-controls" id="studyControls"></div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeStudySession() {
    document.getElementById('studySessionModal')?.remove();
    studySession = null;
}

function updateStudyProgress() {
    const el = document.getElementById('studyProgressText');
    if (!el || !studySession) return;
    el.textContent = `Card ${Math.min(studySession.index + 1, studySession.items.length)} / ${studySession.items.length}`;
}

function renderStudyCard() {
    if (!studySession) return;
    updateStudyProgress();
    if (studySession.index >= studySession.items.length) {
        renderStudySummary();
        return;
    }
    const item = studySession.items[studySession.index];
    studySession.type === 'flashcards' ? renderFlashcardStudyCard(item) : renderQuizStudyCard(item);
}

function renderFlashcardStudyCard(item) {
    studySession.flipped = false;
    document.getElementById('studyStack').innerHTML = `
        <div class="study-ghost-card g2"></div>
        <div class="study-ghost-card g1"></div>
        <div class="study-active-card" id="flashcardStudyFace" onclick="flipStudyFlashcard()">
            <div class="study-label">Question</div>
            <div class="study-text">${escapeHtml(item.question)}</div>
            <div class="study-hint">Tap to reveal answer</div>
        </div>
    `;
    document.getElementById('studyControls').innerHTML = `
        <div class="study-controls-row">
            <button class="study-btn nav-btn" onclick="studyGoBack()" ${studySession.index === 0 ? 'disabled' : ''}><i class='bx bx-left-arrow-alt'></i> Back</button>
            <button class="study-btn skip-btn" onclick="studySkip()"><i class='bx bx-skip-next'></i> Skip</button>
        </div>
    `;
}

function flipStudyFlashcard() {
    if (!studySession) return;
    studySession.flipped = !studySession.flipped;
    const item = studySession.items[studySession.index];
    const face = document.getElementById('flashcardStudyFace');
    if (studySession.flipped) {
        face.classList.add('answer-face');
        face.innerHTML = `
            <div class="study-label answer">Answer</div>
            <div class="study-text">${escapeHtml(item.answer)}</div>
            <div class="study-hint">Did you get it right?</div>
        `;
        document.getElementById('studyControls').innerHTML = `
            <div class="study-controls-row">
                <button class="study-btn correct-btn" onclick="studyAnswer(true)"><i class='bx bx-check'></i> Got it right</button>
                <button class="study-btn wrong-btn" onclick="studyAnswer(false)"><i class='bx bx-x'></i> Got it wrong</button>
            </div>
            <div class="study-controls-row">
                <button class="study-btn nav-btn" onclick="studyGoBack()" ${studySession.index === 0 ? 'disabled' : ''}><i class='bx bx-left-arrow-alt'></i> Back</button>
                <button class="study-btn skip-btn" onclick="studySkip()"><i class='bx bx-skip-next'></i> Skip</button>
            </div>
        `;
    } else {
        face.classList.remove('answer-face');
        face.innerHTML = `
            <div class="study-label">Question</div>
            <div class="study-text">${escapeHtml(item.question)}</div>
            <div class="study-hint">Tap to reveal answer</div>
        `;
    }
}

function renderQuizStudyCard(item) {
    studySession.selectedOption = null;
    studySession.locked = false;
    document.getElementById('studyStack').innerHTML = `
        <div class="study-ghost-card g2"></div>
        <div class="study-ghost-card g1"></div>
        <div class="study-active-card" style="cursor:default;">
            <div class="study-label">Question</div>
            <div class="study-text">${escapeHtml(item.question)}</div>
            <div class="quiz-options">
                ${['A','B','C','D'].map(letter => `
                    <button class="quiz-option-btn" data-letter="${letter}" onclick="selectQuizOption('${letter}')">
                        ${letter}. ${escapeHtml(item.options[letter])}
                    </button>
                `).join('')}
            </div>
            <div id="quizExplanationSlot"></div>
        </div>
    `;
    document.getElementById('studyControls').innerHTML = `
        <div class="study-controls-row">
            <button class="study-btn nav-btn" onclick="studyGoBack()" ${studySession.index === 0 ? 'disabled' : ''}><i class='bx bx-left-arrow-alt'></i> Back</button>
            <button class="study-btn skip-btn" onclick="studySkip()"><i class='bx bx-skip-next'></i> Skip</button>
        </div>
    `;
}

function selectQuizOption(letter) {
    if (!studySession || studySession.locked) return;
    const item = studySession.items[studySession.index];
    studySession.selectedOption = letter;
    studySession.locked = true;
    document.querySelectorAll('.quiz-option-btn').forEach(btn => {
        btn.disabled = true;
        const btnLetter = btn.dataset.letter;
        if (btnLetter === item.correctAnswer) btn.classList.add('correct-answer');
        else if (btnLetter === letter) btn.classList.add('wrong-answer');
        if (btnLetter === letter) btn.classList.add('selected');
    });
    const explanationSlot = document.getElementById('quizExplanationSlot');
    if (explanationSlot && item.explanation) {
        explanationSlot.innerHTML = `
            <div class="quiz-explanation">
                <i class='bx bx-bulb'></i>
                <span>${escapeHtml(item.explanation)}</span>
            </div>
        `;
    }
    const isCorrect = letter === item.correctAnswer;
    document.getElementById('studyControls').innerHTML = `
        <div class="study-controls-row">
            <button class="study-btn ${isCorrect ? 'correct-btn' : 'wrong-btn'}" onclick="studyAnswer(${isCorrect})">
                <i class='bx bx-arrow-to-right'></i> ${isCorrect ? 'Correct! Continue' : 'Continue'}
            </button>
        </div>
        <div class="study-controls-row">
            <button class="study-btn nav-btn" onclick="studyGoBack()" ${studySession.index === 0 ? 'disabled' : ''}><i class='bx bx-left-arrow-alt'></i> Back</button>
        </div>
    `;
}

function studyAnswer(isCorrect) {
    studySession.results.push({ item: studySession.items[studySession.index], status: isCorrect ? 'correct' : 'wrong' });
    studySession.index++;
    renderStudyCard();
}

function studySkip() {
    studySession.results.push({ item: studySession.items[studySession.index], status: 'skipped' });
    studySession.index++;
    renderStudyCard();
}

function studyGoBack() {
    if (studySession.index === 0) return;
    studySession.index--;
    studySession.results.pop();
    renderStudyCard();
}

function renderStudySummary() {
    const correct = studySession.results.filter(r => r.status === 'correct').length;
    const wrong = studySession.results.filter(r => r.status === 'wrong').length;
    const skipped = studySession.results.filter(r => r.status === 'skipped').length;
    const total = studySession.results.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    document.getElementById('studyStack').innerHTML = `
        <div class="study-summary">
            <i class='bx bx-trophy' style="font-size:48px;color:#4f46e5;"></i>
            <div class="study-summary-score">${pct}%</div>
            <div class="study-summary-sub">${correct} correct • ${wrong} wrong • ${skipped} skipped (of ${total})</div>
            <div class="study-summary-list">
                ${studySession.results.map(r => `
                    <div class="study-summary-item ${r.status === 'correct' ? 'correct' : r.status === 'wrong' ? 'wrong' : ''}">
                        <span>${escapeHtml(r.item.question)}</span>
                        <strong>${r.status.toUpperCase()}</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    const hasWrong = wrong > 0 || skipped > 0;
    document.getElementById('studyControls').innerHTML = `
        <div class="study-summary-actions">
            <button class="study-btn nav-btn" onclick="restartStudySession()"> Start Over</button>
            <button class="study-btn skip-btn" onclick="retryWrongOnly()" ${hasWrong ? '' : 'disabled'}>Retry Wrong Only</button>
            <button class="study-btn nav-btn full-width" onclick="saveReviewerFromSession()"></i> Save to Profile</button>
            <button class="study-btn correct-btn full-width" onclick="shareReviewerFromSession()"> Share to Newsfeed</button>
            <button class="study-btn wrong-btn full-width" onclick="closeStudySession()"> Close</button>
        </div>
    `;
}

function restartStudySession() {
    startStudySession(studySession.type, studySession.originalItems, {
        resetOriginal: true,
        meta: studySession.meta
    });
}

function retryWrongOnly() {
    const wrongItems = studySession.results.filter(r => r.status !== 'correct').map(r => r.item);
    startStudySession(studySession.type, wrongItems, {
        resetOriginal: false,
        meta: studySession.meta
    });
}

// ============================================
// MY REVIEWERS (Saved Reviewers)
// ============================================

async function openMyReviewers() {
    const userId = localStorage.getItem('userId') || 'guest';
    let list = [];
    try {
        const response = await fetch(`${API_BASE_URL}/reviewer/user/${userId}`);
        if (response.ok) {
            const raw = await response.json();
            list = raw.map(r => ({
                id: r.id,
                type: r.type,
                items: JSON.parse(r.itemsJson),
                style: r.style,
                difficulty: r.difficulty,
                sourceFileName: r.sourceFileName,
                sourceFileType: r.sourceFileType,
                sourceFileUrl: r.sourceFileUrl,
                description: r.description
            }));
        }
    } catch (error) {
        console.error('Failed to load reviewers:', error);
    }
    window._savedReviewersCache = list;

    const styleLabel = (s) => ({
        definition: 'Definition Focused',
        conceptual: 'Conceptual',
        exam: 'Exam Style',
        identification: 'Identification'
    })[s] || 'Conceptual';

    // Remove any existing modal
    document.querySelector('.my-reviewers-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'my-reviewers-modal active';

    let bodyContent = '';
    if (list.length === 0) {
        bodyContent = `
            <div class="my-reviewers-empty">
                <i class='bx bx-book-bookmark'></i>
                <div class="empty-state-text">No saved reviewers yet</div>
                <div class="empty-state-subtext">Create and save reviewers to see them here</div>
            </div>
        `;
    } else {
        bodyContent = list.map(r => {
            const typeIcon = r.type === 'flashcards' ? 'bx-card' : 'bx-question-mark';
            const typeLabel = r.type === 'flashcards' ? 'Flashcards' : 'Quiz';
            const styleText = styleLabel(r.style);
            const hasFileUrl = !!r.sourceFileUrl;
            return `
                <div class="reviewer-card">
                    <div class="reviewer-card-top">
                        <div class="reviewer-icon"><i class='bx ${typeIcon}'></i></div>
                        <div class="reviewer-meta">
                            <div class="reviewer-title">${typeLabel} Reviewer</div>
                            <div class="reviewer-sub">${r.items.length} items · ${styleText}${r.difficulty ? ' · ' + escapeHtml(r.difficulty) : ''}</div>
                        </div>
                    </div>
                    ${r.description ? `<p class="reviewer-desc">${escapeHtml(r.description)}</p>` : ''}
                    <div class="reviewer-card-footer">
                        ${r.sourceFileName ? `
                            <button class="reviewer-file-chip ${hasFileUrl ? '' : 'disabled'}"
                                    onclick="${hasFileUrl ? `downloadSavedReviewerFile(${r.id})` : ''}"
                                    title="${escapeHtml(r.sourceFileName)}"
                                    ${hasFileUrl ? '' : 'disabled'}>
                                <i class='bx bx-file'></i>
                                <span>${escapeHtml(truncateFilename(r.sourceFileName, 16))}</span>
                                ${hasFileUrl ? `<i class='bx bx-download reviewer-file-chip-icon'></i>` : ''}
                            </button>
                        ` : `
                            <span class="reviewer-manual-tag">Manually created</span>
                        `}
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="reviewer-icon-btn" onclick="editSavedReviewerDescription(${r.id})" title="Edit">
                                <i class='bx bx-edit'></i>
                            </button>
                            <button class="reviewer-icon-btn danger" onclick="deleteSavedReviewer(${r.id})" title="Delete">
                                <i class='bx bx-trash'></i>
                            </button>
                            <button class="reviewer-study-btn" onclick="studyFromSaved(${r.id})">
                                Study <i class='bx bx-right-arrow-alt'></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    modal.innerHTML = `
        <div class="my-reviewers-modal-content">
            <div class="my-reviewers-modal-header">
                <h3>My Saved Reviewers</h3>
                <button class="my-reviewers-modal-close" onclick="this.closest('.my-reviewers-modal').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="my-reviewers-modal-body">
                ${bodyContent}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Close on Escape key
    const closeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeHandler);
        }
    };
    document.addEventListener('keydown', closeHandler);
}
function openEditProfile() {
    // Remove existing modal
    document.querySelector('.edit-profile-modal')?.remove();

    const userId = localStorage.getItem('userId');
    if (!userId) {
        showTemporaryModal('Please log in first.');
        return;
    }

    // Fetch current user data
    fetch(`${API_BASE_URL}/users/${userId}`)
        .then(res => res.json())
        .then(user => {
            const modal = document.createElement('div');
            modal.className = 'edit-profile-modal active';
            modal.innerHTML = `
                <div class="edit-profile-content">
                    <div class="edit-profile-header">
                        <h3>Edit Profile</h3>
                        <button class="profile-edit-btn" onclick="openEditProfile()">
                            <i class='bx bx-edit-alt'></i> Edit Profile
                        </button>
                    </div>
                    <div class="edit-profile-body">
                        <div class="form-group">
                            <label>First Name</label>
                            <input type="text" id="editFirstName" value="${escapeHtml(user.firstName || '')}" placeholder="First name">
                        </div>
                        <div class="form-group">
                            <label>Last Name</label>
                            <input type="text" id="editLastName" value="${escapeHtml(user.lastName || '')}" placeholder="Last name">
                        </div>
                        <div class="form-group">
                            <label>Bio</label>
                            <textarea id="editBio" placeholder="Tell us about yourself...">${escapeHtml(user.bio || '')}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="editEmail" value="${escapeHtml(user.email || '')}" placeholder="Email" disabled>
                            <small style="color:#94a3b8; font-size:12px;">Email cannot be changed</small>
                        </div>
                    </div>
                    <div class="edit-profile-footer">
                        <button class="btn-secondary" onclick="this.closest('.edit-profile-modal').remove()">Cancel</button>
                        <button class="btn-primary" onclick="saveProfileChanges()">Save Changes</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            // Close on Escape
            const closeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', closeHandler);
                }
            };
            document.addEventListener('keydown', closeHandler);
        })
        .catch(err => {
            console.error('Failed to load profile:', err);
            showTemporaryModal('Failed to load profile data.');
        });
}

async function saveProfileChanges() {
    const userId = localStorage.getItem('userId');
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const bio = document.getElementById('editBio').value.trim();

    if (!firstName || !lastName) {
        showTemporaryModal('First and last name are required.');
        return;
    }

    try {
        showLoadingModal('Saving profile...');
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, bio })
        });
        const data = await response.json();
        hideLoadingModal();

        if (response.ok) {
            showTemporaryModal('Profile updated successfully!');
            document.querySelector('.edit-profile-modal')?.remove();
            // Update sidebar and profile page
            updateUserProfileCard();
            loadUserProfile();
        } else {
            showTemporaryModal(data.message || 'Failed to update profile.');
        }
    } catch (error) {
        hideLoadingModal();
        console.error('Error updating profile:', error);
        showTemporaryModal('Server error while updating profile.');
    }
}
function editSavedReviewerDescription(id) {
    const reviewer = (window._savedReviewersCache || []).find(r => r.id === id);
    if (!reviewer) {
        showTemporaryModal('Reviewer not found.');
        return;
    }
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content edit-post-modal" style="max-width:500px;">
            <div class="modal-header">
                <h3>Edit Reviewer Description</h3>
                <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="editSavedReviewerDescription">Description</label>
                    <textarea id="editSavedReviewerDescription" rows="4">${escapeHtml(reviewer.description || '')}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button type="button" class="btn-primary" onclick="updateSavedReviewerDescription(${id})">Update Description</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function updateSavedReviewerDescription(id) {
    const description = document.getElementById('editSavedReviewerDescription').value.trim();
    try {
        const response = await fetch(`${API_BASE_URL}/reviewer/${id}/description`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: description || 'No description provided' })
        });
        if (!response.ok) throw new Error('Failed to update');
        showTemporaryModal('Reviewer description updated!');
    } catch (error) {
        console.error('Failed to update description:', error);
        showTemporaryModal('Failed to update description.');
    }
    document.querySelector('.modal-overlay.active')?.remove();
    openMyReviewers();
}


function studyFromSaved(id) {
    const r = (window._savedReviewersCache || []).find(x => x.id === id);
    if (!r) return;
    document.querySelector('.modal-overlay.active')?.remove();
    startStudySession(r.type, r.items, {
        meta: {
            style: r.style,
            difficulty: r.difficulty,
            sourceFileName: r.sourceFileName,
            sourceFileType: r.sourceFileType,
            sourceFileUrl: r.sourceFileUrl || null,
            description: r.description
        }
    });
}

async function deleteSavedReviewer(id) {
    try {
        await fetch(`${API_BASE_URL}/reviewer/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Failed to delete reviewer:', error);
    }
    document.querySelector('.modal-overlay.active')?.remove();
    openMyReviewers();
}

// ============================================
// SCROLL TO TOP
// ============================================

document.getElementById('scrollToTopBtn')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('scroll', () => {
    document.getElementById('scrollToTopBtn')?.classList.toggle('visible', window.scrollY > 300);
});

// ============================================
// DESCRIPTION PROMPT MODAL (Generic)
// ============================================

function showDescriptionPromptModal(onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal active';
    modal.innerHTML = `
        <div class="confirm-content" style="text-align:left;">
            <div class="confirm-title" style="text-align:center;">Save Reviewer</div>
            <div class="confirm-message" style="text-align:center;">Add a short description so you can find it later.</div>
            <textarea id="reviewerDescriptionInput" placeholder="e.g. Midterm reviewer for Chapter 3 - Cell Biology" style="width:100%; min-height:80px; padding:10px; border:1px solid #ddd; border-radius:8px; margin-bottom:16px; font-family:inherit;"></textarea>
            <div class="confirm-buttons">
                <button class="confirm-btn confirm-cancel" onclick="this.closest('.confirm-modal').remove()">Cancel</button>
                <button class="confirm-btn confirm-ok" style="background:#16a34a;" id="confirmSaveReviewerBtn">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#confirmSaveReviewerBtn').onclick = () => {
        const description = document.getElementById('reviewerDescriptionInput').value.trim();
        modal.remove();
        onConfirm(description);
    };
}

// ============================================
// DOWNLOAD SOURCE FILE (From Post)
// ============================================

function downloadSourceFile(postId) {
    const reviewerData = window._reviewerPostsCache[postId];
    if (!reviewerData || !reviewerData.sourceFileName) {
        showTemporaryModal('No source file available for this reviewer.');
        return;
    }
    console.log(`=== Downloading source file for post ${postId} ===`);
    console.log('Reviewer data:', reviewerData);
    if (reviewerData.sourceFileUrl) {
        requestDownloadPermission(reviewerData.sourceFileUrl, reviewerData.sourceFileName);
        return;
    }
    const cachedPosts = JSON.parse(localStorage.getItem('cachedPosts') || '[]');
    const post = cachedPosts.find(p => p.id === postId);
    if (post) {
        const allFiles = [
            ...(post.documentUrlList || []),
            ...(post.imageUrlList || []),
            ...(post.videoUrlList || [])
        ];
        for (const url of allFiles) {
            const filename = getFileNameFromUrl(url);
            if (filename === reviewerData.sourceFileName ||
                filename.includes(reviewerData.sourceFileName.replace(/\.[^.]+$/, ''))) {
                requestDownloadPermission(url, reviewerData.sourceFileName);
                return;
            }
        }
    }
    showTemporaryModal('Source file not found. It may have been removed.');
}

// ============================================
// FILE PREVIEW (For regular post files)
// ============================================

function previewFile(fileUrl, fileType, filename) {
    console.log('previewFile called with:', fileUrl, fileType, filename);

    if (!fileUrl) {
        console.error('No file URL provided');
        showTemporaryModal('Cannot preview: No file URL');
        return;
    }

    // Close any existing preview
    closeFilePreview();

    const modal = document.createElement('div');
    modal.className = 'file-preview-modal active';
    modal.id = 'filePreviewModal';

    let bodyContent = '';
    let displayName = filename || 'File';

    // Try to extract filename from URL if not provided
    if (!filename || filename === 'File') {
        try {
            const urlParts = fileUrl.split('/');
            displayName = urlParts[urlParts.length - 1] || 'File';
            displayName = displayName.split('?')[0];
            displayName = decodeURIComponent(displayName);
        } catch (e) {
            displayName = 'File';
        }
    }

    // Determine file type
    const type = getFileType(fileUrl, fileType);
    console.log('Detected file type:', type);

    switch (type) {
        case 'image':
            bodyContent = `
                <img src="${fileUrl}" alt="${displayName}" loading="lazy" 
                     onerror="this.parentElement.innerHTML='<div class=\\'document-preview-content\\'><i class=\\'bx bx-image\\'></i><h3>Failed to load image</h3><p>The image could not be loaded.</p><div class=\\'document-actions\\'><button class=\\'close-btn\\' onclick=\\'closeFilePreview()\\'>Close</button></div></div>'">
            `;
            break;

        case 'video':
            bodyContent = `
                <video controls autoplay>
                    <source src="${fileUrl}" type="video/mp4">
                    <source src="${fileUrl}" type="video/webm">
                    <source src="${fileUrl}" type="video/ogg">
                    Your browser does not support the video tag.
                </video>
            `;
            break;

        case 'document':
            bodyContent = `
                <div class="document-preview-content">
                    <i class='bx bx-file'></i>
                    <h3>${escapeHtml(displayName)}</h3>
                    <p>This is a document file. Click download to view it.</p>
                    <div class="document-actions">
                        <button class="download-btn" onclick="event.stopPropagation(); closeFilePreview(); requestDownloadPermission('${fileUrl}', '${escapeHtml(displayName)}')">
                            <i class='bx bx-download'></i> Download
                        </button>
                        <button class="close-btn" onclick="closeFilePreview()">Close</button>
                    </div>
                </div>
            `;
            break;

        default:
            bodyContent = `
                <div class="document-preview-content">
                    <i class='bx bx-file'></i>
                    <h3>${escapeHtml(displayName)}</h3>
                    <p>File preview not available for this type.</p>
                    <div class="document-actions">
                        <button class="download-btn" onclick="event.stopPropagation(); closeFilePreview(); requestDownloadPermission('${fileUrl}', '${escapeHtml(displayName)}')">
                            <i class='bx bx-download'></i> Download
                        </button>
                        <button class="close-btn" onclick="closeFilePreview()">Close</button>
                    </div>
                </div>
            `;
    }

    modal.innerHTML = `
        <div class="file-preview-content">
            <button class="file-preview-close" onclick="closeFilePreview()">
                <i class='bx bx-x'></i>
            </button>
            <div class="file-preview-body">
                ${bodyContent}
            </div>
            <div class="file-preview-footer">
                <span class="file-name">${escapeHtml(displayName)}</span>
                <span class="file-size">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeFilePreview();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', handleFilePreviewKeydown);
}

function closeFilePreview() {
    const modal = document.getElementById('filePreviewModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(function() {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
    document.removeEventListener('keydown', handleFilePreviewKeydown);
}

function handleFilePreviewKeydown(e) {
    if (e.key === 'Escape') {
        closeFilePreview();
    }
}
function getFileType(url, fileType) {
    // If we have a file type from the server, use it
    if (fileType) {
        if (fileType.startsWith('image/')) return 'image';
        if (fileType.startsWith('video/')) return 'video';
        if (fileType.startsWith('application/') ||
            fileType.includes('document') ||
            fileType.includes('pdf') ||
            fileType.includes('word') ||
            fileType.includes('excel')) return 'document';
    }

    // Otherwise detect from URL
    const urlLower = url.toLowerCase();
    if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/)) return 'image';
    if (urlLower.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/)) return 'video';
    if (urlLower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z|gz)$/)) return 'document';

    // Check Cloudinary URL patterns
    if (urlLower.includes('image')) return 'image';
    if (urlLower.includes('video')) return 'video';
    if (urlLower.includes('raw') || urlLower.includes('document') || urlLower.includes('file')) return 'document';

    return 'document';
}
// ============================================
// UTILITY – TRUNCATE FILENAME
// ============================================

function truncateFilename(filename, maxLength = 20) {
    if (!filename || filename.length <= maxLength) return filename;
    const lastDot = filename.lastIndexOf('.');
    const hasExt = lastDot > 0 && lastDot > filename.length - 8;
    const ext = hasExt ? filename.slice(lastDot) : '';
    const base = hasExt ? filename.slice(0, lastDot) : filename;
    const keep = maxLength - ext.length - 3;
    if (keep <= 0) return filename.slice(0, maxLength) + '…';
    return base.slice(0, keep) + '…' + ext;
}


// ============================================
// EXPORT FUNCTIONS FOR HTML
// ============================================

window.activateMobileSearch = activateMobileSearch;
window.deactivateMobileSearch = deactivateMobileSearch;
window.toggleCreatePost = toggleCreatePost;
window.toggleProfileDropdown = toggleProfileDropdown;
window.toggleLeftSidebar = toggleLeftSidebar;
window.toggleRightSidebar = toggleRightSidebar;
window.showProfile = showProfile;
window.showFeed = showFeed;
window.switchProfileTab = switchProfileTab;
window.removeRecentPost = removeRecentPost;
window.logout = logout;
window.submitPost = submitPost;
window.toggleLike = toggleLike;
window.toggleSave = toggleSave;
window.toggleComments = toggleComments;
window.sendComment = sendComment;
window.handleCommentKeyPress = handleCommentKeyPress;
window.openSavedPosts = openSavedPosts;
window.openLikedPosts = openLikedPosts;
window.handleImageUpload = handleImageUpload;
window.handleDocumentUpload = handleDocumentUpload;
window.handleVideoUpload = handleVideoUpload;
window.removeFile = removeFile;
window.backHome = backHome;
window.togglePostMenu = togglePostMenu;
window.deletePost = deletePost;
window.reportPost = reportPost;
window.editPost = editPost;
window.closeEditModal = closeEditModal;
window.submitEditPost = submitEditPost;
window.scrollPostCarousel = scrollPostCarousel;
window.goToSlide = goToSlide;
window.scrollPreviewCarousel = scrollPreviewCarousel;
window.updatePreviewCarouselControls = updatePreviewCarouselControls;
window.openReviewerCreator = openReviewerCreator;
window.closeReviewerCreator = closeReviewerCreator;
window.selectReviewerType = selectReviewerType;
window.addFlashcard = addFlashcard;
window.removeFlashcard = removeFlashcard;
window.addQuizQuestion = addQuizQuestion;
window.removeQuizQuestion = removeQuizQuestion;
window.saveReviewer = saveReviewer;
window.handleReviewerFileUpload = handleReviewerFileUpload;
window.autoGenerateReviewer = autoGenerateReviewer;
window.renderFlashcardCreator = renderFlashcardCreator;
window.renderQuizCreator = renderQuizCreator;
window.recordRecentVisit = recordRecentVisit;
window.removeRecentVisit = removeRecentVisit;
window.goToPost = goToPost;
window.previewFile = previewFile;
window.closeFilePreview = closeFilePreview;