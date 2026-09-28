/**
 * MATIRA Authentication Helper (Developer 1)
 */
const Auth = {
    TOKEN_KEY: 'matira_token',
    USER_KEY: 'matira_user',

    /**
     * Get logged-in user from localStorage
     */
    getUser() {
        try {
            const raw = localStorage.getItem(this.USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Get stored JWT token
     */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!this.getToken() && !!this.getUser();
    },

    /**
     * Save authentication session
     */
    setSession(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    /**
     * Clear session and logout
     */
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        window.location.href = '/pages/login.html';
    },

    /**
     * Fetch latest profile from backend
     */
    async fetchProfile() {
        try {
            const res = await API.get('/auth/me');
            if (res.success && res.user) {
                localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
                return res.user;
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error.message);
            if (error.status === 401) {
                this.logout();
            }
        }
        return null;
    },

    /**
     * Client-side route guard
     */
    async requireAuth(requiredRole = null) {
        if (!this.isLoggedIn()) {
            window.location.href = '/pages/login.html';
            return null;
        }

        const user = await this.fetchProfile() || this.getUser();
        if (!user) {
            this.logout();
            return null;
        }

        if (requiredRole && user.role !== requiredRole) {
            alert(`Access restricted to ${requiredRole}s.`);
            if (user.role === 'farmer') {
                window.location.href = '/pages/seller-dashboard.html';
            } else {
                window.location.href = '/pages/index.html';
            }
            return null;
        }

        return user;
    }
};

// Initialize form event listeners if present on the page
document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Registration Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const errorAlert = document.getElementById('registerError');
        const submitBtn = registerForm.querySelector('button[type="submit"]');

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorAlert) errorAlert.style.display = 'none';

            const full_name = document.getElementById('full_name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const district = document.getElementById('district').value.trim();
            const role = document.querySelector('input[name="role"]:checked')?.value || 'farmer';

            if (!full_name || !phone || !password || !district) {
                showError(errorAlert, 'Please fill in all required fields.');
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creating Account...';
                }

                const res = await API.post('/auth/register', {
                    full_name,
                    phone,
                    email: email || null,
                    password,
                    role,
                    district
                });

                if (res.success && res.token) {
                    Auth.setSession(res.token, res.user);
                    if (res.user.role === 'farmer') {
                        window.location.href = '/pages/seller-dashboard.html';
                    } else {
                        window.location.href = '/pages/index.html';
                    }
                }
            } catch (err) {
                showError(errorAlert, err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                }
            }
        });
    }

    // 2. Handle Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const errorAlert = document.getElementById('loginError');
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorAlert) errorAlert.style.display = 'none';

            const identifier = document.getElementById('identifier').value.trim();
            const password = document.getElementById('password').value;

            if (!identifier || !password) {
                showError(errorAlert, 'Please enter your phone number/email and password.');
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Signing in...';
                }

                const res = await API.post('/auth/login', {
                    identifier,
                    password
                });

                if (res.success && res.token) {
                    Auth.setSession(res.token, res.user);
                    if (res.user.role === 'farmer') {
                        window.location.href = '/pages/seller-dashboard.html';
                    } else {
                        window.location.href = '/pages/index.html';
                    }
                }
            } catch (err) {
                showError(errorAlert, err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign In';
                }
            }
        });
    }

    function showError(alertElement, message) {
        if (alertElement) {
            alertElement.textContent = message;
            alertElement.style.display = 'block';
        } else {
            alert(message);
        }
    }
});
