// MediCare Hospital Management System — Frontend Application
// Team: Tanay Bhutada (2025300029) | Hiten Bohra (2025300030) | Aayush Chaudhari (2025300035)

let cachedPatients = [];
let cachedDoctors = [];
let cachedDepartments = [];
let cachedAppointments = [];
let cachedMedications = [];
let cachedBilling = [];
let cachedSchedules = [];
let activeDeptFilter = 'ALL';

// User Authentication & Role State
// Using sessionStorage ensures that opening a fresh tab or reopening always starts at the Gatekeeper
let currentUser = JSON.parse(sessionStorage.getItem('medicare_active_user')) || null;
let cachedUsers = [];
let activeAuthFilter = 'all';

// Unified API Fetch with Role Header for RBAC enforcement
function apiFetch(url, options = {}) {
    const opts = { ...options };
    opts.headers = { ...(options.headers || {}) };
    if (!opts.headers['Content-Type'] && opts.body && typeof opts.body === 'string') {
        opts.headers['Content-Type'] = 'application/json';
    }
    const role = (currentUser && currentUser.role) ? currentUser.role : 'patient';
    opts.headers['x-user-role'] = role;
    return fetch(url, opts);
}

const PAGE_HEADERS = {
    dashboard: {
        title: 'Hospital Overview',
        subtitle: 'Daily outpatient operations, appointment queue, and specialist roster'
    },
    appointments: {
        title: 'Outpatient Appointments',
        subtitle: 'Schedule, reschedule, and track patient consultations across departments'
    },
    patients: {
        title: 'Patient Registry',
        subtitle: 'Registered patients, demographic records, and clinical charts'
    },
    doctors: {
        title: 'Medical Specialists & Schedules',
        subtitle: 'Department roster, weekly OPD timings, and break hours'
    },
    history: {
        title: 'Clinical Case Histories',
        subtitle: 'Longitudinal patient diagnoses, pre-existing conditions, and treatment notes'
    },
    prescriptions: {
        title: 'Issued Prescriptions (℞)',
        subtitle: 'Medication dosages, frequencies, and pharmacy dispensation logs'
    },
    pharmacy: {
        title: 'Pharmacy Inventory',
        subtitle: 'Medicine stock levels, unit pricing, and stock replenishment'
    },
    billing: {
        title: 'Billing & Patient Accounts',
        subtitle: 'Invoices, payment collection, and printable hospital tax receipts'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    checkAuthGatekeeper();
    loadAuthUsers();
    loadDepartments();
    loadDoctors();
    loadPatients();
    loadAppointments();
    loadMedicalHistory();
    loadMedications();
    loadPrescriptions();
    loadBilling();
    loadDashboardData();
});

// Helper: Get 2-letter initials from name
function getInitials(name = '') {
    const cleaned = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Safe Currency Formatter (Handles strings, nulls, and numbers from MySQL DECIMAL)
function formatCurrency(amount) {
    const num = parseFloat(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastBox = document.getElementById('toast-box');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastMessage.textContent = message;
    if (type === 'success') {
        toastBox.className = 'bg-[#0B192C] border border-teal-500/40 text-white text-xs px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5';
        toastIcon.innerHTML = '<span class="w-2 h-2 rounded-full bg-teal-400 inline-block"></span>';
    } else if (type === 'error') {
        toastBox.className = 'bg-rose-950 border border-rose-700 text-rose-100 text-xs px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5';
        toastIcon.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>';
    } else {
        toastBox.className = 'bg-slate-900 border border-slate-700 text-slate-100 text-xs px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5';
        toastIcon.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>';
    }

    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3500);
}

// Modal Open/Close
function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        populateSelectDropdowns();
        if (id === 'modal-auth-login') {
            loadAuthUsers();
        }
        lucide.createIcons();
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.add('hidden');
    }
});

// =====================================================================
// AUTH & ROLE GATEKEEPER SYSTEM (Admin / Doctor / Patient)
// =====================================================================

function checkAuthGatekeeper() {
    const activeSession = sessionStorage.getItem('medicare_active_user');
    const gatekeeperEl = document.getElementById('auth-gatekeeper');
    const mainAppEl = document.getElementById('main-app-container');

    if (!activeSession) {
        // Not logged in this session: Always show Gatekeeper landing first!
        if (gatekeeperEl) gatekeeperEl.classList.remove('hidden');
        if (mainAppEl) mainAppEl.classList.add('hidden');
        populateGatekeeperPickers();
    } else {
        try {
            currentUser = JSON.parse(activeSession);
        } catch (_) {}
        if (gatekeeperEl) gatekeeperEl.classList.add('hidden');
        if (mainAppEl) mainAppEl.classList.remove('hidden');
        renderCurrentUser();
        applyRolePermissions();
    }
}

let selectedGatekeeperRole = 'doctor';

