
let API_BASE_URL;

if (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') {
    // Local development
    API_BASE_URL = 'http://localhost:8080';
    console.log(' Running in LOCAL mode');
} else if (window.location.hostname.includes('railway.app')) {
    // Production on Render
    API_BASE_URL = 'https://shareview-production.up.railway.app'; // ← CHANGE TO YOUR ACTUAL BACKEND URL
    console.log(' Running in PRODUCTION mode');
} else {
    // Fallback
    API_BASE_URL = 'https://shareview-vovf.onrender.com';
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
    if (!form) return;
    form.classList.toggle('active');
    if (form.classList.contains('active')) {
        form.style.display = 'block';
        if (newsFeed) newsFeed.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        form.style.display = 'none';
        if (newsFeed) newsFeed.style.display = 'block';
    }
}

function toggleProfileDropdown(event) {
    if (event) {
        event.stopPropagation(); // Prevent immediate closing
    }
    const dropdown = document.getElementById('profileDropdown');
    if (!dropdown) {
        console.error('Profile dropdown element not found');
        return;
    }

    // Toggle the active class
    const isActive = dropdown.classList.toggle('active');
    console.log('Dropdown toggled:', isActive);

    // Optional: Add visual feedback to the profile pic
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

function showProfile(event) {
    event && event.preventDefault && event.preventDefault();

    document.querySelector('.feed')?.classList.add('hidden');
    document.getElementById('profilePage')?.classList.add('active');
    document.getElementById('profileDropdown')?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load user profile and automatically load posts
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

function showFeed() {
    document.querySelector('.feed')?.classList.remove('hidden');
    document.getElementById('profilePage')?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSavedPosts(event) {
    event.preventDefault();

    // 1. Open Profile Page
    showProfile(event);

    // 2. After the page loads, activate the Saved tab and scroll to it
    setTimeout(() => {
        const savedTabBtn = document.querySelector('.profile-tab[data-tab="saved"]')
            || document.querySelector('.profile-tab:nth-child(2)'); // fallback
        if (savedTabBtn) {
            savedTabBtn.click();

            // Scroll to the saved content section
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

    // Close profile page if open
    document.querySelector('.feed')?.classList.remove('hidden');
    document.getElementById('profilePage')?.classList.remove('active');

    // Close any open dropdowns
    document.getElementById('profileDropdown')?.classList.remove('active');

    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    const homeMenuItem = document.querySelector('.menu-item[data-tab="newsFeed"]');
    if (homeMenuItem) {
        homeMenuItem.classList.add('active');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh the posts
    loadPosts().then(() => {
    }).catch(error => {
        console.error('Failed to refresh feed:', error);
    });
}

function openLikedPosts(event) {
    event.preventDefault();

    // 1. Open Profile Page
    showProfile(event);

    // 2. After the page loads, activate the Liked tab and scroll to it
    setTimeout(() => {
        const likedTabBtn = document.querySelector('.profile-tab[data-tab="liked"]')
            || document.querySelector('.profile-tab:nth-child(3)'); // fallback
        if (likedTabBtn) {
            likedTabBtn.click();

            // Scroll to the liked content section
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
    // Update tab active states
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.profile-content').forEach(c => c.classList.remove('active'));
    e.currentTarget.classList.add('active');

    // Map tab names to content IDs
    const map = { 'posts': 'postsContent', 'saved': 'savedContent', 'liked': 'likedContent' };
    const id = map[tabName];
    if (id) {
        const contentElement = document.getElementById(id);
        if (contentElement) {
            contentElement.classList.add('active');

            // Show loading state
            contentElement.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-loader-alt bx-spin'></i>
                    <div class="empty-state-text">Loading ${tabName}...</div>
                </div>
            `;
        }
    }

    // Load the content with a small delay to ensure UI is updated
    setTimeout(() => {
        loadProfileContent(tabName).catch(error => {
            console.error('Failed to load profile content:', error);
            showTemporaryModal('Failed to load ' + tabName + ' content');
        });
    }, 50);
}

function removeRecentPost(event, button) {
    event.stopPropagation();
    const postItem = button.closest('.recent-post-item');
    if (!postItem) return;
    postItem.style.transition = 'opacity 0.28s, transform 0.28s';
    postItem.style.opacity = '0';
    postItem.style.transform = 'translateX(20px)';
    setTimeout(() => postItem.remove(), 300);
}

// ============================================
// POST MANAGEMENT FUNCTIONS
// ============================================

// Enhanced state management for multiple files
let selectedFiles = {
    images: [],
    documents: [],
    videos: []
};

// Updated file size limits (in bytes)
const FILE_LIMITS = {
    IMAGE: 5 * 1024 * 1024, // 5MB per image
    DOCUMENT: 10 * 1024 * 1024, // 10MB per document
    VIDEO: 50 * 1024 * 1024, // 50MB per video
    TOTAL: 100 * 1024 * 1024 // 100MB total per post
};

// Compression settings
const COMPRESSION_SETTINGS = {
    IMAGE: { maxWidth: 1200, quality: 0.7 },
    VIDEO: { maxWidth: 1280, maxBitrate: 2000000 } // 2Mbps
};

// ============================================
// ENHANCED FILE UPLOAD HANDLERS WITH SIZE VALIDATION
// ============================================

function handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // Allow multiple selection
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

// File size validation
function validateFileSize(file, type) {
    const maxSize = FILE_LIMITS[type.toUpperCase()];
    if (file.size > maxSize) {
        showTemporaryModal(`${file.name} is too large (max ${maxSize / 1024 / 1024}MB)`);
        return false;
    }

    // Check total size
    const totalSize = calculateTotalFileSize() + file.size;
    if (totalSize > FILE_LIMITS.TOTAL) {
        showTemporaryModal(`Total files would exceed 100MB limit. Current: ${(calculateTotalFileSize() / 1024 / 1024).toFixed(1)}MB`);
        return false;
    }

    return true;
}

// ============================================
// ENHANCED FILE PREVIEW WITH CAROUSEL LAYOUT
// ============================================
// ============================================
// ENHANCED FILE PREVIEW WITH CAROUSEL LAYOUT
// ============================================

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

// Carousel scroll functionality
function scrollPreviewCarousel(direction) {
    const scrollContainer = document.querySelector('.file-previews-scroll');
    if (!scrollContainer) return;

    const scrollAmount = 180; // Width of one item + gap
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

    // Show/hide buttons based on scroll position
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
// Update the removeFile function to work with the new structure
function removeFile(type, filename) {
    // Remove from selected files
    if (type === 'image') {
        selectedFiles.images = selectedFiles.images.filter(item => item.file.name !== filename);
    } else if (type === 'document') {
        selectedFiles.documents = selectedFiles.documents.filter(item => item.file.name !== filename);
    } else if (type === 'video') {
        selectedFiles.videos = selectedFiles.videos.filter(item => item.file.name !== filename);
    }

    // Remove preview element
    const preview = document.querySelector(`[data-filename="${filename}"]`);
    if (preview) {
        preview.style.transition = 'opacity 0.3s, transform 0.3s';
        preview.style.opacity = '0';
        preview.style.transform = 'scale(0.8)';

        setTimeout(() => {
            preview.remove();
            updatePreviewCarouselControls();
            updateTotalSizeIndicator();

            // Remove container if empty
            const previewContainer = document.querySelector('.file-preview-container');
            if (previewContainer && previewContainer.querySelectorAll('.file-preview-item').length === 0) {
                previewContainer.remove();
            }
        }, 300);
    }
}

// Update total size indicator
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
// ============================================
// LINK DETECTION IN CONTENT
// ============================================

function detectLinks(text) {
    if (!text) return text;

    // URL detection regex
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[^\s]{2,})/g;

    return text.replace(urlRegex, (url) => {
        let href = url;
        if (!url.startsWith('http')) {
            href = 'https://' + url;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="content-link">${url}</a>`;
    });
}

// ============================================
// FILE PROCESSING WITH COMPRESSION
// ============================================

async function processImageFile(file) {
    try {
        console.log(`Processing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        let processedFile = file;
        let compressionInfo = null;

        // Compress if file is too large
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

        // For documents, we can't compress much, just check size
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

        // Compress if file is too large
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

// ============================================
// COMPRESSION FUNCTIONS
// ============================================

async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions
                let { width, height } = img;
                if (width > COMPRESSION_SETTINGS.IMAGE.maxWidth) {
                    height = (height * COMPRESSION_SETTINGS.IMAGE.maxWidth) / width;
                    width = COMPRESSION_SETTINGS.IMAGE.maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
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
            const savings = 0; // No compression in this example

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

// Enhanced submit post with link detection
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
        // 1. Close form and return to feed
        toggleCreatePost();
        showFeed();

        // 2. Show uploading modal
        showUploadingModal();

        // 3. Prepare form data
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('userId', userId);

        selectedFiles.images.forEach(item => formData.append('images', item.file));
        selectedFiles.documents.forEach(item => formData.append('documents', item.file));
        selectedFiles.videos.forEach(item => formData.append('videos', item.file));

        // 4. Upload with progress
        const response = await uploadWithProgress(formData);
        const data = await response.json();

        // 5. Hide uploading modal
        hideUploadingModal();

        if (response.ok && data.status === 'success') {
            // 6. Show success notification
            showSuccessModal('Post uploaded successfully! 🎉');

            // 7. Clear form and reload
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
}// Upload with progress tracking
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

// Show uploading modal
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

// Update progress
function updateUploadProgress(percent) {
    const progressFill = document.getElementById('uploadProgressFill');
    const progressText = document.getElementById('uploadProgressText');
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${Math.round(percent)}%`;
}

// Hide uploading modal
function hideUploadingModal() {
    const modal = document.querySelector('.upload-progress-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Show success modal
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

// Show error modal
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

// Close notification modal
function closeNotificationModal(button) {
    const modal = button.closest('.notification-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Export functions
window.closeNotificationModal = closeNotificationModal;
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
// UPDATED POST RENDERING WITH LINKS AND CAROUSEL
// ============================================

function renderPosts(posts) {
    const newsFeed = document.getElementById('newsFeed');
    if (!newsFeed) return;

    localStorage.setItem('cachedPosts', JSON.stringify(posts));

    newsFeed.innerHTML = posts.map(post => `
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
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                <div class="post-text">${detectLinks(escapeHtml(post.content))}</div>
                
                <!-- Files Carousel -->
                ${renderFilesCarousel(post)}
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
    `).join('');

    // Initialize carousels for all posts
    initializePostCarousels();

    // Load post statuses
    posts.forEach(post => {
        if (post.id) {
            loadPostStatus(post.id);
        }
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
                                ${renderFileItem(file)}
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

// Enhanced file item rendering with media controls
// ============================================
// ENHANCED MEDIA CONTROLS WITH MAXIMIZE & DOWNLOAD PERMISSION
// ============================================

let currentPlayingVideo = null;
let currentMaximizedVideo = null;

// Handle video click (play/pause or maximize)
function handleVideoClick(event, videoElement, videoUrl, filename) {
    event.stopPropagation();

    // Check if it's a double click or long press for maximize
    if (event.detail === 2 || event.type === 'longpress') {
        maximizeVideo(videoUrl, filename);
        return;
    }

    // Single click - play/pause
    const container = videoElement.closest('.media-container');
    toggleVideoPlay(container, videoUrl);
}

// Handle video controls overlay click
function handleVideoControlsClick(event, videoUrl, filename) {
    event.stopPropagation();
    maximizeVideo(videoUrl, filename);
}


function closeMaximizedVideo() {
    if (currentMaximizedVideo) {
        currentMaximizedVideo.pause();
        currentMaximizedVideo = null;
    }

    const modal = document.querySelector('.video-maximize-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
    document.removeEventListener('keydown', handleVideoMaximizeKeydown);
}

function handleVideoMaximizeKeydown(e) {
    if (e.key === 'Escape') {
        closeMaximizedVideo();
    } else if (e.key === ' ') {
        e.preventDefault();
        toggleMaximizedVideoPlay();
    }
}

function toggleMaximizedVideoPlay() {
    if (!currentMaximizedVideo) return;

    if (currentMaximizedVideo.paused) {
        currentMaximizedVideo.play();
    } else {
        currentMaximizedVideo.pause();
    }
}

function updateMaximizedVideoControls(isPlaying) {
    const playPauseIcon = document.getElementById('maximizedPlayPause');
    if (playPauseIcon) {
        playPauseIcon.className = isPlaying ? 'bx bx-pause' : 'bx bx-play';
    }
}

function closeMaximizedImage() {
    const modal = document.querySelector('.image-maximize-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
    document.removeEventListener('keydown', handleMaximizeKeydown);
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


// Video play/pause control
function toggleVideoPlay(container) {
    const video = container.querySelector('video');
    const playBtn = container.querySelector('.video-play-btn i');

    if (!video) return;

    // Stop currently playing video
    if (currentPlayingVideo && currentPlayingVideo !== video) {
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

    if (video.paused) {
        // Play video
        video.play().then(() => {
            container.classList.add('video-playing');
            playBtn.className = 'bx bx-pause';
            currentPlayingVideo = video;
        }).catch(error => {
            console.error('Error playing video:', error);
            showTemporaryModal('Error playing video');
        });
    } else {
        // Pause video
        video.pause();
        container.classList.remove('video-playing');
        playBtn.className = 'bx bx-play';
        currentPlayingVideo = null;
    }
}

function handleMaximizeKeydown(e) {
    if (e.key === 'Escape') {
        closeMaximizedImage();
    }
}

// Enhanced carousel initialization with media detection
function initializePostCarousels() {
    document.querySelectorAll('.post-files-carousel').forEach(carousel => {
        const track = carousel.querySelector('.carousel-track');

        if (!track) return;

        // Initialize media elements
        initializeCarouselMedia(carousel);

        // Update navigation on scroll
        track.addEventListener('scroll', () => {
            updateCarouselNavigation(carousel);

            // Pause videos when scrolling away
            pauseVideosOnScroll(carousel);
        });

        // Initialize touch events for mobile
        if (isTouchDevice()) {
            initializeCarouselTouchEvents(carousel);
        }

        // Initialize arrow behavior
        initializeCarouselArrows(carousel);

        // Initial update
        updateCarouselNavigation(carousel);
    });
}

// Initialize media elements in carousel
function initializeCarouselMedia(carousel) {
    const slides = carousel.querySelectorAll('.carousel-slide');

    slides.forEach(slide => {
        const images = slide.querySelectorAll('img');
        const videos = slide.querySelectorAll('video');

        // Set up images
        images.forEach(img => {
            // Detect image orientation and set appropriate class
            img.onload = function() {
                detectMediaOrientation(img);
            };

            // If image already loaded
            if (img.complete) {
                detectMediaOrientation(img);
            }
        });

        // Set up videos
        videos.forEach(video => {
            // Prevent auto-play
            video.setAttribute('preload', 'metadata');

            // Add loading state
            video.addEventListener('loadstart', () => {
                video.parentElement.classList.add('video-loading');
            });

            video.addEventListener('loadeddata', () => {
                video.parentElement.classList.remove('video-loading');
                detectMediaOrientation(video);
            });

            // Handle video end
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

            // Handle video errors
            video.addEventListener('error', () => {
                video.parentElement.classList.remove('video-loading');
                console.error('Error loading video:', video.src);
            });
        });
    });
}

// Detect media orientation and apply appropriate styling
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

    // Remove existing orientation classes
    container.classList.remove('media-landscape', 'media-portrait');

    // Add appropriate orientation class
    if (width > height) {
        container.classList.add('media-landscape');
    } else {
        container.classList.add('media-portrait');
    }
}

// Pause videos when scrolling away from them
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

// Enhanced touch events with better video handling
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

        // Show arrows on touch
        const prevBtn = carousel.querySelector('.prev');
        const nextBtn = carousel.querySelector('.next');
        if (prevBtn) prevBtn.style.opacity = '1';
        if (nextBtn) nextBtn.style.opacity = '1';

        // Check if touch is on video controls
        const video = e.target.closest('video');
        if (video) {
            e.stopPropagation(); // Prevent carousel swipe when interacting with video
        }
    });

    carousel.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;

        // Prevent swipe if interacting with video controls
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
        const tapThreshold = 200; // ms for tap vs swipe

        const isTap = (Date.now() - touchStartTime) < tapThreshold;

        if (Math.abs(diff) > swipeThreshold) {
            // It's a swipe
            if (diff > 0) {
                // Swipe left - next
                carousel.querySelector('.next')?.click();
            } else {
                // Swipe right - previous
                carousel.querySelector('.prev')?.click();
            }
        } else if (isTap) {
            // It's a tap - handle video/image interaction
            // Removed handleCarouselTap call as the function was deleted
        }

        // Hide arrows after delay
        setTimeout(() => {
            if (!carousel.matches(':hover')) {
                carousel.classList.remove('touch-active');
            }
        }, 2000);
    });
}

// Enhanced carousel navigation with media handling
function scrollPostCarousel(button, direction) {
    if (isAnimating) return;

    const carousel = button.closest('.post-files-carousel');

    // Pause any playing video in current carousel
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

    // Smooth scroll
    track.style.scrollBehavior = 'smooth';
    track.scrollTo({ left: newScroll, behavior: 'smooth' });

    // Update UI after animation
    setTimeout(() => {
        updateCarouselNavigation(carousel);
        isAnimating = false;
        track.style.scrollBehavior = 'auto';
    }, animationDuration);

    // Button feedback
    button.style.transform = 'translateY(-50%) scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'translateY(-50%) scale(1)';
    }, 150);
}

// Pause all videos in a carousel
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

// Enhanced goToSlide with video handling
function goToSlide(button, index) {
    if (isAnimating) return;

    const carousel = button.closest('.post-files-carousel');

    // Pause any playing video in current carousel
    pauseVideosInCarousel(carousel);

    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');

    if (!track || slides.length === 0) return;

    const slideWidth = slides[0].offsetWidth + 16;

    isAnimating = true;

    // Smooth scroll to target
    track.style.scrollBehavior = 'smooth';
    track.scrollTo({ left: index * slideWidth, behavior: 'smooth' });

    // Update active states
    setTimeout(() => {
        updateCarouselNavigation(carousel);
        isAnimating = false;
        track.style.scrollBehavior = 'auto';
    }, animationDuration);

    // Button feedback
    button.style.transform = 'scale(1.4)';
    setTimeout(() => {
        button.style.transform = 'scale(1.2)';
    }, 200);
}

// ============================================
// SMOOTH CAROUSEL SYSTEM - FIXED VERSION
// ============================================

let isAnimating = false;
const animationDuration = 400;

// Detect if device is touch-enabled
function isTouchDevice() {
    return (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0));
}

// Update carousel navigation state
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

    // Update button visibility
    prevBtn.style.opacity = scrollLeft > 10 ? '1' : '0.5';
    nextBtn.style.opacity = scrollLeft < scrollWidth - clientWidth - 10 ? '1' : '0.5';

    // Update active states
    slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === currentIndex);
    });

    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentIndex);
    });
}

// Smart arrow visibility
function initializeCarouselArrows(carousel) {
    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');

    if (!prevBtn || !nextBtn) return;

    if (isTouchDevice()) {
        // On touch devices - show on touch, hide by default
        prevBtn.style.opacity = '0';
        nextBtn.style.opacity = '0';
    } else {
        // On desktop - show on hover
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

// ============================================
// POST INTERACTION FUNCTIONS
// ============================================

async function toggleLike(id, button) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showTemporaryModal('Please log in to like posts');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${id}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: parseInt(userId) })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            // Update the specific button that was clicked
            updateLikeButton(button, data.isLiked);

            // Update all instances of this post (in case it appears in multiple places)
            updateAllPostInstances(id, {
                likesCount: data.likesCount,
                isLiked: data.isLiked
            });

            // Update profile stats if on profile page
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.classList.contains('active')) {
                await updateProfileStats(userId);
            }
        }
    } catch (error) {
        console.error('Failed to toggle like:', error);
        showTemporaryModal('Failed to like post');
    }
}

async function toggleSave(id, button) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showTemporaryModal('Please log in to save posts');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${id}/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: parseInt(userId) })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            // Update the specific button that was clicked
            updateSaveButton(button, data.isSaved);

            // Update all instances of this post
            updateAllPostInstances(id, {
                isSaved: data.isSaved
            });

            showTemporaryModal(data.isSaved ? 'Post saved!' : 'Post unsaved!');

            // Update profile stats if on profile page
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.classList.contains('active')) {
                await updateProfileStats(userId);
            }
        }
    } catch (error) {
        console.error('Failed to toggle save:', error);
        showTemporaryModal('Failed to save post');
    }
}

