let currentUser = null;
let uploadInProgress = false;

// Extract video ID from various YouTube URL formats
function extractVideoId(url) {
    try {
        if (!url) {
            console.warn('No URL provided to extractVideoId');
            return null;
        }

        console.log('Extracting video ID from:', url);

        // Handle youtu.be format: https://youtu.be/VIDEO_ID or https://youtu.be/VIDEO_ID?t=...
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0].split('#')[0];
            console.log('Extracted from youtu.be:', videoId);
            return videoId.trim();
        }

        // Handle youtube.com/watch format: https://www.youtube.com/watch?v=VIDEO_ID
        if (url.includes('watch?v=')) {
            const videoId = url.split('watch?v=')[1].split('&')[0].split('#')[0];
            console.log('Extracted from watch?v=:', videoId);
            return videoId.trim();
        }

        // Handle youtube.com/embed format (already in embed format)
        if (url.includes('/embed/')) {
            const videoId = url.split('/embed/')[1].split('?')[0].split('#')[0];
            console.log('Extracted from /embed/:', videoId);
            return videoId.trim();
        }

        // If it's just a video ID
        if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
            console.log('URL is already a video ID:', url);
            return url;
        }

        console.warn('Could not extract video ID from:', url);
        return null;
    } catch (error) {
        console.error('Error extracting video ID:', error);
        return null;
    }
}

// Convert video ID or various formats to full YouTube watch URL
function convertToYouTubeWatchUrl(url) {
    try {
        if (!url) return null;

        console.log('Converting URL:', url);

        // If already a full watch URL, return as is
        if (url.includes('youtube.com/watch?v=')) {
            console.log('Already a watch URL');
            return url;
        }

        // If it's a youtu.be link, convert to watch format
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0].split('#')[0];
            return `https://www.youtube.com/watch?v=${videoId}`;
        }

        // If it's an embed link, extract ID and convert
        if (url.includes('/embed/')) {
            const videoId = url.split('/embed/')[1].split('?')[0].split('#')[0];
            return `https://www.youtube.com/watch?v=${videoId}`;
        }

        // If it's just a video ID (11 characters, alphanumeric with dashes/underscores)
        if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
            return `https://www.youtube.com/watch?v=${url.trim()}`;
        }

        // Return as is if we can't convert
        return url;
    } catch (error) {
        console.error('Error converting YouTube URL:', error);
        return url;
    }
}

// Play video - same as opening any link
function playVideoInModal(url) {
    try {
        console.log('Opening video URL:', url);

        if (!url) {
            showToast('No video URL provided', 'error');
            return;
        }

        // Convert to proper YouTube watch URL if needed
        const videoUrl = convertToYouTubeWatchUrl(url);
        console.log('Final video URL:', videoUrl);

        // Open directly like a web link
        window.open(videoUrl, '_blank');
    } catch (error) {
        console.error('Error opening video:', error);
        showToast('Error opening video', 'error');
    }
}

