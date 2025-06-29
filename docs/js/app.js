// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// Global state
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const dashboardSection = document.getElementById('dashboardSection');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkAuthStatus();
});

// Event Listeners
function setupEventListeners() {
    // Navigation
    loginBtn.addEventListener('click', () => showSection('login'));
    registerBtn.addEventListener('click', () => showSection('register'));
    logoutBtn.addEventListener('click', logout);

    // Forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('incidentForm').addEventListener('submit', handleReportIncident);
    document.getElementById('refreshIncidents').addEventListener('click', loadIncidents);

    
    // Real-time password confirmation validation
    const passwordField = document.getElementById('registerPassword');
    const confirmPasswordField = document.getElementById('registerConfirmPassword');
    
    confirmPasswordField.addEventListener('input', () => {
        validatePasswordConfirmation();
    });
    
    passwordField.addEventListener('input', () => {
        validatePasswordConfirmation();
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('loginMessage');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = { username };
            showMessage(messageDiv, 'Login successful!', 'success');
            setTimeout(() => {
                showSection('dashboard');
                loadIncidents();
            }, 1000);
        } else {
            showMessage(messageDiv, data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, 'Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const role = document.getElementById('registerRole').value;
    const messageDiv = document.getElementById('registerMessage');

    // Validate password confirmation
    if (password !== confirmPassword) {
        showMessage(messageDiv, 'Passwords do not match!', 'error');
        return;
    }

    // Validate password strength (optional - you can customize these rules)
    if (password.length < 6) {
        showMessage(messageDiv, 'Password must be at least 6 characters long!', 'error');
        return;
    }
 
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, confirmPassword ,role })
            //body: JSON.stringify(requestBody)
        });

        const data = await response.text();
  
        if (response.ok) {
            showMessage(messageDiv, 'Registration successful! Please login.', 'success');
            setTimeout(() => showSection('login'), 1500);
        } else {
            showMessage(messageDiv, data || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, 'Network error. Please try again.', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showSection('login');
    updateNavigation();
}

function checkAuthStatus() {
    if (authToken) {
        currentUser = { username: 'User' }; // You could decode JWT to get username
        showSection('dashboard');
        loadIncidents();
    } else {
        showSection('login');
    }
    updateNavigation();
}

// Incident Functions
async function handleReportIncident(e) {
    e.preventDefault();
    const title = document.getElementById('incidentTitle').value;
    const description = document.getElementById('incidentDescription').value;
    const messageDiv = document.getElementById('incidentMessage');

    try {
        const response = await fetch(`${API_BASE_URL}/incidents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ title, description })
        });

        if (response.ok) {
            showMessage(messageDiv, 'Incident reported successfully!', 'success');
            document.getElementById('incidentForm').reset();
            loadIncidents();
        } else {
            const data = await response.text();
            showMessage(messageDiv, data || 'Failed to report incident', 'error');
        }
    } catch (error) {
        showMessage(messageDiv, 'Network error. Please try again.', 'error');
    }
}

async function loadIncidents() {
    const incidentsList = document.getElementById('incidentsList');
    
    try {
        const response = await fetch(`${API_BASE_URL}/incidents`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const incidents = await response.json();
            displayIncidents(incidents);
        } else {
            incidentsList.innerHTML = '<p class="text-red-600">Failed to load incidents</p>';
        }
    } catch (error) {
        incidentsList.innerHTML = '<p class="text-red-600">Network error. Please try again.</p>';
    }
}

function displayIncidents(incidents) {
    const incidentsList = document.getElementById('incidentsList');
    
    if (incidents.length === 0) {
        incidentsList.innerHTML = '<p class="text-gray-500 text-center">No incidents found</p>';
        return;
    }

    incidentsList.innerHTML = incidents.map(incident => `
        <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="font-semibold text-lg">${incident.title}</h4>
                    <p class="text-gray-600 mt-2">${incident.description}</p>
                    <div class="flex items-center mt-3 space-x-4 text-sm text-gray-500">
                        <span>Status: <span class="font-medium ${getStatusColor(incident.status)}">${incident.status}</span></span>
                        <span>Created: ${new Date(incident.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                ${incident.status === 'Reported' ? `
                    <button onclick="updateStatus(${incident.id}, 'In Progress')" 
                            class="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">
                        Mark In Progress
                    </button>
                ` : incident.status === 'In Progress' ? `
                    <button onclick="updateStatus(${incident.id}, 'Resolved')" 
                            class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                        Mark Resolved
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function updateStatus(incidentId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(newStatus)
        });

        if (response.ok) {
            loadIncidents();
        } else {
            alert('Failed to update status');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// Utility Functions
function showSection(sectionName) {
    // Hide all sections
    loginSection.classList.add('hidden');
    registerSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');

    // Show selected section
    switch (sectionName) {
        case 'login':
            loginSection.classList.remove('hidden');
            break;
        case 'register':
            registerSection.classList.remove('hidden');
            break;
        case 'dashboard':
            dashboardSection.classList.remove('hidden');
            break;
    }
}

function updateNavigation() {
    if (authToken) {
        loginBtn.classList.add('hidden');
        registerBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
    } else {
        loginBtn.classList.remove('hidden');
        registerBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
    }
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `mt-4 text-center ${type === 'success' ? 'text-green-600' : 'text-red-600'}`;
    setTimeout(() => {
        element.textContent = '';
        element.className = 'mt-4 text-center';
    }, 3000);
}

function validatePasswordConfirmation() {
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const confirmPasswordField = document.getElementById('registerConfirmPassword');
    
    if (confirmPassword.length > 0) {
        if (password === confirmPassword) {
            confirmPasswordField.classList.remove('border-red-500');
            confirmPasswordField.classList.add('border-green-500');
        } else {
            confirmPasswordField.classList.remove('border-green-500');
            confirmPasswordField.classList.add('border-red-500');
        }
    } else {
        confirmPasswordField.classList.remove('border-red-500', 'border-green-500');
        confirmPasswordField.classList.add('border-gray-300');
    }
}


function getStatusColor(status) {
    switch (status) {
        case 'Reported':
            return 'text-blue-600';
        case 'In Progress':
            return 'text-yellow-600';
        case 'Resolved':
            return 'text-green-600';
        default:
            return 'text-gray-600';
    }
} 