// Helper function to update all instances of a post
function updateAllPostInstances(postId, updates) {
    const allPostInstances = document.querySelectorAll(`[data-post-id="${postId}"]`);

    allPostInstances.forEach(postCard => {
        // Update likes count
        if (updates.likesCount !== undefined) {
            const likesSpan = postCard.querySelector('.post-stats span:first-child');
            if (likesSpan) {
                likesSpan.textContent = `${updates.likesCount} Likes`;
            }
        }

        // Update like buttons
        if (updates.isLiked !== undefined) {
            const likeBtns = postCard.querySelectorAll('.like-btn');
            likeBtns.forEach(btn => updateLikeButton(btn, updates.isLiked));
        }

        // Update save buttons
        if (updates.isSaved !== undefined) {
            const saveBtns = postCard.querySelectorAll('.save-btn');
            saveBtns.forEach(btn => updateSaveButton(btn, updates.isSaved));
        }
    });
}

// ============================================
// COMMENTS FUNCTIONS
// ============================================

async function toggleComments(postId) {
    // Find the post card that contains the clicked button
    let postCard;

    // If called from onclick, event.target might help us find the right post card
    if (event) {
        postCard = event.target.closest('[data-post-id]');
    }

    // If we still don't have a post card, try to find any instance
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

    // Find the post-actions div to insert comments after it
    const postActions = postCard.querySelector('.post-actions');
    if (postActions) {
        postActions.after(commentsSection);
    } else {
        // Fallback: insert at the end of post card
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

    try {
        const response = await fetch(`${API_BASE_URL}/api/comments/post/${postId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                userId: userId
            })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            input.value = '';
            await loadComments(postId);

            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            const commentsSpan = postCard.querySelector('.post-stats span:nth-child(2)');
            if (commentsSpan) {
                const currentCount = parseInt(commentsSpan.textContent.match(/\d+/)[0]);
                commentsSpan.textContent = `${currentCount + 1} Comments`;
            }

            // Update profile stats if on profile page
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.classList.contains('active')) {
                updateProfileStats(userId);
            }
        } else {
            showTemporaryModal(data.message || 'Failed to add comment');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        showTemporaryModal('Error adding comment');
    }
}

function handleCommentKeyPress(event, postId) {
    if (event.key === 'Enter') {
        sendComment(postId);
    }
}

// ============================================
// PROFILE MANAGEMENT FUNCTIONS
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

            // Also update the profile page details
            updateProfilePage(user);

            // Fetch and update profile stats
            await updateProfileStats(userId);
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        throw error;
    }
}

async function updateProfileStats(userId) {
    try {
        // Fetch user's posts count
        const postsResponse = await fetch(`${API_BASE_URL}/users/${userId}/posts`);
        let postsCount = 0;
        if (postsResponse.ok) {
            const posts = await postsResponse.json();
            postsCount = posts.length;
        }

        // Fetch user's liked posts count
        const likedResponse = await fetch(`${API_BASE_URL}/users/${userId}/liked-posts`);
        let likedCount = 0;
        if (likedResponse.ok) {
            const liked = await likedResponse.json();
            likedCount = liked.length;
        }

        // Update the stats in the profile page
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

            // Force refresh statuses after a short delay
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

// Helper function to extract filename from URL
function getFileNameFromUrl(url) {
    if (!url) return 'Unknown File';

    // For Cloudinary URLs
    if (url.includes('cloudinary.com')) {
        const parts = url.split('/');
        // Remove file extension for display if needed
        return parts[parts.length - 1];
    }

    // Fallback for other URLs
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/^\d+_/, ''); // Remove timestamp prefix if present
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
        // Use the same renderPosts function but for the specific container
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
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                <div class="post-text">${detectLinks(escapeHtml(post.content))}</div>
                
                <!-- Updated: Use multiple files carousel -->
                ${renderFilesCarousel(post)}
            </div>

            <div class="post-stats">
                <span>{post.likesCount || 0} Likes</span>
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

    // Initialize carousels for all posts
    initializePostCarousels();

    // Load post statuses
    posts.forEach(post => {
        if (post.id) {
            loadPostStatus(post.id);
        }
    });
}

// ============================================
// POST MENU FUNCTIONS
// ============================================

function togglePostMenu(event, postId, postUserId) {
    event.stopPropagation();

    // Close any existing post menus
    document.querySelectorAll('.post-menu-dropdown').forEach(menu => menu.remove());

    const currentUserId = parseInt(localStorage.getItem('userId'));
    const isOwnPost = currentUserId === postUserId;

    // Create dropdown menu
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

    // Position dropdown near the menu icon
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

    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closePostMenus);
    }, 0);
}

function closePostMenus() {
    document.querySelectorAll('.post-menu-dropdown').forEach(menu => menu.remove());
    document.removeEventListener('click', closePostMenus);
}

// Edit Post Function
// Edit Post Function - Fixed version
// Edit Post Function - Fixed version
async function editPost(event, postId) {
    event.stopPropagation();
    closePostMenus();

    try {
        // More robust way to find the post card
        let postCard;

        // Try multiple ways to find the post card
        if (event.target.closest) {
            postCard = event.target.closest('.post-card');
        }

        // If not found, try to find by data attribute
        if (!postCard) {
            postCard = document.querySelector(`[data-post-id="${postId}"]`);
        }

        // If still not found, try to find the closest article
        if (!postCard) {
            postCard = event.target.closest('article');
        }

        if (!postCard) {
            console.error('Post card not found for ID:', postId);
            showTemporaryModal('Could not find post data');
            return;
        }

        // Get title and content from the displayed post
        const titleElement = postCard.querySelector('.post-title');
        const contentElement = postCard.querySelector('.post-text');

        if (!titleElement || !contentElement) {
            showTemporaryModal('Could not load post content');
            return;
        }

        const title = titleElement.textContent || '';
        const content = contentElement.textContent || '';

        // Get file information if available
        let imageUrl = null;
        let documentUrl = null;
        let videoUrl = null;

        // Check for images
        const imageElement = postCard.querySelector('.post-file-image');
        if (imageElement) {
            imageUrl = imageElement.src;
        }

        // Check for documents
        const documentElement = postCard.querySelector('.post-file-document');
        if (documentElement) {
            documentUrl = 'document-attached';
        }

        // Check for videos
        const videoElement = postCard.querySelector('.post-file-video');
        if (videoElement) {
            videoUrl = videoElement.src;
        }

        const postData = {
            id: postId,
            title: title,
            content: content,
            imageUrl: imageUrl,
            documentUrl: documentUrl,
            videoUrl: videoUrl
        };

        console.log('Editing post data:', postData);
        // Show edit form/modal
        showEditPostForm(postData);

    } catch (error) {
        console.error('Error loading post for editing:', error);
        showTemporaryModal('Error loading post for editing');
    }
}

function showEditPostForm(post) {
    // Create edit form modal
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
            headers: {
                'Content-Type': 'application/json'
            },
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

            // Refresh the posts to show updated content
            await loadPosts();

            // If on profile page, refresh profile content too
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
// Delete Post Function
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

                // Remove post from UI
                document.querySelectorAll(`[data-post-id="${postId}"]`).forEach(post => {
                    post.style.transition = 'opacity 0.3s, transform 0.3s';
                    post.style.opacity = '0';
                    post.style.transform = 'translateY(-20px)';
                    setTimeout(() => post.remove(), 300);
                });

                // Update profile stats if on profile page
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

// Report Post Function
async function reportPost(event, postId) {
    event.stopPropagation();
    closePostMenus();

    showConfirmModal('Are you sure you want to report this post?', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: localStorage.getItem('userId'),
                    reason: 'User reported this post'
                })
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showTemporaryModal('Post reported. Thank you for helping keep our community safe.');
            } else {
                showTemporaryModal(data.message || 'Failed to report post');
            }
        } catch (error) {
            console.error('Error reporting post:', error);
            showTemporaryModal('Error reporting post');
        }
    });
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
            headers: {
                'userId': userId
            }
        });

        console.log(`Status response for post ${id}:`, response.status);

        if (response.ok) {
            const status = await response.json();
            console.log(`Post ${id} status:`, status);
            updatePostUI(id, status);
        } else {
            console.error(`Failed to load status for post ${id}:`, response.status);
            // Set default state
            updatePostUI(id, { isLiked: false, isSaved: false, likesCount: 0 });
        }
    } catch (error) {
        console.error('Failed to load post status:', error);
        // Set default state on error
        updatePostUI(id, { isLiked: false, isSaved: false, likesCount: 0 });
    }
}

function updatePostUI(postId, status) {
    // Find all post cards with this ID (could be in feed or profile)
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
            // Small delay to avoid overwhelming the server
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
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function loadPosts() {
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

    // Auto-close sidebars when clicking outside (only on smaller screens)
    if (window.innerWidth <= 1400) {
        const leftSidebar = document.getElementById('leftSidebar');
        const rightSidebar = document.getElementById('rightSidebar');
        const toggleLeftBtn = document.getElementById('toggleLeftSidebarBtn');
        const toggleRightBtn = document.getElementById('toggleRightSidebarBtn');

        // Close left sidebar if clicking outside
        if (leftSidebar && !leftSidebar.classList.contains('hidden')) {
            if (!leftSidebar.contains(e.target) && !toggleLeftBtn.contains(e.target)) {
                leftSidebar.classList.add('hidden');
            }
        }

        // Close right sidebar if clicking outside
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
// Add listener for scroll events on preview carousel
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
// ENHANCED DOWNLOAD PERMISSION SYSTEM
// ============================================

// Enhanced download function that always shows permission modal
function requestDownloadPermission(fileUrl, filename) {
    // Create download permission modal
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

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDownloadPermission();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', handleDownloadPermissionKeydown);
}

// Enhanced file item rendering with proper download handlers
function renderFileItem(file) {
    // Cloudinary returns full URLs, so no need to prepend API_BASE_URL
    const fullUrl = file.url; // Already a complete Cloudinary URL
    const filename = getFileNameFromUrl(file.url);

    switch (file.type) {
        case 'image':
            return `
                <div class="media-container" onclick="maximizeImage('${fullUrl}', '${filename}')">
                    <img src="${fullUrl}" alt="${filename}" class="post-file-image" loading="lazy">
                </div>
            `;

        case 'video':
            return `
                <div class="media-container">
                    <video class="post-file-video" preload="metadata" 
                           onclick="handleVideoClick(event, this, '${fullUrl}', '${filename}')">
                        <source src="${fullUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-controls-overlay" onclick="handleVideoControlsClick(event, '${fullUrl}', '${filename}')">
                        <button class="video-play-btn">
                            <i class='bx bx-play'></i>
                        </button>
                    </div>
                </div>
            `;

        case 'document':
            return `
                <div class="post-file-document" onclick="openDocumentPreview('${fullUrl}', '${filename}')">
                    <i class='bx bx-file'></i>
                    <div class="document-info">
                        <div class="document-name">${filename}</div>
                        <div class="document-type">Document</div>
                    </div>
                    <button class="download-btn" onclick="requestDownloadPermission('${fullUrl}', '${filename}')">
                        <i class='bx bx-download'></i>
                    </button>
                </div>
            `;

        default:
            return '';
    }
}
// Enhanced maximize controls with download buttons
function maximizeImage(imageUrl, filename) {
    const modal = document.createElement('div');
    modal.className = 'image-maximize-modal active';
    modal.innerHTML = `
    <div class="maximized-image-container">
        <img src="${imageUrl}" class="maximized-image" onclick="event.stopPropagation()">
        <div class="maximize-controls">
            <div class="maximize-controls-right">
                <button class="maximize-btn" onclick="requestDownloadPermission('${imageUrl}', '${filename}')">
                    <i class='bx bx-download'></i>
                </button>
                <button class="maximize-btn" onclick="closeMaximizedImage()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
        </div>
    </div>
`;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeMaximizedImage();
        }
    });

    document.addEventListener('keydown', handleMaximizeKeydown);
}
// Enhanced video maximize with download button
function maximizeVideo(videoUrl) {
    // Pause any currently playing video
    if (currentPlayingVideo) {
        currentPlayingVideo.pause();
        const container = currentPlayingVideo.closest('.media-container');
        if (container) {
            container.classList.remove('video-playing');
            const playBtn = container.querySelector('.video-play-btn i');
            if (playBtn) {
                playBtn.className = 'bx bx-play';
            }
        }
        currentPlayingVideo = null;
    }

    // Create video maximize modal
    const modal = document.createElement('div');
    modal.className = 'video-maximize-modal active';
    modal.innerHTML = `
        <div class="maximized-video-container">
            <video class="maximized-video" controls autoplay>
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
           
        </div>
    `;

    document.body.appendChild(modal);

    const video = modal.querySelector('.maximized-video');
    currentMaximizedVideo = video;

    // Set up video event listeners
    video.addEventListener('play', () => {
        updateMaximizedVideoControls(true);
    });

    video.addEventListener('pause', () => {
        updateMaximizedVideoControls(false);
    });

    video.addEventListener('loadeddata', () => {
        modal.classList.remove('video-loading');
    });

    video.addEventListener('waiting', () => {
        modal.classList.add('video-loading');
    });

    video.addEventListener('canplay', () => {
        modal.classList.remove('video-loading');
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeMaximizedVideo();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', handleVideoMaximizeKeydown);

    // Auto-play the video
    video.play().catch(error => {
        console.error('Error auto-playing maximized video:', error);
    });
}

// New function for document preview instead of direct download
function openDocumentPreview(documentUrl, filename) {
    const modal = document.createElement('div');
    modal.className = 'document-preview-modal active';
    modal.innerHTML = `
        <div class="document-preview-container">
            <div class="document-preview-header">
                <div class="document-preview-icon">
                    <i class='bx bx-file'></i>
                </div>
                <div class="document-preview-info">
                    <div class="document-preview-name">${filename}</div>
                    <div class="document-preview-type">Document File</div>
                </div>
            </div>
            <div class="document-preview-message">
                <i class='bx bx-info-circle'></i>
                This document cannot be previewed in the app.
            </div>
            <div class="document-preview-actions">
                <button class="document-preview-btn secondary" onclick="closeDocumentPreview()">
                    <i class='bx bx-x'></i>
                    Cancel
                </button>
                <button class="document-preview-btn primary" onclick="requestDownloadPermission('${documentUrl}', '${filename}')">
                    <i class='bx bx-download'></i>
                    Download File
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDocumentPreview();
        }
    });

    document.addEventListener('keydown', handleDocumentPreviewKeydown);
}

function closeDocumentPreview() {
    const modal = document.querySelector('.document-preview-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
    document.removeEventListener('keydown', handleDocumentPreviewKeydown);
}

function handleDocumentPreviewKeydown(e) {
    if (e.key === 'Escape') {
        closeDocumentPreview();
    }
}

// Enhanced download execution
function confirmDownload(fileUrl, filename) {
    closeDownloadPermission();

    // Add a small delay to allow modal to close
    setTimeout(() => {
        executeDownload(fileUrl, filename);
    }, 100);
}

function executeDownload(url, filename) {
    showTemporaryModal('Preparing download...');

    // Create a temporary anchor element for download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    link.target = '_blank'; // Open in new tab for better UX

    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(link);
        showTemporaryModal('Download started!');
    }, 1000);
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