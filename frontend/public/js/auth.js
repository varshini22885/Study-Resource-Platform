let currentAuthEmail = '';

function openLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (!loginModal) {
        return;
    }

    resetAuthModal();
    loginModal.classList.add('active');

    const emailInput = document.getElementById('authEmail');
    if (emailInput) {
        emailInput.focus();
    }
}

function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.remove('active');
    }

    resetAuthModal();
}

function resetAuthModal() {
    currentAuthEmail = '';

    const emailStep = document.getElementById('authStepEmail');
    const passwordStep = document.getElementById('authStepPassword');
    const registerStep = document.getElementById('authStepRegister');

    if (emailStep) emailStep.style.display = 'block';
    if (passwordStep) passwordStep.style.display = 'none';
    if (registerStep) registerStep.style.display = 'none';

    const emailInput = document.getElementById('authEmail');
    const loginPassword = document.getElementById('loginPassword');
    const registerName = document.getElementById('registerName');
    const registerPassword = document.getElementById('registerPassword');
    const registerRole = document.getElementById('registerRole');

    if (emailInput) emailInput.value = '';
    if (loginPassword) loginPassword.value = '';
    if (registerName) registerName.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerRole) registerRole.value = 'student';
}

function showAuthStep(step) {
    const emailStep = document.getElementById('authStepEmail');
    const passwordStep = document.getElementById('authStepPassword');
    const registerStep = document.getElementById('authStepRegister');

    if (emailStep) emailStep.style.display = step === 'email' ? 'block' : 'none';
    if (passwordStep) passwordStep.style.display = step === 'password' ? 'block' : 'none';
    if (registerStep) registerStep.style.display = step === 'register' ? 'block' : 'none';
}

function goBackToEmail() {
    showAuthStep('email');
    const emailInput = document.getElementById('authEmail');
    if (emailInput) {
        emailInput.focus();
    }
}

function setAuthLoading(isLoading) {
    const buttons = document.querySelectorAll('#loginModal button');
    buttons.forEach((button) => {
        button.disabled = isLoading;
        button.dataset.previousText = button.dataset.previousText || button.textContent;
        if (isLoading && button.classList.contains('btn-primary')) {
            button.textContent = 'Please wait...';
        } else if (!isLoading && button.dataset.previousText) {
            button.textContent = button.dataset.previousText;
        }
    });
}

function getAuthErrorMessage(error, fallbackMessage) {
    return error?.message || error?.response?.message || fallbackMessage;
}

async function continueWithEmail() {
    try {
        const emailInput = document.getElementById('authEmail');
        const email = emailInput ? emailInput.value.trim() : '';
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            showToast('Please enter a valid email address', 'warning');
            return;
        }

        currentAuthEmail = email.toLowerCase();
        setAuthLoading(true);

        const response = await apiCall('/auth/check-email', 'POST', { email: currentAuthEmail }, false);
        if (response.exists) {
            const loginLabel = document.getElementById('loginEmailLabel');
            if (loginLabel) {
                loginLabel.textContent = currentAuthEmail;
            }
            showAuthStep('password');

            const loginPassword = document.getElementById('loginPassword');
            if (loginPassword) {
                loginPassword.focus();
            }
        } else {
            const registerLabel = document.getElementById('registerEmailLabel');
            if (registerLabel) {
                registerLabel.textContent = currentAuthEmail;
            }
            showAuthStep('register');

            const registerName = document.getElementById('registerName');
            if (registerName) {
                registerName.focus();
            }
        }
    } catch (error) {
        showToast(getAuthErrorMessage(error, 'Unable to check email'), 'error');
    } finally {
        setAuthLoading(false);
    }
}

async function submitLogin() {
    try {
        const passwordInput = document.getElementById('loginPassword');
        const password = passwordInput ? passwordInput.value : '';

        if (!password) {
            showToast('Enter your password to continue', 'warning');
            return;
        }

        setAuthLoading(true);
        const response = await apiCall('/auth/login', 'POST', {
            email: currentAuthEmail,
            password
        }, false);

        if (response.token) {
            localStorage.setItem('token', response.token);
        }

        showToast('Login successful', 'success');
        window.location.href = response.redirectUrl || 'dashboard.html';
    } catch (error) {
        showToast(getAuthErrorMessage(error, 'Incorrect password or account not found'), 'error');
    } finally {
        setAuthLoading(false);
    }
}