function showLoginGatekeeper() {
    sessionStorage.removeItem('medicare_active_user');
    currentUser = null;
    const gatekeeperEl = document.getElementById('auth-gatekeeper');
    const mainAppEl = document.getElementById('main-app-container');
    const roleSelectView = document.getElementById('gk-role-selection-view');
    const rolePortalView = document.getElementById('gk-role-portal-view');

    if (gatekeeperEl) {
        gatekeeperEl.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (mainAppEl) mainAppEl.classList.add('hidden');
    if (roleSelectView) roleSelectView.classList.remove('hidden');
    if (rolePortalView) rolePortalView.classList.add('hidden');

    loadAuthUsers();
    showToast('Select your role to access the portal.');
}

function hideLoginGatekeeper() {
    const gatekeeperEl = document.getElementById('auth-gatekeeper');
    const mainAppEl = document.getElementById('main-app-container');
    if (gatekeeperEl) gatekeeperEl.classList.add('hidden');
    if (mainAppEl) mainAppEl.classList.remove('hidden');
    renderCurrentUser();
    applyRolePermissions();
    loadDashboardData();
    lucide.createIcons();
}

async function loginGatekeeperAs(userId) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const json = await res.json();
        if (json.success) {
            currentUser = json.data || json.user;
            sessionStorage.setItem('medicare_active_user', JSON.stringify(currentUser));
            localStorage.setItem('medicare_user', JSON.stringify(currentUser));
            hideLoginGatekeeper();
            showToast(`Welcome! Logged in as ${currentUser.full_name} (${currentUser.role.toUpperCase()})`);
        } else {
            showToast(json.error || 'Login failed', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function openRolePortal(role) {
    selectedGatekeeperRole = role;
    const roleSelectView = document.getElementById('gk-role-selection-view');
    const rolePortalView = document.getElementById('gk-role-portal-view');
    if (roleSelectView) roleSelectView.classList.add('hidden');
    if (rolePortalView) rolePortalView.classList.remove('hidden');

    const badgeEl = document.getElementById('gk-portal-role-badge');
    const iconEl = document.getElementById('gk-portal-role-icon');
    const titleEl = document.getElementById('gk-portal-role-title');
    const descEl = document.getElementById('gk-portal-role-desc');
    const regLabel = document.getElementById('portal-tab-register-label');

    // Forms
    const formDoc = document.getElementById('form-register-doctor');
    const formPat = document.getElementById('form-register-patient');
    const formAdm = document.getElementById('form-register-admin');

    if (formDoc) formDoc.classList.add('hidden');
    if (formPat) formPat.classList.add('hidden');
    if (formAdm) formAdm.classList.add('hidden');

    if (role === 'doctor') {
        if (badgeEl) {
            badgeEl.className = 'text-xs font-bold px-3 py-1 rounded-full border bg-blue-500/20 text-blue-300 border-blue-400/30';
            badgeEl.textContent = 'DOCTOR PORTAL';
        }
        if (iconEl) {
            iconEl.className = 'w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-300 text-2xl shadow-lg';
            iconEl.innerHTML = '<i data-lucide="stethoscope" class="w-7 h-7"></i>';
        }
        if (titleEl) titleEl.textContent = 'Doctor Clinical Gateway';
        if (descEl) descEl.textContent = 'Sign in to access your OPD consultations, patient diagnoses, and prescriptions, or register as a new specialist doctor with weekly OPD schedules in MySQL.';
        if (regLabel) regLabel.textContent = 'Register New Doctor (Specialization & Schedules)';
        if (formDoc) formDoc.classList.remove('hidden');
        populateDoctorDepartmentDropdown();
    } else if (role === 'patient') {
        if (badgeEl) {
            badgeEl.className = 'text-xs font-bold px-3 py-1 rounded-full border bg-teal-500/20 text-teal-300 border-teal-400/30';
            badgeEl.textContent = 'PATIENT PORTAL';
        }
        if (iconEl) {
            iconEl.className = 'w-14 h-14 rounded-2xl bg-teal-600/30 border border-teal-500/50 flex items-center justify-center text-teal-300 text-2xl shadow-lg';
            iconEl.innerHTML = '<i data-lucide="heart-pulse" class="w-7 h-7"></i>';
        }
        if (titleEl) titleEl.textContent = 'Patient Health Gateway';
        if (descEl) descEl.textContent = 'Sign in to book doctor appointments, view case histories, download digital prescriptions, or register for an official MediCare UHID in MySQL.';
        if (regLabel) regLabel.textContent = 'Register New Patient (Generate UHID)';
        if (formPat) formPat.classList.remove('hidden');
    } else {
        if (badgeEl) {
            badgeEl.className = 'text-xs font-bold px-3 py-1 rounded-full border bg-purple-500/20 text-purple-300 border-purple-400/30';
            badgeEl.textContent = 'HOSPITAL ADMIN PORTAL';
        }
        if (iconEl) {
            iconEl.className = 'w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 text-2xl shadow-lg';
            iconEl.innerHTML = '<i data-lucide="shield-check" class="w-7 h-7"></i>';
        }
        if (titleEl) titleEl.textContent = 'Hospital Administrator Gateway';
        if (descEl) descEl.textContent = 'Sign in for master control over specialist doctors, clinical departments, pharmacy stocks, and billing audits, or register an authorized admin passkey in MySQL.';
        if (regLabel) regLabel.textContent = 'Register Authorized Administrator';
        if (formAdm) formAdm.classList.remove('hidden');
    }

    switchPortalTab('login');
    populatePortalUserPicker(role);
    lucide.createIcons();
}

function backToRoleSelect() {
    const roleSelectView = document.getElementById('gk-role-selection-view');
    const rolePortalView = document.getElementById('gk-role-portal-view');
    if (roleSelectView) roleSelectView.classList.remove('hidden');
    if (rolePortalView) rolePortalView.classList.add('hidden');
    lucide.createIcons();
}

function switchPortalTab(tab) {
    const loginSec = document.getElementById('portal-login-section');
    const regSec = document.getElementById('portal-register-section');
    const loginBtn = document.getElementById('portal-tab-login-btn');
    const regBtn = document.getElementById('portal-tab-register-btn');

    if (tab === 'login') {
        if (loginSec) loginSec.classList.remove('hidden');
        if (regSec) regSec.classList.add('hidden');
        if (loginBtn) {
            loginBtn.className = 'flex-1 py-2.5 text-teal-400 border-b-2 border-teal-400 text-center transition flex items-center justify-center gap-2 font-bold';
        }
        if (regBtn) {
            regBtn.className = 'flex-1 py-2.5 text-slate-400 hover:text-white border-b-2 border-transparent text-center transition flex items-center justify-center gap-2 font-bold';
        }
    } else {
        if (loginSec) loginSec.classList.add('hidden');
        if (regSec) regSec.classList.remove('hidden');
        if (loginBtn) {
            loginBtn.className = 'flex-1 py-2.5 text-slate-400 hover:text-white border-b-2 border-transparent text-center transition flex items-center justify-center gap-2 font-bold';
        }
        if (regBtn) {
            regBtn.className = 'flex-1 py-2.5 text-teal-400 border-b-2 border-teal-400 text-center transition flex items-center justify-center gap-2 font-bold';
        }
    }
    lucide.createIcons();
}

async function populatePortalUserPicker(role) {
    const picker = document.getElementById('portal-quick-user-picker');
    if (!picker) return;

    if (!cachedUsers || cachedUsers.length === 0) {
        try {
            const res = await fetch('/api/auth/users');
            const json = await res.json();
            if (json.success) cachedUsers = json.data;
        } catch (_) {}
    }

    const filtered = (cachedUsers || []).filter(u => u.role.toLowerCase() === role.toLowerCase());
    if (filtered.length === 0) {
        picker.innerHTML = `<option value="">No existing ${role} accounts found. Please register below.</option>`;
    } else {
        picker.innerHTML = filtered.map(u => {
            const extra = u.specialization ? ` (${u.specialization})` : (u.patient_id ? ` (UHID-${1000 + u.patient_id})` : '');
            return `<option value="${u.user_id}">${u.full_name}${extra} — [${u.username}]</option>`;
        }).join('');
    }
}

async function populateDoctorDepartmentDropdown() {
    const deptSelect = document.getElementById('reg-doc-dept');
    if (!deptSelect) return;

    if (!cachedDepartments || cachedDepartments.length === 0) {
        try {
            const res = await fetch('/api/departments');
            const json = await res.json();
            if (json.success) cachedDepartments = json.data;
        } catch (_) {}
    }

    if (cachedDepartments && cachedDepartments.length > 0) {
        deptSelect.innerHTML = cachedDepartments.map(d => `
            <option value="${d.department_id}">${d.department_name} (${d.floor})</option>
        `).join('');
    } else {
        deptSelect.innerHTML = `
            <option value="1">Cardiology</option>
            <option value="2">Neurology</option>
            <option value="3">Pediatrics</option>
            <option value="4">Orthopedics</option>
            <option value="5">General Medicine</option>
            <option value="6">Dermatology</option>
        `;
    }
}

function loginWithSelectedPickerUser() {
    const picker = document.getElementById('portal-quick-user-picker');
    if (!picker || !picker.value) {
        return showToast('Please select an account first or register a new one below.', 'warning');
    }
    loginGatekeeperAs(Number(picker.value));
}

async function handlePortalCredentialLogin(e) {
    e.preventDefault();
    const username = document.getElementById('portal-login-username').value.trim();
    const password = document.getElementById('portal-login-password').value.trim();

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const json = await res.json();
        if (json.success) {
            currentUser = json.data || json.user;
            sessionStorage.setItem('medicare_active_user', JSON.stringify(currentUser));
            localStorage.setItem('medicare_user', JSON.stringify(currentUser));
            hideLoginGatekeeper();
            showToast(`Welcome back, ${currentUser.full_name}! (${currentUser.role.toUpperCase()})`);
            e.target.reset();
        } else {
            showToast(json.error || 'Invalid credentials', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleDoctorRegistration(e) {
    e.preventDefault();
    const dayCheckboxes = document.querySelectorAll('input[name="doc-days"]:checked');
    const selectedDays = Array.from(dayCheckboxes).map(cb => cb.value);

    if (selectedDays.length === 0) {
        return showToast('Please select at least one OPD consultation day.', 'warning');
    }

    const rawPhone = document.getElementById('reg-doc-phone').value.trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
        return showToast('Contact phone must be exactly 10 digits.', 'error');
    }

    const payload = {
        name: document.getElementById('reg-doc-name').value.trim(),
        email: document.getElementById('reg-doc-email').value.trim(),
        phone: cleanPhone,
        department_id: document.getElementById('reg-doc-dept').value,
        specialization: document.getElementById('reg-doc-spec').value.trim(),
        experience_years: document.getElementById('reg-doc-exp').value,
        days: selectedDays,
        start_time: document.getElementById('reg-doc-start-time').value,
        end_time: document.getElementById('reg-doc-end-time').value,
        break_start: document.getElementById('reg-doc-break-start').value,
        break_end: document.getElementById('reg-doc-break-end').value,
        username: document.getElementById('reg-doc-username').value.trim(),
        password: document.getElementById('reg-doc-password').value.trim() || 'doctor123'
    };

    try {
        const res = await fetch('/api/auth/register-doctor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Doctor ${payload.name} registered successfully with OPD schedule in MySQL!`);
            currentUser = json.data || json.user;
            sessionStorage.setItem('medicare_active_user', JSON.stringify(currentUser));
            localStorage.setItem('medicare_user', JSON.stringify(currentUser));
            hideLoginGatekeeper();
            e.target.reset();
            loadDoctors();
            loadDepartments();
            loadDashboardData();
        } else {
            showToast(json.error || 'Failed to register doctor', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handlePatientRegistration(e) {
    e.preventDefault();
    const rawPhone = document.getElementById('reg-pat-phone').value.trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
        return showToast('Contact phone must be exactly 10 digits.', 'error');
    }

    const payload = {
        name: document.getElementById('reg-pat-name').value.trim(),
        email: document.getElementById('reg-pat-email').value.trim(),
        phone: cleanPhone,
        date_of_birth: document.getElementById('reg-pat-dob').value,
        gender: document.getElementById('reg-pat-gender').value,
        address: document.getElementById('reg-pat-address').value.trim(),
        username: document.getElementById('reg-pat-username').value.trim(),
        password: document.getElementById('reg-pat-password').value.trim() || 'patient123'
    };

    try {
        const res = await fetch('/api/auth/register-patient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Patient account created in MySQL with official UHID!`);
            currentUser = json.data || json.user;
            sessionStorage.setItem('medicare_active_user', JSON.stringify(currentUser));
            localStorage.setItem('medicare_user', JSON.stringify(currentUser));
            hideLoginGatekeeper();
            e.target.reset();
            loadPatients();
            loadDashboardData();
        } else {
            showToast(json.error || 'Failed to register patient', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleAdminRegistration(e) {
    e.preventDefault();
    const passkey = document.getElementById('reg-adm-passkey').value.trim();
    if (passkey !== 'admin123' && passkey !== 'hospital123') {
        return showToast('Invalid Hospital Authorization Key. Use admin123', 'error');
    }

    const payload = {
        full_name: document.getElementById('reg-adm-name').value.trim(),
        username: document.getElementById('reg-adm-username').value.trim(),
        email: document.getElementById('reg-adm-email').value.trim(),
        password: document.getElementById('reg-adm-password').value.trim() || 'admin123'
    };

    try {
        const res = await fetch('/api/auth/register-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Administrator ${payload.full_name} registered successfully in MySQL!`);
            currentUser = json.data || json.user;
            sessionStorage.setItem('medicare_active_user', JSON.stringify(currentUser));
            localStorage.setItem('medicare_user', JSON.stringify(currentUser));
            hideLoginGatekeeper();
            e.target.reset();
            loadDashboardData();
        } else {
            showToast(json.error || 'Failed to register administrator', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function applyRolePermissions() {
    if (!currentUser) return;
    const role = (currentUser.role || 'admin').toLowerCase();

    // 1. Patient Directory: HIDDEN from Patient (Only Doctor & Admin can view all patients)
    const navPatients = document.getElementById('nav-patients');
    const topbarNavPatients = document.getElementById('topbar-nav-patients');
    const hubCardPatients = document.getElementById('hub-card-patients');
    if (role === 'patient') {
        if (navPatients) navPatients.classList.add('hidden');
        if (topbarNavPatients) topbarNavPatients.classList.add('hidden');
        if (hubCardPatients) hubCardPatients.classList.add('hidden');
    } else {
        if (navPatients) navPatients.classList.remove('hidden');
        if (topbarNavPatients) topbarNavPatients.classList.remove('hidden');
        if (hubCardPatients) hubCardPatients.classList.remove('hidden');
    }

    // 2. Pharmacy Stock: HIDDEN from BOTH Patient and Doctor (Admin ONLY)
    const navPharmacy = document.getElementById('nav-pharmacy');
    const topbarNavPharmacy = document.getElementById('topbar-nav-pharmacy');
    const hubCardPharmacy = document.getElementById('hub-card-pharmacy');
    const btnAddMedication = document.getElementById('btn-add-medication');
    const btnAddMedicationHeader = document.getElementById('btn-add-medication-header');
    const hubBtnAddMedication = document.getElementById('hub-btn-add-medication');
    const hubBadgePharmacy = document.getElementById('hub-badge-pharmacy');
    if (role === 'admin') {
        if (navPharmacy) navPharmacy.classList.remove('hidden');
        if (topbarNavPharmacy) topbarNavPharmacy.classList.remove('hidden');
        if (hubCardPharmacy) hubCardPharmacy.classList.remove('hidden');
        if (btnAddMedication) btnAddMedication.classList.remove('hidden');
        if (btnAddMedicationHeader) btnAddMedicationHeader.classList.remove('hidden');
        if (hubBtnAddMedication) hubBtnAddMedication.classList.remove('hidden');
        if (hubBadgePharmacy) hubBadgePharmacy.textContent = 'ADMIN ONLY';
    } else {
        if (navPharmacy) navPharmacy.classList.add('hidden');
        if (topbarNavPharmacy) topbarNavPharmacy.classList.add('hidden');
        if (hubCardPharmacy) hubCardPharmacy.classList.add('hidden');
        if (btnAddMedication) btnAddMedication.classList.add('hidden');
        if (btnAddMedicationHeader) btnAddMedicationHeader.classList.add('hidden');
        if (hubBtnAddMedication) hubBtnAddMedication.classList.add('hidden');
        if (hubBadgePharmacy) hubBadgePharmacy.textContent = 'RESTRICTED';
    }

    // 3. Doctors management: Admin ONLY
    const btnAddDoctor = document.getElementById('btn-add-doctor');
    const btnAddDoctorHeader = document.getElementById('btn-add-doctor-header');
    const hubBtnAddDoctor = document.getElementById('hub-btn-add-doctor');
    const hubBadgeDoctor = document.getElementById('hub-badge-doctor');
    if (role === 'admin') {
        if (btnAddDoctor) btnAddDoctor.classList.remove('hidden');
        if (btnAddDoctorHeader) btnAddDoctorHeader.classList.remove('hidden');
        if (hubBtnAddDoctor) hubBtnAddDoctor.classList.remove('hidden');
        if (hubBadgeDoctor) hubBadgeDoctor.textContent = 'ADMIN CONTROL';
    } else {
        if (btnAddDoctor) btnAddDoctor.classList.add('hidden');
        if (btnAddDoctorHeader) btnAddDoctorHeader.classList.add('hidden');
        if (hubBtnAddDoctor) hubBtnAddDoctor.classList.add('hidden');
        if (hubBadgeDoctor) hubBadgeDoctor.textContent = role === 'doctor' ? 'OPD SCHEDULE' : 'SPECIALISTS';
    }

    // 4. Clinical Case Records (Diagnoses): Doctor & Admin ONLY (Patients CANNOT diagnose)
    const btnAddHistory = document.getElementById('btn-add-history');
    const btnAddHistoryHeader = document.getElementById('btn-add-history-header');
    const hubBtnAddHistory = document.getElementById('hub-btn-add-history');
    const hubBadgeHistory = document.getElementById('hub-badge-history');
    if (role === 'patient') {
        if (btnAddHistory) btnAddHistory.classList.add('hidden');
        if (btnAddHistoryHeader) btnAddHistoryHeader.classList.add('hidden');
        if (hubBtnAddHistory) hubBtnAddHistory.classList.add('hidden');
        if (hubBadgeHistory) hubBadgeHistory.textContent = 'MY HISTORY';
    } else {
        if (btnAddHistory) btnAddHistory.classList.remove('hidden');
        if (btnAddHistoryHeader) btnAddHistoryHeader.classList.remove('hidden');
        if (hubBtnAddHistory) hubBtnAddHistory.classList.remove('hidden');
        if (hubBadgeHistory) hubBadgeHistory.textContent = 'CLINICAL CARE';
    }

    // 5. Prescriptions (Rx): Doctor & Admin ONLY (Patients CANNOT prescribe)
    const btnAddPrescription = document.getElementById('btn-add-prescription');
    const btnAddPrescriptionHeader = document.getElementById('btn-add-prescription-header');
    const hubBtnAddPrescription = document.getElementById('hub-btn-add-prescription');
    const hubBadgePrescriptions = document.getElementById('hub-badge-prescriptions');
    if (role === 'patient') {
        if (btnAddPrescription) btnAddPrescription.classList.add('hidden');
        if (btnAddPrescriptionHeader) btnAddPrescriptionHeader.classList.add('hidden');
        if (hubBtnAddPrescription) hubBtnAddPrescription.classList.add('hidden');
        if (hubBadgePrescriptions) hubBadgePrescriptions.textContent = 'MY RX (VIEW)';
    } else {
        if (btnAddPrescription) btnAddPrescription.classList.remove('hidden');
        if (btnAddPrescriptionHeader) btnAddPrescriptionHeader.classList.remove('hidden');
        if (hubBtnAddPrescription) hubBtnAddPrescription.classList.remove('hidden');
        if (hubBadgePrescriptions) hubBadgePrescriptions.textContent = 'ISSUE RX';
    }

    // 6. Patient Registration from Header & Hub: Staff/Admin & Doctor only (not patient)
    const btnRegPatientHeader = document.getElementById('btn-register-patient-header');
    const hubBtnRegPatient = document.getElementById('hub-btn-reg-patient');
    if (role === 'patient') {
        if (btnRegPatientHeader) btnRegPatientHeader.classList.add('hidden');
        if (hubBtnRegPatient) hubBtnRegPatient.classList.add('hidden');
    } else {
        if (btnRegPatientHeader) btnRegPatientHeader.classList.remove('hidden');
        if (hubBtnRegPatient) hubBtnRegPatient.classList.remove('hidden');
    }

    // 7. Patient Header Shortcuts
    const btnPayBillsHeader = document.getElementById('btn-pay-bills-header');
    const btnMyPrescriptionsHeader = document.getElementById('btn-my-prescriptions-header');
    if (role === 'patient') {
        if (btnPayBillsHeader) btnPayBillsHeader.classList.remove('hidden');
        if (btnMyPrescriptionsHeader) btnMyPrescriptionsHeader.classList.remove('hidden');
    } else {
        if (btnPayBillsHeader) btnPayBillsHeader.classList.add('hidden');
        if (btnMyPrescriptionsHeader) btnMyPrescriptionsHeader.classList.add('hidden');
    }

    // 8. Command Center Module Counter
    const moduleCounter = document.getElementById('role-modules-counter');
    if (moduleCounter) {
        if (role === 'patient') {
            moduleCounter.textContent = '6 Active Modules';
        } else if (role === 'doctor') {
            moduleCounter.textContent = '7 Active Modules';
        } else {
            moduleCounter.textContent = '8 Active Modules';
        }
    }

    // 9. Appointment Scope Configuration (Doctors see their own patients by default)
    const apptScopeContainer = document.getElementById('appt-scope-container');
    const scopeBtnMy = document.getElementById('scope-appt-MY');
    const scopeBtnAll = document.getElementById('scope-appt-ALL');
    const scopeMyLabel = document.getElementById('scope-appt-my-label');

    if (role === 'doctor') {
        activeApptScope = 'MY';
        dashboardDoctorScope = 'MY';
        if (apptScopeContainer) apptScopeContainer.classList.remove('hidden');
        if (scopeMyLabel) scopeMyLabel.textContent = 'My Patients Only';
        if (scopeBtnMy) scopeBtnMy.className = 'appt-scope-btn px-3 py-1.5 rounded-md font-bold text-xs bg-teal-700 text-white shadow-sm flex items-center gap-1.5 transition';
        if (scopeBtnAll) scopeBtnAll.className = 'appt-scope-btn px-3 py-1.5 rounded-md font-medium text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition';
    } else if (role === 'patient') {
        activeApptScope = 'MY';
        dashboardDoctorScope = 'MY';
        if (apptScopeContainer) apptScopeContainer.classList.add('hidden');
    } else {
        // Admin default: all appointments
        activeApptScope = 'ALL';
        dashboardDoctorScope = 'ALL';
        if (apptScopeContainer) apptScopeContainer.classList.remove('hidden');
        if (scopeMyLabel) scopeMyLabel.textContent = 'My Patients';
        if (scopeBtnMy) scopeBtnMy.className = 'appt-scope-btn px-3 py-1.5 rounded-md font-medium text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition';
        if (scopeBtnAll) scopeBtnAll.className = 'appt-scope-btn px-3 py-1.5 rounded-md font-bold text-xs bg-teal-700 text-white shadow-sm flex items-center gap-1.5 transition';
    }

    // Re-render UI grids & tables with active role permissions applied
    if (cachedDoctors && cachedDoctors.length > 0) renderDoctorsGrid();
    if (cachedAppointments && cachedAppointments.length > 0) renderAppointments(getFilteredAppointments());
    if (cachedPatients && cachedPatients.length > 0) renderPatients(cachedPatients);
    if (cachedMedications && cachedMedications.length > 0) renderMedicationsTable();
    if (cachedBilling && cachedBilling.length > 0) renderBilling(cachedBilling);
    loadMedicalHistory();
    loadPrescriptions();

    lucide.createIcons();
}

async function loadAuthUsers() {
    try {
        const res = await fetch('/api/auth/users');
        const json = await res.json();
        if (json.success) {
            cachedUsers = json.data;
            renderAuthCards();
        }
    } catch (err) {
        console.error('Error loading auth users:', err);
    }
}

function filterAuthCards(role) {
    activeAuthFilter = role;
    document.querySelectorAll('.auth-role-pill').forEach(btn => {
        btn.className = 'auth-role-pill px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200';
    });
    const activeBtn = document.getElementById(`auth-pill-${role}`);
    if (activeBtn) {
        activeBtn.className = 'auth-role-pill px-3 py-1 rounded-lg text-xs font-semibold bg-[#0B192C] text-white';
    }
    renderAuthCards();
}

function renderAuthCards() {
    const container = document.getElementById('auth-quick-cards');
    if (!container) return;

    let users = cachedUsers;
    if (activeAuthFilter !== 'all') {
        users = cachedUsers.filter(u => u.role.toLowerCase() === activeAuthFilter);
    }

    if (!users || users.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center py-6 text-slate-400 text-xs">No accounts found for this role.</div>`;
        return;
    }

    container.innerHTML = users.map(u => {
        const isActive = currentUser && Number(currentUser.user_id) === Number(u.user_id);
        const roleColor = u.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          u.role === 'doctor' ? 'bg-teal-100 text-teal-800 border-teal-200' :
                          'bg-blue-100 text-blue-800 border-blue-200';

        const roleDetail = u.role === 'doctor' && u.department_name ? `Dept: ${u.department_name}` :
                           u.role === 'patient' && u.patient_gender ? `${u.patient_gender}, ${u.patient_age} yrs` :
                           'Chief Administrator';

        return `
            <div class="p-3 rounded-xl border ${isActive ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20' : 'border-slate-200 bg-white hover:border-slate-300'} transition flex items-center justify-between gap-2.5">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-9 h-9 rounded-lg ${u.role === 'admin' ? 'bg-purple-700' : u.role === 'doctor' ? 'bg-[#148F77]' : 'bg-blue-600'} text-white font-bold text-xs flex items-center justify-center shrink-0">
                        ${getInitials(u.full_name)}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-bold text-slate-900 text-xs truncate max-w-[130px]">${u.full_name}</span>
                            <span class="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${roleColor}">${u.role}</span>
                        </div>
                        <div class="text-[10px] text-slate-500 truncate">${roleDetail} • <span class="font-mono text-slate-400">@${u.username}</span></div>
                    </div>
                </div>
                <div>
                    ${isActive ? `
                        <span class="text-[10px] font-bold text-teal-700 bg-teal-100 px-2.5 py-1 rounded-md shrink-0">Active</span>
                    ` : `
                        <button onclick="loginAs(${u.user_id})" class="text-[11px] font-semibold text-slate-700 hover:text-white hover:bg-[#148F77] border border-slate-200 px-2.5 py-1 rounded-md transition shrink-0">
                            Switch
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function loginAs(userId) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const json = await res.json();
        if (json.success) {
            currentUser = json.data || json.user;
            sessionStorage.setItem('medicare_active_user', JSON.stringify(currentUser));
            localStorage.setItem('medicare_user', JSON.stringify(currentUser));
            closeModal('modal-auth-login');
            renderCurrentUser();
            showToast(`Switched active profile: ${currentUser.full_name} (${currentUser.role.toUpperCase()})`);
            renderAuthCards();
            applyRolePermissions();
        } else {
            showToast(json.error || 'Failed to switch role', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleLoginForm(e) {
    e.preventDefault();
    const username = document.getElementById('auth-input-username').value.trim();
    const password = document.getElementById('auth-input-password').value.trim();

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const json = await res.json();
        if (json.success) {
            currentUser = json.data || json.user;
            sessionStorage.setItem('medicare_active_user', JSON.stringify(currentUser));
            localStorage.setItem('medicare_user', JSON.stringify(currentUser));
            closeModal('modal-auth-login');
            renderCurrentUser();
            showToast(`Welcome back, ${currentUser.full_name}! (${currentUser.role.toUpperCase()})`);
            renderAuthCards();
            applyRolePermissions();
            e.target.reset();
        } else {
            showToast(json.error || 'Invalid credentials', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function logoutUser() {
    showLoginGatekeeper();
}

function renderCurrentUser() {
    if (!currentUser) return;

    // Header user pill
    const avatarEl = document.getElementById('header-user-avatar');
    const nameEl = document.getElementById('header-user-name');
    const roleEl = document.getElementById('header-user-role');

    if (avatarEl) avatarEl.textContent = getInitials(currentUser.full_name);
    if (nameEl) nameEl.textContent = currentUser.full_name;
    if (roleEl) {
        roleEl.textContent = (currentUser.role || 'ADMIN').toUpperCase();
        if (currentUser.role === 'admin') roleEl.className = 'text-[9px] text-purple-700 font-extrabold uppercase tracking-wider';
        else if (currentUser.role === 'doctor') roleEl.className = 'text-[9px] text-teal-700 font-extrabold uppercase tracking-wider';
        else roleEl.className = 'text-[9px] text-blue-700 font-extrabold uppercase tracking-wider';
    }

    // Overview banner
    const bannerBadge = document.getElementById('role-avatar-badge');
    const bannerLabel = document.getElementById('role-badge-label');
    const bannerType = document.getElementById('role-account-type');
    const bannerHeading = document.getElementById('role-user-heading');
    const bannerDesc = document.getElementById('role-user-desc');

    if (bannerBadge) bannerBadge.textContent = getInitials(currentUser.full_name);
    if (bannerHeading) bannerHeading.textContent = `Welcome, ${currentUser.full_name}`;

    if (bannerLabel) {
        bannerLabel.textContent = `ACTIVE ROLE: ${(currentUser.role || 'ADMIN').toUpperCase()}`;
        if (currentUser.role === 'admin') bannerLabel.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-400 text-slate-900';
        else if (currentUser.role === 'doctor') bannerLabel.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-400 text-slate-900';
        else bannerLabel.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-300 text-slate-900';
    }

    if (bannerType) {
        if (currentUser.role === 'doctor') bannerType.textContent = '• Consulting Specialist Physician';
        else if (currentUser.role === 'patient') bannerType.textContent = '• Registered Outpatient Profile';
        else bannerType.textContent = '• Chief Hospital Administrator';
    }

    if (bannerDesc) {
        if (currentUser.role === 'doctor') {
            bannerDesc.textContent = `Doctor view enabled: OPD consultations, write prescriptions, and schedule management for Dr. ${currentUser.full_name}.`;
        } else if (currentUser.role === 'patient') {
            bannerDesc.textContent = `Patient portal view: Book appointments, view your clinical history, and check your pharmacy & consultation bills.`;
        } else {
            bannerDesc.textContent = 'Full administrative control over OPD reception, doctors, pharmacy inventory, and billing accounts.';
        }
    }

    lucide.createIcons();
}

function applyRoleFilters() {
    if (cachedAppointments && cachedAppointments.length > 0) {
        renderAppointments(cachedAppointments);
    }
}

// Switch Sidebar Tab
function switchTab(tabId) {
    if (currentUser) {
        const role = (currentUser.role || 'admin').toLowerCase();
        if (role === 'patient' && tabId === 'patients') {
            showToast('Patient Directory is restricted to Hospital Staff & Doctors', 'warning');
            switchTab('dashboard');
            return;
        }
        if ((role === 'patient' || role === 'doctor') && tabId === 'pharmacy') {
            showToast('Pharmacy Inventory is restricted to Hospital Administration', 'warning');
            switchTab('dashboard');
            return;
        }
    }

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabId}`);
    const targetNav = document.getElementById(`nav-${tabId}`);

    if (targetTab) targetTab.classList.remove('hidden');
    if (targetNav) targetNav.classList.add('active');

    // Update top horizontal module navigation bar buttons
    document.querySelectorAll('.topbar-nav-btn').forEach(btn => {
        btn.className = 'topbar-nav-btn px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 hover:bg-white/10 text-slate-300 hover:text-white';
    });
    const activeTopbarBtn = document.getElementById(`topbar-nav-${tabId}`);
    if (activeTopbarBtn) {
        activeTopbarBtn.className = 'topbar-nav-btn px-3 py-1.5 rounded-lg font-semibold bg-white/20 text-white shadow-sm whitespace-nowrap transition flex items-center gap-1.5';
    }

    const headerMeta = PAGE_HEADERS[tabId];
    if (headerMeta) {
        document.getElementById('page-title').textContent = headerMeta.title;
        document.getElementById('page-subtitle').textContent = headerMeta.subtitle;
    }

    lucide.createIcons();

    if (tabId === 'dashboard') loadDashboardData();
    if (tabId === 'patients') loadPatients();
    if (tabId === 'doctors') { loadDepartments(); loadDoctors(); }
    if (tabId === 'appointments') loadAppointments();
    if (tabId === 'history') loadMedicalHistory();
    if (tabId === 'pharmacy') loadMedications();
    if (tabId === 'prescriptions') loadPrescriptions();
    if (tabId === 'billing') loadBilling();
}

// =====================================================================
// 1. OVERVIEW DASHBOARD
// =====================================================================
function updateDbBadge(engine) {
    const badge = document.getElementById('db-badge');
    if (!badge) return;
    if (engine === 'mysql') {
        badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-50 text-emerald-800 border-emerald-300';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>MySQL (hospital_management_db)</span>';
        badge.title = 'Active: Connected directly to MySQL Server on localhost:3306';
    } else {
        badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-amber-50 text-amber-800 border-amber-300';
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>SQLite (hospital.db)</span>';
        badge.title = 'Running on SQLite fallback. To connect to MySQL Workbench, add your MySQL password in .env and restart!';
    }
}

async function loadDashboardData() {
    try {
        const res = await fetch('/api/stats');
        const json = await res.json();
        if (json.success) {
            updateDbBadge(json.engine);
            const d = json.data;
            document.getElementById('stat-patients').textContent = d.patientsCount;
            document.getElementById('stat-doctors').textContent = d.doctorsCount;
            document.getElementById('stat-appointments').textContent = d.appointmentsCount;
            document.getElementById('stat-pending-appt').textContent = `${d.pendingAppointments} Scheduled`;
            document.getElementById('stat-revenue').textContent = `₹${Number(d.totalRevenue).toLocaleString('en-IN')}`;
            document.getElementById('stat-pending-bills').textContent = `₹${Number(d.pendingBilling).toLocaleString('en-IN')} Due`;
        }

        const apptRes = await fetch('/api/appointments');
        const apptJson = await apptRes.json();
        if (apptJson.success) {
            const allAppts = apptJson.data || [];
            let displayList = allAppts;
            const titleEl = document.getElementById('dashboard-queue-title');
            const subTitleEl = document.getElementById('dashboard-queue-subtitle');
            const toggleBtn = document.getElementById('dashboard-queue-toggle');
            const toggleText = document.getElementById('dashboard-queue-toggle-text');

            if (currentUser && currentUser.role === 'doctor' && currentUser.doctor_id) {
                const docId = Number(currentUser.doctor_id);
                const myAppts = allAppts.filter(a => Number(a.doctor_id) === docId);
                const scheduledCount = myAppts.filter(a => a.status === 'Scheduled').length;

                // Adjust dashboard stat card specifically for this Doctor
                const apptStatEl = document.getElementById('stat-appointments');
                const pendingStatEl = document.getElementById('stat-pending-appt');
                if (apptStatEl) apptStatEl.textContent = myAppts.length;
                if (pendingStatEl) pendingStatEl.textContent = `${scheduledCount} Scheduled for You`;

                if (toggleBtn) toggleBtn.classList.remove('hidden');

                if (dashboardDoctorScope === 'MY') {
                    displayList = myAppts;
                    if (titleEl) titleEl.textContent = `🩺 Your OPD Consultation Queue (${currentUser.full_name})`;
                    if (subTitleEl) subTitleEl.textContent = `Showing only patients scheduled with you (${myAppts.length} total, ${scheduledCount} upcoming)`;
                    if (toggleText) toggleText.textContent = `View All Hospital (${allAppts.length})`;
                } else {
                    displayList = allAppts;
                    if (titleEl) titleEl.textContent = `🏥 All Hospital OPD Consultations`;
                    if (subTitleEl) subTitleEl.textContent = `Hospital-wide queue across all department specialists`;
                    if (toggleText) toggleText.textContent = `Show My Patients Only (${myAppts.length})`;
                }
            } else if (currentUser && currentUser.role === 'patient' && currentUser.patient_id) {
                const patId = Number(currentUser.patient_id);
                const myAppts = allAppts.filter(a => Number(a.patient_id) === patId);
                displayList = myAppts;

                const apptStatEl = document.getElementById('stat-appointments');
                const pendingStatEl = document.getElementById('stat-pending-appt');
                if (apptStatEl) apptStatEl.textContent = myAppts.length;
                if (pendingStatEl) pendingStatEl.textContent = `${myAppts.filter(a => a.status === 'Scheduled').length} Upcoming Visits`;

                if (titleEl) titleEl.textContent = `Your Scheduled Consultations`;
                if (subTitleEl) subTitleEl.textContent = `Your outpatient bookings and past medical visits`;
                if (toggleBtn) toggleBtn.classList.add('hidden');
            } else {
                // Admin
                if (titleEl) titleEl.textContent = `Outpatient (OPD) Consultation Queue`;
                if (subTitleEl) subTitleEl.textContent = `Upcoming and recently completed patient visits`;
                if (toggleBtn) toggleBtn.classList.add('hidden');
            }

            const list = displayList.slice(0, 6);
            const tbody = document.getElementById('dashboard-recent-appointments');
            if (!tbody) return;

            if (list.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">
                    <p class="font-medium text-slate-500">No appointments found in this view.</p>
                    ${(currentUser && currentUser.role === 'doctor' && dashboardDoctorScope === 'MY') ? `
                        <button onclick="toggleDashboardDoctorScope()" class="text-xs text-teal-700 font-bold hover:underline mt-1">
                            Click here to see all hospital bookings &rarr;
                        </button>
                    ` : ''}
                </td></tr>`;
            } else {
                tbody.innerHTML = list.map(a => `
                    <tr class="hover:bg-slate-50/80 transition">
                        <td class="py-3 px-4">
                            <div class="flex items-center gap-2.5">
                                <div class="w-7 h-7 rounded-full bg-teal-50 text-teal-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-teal-200/60">
                                    ${getInitials(a.patient_name)}
                                </div>
                                <div>
                                    <div class="font-semibold text-slate-800">${a.patient_name}</div>
                                    <div class="text-[11px] text-slate-400 tabular-nums">${a.patient_phone}</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-3 px-4">
                            <div class="font-medium text-slate-800">${a.doctor_name}</div>
                            <div class="text-[11px] text-slate-500">${a.department_name}</div>
                        </td>
                        <td class="py-3 px-4 tabular-nums">
                            <div class="font-medium text-slate-800">${a.appointment_date}</div>
                            <div class="text-[11px] text-slate-400">${a.start_time} – ${a.end_time}</div>
                        </td>
                        <td class="py-3 px-4">
                            <span class="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">${a.consultation_type}</span>
                        </td>
                        <td class="py-3 px-4">
                            <span class="badge-status badge-${a.status}">${a.status}</span>
                        </td>
                        <td class="py-3 px-4 text-right">
                            <button onclick="viewPatient360(${a.patient_id})" class="text-teal-700 hover:text-teal-900 font-semibold text-xs">
                                Open File
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

// =====================================================================
// 2. PATIENTS DIRECTORY
// =====================================================================
async function loadPatients() {
    try {
        const res = await fetch('/api/patients');
        const json = await res.json();
        if (json.success) {
            cachedPatients = json.data;
            renderPatients(cachedPatients);
        }
    } catch (err) {
        console.error('Error loading patients:', err);
    }
}

function renderPatients(patients) {
    const tbody = document.getElementById('patients-table-body');
    if (patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">No matching patient records found.</td></tr>';
        return;
    }

    tbody.innerHTML = patients.map(p => {
        const birthYear = new Date(p.date_of_birth).getFullYear();
        const age = isNaN(birthYear) ? 'N/A' : (new Date().getFullYear() - birthYear);

        return `
            <tr class="hover:bg-slate-50/80 transition">
                <td class="py-3.5 px-4 font-mono text-xs font-semibold text-slate-500">UHID-${1000 + p.patient_id}</td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            ${getInitials(p.name)}
                        </div>
                        <div>
                            <div class="font-bold text-slate-900 text-xs">${p.name}</div>
                            <div class="text-[11px] text-slate-400">DOB: ${p.date_of_birth}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-4">
                    <span class="font-semibold text-slate-700">${age} yrs</span>
                    <span class="mx-1 text-slate-300">•</span>
                    <span class="text-slate-600">${p.gender}</span>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-mono text-xs text-slate-700">${p.phone}</div>
                    <div class="text-[11px] text-slate-400">${p.email}</div>
                </td>
                <td class="py-3.5 px-4 text-slate-600 max-w-xs truncate" title="${p.address}">${p.address}</td>
                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <button onclick="viewPatient360(${p.patient_id})" class="bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/80 font-semibold px-3 py-1.5 rounded-lg text-xs mr-1.5 transition">
                        Patient Chart
                    </button>
                    ${(currentUser && currentUser.role === 'admin') ? `
                    <button onclick="deletePatient(${p.patient_id})" class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition" title="Remove Patient">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

function filterPatients() {
    const q = document.getElementById('patient-search-input').value.toLowerCase().trim();
    if (!q) {
        renderPatients(cachedPatients);
        return;
    }
    const filtered = cachedPatients.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
    renderPatients(filtered);
}

async function handleCreatePatient(e) {
    e.preventDefault();
    const rawPhone = document.getElementById('new-patient-phone').value.trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
        return showToast('Contact phone must be exactly 10 digits.', 'error');
    }

    const data = {
        name: document.getElementById('new-patient-name').value.trim(),
        email: document.getElementById('new-patient-email').value.trim(),
        phone: cleanPhone,
        date_of_birth: document.getElementById('new-patient-dob').value,
        gender: document.getElementById('new-patient-gender').value,
        address: document.getElementById('new-patient-address').value.trim()
    };

    try {
        const res = await apiFetch('/api/patients', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Patient registered successfully');
            closeModal('modal-add-patient');
            e.target.reset();
            loadPatients();
            loadDashboardData();
        } else {
            showToast(json.error || 'Could not register patient', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deletePatient(id) {
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can remove patients from the registry.', 'error');
    }
    if (!confirm('Remove this patient and associated records from the registry? All linked appointments, bills, and medical history will be deleted from MySQL.')) return;
    try {
        const res = await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Patient and all associated records deleted from MySQL');
            loadPatients();
            loadAppointments();
            loadMedicalHistory();
            loadBilling();
            loadPrescriptions();
            loadDashboardData();
        } else {
            showToast(json.error, 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function viewPatient360(id) {
    try {
        const res = await fetch(`/api/patients/${id}`);
        const json = await res.json();
        if (!json.success) return showToast('Could not load patient file', 'error');

        const p = json.data;
        const container = document.getElementById('patient-details-content');

        container.innerHTML = `
            <!-- Patient Header Banner -->
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-start">
                <div class="flex items-center gap-3.5">
                    <div class="w-11 h-11 rounded-full bg-[#0B192C] text-white font-bold text-sm flex items-center justify-center">
                        ${getInitials(p.name)}
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="text-base font-bold text-slate-900">${p.name}</h4>
                            <span class="text-[11px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">UHID-${1000 + p.patient_id}</span>
                        </div>
                        <p class="text-slate-500 text-xs mt-0.5">${p.gender} • DOB: ${p.date_of_birth} • ${p.phone}</p>
                        <p class="text-slate-500 text-[11px] mt-0.5">${p.address}</p>
                    </div>
                </div>
            </div>

            <!-- Medical History Section -->
            <div>
                <h5 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">Clinical Diagnoses & History (${p.medicalHistory.length})</h5>
                ${p.medicalHistory.length === 0 ? '<div class="p-4 text-slate-400 bg-slate-50 rounded-lg border border-slate-200/70 text-center">No prior clinical diagnoses recorded.</div>' : `
                    <div class="space-y-2.5">
                        ${p.medicalHistory.map(m => `
                            <div class="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                                <div class="flex justify-between items-center text-[11px] text-slate-400">
                                    <span class="font-semibold text-teal-700">${m.diagnosis}</span>
                                    <span class="font-mono">${m.record_date} • ${m.doctor_name}</span>
                                </div>
                                <div class="text-slate-700"><strong>Symptoms / Condition:</strong> ${m.conditions}</div>
                                <div class="text-slate-700"><strong>Treatment Plan:</strong> ${m.treatment}</div>
                                ${m.notes ? `<div class="text-slate-500 text-[11px] pt-1">Note: ${m.notes}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Appointments Section -->
            <div>
                <h5 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">Consultation Visits (${p.appointments.length})</h5>
                ${p.appointments.length === 0 ? '<div class="p-4 text-slate-400 bg-slate-50 rounded-lg border border-slate-200/70 text-center">No appointments on record.</div>' : `
                    <div class="space-y-2">
                        ${p.appointments.map(a => `
                            <div class="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                                <div>
                                    <span class="font-bold text-slate-800">${a.doctor_name}</span>
                                    <span class="text-slate-500">(${a.department_name})</span>
                                    <div class="text-slate-400 text-[11px] mt-0.5 tabular-nums">${a.appointment_date} • ${a.start_time} – ${a.end_time} • ${a.consultation_type}</div>
                                </div>
                                <span class="badge-status badge-${a.status}">${a.status}</span>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Billing Section -->
            <div>
                <h5 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">Billing & Invoices (${p.bills.length})</h5>
                ${p.bills.length === 0 ? '<div class="p-4 text-slate-400 bg-slate-50 rounded-lg border border-slate-200/70 text-center">No invoices generated.</div>' : `
                    <div class="space-y-2">
                        ${p.bills.map(b => `
                            <div class="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                                <div class="tabular-nums">
                                    <span class="font-mono font-bold text-slate-700">INV-${b.bill_id}</span>
                                    <span class="text-slate-400 mx-1.5">•</span>
                                    <span class="text-slate-500">${b.bill_date} (${b.payment_mode})</span>
                                </div>
                                <div class="flex items-center gap-2.5">
                                    <span class="font-bold text-slate-900 font-mono">₹${formatCurrency(b.total_amount)}</span>
                                    <span class="badge-status badge-${b.payment_status}">${b.payment_status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        openModal('modal-patient-details');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// =====================================================================
// 3. DOCTORS, DEPARTMENTS & SCHEDULES
// =====================================================================
async function loadDepartments() {
    try {
        const res = await fetch('/api/departments');
        const json = await res.json();
        if (json.success) {
            cachedDepartments = json.data;

            // Render bottom reference strip
            const container = document.getElementById('departments-grid');
            if (container) {
                container.innerHTML = cachedDepartments.map(d => `
                    <div class="p-3.5 hover:bg-slate-50 transition">
                        <div class="font-bold text-slate-800 text-xs">${d.department_name}</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">${d.location}</div>
                        <div class="text-[10px] text-teal-700 font-semibold mt-1">${d.floor} • ${d.doctor_count} Dr(s)</div>
                    </div>
                `).join('');
            }

            // Render filter pills
            const pills = document.getElementById('department-filter-pills');
            if (pills) {
                pills.innerHTML = `
                    <button onclick="filterDoctorsByDept('ALL')" class="dept-pill px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeDeptFilter === 'ALL' ? 'bg-[#0B192C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                        All Departments
                    </button>
                    ${cachedDepartments.map(d => `
                        <button onclick="filterDoctorsByDept('${d.department_name}')" class="dept-pill px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeDeptFilter === d.department_name ? 'bg-[#0B192C] text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                            ${d.department_name}
                        </button>
                    `).join('')}
                `;
            }
        }
    } catch (err) {
        console.error('Error loading departments:', err);
    }
}

function filterDoctorsByDept(deptName) {
    activeDeptFilter = deptName;
    loadDepartments();
    renderDoctorsGrid();
}

async function loadDoctors() {
    try {
        const [docRes, schedRes] = await Promise.all([
            fetch('/api/doctors'),
            fetch('/api/schedules')
        ]);
        const docJson = await docRes.json();
        const schedJson = await schedRes.json();

        if (docJson.success) cachedDoctors = docJson.data;
        if (schedJson.success) cachedSchedules = schedJson.data;

        renderDoctorsGrid();
        renderDashboardDoctorRoster();
    } catch (err) {
        console.error('Error loading doctors:', err);
    }
}

function renderDashboardDoctorRoster() {
    const rosterEl = document.getElementById('dashboard-doctor-roster');
    if (!rosterEl) return;

    rosterEl.innerHTML = cachedDoctors.map(doc => {
        const docSchedules = cachedSchedules.filter(s => s.doctor_id === doc.doctor_id);
        const days = docSchedules.map(s => s.day_of_week.substring(0, 3)).join(', ');
        return `
            <div class="pt-3 first:pt-0 flex items-start justify-between gap-3">
                <div class="flex items-start gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80">
                        ${getInitials(doc.name)}
                    </div>
                    <div>
                        <div class="font-bold text-slate-800 text-xs">${doc.name}</div>
                        <div class="text-[11px] text-teal-700 font-medium">${doc.department_name} • ${doc.floor}</div>
                        <div class="text-[11px] text-slate-400 mt-0.5">OPD Days: ${days || 'By Appointment'}</div>
                    </div>
                </div>
                <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">${doc.experience_years}y exp</span>
            </div>
        `;
    }).join('');
}

function renderDoctorsGrid() {
    const container = document.getElementById('doctors-grid');
    if (!container) return;

    const list = activeDeptFilter === 'ALL'
        ? cachedDoctors
        : cachedDoctors.filter(d => d.department_name === activeDeptFilter);

    container.innerHTML = list.map(doc => {
        const docSchedules = cachedSchedules.filter(s => s.doctor_id === doc.doctor_id);

        return `
            <div class="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between space-y-4">
                <div>
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-xl bg-[#0B192C] text-white font-bold text-sm flex items-center justify-center shrink-0">
                                ${getInitials(doc.name)}
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-900 text-sm">${doc.name}</h4>
                                <p class="text-teal-700 font-semibold text-xs">${doc.specialization}</p>
                            </div>
                        </div>
                        <span class="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md text-[11px] font-semibold shrink-0">
                            ${doc.experience_years} yrs
                        </span>
                    </div>

                    <div class="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                        <div class="flex justify-between">
                            <span class="text-slate-400">Department</span>
                            <span class="font-semibold text-slate-800">${doc.department_name}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">Location</span>
                            <span class="text-slate-700">${doc.location} (${doc.floor})</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">Direct Contact</span>
                            <span class="font-mono text-[11px] text-slate-700">${doc.phone}</span>
                        </div>
                    </div>
                </div>

                <!-- Weekly OPD Schedule -->
                <div class="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Weekly OPD Timings</div>
                    ${docSchedules.length === 0 ? '<p class="text-[11px] text-slate-400">On-call schedule</p>' : `
                        <div class="space-y-1">
                            ${docSchedules.map(s => `
                                <div class="flex justify-between text-[11px]">
                                    <span class="font-semibold text-slate-700">${s.day_of_week}</span>
                                    <span class="font-mono text-slate-600">${s.start_time} – ${s.end_time} <span class="text-slate-400 text-[10px]">(Break ${s.break_start})</span></span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Actions: Edit & Remove (Restricted to Admin Only) -->
                ${(currentUser && currentUser.role === 'admin') ? `
                <div class="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button onclick="openEditDoctorModal(${doc.doctor_id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 transition">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Edit Profile
                    </button>
                    <button onclick="deleteDoctor(${doc.doctor_id})" class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 transition">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove
                    </button>
                </div>
                ` : `
                <div class="pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                    <span class="inline-flex items-center gap-1 text-teal-700 font-semibold"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Verified Specialist</span>
                    <span class="text-slate-400">OPD Roster</span>
                </div>
                `}
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

async function handleCreateDoctor(e) {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can add doctors to hospital roster.', 'error');
    }
    const rawPhone = document.getElementById('new-doc-phone').value.trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
        return showToast('Phone number must be exactly 10 digits.', 'error');
    }
    const data = {
        name: document.getElementById('new-doc-name').value.trim(),
        email: document.getElementById('new-doc-email').value.trim(),
        phone: cleanPhone,
        department_id: document.getElementById('new-doc-dept').value,
        experience_years: document.getElementById('new-doc-exp').value,
        specialization: document.getElementById('new-doc-spec').value.trim()
    };

    try {
        const res = await apiFetch('/api/doctors', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Specialist added to hospital roster');
            closeModal('modal-add-doctor');
            e.target.reset();
            loadDoctors();
            loadDepartments();
            loadDashboardData();
        } else {
            showToast(json.error, 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function openEditDoctorModal(doctorId) {
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can edit doctor details.', 'error');
    }
    const doc = cachedDoctors.find(d => d.doctor_id === doctorId);
    if (!doc) return;

    // Populate department select options
    const deptOptions = cachedDepartments.length > 0 
        ? cachedDepartments.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join('')
        : '<option value="1">Cardiology</option>';
    const deptSelect = document.getElementById('edit-doc-dept');
    if (deptSelect) deptSelect.innerHTML = deptOptions;

    // Set input values
    document.getElementById('edit-doc-id').value = doc.doctor_id;
    document.getElementById('edit-doc-name').value = doc.name;
    document.getElementById('edit-doc-email').value = doc.email;
    document.getElementById('edit-doc-phone').value = doc.phone;
    document.getElementById('edit-doc-dept').value = doc.department_id;
    document.getElementById('edit-doc-exp').value = doc.experience_years;
    document.getElementById('edit-doc-spec').value = doc.specialization;

    openModal('modal-edit-doctor');
}

async function handleUpdateDoctor(e) {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can update doctor profiles.', 'error');
    }
    const id = document.getElementById('edit-doc-id').value;
    const rawPhone = document.getElementById('edit-doc-phone').value.trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
        return showToast('Phone number must be exactly 10 digits.', 'error');
    }
    const data = {
        name: document.getElementById('edit-doc-name').value.trim(),
        email: document.getElementById('edit-doc-email').value.trim(),
        phone: cleanPhone,
        department_id: document.getElementById('edit-doc-dept').value,
        experience_years: document.getElementById('edit-doc-exp').value,
        specialization: document.getElementById('edit-doc-spec').value.trim()
    };

    try {
        const res = await apiFetch(`/api/doctors/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Doctor details updated successfully in MySQL!');
            closeModal('modal-edit-doctor');
            loadDoctors();
            loadDepartments();
            loadDashboardData();
        } else {
            showToast(json.error || 'Failed to update doctor', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteDoctor(id) {
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can remove doctors.', 'error');
    }
    const doc = cachedDoctors.find(d => d.doctor_id === id);
    const docName = doc ? doc.name : 'this doctor';
    if (!confirm(`Are you sure you want to remove ${docName}? All associated schedules, appointments, and clinical records will also be removed from MySQL.`)) return;

    try {
        const res = await apiFetch(`/api/doctors/${id}`, {
            method: 'DELETE'
        });
        const json = await res.json();
        if (json.success) {
            showToast('Doctor and all linked records removed from MySQL');
            loadDoctors();
            loadDepartments();
            loadAppointments();
            loadMedicalHistory();
            loadPrescriptions();
            loadDashboardData();
        } else {
            showToast(json.error || 'Failed to remove doctor', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// =====================================================================
// 4. APPOINTMENTS
// =====================================================================
// Appointment Role-Based Scoping & Filter State
let activeApptStatusFilter = 'ALL';
let activeApptScope = 'MY';
let dashboardDoctorScope = 'MY';

function getFilteredAppointments() {
    let appts = [...cachedAppointments];
    
    // 1. Role Scope Filter
    if (currentUser) {
        const role = (currentUser.role || '').toLowerCase();
        if (role === 'doctor') {
            if (activeApptScope === 'MY' && currentUser.doctor_id) {
                appts = appts.filter(a => Number(a.doctor_id) === Number(currentUser.doctor_id));
            }
        } else if (role === 'patient') {
            // Patients always see only their own appointments for medical privacy
            if (currentUser.patient_id) {
                appts = appts.filter(a => Number(a.patient_id) === Number(currentUser.patient_id));
            }
        } else if (role === 'admin') {
            if (activeApptScope === 'MY' && currentUser.doctor_id) {
                appts = appts.filter(a => Number(a.doctor_id) === Number(currentUser.doctor_id));
            }
        }
    }

    // 2. Status Filter
    if (activeApptStatusFilter !== 'ALL') {
        appts = appts.filter(a => a.status === activeApptStatusFilter);
    }

    return appts;
}

function setAppointmentScope(scope) {
    activeApptScope = scope;
    const btnMy = document.getElementById('scope-appt-MY');
    const btnAll = document.getElementById('scope-appt-ALL');

    if (btnMy && btnAll) {
        if (scope === 'MY') {
            btnMy.className = 'appt-scope-btn px-3 py-1.5 rounded-md font-bold text-xs bg-teal-700 text-white shadow-sm flex items-center gap-1.5 transition';
            btnAll.className = 'appt-scope-btn px-3 py-1.5 rounded-md font-medium text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition';
        } else {
            btnMy.className = 'appt-scope-btn px-3 py-1.5 rounded-md font-medium text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition';
            btnAll.className = 'appt-scope-btn px-3 py-1.5 rounded-md font-bold text-xs bg-teal-700 text-white shadow-sm flex items-center gap-1.5 transition';
        }
    }

    renderAppointments(getFilteredAppointments());
    lucide.createIcons();
}

function setAppointmentFilter(status) {
    activeApptStatusFilter = status;
    document.querySelectorAll('.appt-filter-btn').forEach(btn => {
        btn.className = 'appt-filter-btn px-3 py-1.5 rounded-md font-medium text-slate-600 hover:text-slate-900';
    });
    const activeBtn = document.getElementById(`filter-appt-${status}`);
    if (activeBtn) {
        activeBtn.className = 'appt-filter-btn active px-3 py-1.5 rounded-md font-semibold bg-white text-slate-900 shadow-sm';
    }

    renderAppointments(getFilteredAppointments());
}

function toggleDashboardDoctorScope() {
    dashboardDoctorScope = (dashboardDoctorScope === 'MY') ? 'ALL' : 'MY';
    loadDashboardData();
}

async function loadAppointments() {
    try {
        const res = await fetch('/api/appointments');
        const json = await res.json();
        if (json.success) {
            cachedAppointments = json.data;
            renderAppointments(getFilteredAppointments());
        }
    } catch (err) {
        console.error('Error loading appointments:', err);
    }
}

function renderAppointments(appts) {
    const tbody = document.getElementById('appointments-table-body');
    if (!tbody) return;

    if (!appts || appts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="p-8 text-center text-slate-400">
                    <div class="max-w-xs mx-auto space-y-2">
                        <i data-lucide="calendar-x-2" class="w-8 h-8 mx-auto text-slate-300"></i>
                        <p class="font-medium text-slate-600 text-xs">No appointments found for this filter or scope.</p>
                        ${currentUser && currentUser.role === 'doctor' && activeApptScope === 'MY' ? `
                            <button onclick="setAppointmentScope('ALL')" class="text-xs text-teal-700 font-bold hover:underline">
                                View all hospital appointments &rarr;
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>`;
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = appts.map(a => {
        const isDocMatch = currentUser && currentUser.role === 'doctor' && Number(currentUser.doctor_id) === Number(a.doctor_id);
        const isPatMatch = currentUser && currentUser.role === 'patient' && Number(currentUser.patient_id) === Number(a.patient_id);
        const rowHighlight = isDocMatch ? 'bg-teal-50/60 border-l-4 border-l-[#148F77]' : 
                             isPatMatch ? 'bg-blue-50/60 border-l-4 border-l-blue-600' : 
                             'hover:bg-slate-50/80';

        return `
        <tr class="${rowHighlight} transition">
            <td class="py-3.5 px-4 font-mono font-semibold text-slate-500">APT-${100 + a.appointment_id}</td>
            <td class="py-3.5 px-4">
                <div class="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>${a.patient_name}</span>
                    ${isPatMatch ? '<span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">You</span>' : ''}
                </div>
                <div class="text-[11px] text-slate-400 font-mono">${a.patient_phone}</div>
            </td>
            <td class="py-3.5 px-4">
                <div class="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>${a.doctor_name}</span>
                    ${isDocMatch ? '<span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">Your Patient</span>' : ''}
                </div>
                <div class="text-[11px] text-teal-700">${a.department_name}</div>
            </td>
            <td class="py-3.5 px-4 font-mono text-slate-700">${a.appointment_date}</td>
            <td class="py-3.5 px-4 font-mono text-xs text-slate-600">${a.start_time} – ${a.end_time}</td>
            <td class="py-3.5 px-4">
                <span class="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">${a.consultation_type}</span>
            </td>
            <td class="py-3.5 px-4"><span class="badge-status badge-${a.status}">${a.status}</span></td>
            <td class="py-3.5 px-4 tabular-nums">
                ${a.total_amount ? `
                    <span class="font-bold text-slate-800 font-mono">₹${a.total_amount}</span>
                    <span class="text-[10px] ml-1 text-slate-400">(${a.payment_status})</span>
                ` : '<span class="text-slate-400">—</span>'}
            </td>
            <td class="py-3.5 px-4 text-right whitespace-nowrap">
                ${a.status === 'Scheduled' ? `
                    ${(currentUser && currentUser.role !== 'patient') ? `
                    <button onclick="updateAppointmentStatus(${a.appointment_id}, 'Completed')" class="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-md text-[11px] font-semibold mr-1 transition">
                        Mark Done
                    </button>
                    ` : ''}
                    <button onclick="updateAppointmentStatus(${a.appointment_id}, 'Cancelled')" class="text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md text-[11px] font-medium transition mr-1">
                        Cancel
                    </button>
                ` : `<span class="text-slate-400 text-[11px] mr-1.5">Closed</span>`}
                ${(currentUser && currentUser.role === 'admin') ? `
                <button onclick="deleteAppointment(${a.appointment_id})" class="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-md text-[11px] font-semibold transition" title="Delete appointment and linked billing">
                    Delete
                </button>
                ` : ''}
            </td>
        </tr>
    `;
    }).join('');
    lucide.createIcons();
}

async function handleBookAppointment(e) {
    e.preventDefault();
    const patient_id = (currentUser && currentUser.role === 'patient' && currentUser.patient_id) 
        ? currentUser.patient_id 
        : document.getElementById('appt-patient-select').value;

    const data = {
        patient_id: patient_id,
        doctor_id: document.getElementById('appt-doctor-select').value,
        appointment_date: document.getElementById('appt-date').value,
        start_time: document.getElementById('appt-start').value,
        end_time: document.getElementById('appt-end').value,
        consultation_type: document.getElementById('appt-type').value,
        fee: parseFloat(document.getElementById('appt-fee').value) || 800
    };

    try {
        const res = await apiFetch('/api/appointments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Appointment scheduled and invoice created');
            closeModal('modal-book-appointment');
            e.target.reset();
            loadAppointments();
            loadBilling();
            loadDashboardData();
        } else {
            showToast(json.error || 'Could not schedule appointment', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function updateAppointmentStatus(id, status) {
    try {
        const res = await apiFetch(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Appointment status updated to ${status}`);
            loadAppointments();
            loadDashboardData();
        } else {
            showToast(json.error, 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteAppointment(id) {
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can delete appointments from MySQL.', 'error');
    }
    if (!confirm(`Permanently delete Appointment APT-${100 + id} and its linked billing invoice from MySQL?`)) return;
    try {
        const res = await apiFetch(`/api/appointments/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Appointment and linked invoice deleted from MySQL');
            loadAppointments();
            loadBilling();
            loadPrescriptions();
            loadDashboardData();
        } else {
            showToast(json.error || 'Failed to delete appointment', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// =====================================================================
// 5. MEDICAL HISTORY (CASE SHEETS)
// =====================================================================
async function loadMedicalHistory() {
    try {
        const res = await fetch('/api/medical-history');
        const json = await res.json();
        if (json.success) {
            const container = document.getElementById('medical-history-cards');
            let records = json.data || [];
            if (currentUser && currentUser.role === 'patient' && currentUser.patient_id) {
                const myPatId = Number(currentUser.patient_id);
                records = records.filter(m => Number(m.patient_id) === myPatId);
            }

            if (records.length === 0) {
                const emptyMsg = (currentUser && currentUser.role === 'patient')
                    ? 'No clinical case history recorded for your profile yet.'
                    : 'No clinical case records documented yet.';
                container.innerHTML = `<div class="p-8 text-slate-400 text-center col-span-2">${emptyMsg}</div>`;
                return;
            }

            container.innerHTML = records.map(m => `
                <div class="bg-white p-5 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3">
                    <div>
                        <div class="flex justify-between items-start border-b border-slate-100 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-8 h-8 rounded-full bg-teal-50 text-teal-800 font-bold text-xs flex items-center justify-center border border-teal-200">
                                    ${getInitials(m.patient_name)}
                                </div>
                                <div>
                                    <h4 class="font-bold text-slate-900 text-sm">${m.patient_name}</h4>
                                    <span class="text-[11px] text-slate-400">Consulted ${m.doctor_name} (${m.department_name})</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${m.record_date}</span>
                                ${(currentUser && currentUser.role === 'admin') ? `
                                <button onclick="deleteMedicalHistory(${m.history_id})" class="text-slate-400 hover:text-rose-600 p-1 rounded transition" title="Delete Case Note">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>

                        <div class="mt-3 space-y-2 text-xs">
                            <div>
                                <span class="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Primary Diagnosis</span>
                                <span class="font-bold text-slate-900 text-sm">${m.diagnosis}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Presenting Conditions</span>
                                <span class="text-slate-700">${m.conditions}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Treatment Protocol</span>
                                <span class="text-slate-800 font-medium">${m.treatment}</span>
                            </div>
                        </div>
                    </div>

                    ${m.notes ? `
                        <div class="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-slate-600 text-[11px]">
                            <strong class="text-slate-700">Physician Note:</strong> ${m.notes}
                        </div>
                    ` : ''}
                </div>
            `).join('');
            lucide.createIcons();
        }
    } catch (err) {
        console.error('Error loading medical history:', err);
    }
}

async function deleteMedicalHistory(id) {
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can delete clinical case notes from MySQL.', 'error');
    }
    if (!confirm('Remove this clinical case note from MySQL?')) return;
    try {
        const res = await apiFetch(`/api/medical-history/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Clinical case note removed from MySQL');
            loadMedicalHistory();
        } else {
            showToast(json.error || 'Failed to remove note', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleCreateHistory(e) {
    e.preventDefault();
    if (currentUser && currentUser.role === 'patient') {
        return showToast('Permission Denied: Patients cannot document diagnoses or case sheets.', 'error');
    }
    const data = {
        patient_id: document.getElementById('history-patient-select').value,
        doctor_id: document.getElementById('history-doctor-select').value,
        record_date: document.getElementById('history-date').value,
        conditions: document.getElementById('history-conditions').value.trim(),
        diagnosis: document.getElementById('history-diagnosis').value.trim(),
        treatment: document.getElementById('history-treatment').value.trim(),
        notes: document.getElementById('history-notes').value.trim()
    };

    try {
        const res = await apiFetch('/api/medical-history', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Clinical case record saved');
            closeModal('modal-add-history');
            e.target.reset();
            loadMedicalHistory();
        } else {
            showToast(json.error, 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// =====================================================================
// 6. PHARMACY & MEDICATIONS
// =====================================================================
async function loadMedications() {
    try {
        const res = await fetch('/api/medications');
        const json = await res.json();
        if (json.success) {
            cachedMedications = json.data;
            renderMedicationsTable();
        }
    } catch (err) {
        console.error('Error loading medications:', err);
    }
}

function renderMedicationsTable() {
    const tbody = document.getElementById('medications-table-body');
    if (!tbody || !cachedMedications) return;
    const isAdmin = currentUser && currentUser.role === 'admin';

    tbody.innerHTML = cachedMedications.map(m => {
        const isLow = m.stock_quantity < 100;
        return `
            <tr class="hover:bg-slate-50/80 transition">
                <td class="py-3.5 px-4 font-mono text-slate-500">MED-${100 + m.medication_id}</td>
                <td class="py-3.5 px-4 font-bold text-slate-900">${m.medicine_name}</td>
                <td class="py-3.5 px-4">
                    <span class="px-2.5 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 font-medium">${m.type}</span>
                </td>
                <td class="py-3.5 px-4 text-slate-600">${m.unit}</td>
                <td class="py-3.5 px-4 font-mono font-semibold text-slate-800">₹${formatCurrency(m.price)}</td>
                <td class="py-3.5 px-4 font-mono font-bold ${isLow ? 'text-amber-700' : 'text-slate-800'}">${m.stock_quantity} packs</td>
                <td class="py-3.5 px-4">
                    <span class="badge-status ${isLow ? 'badge-Pending' : 'badge-Completed'}">
                        ${isLow ? 'Low Stock' : 'Available'}
                    </span>
                </td>
                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    ${isAdmin ? `
                        <button onclick="restockMedication(${m.medication_id}, 50)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-md text-[11px] transition">
                            +50 Packs
                        </button>
                        <button onclick="deleteMedication(${m.medication_id})" class="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-md text-[11px] font-semibold transition ml-1" title="Delete Medication">
                            Remove
                        </button>
                    ` : `
                        <span class="text-slate-400 text-[11px] font-mono">Restricted</span>
                    `}
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

async function restockMedication(id, qty) {
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can restock medications.', 'error');
    }
    try {
        const res = await apiFetch(`/api/medications/${id}/stock`, {
            method: 'PATCH',
            body: JSON.stringify({ adjustment: qty })
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Added ${qty} packs to pharmacy inventory`);
            loadMedications();
            loadDashboardData();
        } else {
            showToast(json.error || 'Failed to restock', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleCreateMedication(e) {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can add medicines to stock.', 'error');
    }
    const data = {
        medicine_name: document.getElementById('new-med-name').value.trim(),
        type: document.getElementById('new-med-type').value,
        unit: document.getElementById('new-med-unit').value.trim(),
        price: parseFloat(document.getElementById('new-med-price').value),
        stock_quantity: parseInt(document.getElementById('new-med-stock').value)
    };

    try {
        const res = await apiFetch('/api/medications', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showToast('Medicine added to pharmacy stock');
            closeModal('modal-add-medication');
            e.target.reset();
            loadMedications();
        } else {
            showToast(json.error, 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteMedication(id) {
    if (!currentUser || currentUser.role !== 'admin') {
        return showToast('Permission Denied: Only Admin can remove medications from MySQL.', 'error');
    }
    const med = cachedMedications.find(m => m.medication_id === id);
    const medName = med ? med.medicine_name : 'this medicine';
    if (!confirm(`Permanently remove ${medName} from pharmacy inventory in MySQL?`)) return;
    try {
        const res = await apiFetch(`/api/medications/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Medicine removed from MySQL');
            loadMedications();
            loadPrescriptions();
        } else {
            showToast(json.error || 'Failed to remove medicine', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// =====================================================================
// 7. PRESCRIPTIONS (Rx)
// =====================================================================
async function loadPrescriptions() {
    try {
        const res = await fetch('/api/prescriptions');
        const json = await res.json();
        if (json.success) {
            const tbody = document.getElementById('prescriptions-table-body');
            let records = json.data || [];
            if (currentUser && currentUser.role === 'patient' && currentUser.patient_id) {
                const myPatId = Number(currentUser.patient_id);
                records = records.filter(pr => Number(pr.patient_id) === myPatId);
            }

            if (records.length === 0) {
                const emptyMsg = (currentUser && currentUser.role === 'patient')
                    ? 'No active prescriptions issued for your profile yet.'
                    : 'No prescriptions issued yet.';
                tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-slate-400">${emptyMsg}</td></tr>`;
                return;
            }

            tbody.innerHTML = records.map(pr => `
                <tr class="hover:bg-slate-50/80 transition">
                    <td class="py-3.5 px-4 font-mono font-semibold text-teal-700">Rx-${200 + pr.prescription_id}</td>
                    <td class="py-3.5 px-4 font-bold text-slate-900">${pr.patient_name}</td>
                    <td class="py-3.5 px-4 text-slate-700">${pr.doctor_name}</td>
                    <td class="py-3.5 px-4">
                        <span class="font-bold text-slate-900">${pr.medicine_name}</span>
                        <span class="text-[11px] text-slate-400 block">${pr.medicine_type}</span>
                    </td>
                    <td class="py-3.5 px-4">
                        <div class="font-semibold text-slate-800">${pr.dosage}</div>
                        <div class="text-[11px] text-slate-500">${pr.frequency}</div>
                    </td>
                    <td class="py-3.5 px-4 text-slate-700">${pr.duration}</td>
                    <td class="py-3.5 px-4 font-mono font-bold text-slate-700">${pr.quantity}</td>
                    <td class="py-3.5 px-4 text-slate-600 max-w-xs truncate" title="${pr.instructions || ''}">${pr.instructions || 'As directed'}</td>
                    <td class="py-3.5 px-4 font-mono text-xs text-slate-500">${pr.prescribed_date}</td>
                    <td class="py-3.5 px-4 text-right whitespace-nowrap">
                        ${(currentUser && currentUser.role !== 'patient') ? `
                        <button onclick="deletePrescription(${pr.prescription_id})" class="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-md text-[11px] font-semibold transition" title="Cancel prescription and restore stock">
                            Cancel Rx
                        </button>
                        ` : `
                        <span class="text-teal-700 font-semibold text-[11px]">Valid Rx</span>
                        `}
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading prescriptions:', err);
    }
}

async function deletePrescription(id) {
    if (currentUser && currentUser.role === 'patient') {
        return showToast('Permission Denied: Patients cannot cancel clinical prescriptions.', 'error');
    }
    if (!confirm('Cancel this prescription? Medicine stock will be restored and appointment billing adjusted.')) return;
    try {
        const res = await apiFetch(`/api/prescriptions/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Prescription cancelled: stock restored & invoice adjusted');
            loadPrescriptions();
            loadMedications();
            loadBilling();
            loadDashboardData();
        } else {
            showToast(json.error || 'Failed to cancel prescription', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleCreatePrescription(e) {
    e.preventDefault();
    if (currentUser && currentUser.role === 'patient') {
        return showToast('Permission Denied: Patients cannot issue medical prescriptions.', 'error');
    }
    const data = {
        appointment_id: parseInt(document.getElementById('presc-appt-select').value),
        doctor_id: parseInt(document.getElementById('presc-doctor-select').value),
        medication_id: parseInt(document.getElementById('presc-med-select').value),
        dosage: document.getElementById('presc-dosage').value.trim(),
        frequency: document.getElementById('presc-freq').value.trim(),
        duration: document.getElementById('presc-duration').value.trim(),
        quantity: parseInt(document.getElementById('presc-qty').value),
        instructions: document.getElementById('presc-instructions').value.trim(),
        prescribed_date: document.getElementById('presc-date').value
    };

    try {
        const res = await apiFetch('/api/prescriptions', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Prescription dispensed (Remaining stock: ${json.remaining_stock})`);
            closeModal('modal-add-prescription');
            e.target.reset();
            loadPrescriptions();
            loadMedications();
            loadBilling();
        } else {
            showToast(json.error, 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// =====================================================================
// 8. BILLING & INVOICES
// =====================================================================
async function loadBilling() {
    try {
        const res = await fetch('/api/billing');
        const json = await res.json();
        if (json.success) {
            cachedBilling = json.data;
            renderBilling(cachedBilling);
        }
    } catch (err) {
        console.error('Error loading billing:', err);
    }
}

function renderBilling(bills) {
    const tbody = document.getElementById('billing-table-body');
    const isPatient = currentUser && currentUser.role === 'patient';
    const isDoctor = currentUser && currentUser.role === 'doctor';

    let displayBills = bills || [];
    if (isPatient && currentUser.patient_id) {
        const myPatId = Number(currentUser.patient_id);
        displayBills = displayBills.filter(b => Number(b.patient_id) === myPatId);
    }

    if (displayBills.length === 0) {
        const emptyMsg = isPatient
            ? 'No billing invoices found for your account.'
            : 'No invoices found.';
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400">${emptyMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = displayBills.map(b => `
        <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3.5 px-4 font-mono font-semibold text-slate-500">INV-${1000 + b.bill_id}</td>
            <td class="py-3.5 px-4 font-bold text-slate-900">${b.patient_name}</td>
            <td class="py-3.5 px-4 text-slate-600">${b.doctor_name}</td>
            <td class="py-3.5 px-4 font-mono text-xs text-slate-500">${b.bill_date}</td>
            <td class="py-3.5 px-4 font-bold text-slate-900 font-mono text-sm">₹${formatCurrency(b.total_amount)}</td>
            <td class="py-3.5 px-4"><span class="badge-status badge-${b.payment_status}">${b.payment_status}</span></td>
            <td class="py-3.5 px-4">
                <span class="px-2.5 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 font-medium">${b.payment_mode}</span>
            </td>
            <td class="py-3.5 px-4 text-right whitespace-nowrap">
                ${b.payment_status === 'Pending' ? `
                    ${isDoctor ? `
                        <span class="text-amber-600 font-semibold text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Payment Due</span>
                    ` : `
                        <button onclick="openPayBillModal(${b.bill_id}, '${b.patient_name}', ${b.total_amount})" class="${isPatient ? 'bg-teal-600 hover:bg-teal-500' : 'bg-[#148F77] hover:bg-[#107360]'} text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5">
                            <i data-lucide="credit-card" class="w-3.5 h-3.5"></i>
                            <span>${isPatient ? 'Pay Bill Online' : 'Collect Payment'}</span>
                        </button>
                    `}
                ` : `
                    <button onclick="printInvoiceReceipt(${b.bill_id})" class="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print Receipt
                    </button>
                `}
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function filterBilling(status) {
    let source = cachedBilling;
    if (currentUser && currentUser.role === 'patient' && currentUser.patient_id) {
        const myPatId = Number(currentUser.patient_id);
        source = source.filter(b => Number(b.patient_id) === myPatId);
    }
    if (status === 'ALL') {
        renderBilling(source);
    } else {
        renderBilling(source.filter(b => b.payment_status === status));
    }
}

function openPayBillModal(billId, patientName, amount) {
    document.getElementById('pay-bill-id').value = billId;
    document.getElementById('pay-display-id').textContent = `INV-${1000 + billId}`;
    document.getElementById('pay-display-patient').textContent = patientName;
    document.getElementById('pay-display-amount').textContent = `₹${formatCurrency(amount)}`;
    openModal('modal-pay-bill');
}

async function handlePayBill(e) {
    e.preventDefault();
    const id = document.getElementById('pay-bill-id').value;
    const payment_mode = document.getElementById('pay-payment-mode').value;

    try {
        const res = await apiFetch(`/api/billing/${id}/pay`, {
            method: 'POST',
            body: JSON.stringify({ payment_mode })
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Payment received via ${payment_mode}`);
            closeModal('modal-pay-bill');
            loadBilling();
            loadAppointments();
            loadDashboardData();
        } else {
            showToast(json.error, 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function printInvoiceReceipt(billId) {
    const bill = cachedBilling.find(b => b.bill_id === billId);
    if (!bill) return;

    const content = document.getElementById('invoice-receipt-content');
    content.innerHTML = `
        <div class="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
                <h2 class="text-lg font-bold text-slate-900">MediCare Multi-Speciality Hospital</h2>
                <p class="text-slate-500 text-[11px]">Bhavan's Campus Rd, Munshi Nagar, Andheri West, Mumbai 400058</p>
                <p class="text-slate-500 text-[11px]">Reg No: MH/MUM/HMS-2026 | Tel: +91 22 2623 2102</p>
            </div>
            <div class="text-right">
                <span class="font-bold text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded">PAID RECEIPT</span>
                <p class="font-mono text-xs font-bold mt-1.5 text-slate-800">INV-${1000 + bill.bill_id}</p>
                <p class="text-slate-500 text-[11px]">Date: ${bill.bill_date}</p>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4 py-3 text-xs">
            <div>
                <p class="text-slate-400 font-semibold uppercase text-[10px]">Patient Details</p>
                <p class="font-bold text-slate-900 text-sm mt-0.5">${bill.patient_name}</p>
                <p class="text-slate-600">${bill.patient_phone || ''}</p>
                <p class="text-slate-500 text-[11px]">${bill.patient_email || ''}</p>
            </div>
            <div class="text-right">
                <p class="text-slate-400 font-semibold uppercase text-[10px]">Consulting Specialist</p>
                <p class="font-bold text-slate-900 text-sm mt-0.5">${bill.doctor_name}</p>
                <p class="text-slate-600">Booking Ref: APT-${100 + bill.appointment_id}</p>
                <p class="text-slate-600">Payment Mode: <strong>${bill.payment_mode}</strong></p>
            </div>
        </div>

        <table class="w-full text-left text-xs border border-slate-200 mt-2">
            <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                    <th class="p-2.5">Particulars</th>
                    <th class="p-2.5 text-right">Units</th>
                    <th class="p-2.5 text-right">Amount (₹)</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <tr>
                    <td class="p-2.5">OPD Specialist Consultation & Pharmacy Charges</td>
                    <td class="p-2.5 text-right">1</td>
                    <td class="p-2.5 text-right font-mono">₹${formatCurrency(bill.total_amount)}</td>
                </tr>
            </tbody>
            <tfoot class="border-t-2 border-slate-900 bg-slate-50 font-bold">
                <tr>
                    <td colspan="2" class="p-2.5 text-right text-slate-800">Total Amount Received</td>
                    <td class="p-2.5 text-right text-slate-900 text-sm font-mono">₹${formatCurrency(bill.total_amount)}</td>
                </tr>
            </tfoot>
        </table>

        <div class="pt-4 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
            <span>Computer generated official hospital receipt.</span>
            <span class="font-semibold text-slate-700">Authorized Signatory</span>
        </div>
    `;

    openModal('modal-invoice-receipt');
}

// Populate Select Dropdowns inside Modals
function populateSelectDropdowns() {
    const isPatient = currentUser && currentUser.role === 'patient';
    const patientOptions = cachedPatients.map(p => `<option value="${p.patient_id}">${p.name} (UHID-${1000 + p.patient_id})</option>`).join('');
    
    ['appt-patient-select', 'history-patient-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isPatient && currentUser.patient_id) {
                el.innerHTML = `<option value="${currentUser.patient_id}" selected>${currentUser.full_name} (UHID-${1000 + currentUser.patient_id}) — You</option>`;
                el.disabled = true;
            } else {
                el.disabled = false;
                el.innerHTML = `<option value="">Select patient...</option>` + patientOptions;
            }
        }
    });

    const docOptions = cachedDoctors.map(d => `<option value="${d.doctor_id}">${d.name} — ${d.department_name}</option>`).join('');
    ['appt-doctor-select', 'history-doctor-select', 'presc-doctor-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<option value="">Select doctor...</option>` + docOptions;
    });

    const deptOptions = cachedDepartments.length > 0 
        ? cachedDepartments.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join('')
        : '<option value="1">Cardiology</option>';
    const docDeptEl = document.getElementById('new-doc-dept');
    if (docDeptEl) docDeptEl.innerHTML = deptOptions;
    const editDocDeptEl = document.getElementById('edit-doc-dept');
    if (editDocDeptEl) editDocDeptEl.innerHTML = deptOptions;

    const medOptions = cachedMedications.map(m => `<option value="${m.medication_id}">${m.medicine_name} (₹${m.price} • ${m.stock_quantity} in stock)</option>`).join('');
    const prescMedEl = document.getElementById('presc-med-select');
    if (prescMedEl) prescMedEl.innerHTML = medOptions;

    const apptOptions = cachedAppointments.map(a => `<option value="${a.appointment_id}">APT-${100 + a.appointment_id} • ${a.patient_name} (${a.doctor_name})</option>`).join('');
    const prescApptEl = document.getElementById('presc-appt-select');
    if (prescApptEl) prescApptEl.innerHTML = apptOptions;

    const today = new Date().toISOString().split('T')[0];
    ['appt-date', 'history-date', 'presc-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = today;
    });

    // Auto pre-select according to active logged-in role
    if (currentUser && currentUser.role === 'doctor' && currentUser.doctor_id) {
        ['appt-doctor-select', 'history-doctor-select', 'presc-doctor-select'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = currentUser.doctor_id;
        });
    } else if (currentUser && currentUser.role === 'patient' && currentUser.patient_id) {
        ['appt-patient-select', 'history-patient-select'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = currentUser.patient_id;
        });
    }
}