function viewPdfInModal(resourceId) {
    const token = localStorage.getItem('token');
    const backendUrl = `${API_BASE_URL}/resources/${resourceId}/download?inline=true` + (token ? `&token=${encodeURIComponent(token)}` : '');

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; width: 95%; height: 90vh; display: flex; flex-direction: column; position: relative;">
            <button class="modal-close" onclick="this.parentElement.parentElement.remove()" style="position: absolute; right: 15px; top: 15px; background: white; border-radius: 50%; width: 30px; height: 30px; border: none; cursor: pointer; font-size: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10;">&times;</button>
            <div class="modal-body" style="flex: 1; padding: 0; padding-top: 40px; height: 100%;">
                <iframe src="${backendUrl}" width="100%" height="100%" style="border: none; border-radius: 4px;"></iframe>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function toggleSubjectInput() {
    const subjectSelect = document.getElementById('subject');
    const customSubjectGroup = document.getElementById('customSubjectGroup');
    const customSubject = document.getElementById('customSubject');

    if (subjectSelect.value === 'Other') {
        customSubjectGroup.style.display = 'block';
        customSubject.required = true;
    } else {
        customSubjectGroup.style.display = 'none';
        customSubject.required = false;
        customSubject.value = '';
    }
}

function getTabContentId(tabName) {
    const tabMap = {
        overview: 'overviewTab',
        upload: 'uploadSectionTab',
        'my-uploads': 'myUploadsSectionTab',
        moderate: 'moderateSectionTab'
    };
    return tabMap[tabName] || `${tabName}Tab`;
}

async function initializeDashboard() {
    try {
        const response = await apiCall('/auth/me', 'GET');
        currentUser = response.user;

        updateDashboardHeader();
        loadUserStats();
        loadUserResources();

        // Show moderation tab for admins
        if (currentUser.role === 'admin') {
            document.getElementById('moderateTab').style.display = 'block';
            document.getElementById('moderationCard').style.display = 'block';
            loadPendingResources();
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('from') === 'oauth') {
            showToast('Login successful!', 'success');
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        window.location.href = 'index.html';
    }
}

function updateDashboardHeader() {
    const welcomeName = document.getElementById('welcomeName');
    const roleInfo = document.getElementById('roleInfo');

    if (welcomeName) {
        welcomeName.textContent = currentUser.name.split(' ')[0];
    }

    if (roleInfo) {
        const roleText = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
        roleInfo.textContent = `Role: ${roleText}`;
    }
}

async function loadUserStats() {
    try {
        const response = await apiCall('/resources/my-uploads/list', 'GET');
        const resources = response.resources || [];

        const totalUploads = resources.length;
        const approvedCount = resources.filter(r => r.status === 'approved').length;
        const pendingCount = resources.filter(r => r.status === 'pending').length;

        document.getElementById('totalUploads').textContent = totalUploads;
        document.getElementById('approvedCount').textContent = approvedCount;
        document.getElementById('pendingCount').textContent = pendingCount;

        if (currentUser.role === 'admin') {
            loadAdminStats();
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function loadAdminStats() {
    try {
        const response = await apiCall('/resources/pending/list', 'GET');
        const pendingResources = response.resources || [];
        document.getElementById('pendingModeration').textContent = pendingResources.length;
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function loadUserResources() {
    try {
        const response = await apiCall('/resources/my-uploads/list', 'GET');
        const resources = response.resources || [];
        displayUserResources(resources);
    } catch (error) {
        console.error('Error loading user resources:', error);
        showToast('Error loading your resources', 'error');
    }
}

function displayUserResources(resources) {
    const grid = document.getElementById('myUploadsGrid');
    if (!grid) return;

    if (resources.length === 0) {
        grid.innerHTML = '<div class="loading"><p>You haven\'t uploaded any resources yet</p></div>';
        return;
    }

    grid.innerHTML = resources.map(resource => createUserResourceCard(resource)).join('');
}

function createUserResourceCard(resource) {
    const statusClass = `status-${resource.status}`;
    const statusText = resource.status.charAt(0).toUpperCase() + resource.status.slice(1);

    return `
        <div class="resource-card">
            <div class="resource-header">
                <span class="resource-type-badge">${getTypeIcon(resource.type)} ${resource.type}</span>
            </div>
            <div class="resource-body">
                <div class="resource-status ${statusClass}">${statusText}</div>
                <h3 class="resource-title">${resource.title}</h3>
                <p class="resource-description">${resource.description || 'No description'}</p>
                
                ${resource.status === 'rejected' ? `
                    <p style="color: #e74c3c; font-size: 0.9rem; margin-bottom: 10px;">
                        <strong>Reason:</strong> ${resource.rejectionReason || 'Not specified'}
                    </p>
                ` : ''}

                <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 15px;">
                    <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">
                        <strong>Subject:</strong> ${resource.subject}
                    </p>
                    <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">
                        <strong>Uploaded:</strong> ${new Date(resource.createdAt).toLocaleDateString()}
                    </p>
                    ${resource.downloadCount ? `
                        <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">
                            <strong>Downloads:</strong> ${resource.downloadCount}
                        </p>
                    ` : ''}
                </div>
                <div style="margin-top: 12px; display:flex; gap:8px;">
                    <button onclick="deleteResource('${resource._id}')" class="btn btn-danger btn-sm" style="min-width: 100px;">Delete</button>
                </div>
            </div>
        </div>
    `;
}

async function loadPendingResources() {
    try {
        const response = await apiCall('/resources/pending/list', 'GET');
        const resources = response.resources || [];
        displayPendingResources(resources);
    } catch (error) {
        console.error('Error loading pending resources:', error);
        showToast('Error loading pending resources', 'error');
    }
}

function displayPendingResources(resources) {
    const container = document.getElementById('pendingResources');
    if (!container) return;

    if (resources.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;"><p>No pending resources to moderate</p></div>';
        return;
    }

    container.innerHTML = resources.map(resource => createModerationCard(resource)).join('');
}

function createModerationCard(resource) {
    const uploaderName = resource.uploadedBy?.name || 'Unknown User';
    const uploaderEmail = resource.uploadedBy?.email || 'N/A';

    return `
        <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 15px;">
                <div>
                    <h4 style="margin: 0 0 5px 0;">${resource.title}</h4>
                    <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">${resource.subject}</p>
                    <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">${resource.description || 'No description'}</p>
                    <p style="margin: 8px 0 0 0; color: #999; font-size: 0.85rem;">
                        Uploaded by: <strong>${uploaderName}</strong> (${uploaderEmail})
                    </p>
                    <p style="margin: 5px 0; color: #999; font-size: 0.85rem;">
                        Date: ${new Date(resource.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <div style="display: flex; gap: 8px; flex-direction: column; justify-content: center;">
                    <button onclick="approveResource('${resource._id}')" class="btn btn-success btn-sm" style="min-width: 120px;">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button onclick="openRejectDialog('${resource._id}')" class="btn btn-danger btn-sm" style="min-width: 120px;">
                        <i class="fas fa-times"></i> Reject
                    </button>
                    <button onclick="deleteResource('${resource._id}')" class="btn btn-dark btn-sm" style="min-width: 120px;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    ${resource.url ? (resource.type === 'video' ? `
                        <button onclick="playVideoInModal('${resource.url}')" class="btn btn-secondary btn-sm" style="min-width: 120px;">
                            <i class="fas fa-play"></i> Watch
                        </button>
                    ` : resource.type === 'pdf' ? `
                        <button onclick="viewPdfInModal('${resource._id}')" class="btn btn-secondary btn-sm" style="min-width: 120px;">
                            <i class="fas fa-file-pdf"></i> View PDF
                        </button>
                    ` : `
                        <a href="${resource.url}" target="_blank" class="btn btn-secondary btn-sm" style="min-width: 120px; text-align: center;">
                            <i class="fas fa-external-link-alt"></i> View
                        </a>
                    `) : ''}
                </div>
            </div>
        </div>
    `;
}

async function approveResource(resourceId) {
    try {
        if (confirm('Approve this resource?')) {
            const response = await apiCall(`/resources/${resourceId}/approve`, 'PUT');

            if (response.success) {
                showToast('Resource approved successfully', 'success');
                loadUserStats();
                loadAdminStats();
                loadPendingResources();
            }
        }
    } catch (error) {
        console.error('Error approving resource:', error);
        showToast('Error approving resource', 'error');
    }
}

function openRejectDialog(resourceId) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            <div class="modal-body" style="text-align: left;">
                <h2>Reject Resource</h2>
                <p>Enter the reason for rejection:</p>
                <textarea id="rejectReason" placeholder="Enter rejection reason..." style="width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: Arial; font-size: 14px; resize: vertical;"></textarea>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary">Cancel</button>
                    <button onclick="submitReject('${resourceId}')" class="btn btn-danger" style="background-color: #dc3545;">Reject</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('rejectReason').focus();
}

function submitReject(resourceId) {
    const reason = document.getElementById('rejectReason').value.trim();
    if (reason === '') {
        showToast('Please enter a rejection reason', 'error');
        return;
    }
    // Remove the modal
    document.querySelector('.modal.active').remove();
    rejectResource(resourceId, reason);
}

async function rejectResource(resourceId, reason) {
    try {
        const response = await apiCall(`/resources/${resourceId}/reject`, 'PUT', { reason });

        if (response.success) {
            showToast('Resource rejected', 'success');
            loadUserStats();
            loadAdminStats();
            loadPendingResources();
        }
    } catch (error) {
        console.error('Error rejecting resource:', error);
        showToast('Error rejecting resource', 'error');
    }
}

function showTab(tabName, clickedElement) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => link.classList.remove('active'));

    const tabElement = document.getElementById(getTabContentId(tabName));
    if (tabElement) {
        tabElement.classList.add('active');
        tabElement.style.display = 'block';
    }

    const activeLink = clickedElement?.closest('.sidebar-link');
    if (activeLink) {
        activeLink.classList.add('active');
    }

    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        const hamburger = document.getElementById('hamburger');
        if (hamburger) {
            hamburger.classList.remove('active');
        }
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
}

function setupFileUpload() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('file');

    if (!fileUploadArea) return;

    fileUploadArea.addEventListener('click', () => fileInput.click());

    fileUploadArea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInput.click();
        }
    });

    const setDragState = (isDragging) => {
        fileUploadArea.classList.toggle('drag-over', isDragging);
    };

    fileUploadArea.addEventListener('dragenter', (e) => {
        e.preventDefault();
        setDragState(true);
    });

    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragState(true);
    });

    fileUploadArea.addEventListener('dragleave', () => {
        setDragState(false);
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        setDragState(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type === 'application/pdf') {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (droppedFile) {
            showToast('Please drop a PDF file only', 'warning');
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            const fileSize = (fileInput.files[0].size / 1024 / 1024).toFixed(2);
            const fileUploadText = document.getElementById('fileUploadText');
            const fileUploadStatus = document.getElementById('fileUploadStatus');

            if (fileUploadText) {
                fileUploadText.textContent = `${fileName} (${fileSize} MB)`;
            }

            if (fileUploadStatus) {
                fileUploadStatus.textContent = 'Ready to upload';
                fileUploadStatus.style.color = '#2ecc71';
            }
        }
    });
}

