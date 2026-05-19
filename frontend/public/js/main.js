// Load approved resources
async function loadApprovedResources() {
    try {
        const response = await apiCall('/resources/approved', 'GET', null, false);
        displayResources(response.resources || []);
    } catch (error) {
        console.error('Error loading resources:', error);
        showToast('Error loading resources', 'error');
    }
}

// Display resources in grid
function displayResources(resources) {
    const resourcesGrid = document.getElementById('resourcesGrid');
    if (!resourcesGrid) return;

    if (resources.length === 0) {
        resourcesGrid.innerHTML = '<div class="loading"><p>No resources found</p></div>';
        return;
    }

    resourcesGrid.innerHTML = resources.map(resource => createResourceCard(resource)).join('');
}

// Create resource card HTML
function createResourceCard(resource) {
    const typeIcon = getTypeIcon(resource.type);
    const uploaderAvatar = resource.uploadedBy?.profilePicture || 'https://via.placeholder.com/32';
    const uploaderName = resource.uploadedBy?.name || 'Unknown';
    const formattedDate = new Date(resource.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const isPdf = resource.type === 'pdf';
    const isMediaLink = resource.type === 'video' || resource.type === 'link';

    return `
        <div class="resource-card">
            <div class="resource-header">
                <span class="resource-type-badge">${typeIcon} ${resource.type}</span>
            </div>
            <div class="resource-body">
                <span class="resource-subject">${resource.subject}</span>
                <h3 class="resource-title">${resource.title}</h3>
                <p class="resource-description">${resource.description || 'No description provided'}</p>
                
                <div class="resource-uploader">
                    <img src="${uploaderAvatar}" alt="Profile" class="uploader-avatar">
                    <div class="uploader-info">
                        <span class="uploader-name">${uploaderName}</span>
                        <span class="uploader-date">${formattedDate}</span>
                    </div>
                </div>

                <div class="resource-actions">
                    ${isPdf ? `
                        <button onclick="handleResourceAccess('${resource._id}')" class="btn btn-primary btn-sm">
                            <i class="fas fa-download"></i> Download
                        </button>
                    ` : ''}
                    <button onclick="openResourceDetail('${resource._id}')" class="btn btn-secondary btn-sm">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Handle resource access (protected)
async function handleResourceAccess(resourceId) {
    try {
        // Check authentication status
        const response = await apiCall('/auth/status', 'GET', null, false);

        if (!response.authenticated) {
            openLoginModal();
            return;
        }

        // User is authenticated, allow download
        downloadResource(resourceId);
    } catch (error) {
        console.error('Error:', error);
        openLoginModal();
    }
}

// Download resource
async function downloadResource(resourceId) {
    try {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/download`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to download resource');
        }

        // Get the filename from Content-Disposition header
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'download.pdf';
        if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename=(?:"([^"]+)"|([^;]+))/);
            if (match) {
                filename = match[1] || match[2];
            }
        }
        filename = filename.trim();
        if (!filename.toLowerCase().endsWith('.pdf')) {
            filename += '.pdf';
        }

        // Get the blob and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        showToast('Download started', 'success');
    } catch (error) {
        console.error('Error downloading resource:', error);
        showToast('Error downloading resource', 'error');
    }
}

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

// Open resource detail
async function openResourceDetail(resourceId) {
    try {
        // Check authentication
        const authResponse = await apiCall('/auth/status', 'GET', null, false);

        if (!authResponse.authenticated) {
            openLoginModal();
            return;
        }

        const response = await apiCall(`/resources/${resourceId}`, 'GET');

        if (response.success) {
            displayResourceDetail(response.resource);
        }
    } catch (error) {
        console.error('Error fetching resource details:', error);
        if (error.message.includes('Unauthorized')) {
            openLoginModal();
        } else {
            showToast('Error fetching resource details', 'error');
        }
    }
}

// Display resource details
function displayResourceDetail(resource) {
    const isPdf = resource.type === 'pdf';
    const isVideo = resource.type === 'video';
    const isLink = resource.type === 'link';

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            <div class="modal-body" style="text-align: left;">
                <h2>${resource.title}</h2>
                <p><strong>Subject:</strong> ${resource.subject}</p>
                <p><strong>Type:</strong> ${resource.type}</p>
                <p><strong>Description:</strong> ${resource.description || 'No description'}</p>
                <p><strong>Uploaded by:</strong> ${resource.uploadedBy?.name}</p>
                ${resource.fileSize ? `<p><strong>File Size:</strong> ${resource.fileSize}</p>` : ''}
                ${resource.downloadCount ? `<p><strong>Downloads:</strong> ${resource.downloadCount}</p>` : ''}
                ${isPdf ? `
                    <button onclick="downloadResource('${resource._id}')" class="btn btn-primary" style="width: 100%; margin-top: 20px;">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                ` : ''}
                ${isVideo ? `<button onclick="playVideoInModal('${resource.url}')" class="btn btn-secondary" style="width: 100%; margin-top: 10px; text-align: center; cursor: pointer;">
                    <i class="fas fa-play"></i> Watch Video
                </button>` : ''}
                ${isLink && !isVideo ? `<a href="${resource.url}" target="_blank" class="btn btn-secondary" style="width: 100%; margin-top: 10px; text-align: center; display: inline-block; text-decoration: none;">
                    <i class="fas fa-external-link-alt"></i> Open Link
                </a>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Filter resources
function filterResources() {
    const subject = document.getElementById('subjectFilter')?.value || '';
    const type = document.getElementById('typeFilter')?.value || '';
    const search = document.getElementById('searchInput')?.value || '';

    loadFilteredResources(subject, type, search);
}

// Load filtered resources
async function loadFilteredResources(subject = '', type = '', search = '') {
    try {
        let endpoint = '/resources/approved?';

        if (subject) endpoint += `subject=${subject}&`;
        if (type) endpoint += `type=${type}&`;
        if (search) endpoint += `search=${search}&`;

        const response = await apiCall(endpoint.slice(0, -1), 'GET', null, false);
        displayResources(response.resources || []);
    } catch (error) {
        console.error('Error filtering resources:', error);
        showToast('Error filtering resources', 'error');
    }
}

// Get icon based on resource type
function getTypeIcon(type) {
    const icons = {
        pdf: '<i class="fas fa-file-pdf"></i>',
        video: '<i class="fas fa-video"></i>',
        link: '<i class="fas fa-link"></i>'
    };
    return icons[type] || '<i class="fas fa-file"></i>';
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadApprovedResources();

    // Setup filter listeners
    const subjectFilter = document.getElementById('subjectFilter');
    const typeFilter = document.getElementById('typeFilter');
    const searchInput = document.getElementById('searchInput');

    if (subjectFilter) {
        subjectFilter.addEventListener('change', filterResources);
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', filterResources);
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', filterResources);
    }
});
