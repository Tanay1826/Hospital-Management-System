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
    loadDashboardData();
    loadPatients();
    loadDepartments();
    loadDoctors();
    loadAppointments();
    loadMedicalHistory();
    loadMedications();
    loadPrescriptions();
    loadBilling();
});

// Helper: Get 2-letter initials from name
function getInitials(name = '') {
    const cleaned = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

// Switch Sidebar Tab
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabId}`);
    const targetNav = document.getElementById(`nav-${tabId}`);

    if (targetTab) targetTab.classList.remove('hidden');
    if (targetNav) targetNav.classList.add('active');

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
async function loadDashboardData() {
    try {
        const res = await fetch('/api/stats');
        const json = await res.json();
        if (json.success) {
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
            const list = apptJson.data.slice(0, 6);
            const tbody = document.getElementById('dashboard-recent-appointments');
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">No appointments booked yet.</td></tr>';
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
                    <button onclick="deletePatient(${p.patient_id})" class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition" title="Remove Patient">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i>
                    </button>
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
    const data = {
        name: document.getElementById('new-patient-name').value.trim(),
        email: document.getElementById('new-patient-email').value.trim(),
        phone: document.getElementById('new-patient-phone').value.trim(),
        date_of_birth: document.getElementById('new-patient-dob').value,
        gender: document.getElementById('new-patient-gender').value,
        address: document.getElementById('new-patient-address').value.trim()
    };

    try {
        const res = await fetch('/api/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    if (!confirm('Remove this patient and associated records from the registry?')) return;
    try {
        const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Patient removed');
            loadPatients();
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
                                    <span class="font-bold text-slate-900 font-mono">₹${b.total_amount.toFixed(2)}</span>
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
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

async function handleCreateDoctor(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('new-doc-name').value.trim(),
        email: document.getElementById('new-doc-email').value.trim(),
        phone: document.getElementById('new-doc-phone').value.trim(),
        department_id: document.getElementById('new-doc-dept').value,
        experience_years: document.getElementById('new-doc-exp').value,
        specialization: document.getElementById('new-doc-spec').value.trim()
    };

    try {
        const res = await fetch('/api/doctors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

// =====================================================================
// 4. APPOINTMENTS
// =====================================================================
async function loadAppointments() {
    try {
        const res = await fetch('/api/appointments');
        const json = await res.json();
        if (json.success) {
            cachedAppointments = json.data;
            renderAppointments(cachedAppointments);
        }
    } catch (err) {
        console.error('Error loading appointments:', err);
    }
}

function renderAppointments(appts) {
    const tbody = document.getElementById('appointments-table-body');
    if (appts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-slate-400">No appointments found for the selected filter.</td></tr>';
        return;
    }

    tbody.innerHTML = appts.map(a => `
        <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3.5 px-4 font-mono font-semibold text-slate-500">APT-${100 + a.appointment_id}</td>
            <td class="py-3.5 px-4">
                <div class="font-bold text-slate-900">${a.patient_name}</div>
                <div class="text-[11px] text-slate-400 font-mono">${a.patient_phone}</div>
            </td>
            <td class="py-3.5 px-4">
                <div class="font-semibold text-slate-800">${a.doctor_name}</div>
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
                    <button onclick="updateAppointmentStatus(${a.appointment_id}, 'Completed')" class="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-md text-[11px] font-semibold mr-1 transition">
                        Mark Done
                    </button>
                    <button onclick="updateAppointmentStatus(${a.appointment_id}, 'Cancelled')" class="text-slate-400 hover:text-rose-600 px-2 py-1 rounded-md text-[11px] font-medium transition">
                        Cancel
                    </button>
                ` : `<span class="text-slate-400 text-[11px]">Closed</span>`}
            </td>
        </tr>
    `).join('');
}

function setAppointmentFilter(status) {
    document.querySelectorAll('.appt-filter-btn').forEach(btn => {
        btn.className = 'appt-filter-btn px-3 py-1.5 rounded-md font-medium text-slate-600 hover:text-slate-900';
    });
    const activeBtn = document.getElementById(`filter-appt-${status}`);
    if (activeBtn) {
        activeBtn.className = 'appt-filter-btn active px-3 py-1.5 rounded-md font-semibold bg-white text-slate-900 shadow-sm';
    }

    if (status === 'ALL') {
        renderAppointments(cachedAppointments);
    } else {
        renderAppointments(cachedAppointments.filter(a => a.status === status));
    }
}

