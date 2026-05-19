// API Configuration
// TODO: Replace 'your-backend-app.onrender.com' with your actual Render backend URL after deploying
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://study-resource-platform.onrender.com/api';

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', data = null, includeAuth = true) {
    const headers = {
        'Content-Type': 'application/json',
    };

    const options = {
        method,
        headers,
        credentials: 'include' // Include credentials for session-based auth
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Helper function for file uploads
async function apiUpload(endpoint, formData) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Upload Error:', error);
        throw error;
    }
}

// Toast notification helper
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}