async function submitRegistration() {
    try {
        const nameInput = document.getElementById('registerName');
        const passwordInput = document.getElementById('registerPassword');
        const roleInput = document.getElementById('registerRole');

        const name = nameInput ? nameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        const role = roleInput ? roleInput.value : 'user';

        if (!password || password.length < 8) {
            showToast('Password must be at least 8 characters long', 'warning');
            return;
        }

        setAuthLoading(true);
        const response = await apiCall('/auth/register', 'POST', {
            name,
            email: currentAuthEmail,
            password,
            role
        }, false);

        if (response.token) {
            localStorage.setItem('token', response.token);
        }

        showToast('Account created successfully', 'success');
        window.location.href = response.redirectUrl || 'dashboard.html';
    } catch (error) {
        showToast(getAuthErrorMessage(error, 'Could not create account'), 'error');
    } finally {
        setAuthLoading(false);
    }
}

async function logout() {
    try {
        await apiCall('/auth/logout', 'POST');
        localStorage.removeItem('token');
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        localStorage.removeItem('token');
        showToast('Error logging out', 'error');
    }
}

async function checkAuthStatus() {
    try {
        const response = await apiCall('/auth/status', 'GET', null, false);

        if (response.authenticated && response.user) {
            updateNavbarForLoggedIn(response.user);
            return response.user;
        }

        updateNavbarForGuest();
        return null;
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateNavbarForGuest();
        return null;
    }
}

function updateNavbarForLoggedIn(user) {
    const authMenu = document.getElementById('authMenu');
    const userMenu = document.getElementById('userMenu');
    const heroSignInBtn = document.getElementById('heroSignInBtn');

    if (authMenu) {
        authMenu.style.display = 'none';
    }

    if (heroSignInBtn) {
        heroSignInBtn.textContent = 'Go to Dashboard';
        heroSignInBtn.setAttribute('onclick', "window.location.href='dashboard.html'");
    }

    if (userMenu) {
        userMenu.style.display = 'flex';
        const profilePic = userMenu.querySelector('#userProfilePic');
        const defaultIcon = userMenu.querySelector('#defaultAvatarIcon');
        const userName = userMenu.querySelector('#userName');

        if (user.profilePicture && profilePic && defaultIcon) {
            profilePic.src = user.profilePicture;
            profilePic.alt = user.name || 'User';
            profilePic.style.display = 'block';
            defaultIcon.style.display = 'none';
        } else if (profilePic && defaultIcon) {
            profilePic.style.display = 'none';
            defaultIcon.style.display = 'flex';
        }

        if (userName) {
            userName.textContent = (user.name || 'User').split(' ')[0];
        }
    }
}

function updateNavbarForGuest() {
    const authMenu = document.getElementById('authMenu');
    const userMenu = document.getElementById('userMenu');
    const heroSignInBtn = document.getElementById('heroSignInBtn');

    if (authMenu) {
        authMenu.style.display = 'block';
    }

    if (heroSignInBtn) {
        heroSignInBtn.textContent = 'Sign In';
        heroSignInBtn.setAttribute('onclick', 'openLoginModal()');
    }

    if (userMenu) {
        userMenu.style.display = 'none';
    }
}

function toggleDropdown() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (dropdownMenu) {
        dropdownMenu.classList.toggle('active');
    }
}

function toggleHamburger() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebar) {
        toggleSidebar();
        return;
    }
    
    const navMenu = document.getElementById('navMenu');
    const userMenu = document.getElementById('userMenu');
    
    if (hamburger) {
        hamburger.classList.toggle('active');
    }
    if (navMenu) {
        navMenu.classList.toggle('active');
    }
    if (userMenu && userMenu.style.display !== 'none' && !userMenu.classList.contains('hidden-by-auth')) {
        // Only toggle active if the user is logged in
        userMenu.classList.toggle('active');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const isActive = sidebar.classList.toggle('active');
        const hamburger = document.getElementById('hamburger');
        if (hamburger) {
            if (isActive) {
                hamburger.classList.add('active');
            } else {
                hamburger.classList.remove('active');
            }
        }
    }
}

document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('userMenu');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (userMenu && dropdownMenu && !userMenu.contains(e.target)) {
        dropdownMenu.classList.remove('active');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger');
    const emailInput = document.getElementById('authEmail');
    const loginPassword = document.getElementById('loginPassword');
    const registerPassword = document.getElementById('registerPassword');

    if (hamburger) {
        hamburger.addEventListener('click', toggleHamburger);
    }

    [emailInput, loginPassword, registerPassword].forEach((input) => {
        if (input) {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();

                    if (input.id === 'authEmail') {
                        continueWithEmail();
                    } else if (input.id === 'loginPassword') {
                        submitLogin();
                    } else if (input.id === 'registerPassword') {
                        submitRegistration();
                    }
                }
            });
        }
    });

    checkAuthStatus();
});