async function handleBookAppointment(e) {
    e.preventDefault();
    const data = {
        patient_id: document.getElementById('appt-patient-select').value,
        doctor_id: document.getElementById('appt-doctor-select').value,
        appointment_date: document.getElementById('appt-date').value,
        start_time: document.getElementById('appt-start').value,
        end_time: document.getElementById('appt-end').value,
        consultation_type: document.getElementById('appt-type').value,
        fee: parseFloat(document.getElementById('appt-fee').value) || 800
    };

    try {
        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
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

// =====================================================================
// 5. MEDICAL HISTORY (CASE SHEETS)
// =====================================================================
async function loadMedicalHistory() {
    try {
        const res = await fetch('/api/medical-history');
        const json = await res.json();
        if (json.success) {
            const container = document.getElementById('medical-history-cards');
            if (json.data.length === 0) {
                container.innerHTML = '<div class="p-8 text-slate-400 text-center col-span-2">No clinical case records documented yet.</div>';
                return;
            }

            container.innerHTML = json.data.map(m => `
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
                            <span class="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${m.record_date}</span>
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
        }
    } catch (err) {
        console.error('Error loading medical history:', err);
    }
}

async function handleCreateHistory(e) {
    e.preventDefault();
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
        const res = await fetch('/api/medical-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            const tbody = document.getElementById('medications-table-body');
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
                        <td class="py-3.5 px-4 font-mono font-semibold text-slate-800">₹${m.price.toFixed(2)}</td>
                        <td class="py-3.5 px-4 font-mono font-bold ${isLow ? 'text-amber-700' : 'text-slate-800'}">${m.stock_quantity} packs</td>
                        <td class="py-3.5 px-4">
                            <span class="badge-status ${isLow ? 'badge-Pending' : 'badge-Completed'}">
                                ${isLow ? 'Low Stock' : 'Available'}
                            </span>
                        </td>
                        <td class="py-3.5 px-4 text-right">
                            <button onclick="restockMedication(${m.medication_id}, 50)" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-md text-[11px] transition">
                                +50 Packs
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading medications:', err);
    }
}

async function restockMedication(id, qty) {
    try {
        const res = await fetch(`/api/medications/${id}/stock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adjustment: qty })
        });
        const json = await res.json();
        if (json.success) {
            showToast(`Added ${qty} packs to pharmacy inventory`);
            loadMedications();
            loadDashboardData();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleCreateMedication(e) {
    e.preventDefault();
    const data = {
        medicine_name: document.getElementById('new-med-name').value.trim(),
        type: document.getElementById('new-med-type').value,
        unit: document.getElementById('new-med-unit').value.trim(),
        price: parseFloat(document.getElementById('new-med-price').value),
        stock_quantity: parseInt(document.getElementById('new-med-stock').value)
    };

    try {
        const res = await fetch('/api/medications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

// =====================================================================
// 7. PRESCRIPTIONS (Rx)
// =====================================================================
async function loadPrescriptions() {
    try {
        const res = await fetch('/api/prescriptions');
        const json = await res.json();
        if (json.success) {
            const tbody = document.getElementById('prescriptions-table-body');
            if (json.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-slate-400">No prescriptions issued yet.</td></tr>';
                return;
            }

            tbody.innerHTML = json.data.map(pr => `
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
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading prescriptions:', err);
    }
}

async function handleCreatePrescription(e) {
    e.preventDefault();
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
        const res = await fetch('/api/prescriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    if (bills.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-400">No invoices found.</td></tr>';
        return;
    }

    tbody.innerHTML = bills.map(b => `
        <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3.5 px-4 font-mono font-semibold text-slate-500">INV-${1000 + b.bill_id}</td>
            <td class="py-3.5 px-4 font-bold text-slate-900">${b.patient_name}</td>
            <td class="py-3.5 px-4 text-slate-600">${b.doctor_name}</td>
            <td class="py-3.5 px-4 font-mono text-xs text-slate-500">${b.bill_date}</td>
            <td class="py-3.5 px-4 font-bold text-slate-900 font-mono text-sm">₹${b.total_amount.toFixed(2)}</td>
            <td class="py-3.5 px-4"><span class="badge-status badge-${b.payment_status}">${b.payment_status}</span></td>
            <td class="py-3.5 px-4">
                <span class="px-2.5 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 font-medium">${b.payment_mode}</span>
            </td>
            <td class="py-3.5 px-4 text-right whitespace-nowrap">
                ${b.payment_status === 'Pending' ? `
                    <button onclick="openPayBillModal(${b.bill_id}, '${b.patient_name}', ${b.total_amount})" class="bg-[#148F77] hover:bg-[#107360] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                        Collect Payment
                    </button>
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
    if (status === 'ALL') {
        renderBilling(cachedBilling);
    } else {
        renderBilling(cachedBilling.filter(b => b.payment_status === status));
    }
}

function openPayBillModal(billId, patientName, amount) {
    document.getElementById('pay-bill-id').value = billId;
    document.getElementById('pay-display-id').textContent = `INV-${1000 + billId}`;
    document.getElementById('pay-display-patient').textContent = patientName;
    document.getElementById('pay-display-amount').textContent = `₹${amount.toFixed(2)}`;
    openModal('modal-pay-bill');
}

async function handlePayBill(e) {
    e.preventDefault();
    const id = document.getElementById('pay-bill-id').value;
    const payment_mode = document.getElementById('pay-payment-mode').value;

    try {
        const res = await fetch(`/api/billing/${id}/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
                    <td class="p-2.5 text-right font-mono">₹${bill.total_amount.toFixed(2)}</td>
                </tr>
            </tbody>
            <tfoot class="border-t-2 border-slate-900 bg-slate-50 font-bold">
                <tr>
                    <td colspan="2" class="p-2.5 text-right text-slate-800">Total Amount Received</td>
                    <td class="p-2.5 text-right text-slate-900 text-sm font-mono">₹${bill.total_amount.toFixed(2)}</td>
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
    const patientOptions = cachedPatients.map(p => `<option value="${p.patient_id}">${p.name} (UHID-${1000 + p.patient_id})</option>`).join('');
    ['appt-patient-select', 'history-patient-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<option value="">Select patient...</option>` + patientOptions;
    });

    const docOptions = cachedDoctors.map(d => `<option value="${d.doctor_id}">${d.name} — ${d.department_name}</option>`).join('');
    ['appt-doctor-select', 'history-doctor-select', 'presc-doctor-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<option value="">Select doctor...</option>` + docOptions;
    });

    const deptOptions = cachedDepartments.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join('');
    const docDeptEl = document.getElementById('new-doc-dept');
    if (docDeptEl) docDeptEl.innerHTML = deptOptions;

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
}