function toggleFileInput() {
    const type = document.getElementById('type').value;
    const fileInputGroup = document.getElementById('fileInputGroup');
    const urlInputGroup = document.getElementById('urlInputGroup');

    if (type === 'pdf') {
        fileInputGroup.style.display = 'block';
        urlInputGroup.style.display = 'none';
    } else if (type === 'video' || type === 'link') {
        fileInputGroup.style.display = 'none';
        urlInputGroup.style.display = 'block';
    } else {
        fileInputGroup.style.display = 'none';
        urlInputGroup.style.display = 'none';
    }
}

async function handleUploadForm(e) {
    e.preventDefault();

    if (uploadInProgress) return;
    uploadInProgress = true;
    const submitBtn = document.querySelector('#uploadForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
    }

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    let subject = document.getElementById('subject').value;
    if (subject === 'Other') {
        subject = document.getElementById('customSubject').value.trim();
    }
    const type = document.getElementById('type').value;

    console.log('📤 UPLOAD FORM SUBMISSION:');
    console.log('  Title:', title);
    console.log('  Subject:', subject);
    console.log('  Type:', type);
    console.log('  Description:', description);

    if (!title || !subject || !type) {
        showToast('Please fill in all required fields', 'warning');
        uploadInProgress = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Resource';
        }
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('subject', subject);
    formData.append('type', type);

    if (type === 'pdf') {
        const fileInput = document.getElementById('file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            uploadInProgress = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Resource';
            }
            showToast('Please select a PDF file', 'warning');
            return;
        }
        formData.append('file', fileInput.files[0]);
        console.log('  PDF File:', fileInput.files[0].name);
    } else {
        const url = document.getElementById('url').value;
        if (!url) {
            uploadInProgress = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Resource';
            }
            showToast('Please enter a URL', 'warning');
            return;
        }
        formData.append('url', url);
        console.log('  URL:', url);
    }

    try {
        console.log('📡 Sending upload request to /resources/upload');
        const response = await apiUpload('/resources/upload', formData);

        console.log('✅ Upload response:', response);

        if (response.success) {
            showToast('Resource uploaded successfully! Awaiting admin approval.', 'success');
            document.getElementById('uploadForm').reset();
            const fileUploadText = document.getElementById('fileUploadText');
            const fileUploadStatus = document.getElementById('fileUploadStatus');
            if (fileUploadText) fileUploadText.textContent = 'Click to upload or drag and drop a PDF here';
            if (fileUploadStatus) {
                fileUploadStatus.textContent = 'PDF only, max 50 MB';
                fileUploadStatus.style.color = '#999';
            }
            loadUserStats();
            loadUserResources();
        }
    } catch (error) {
        console.error('❌ Error uploading resource:', error);
        console.error('  Error message:', error.message);
        console.error('  Full error:', error);
        showToast('Error uploading resource: ' + error.message, 'error');
    } finally {
        uploadInProgress = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Resource';
        }
    }
}

function getTypeIcon(type) {
    const icons = {
        pdf: '<i class="fas fa-file-pdf"></i>',
        video: '<i class="fas fa-video"></i>',
        link: '<i class="fas fa-link"></i>'
    };
    return icons[type] || '<i class="fas fa-file"></i>';
}

async function deleteResource(resourceId) {
    try {
        if (!confirm('Are you sure you want to delete this resource? This cannot be undone.')) return;

        const response = await apiCall(`/resources/${resourceId}`, 'DELETE');
        if (response.success) {
            showToast('Resource deleted', 'success');
            loadUserStats();
            loadUserResources();
            loadPendingResources();
        }
    } catch (error) {
        console.error('Error deleting resource:', error);
        showToast('Error deleting resource', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupFileUpload();

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadForm);
    }

    const overviewTab = document.getElementById('overviewTab');
    const overviewLink = document.querySelector('[onclick*="showTab(\'overview\'"]');
    if (overviewTab) {
        overviewTab.classList.add('active');
        overviewTab.style.display = 'block';
    }
    if (overviewLink) {
        overviewLink.classList.add('active');
    }

    showTab('overview', overviewLink);
});
