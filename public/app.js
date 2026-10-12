// MediCare Hospital Management System - Frontend Controller
// Team Members: Tanay Bhutada (Lead) | Hiten Bohra | Aayush Chaudhari

let cachedPatients = [];
let cachedDoctors = [];
let cachedDepartments = [];
let cachedAppointments = [];
let cachedMedications = [];
let cachedBilling = [];
let vivaQueries = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    loadDashboardData();
    loadPatients();
    loadDoctors();
    loadDepartments();
    loadAppointments();
    loadMedicalHistory();
    loadMedications();
    loadPrescriptions();
    loadBilling();
    loadAuditLogs();
    loadVivaQueries();
});

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastBox = document.getElementById('toast-box');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastMessage.textContent = message;
    if (type === 'success') {
        toastBox.className = 'bg-emerald-900 border border-emerald-700 text-emerald-100 text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2';
        toastIcon.innerHTML = '✅';
    } else if (type === 'error') {
        toastBox.className = 'bg-rose-900 border border-rose-700 text-rose-100 text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2';
        toastIcon.innerHTML = '❌';
    } else {
        toastBox.className = 'bg-slate-900 border border-slate-700 text-slate-100 text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2';
        toastIcon.innerHTML = 'ℹ️';
    }

    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3500);
}

// Modal handling
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

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.add('hidden');
    }
});

// Tab navigation
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabId}`);
    const targetNav = document.getElementById(`nav-${tabId}`);

    if (targetTab) targetTab.classList.remove('hidden');
    if (targetNav) targetNav.classList.add('active');

    lucide.createIcons();

    // Refresh data on tab activation
    if (tabId === 'dashboard') loadDashboardData();
    if (tabId === 'patients') loadPatients();
    if (tabId === 'doctors') { loadDoctors(); loadDepartments(); }
    if (tabId === 'appointments') loadAppointments();
    if (tabId === 'history') loadMedicalHistory();
    if (tabId === 'pharmacy') loadMedications();
    if (tabId === 'prescriptions') loadPrescriptions();
    if (tabId === 'billing') loadBilling();
}

// =====================================================================
// 1. DASHBOARD LOADERS
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
            document.getElementById('stat-pending-bills').textContent = `₹${Number(d.pendingBilling).toLocaleString('en-IN')}`;
            document.getElementById('stat-low-stock').textContent = d.lowStockMedications;
        }

        // Recent Appointments
        const apptRes = await fetch('/api/appointments');
        const apptJson = await apptRes.json();
        if (apptJson.success) {
            const list = apptJson.data.slice(0, 5);
            const tbody = document.getElementById('dashboard-recent-appointments');
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">No appointments found.</td></tr>';
            } else {
                tbody.innerHTML = list.map(a => `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="p-3 font-semibold text-slate-800">${a.patient_name}</td>
                        <td class="p-3 text-slate-600">${a.doctor_name}<br><span class="text-[10px] text-slate-400">${a.department_name}</span></td>
                        <td class="p-3 font-mono text-[11px]">${a.appointment_date} <br><span class="text-slate-400">${a.start_time} - ${a.end_time}</span></td>
                        <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">${a.consultation_type}</span></td>
                        <td class="p-3"><span class="badge-status badge-${a.status}">${a.status}</span></td>
                        <td class="p-3 text-right">
                            <button onclick="viewPatient360(${a.patient_id})" class="text-blue-600 hover:text-blue-800 font-semibold text-[11px]">Details</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

async function loadAuditLogs() {
    try {
        const res = await fetch('/api/audit-logs');
        const json = await res.json();
        const container = document.getElementById('dashboard-audit-logs');
        if (json.success && json.data.length > 0) {
            container.innerHTML = json.data.slice(0, 8).map(log => `
                <div class="pt-2 text-[11px]">
                    <div class="flex justify-between items-center text-slate-500">
                        <span class="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">${log.action_type}</span>
                        <span class="text-[10px] font-mono">${log.timestamp.split(' ')[1] || log.timestamp}</span>
                    </div>
                    <p class="text-slate-700 mt-1 font-mono text-[10.5px] leading-tight">${log.details}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">No trigger events logged yet.</div>';
        }
    } catch (err) {
        console.error('Error loading audit logs:', err);
    }
}

// =====================================================================
// 2. PATIENTS CONTROLLER
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
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">No patient records found.</td></tr>';
        return;
    }

    tbody.innerHTML = patients.map(p => {
        // Calculate age
        const birthYear = new Date(p.date_of_birth).getFullYear();
        const age = isNaN(birthYear) ? 'N/A' : (new Date().getFullYear() - birthYear);

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 font-mono font-bold text-slate-500">#${p.patient_id}</td>
                <td class="p-3">
                    <div class="font-bold text-slate-800 text-sm">${p.name}</div>
                    <div class="text-[11px] text-slate-400">Reg: ${p.created_at ? p.created_at.split(' ')[0] : '2026-10-12'}</div>
                </td>
                <td class="p-3">
                    <div class="text-slate-700">${p.email}</div>
                    <div class="text-slate-500 font-mono text-[11px]">${p.phone}</div>
                </td>
                <td class="p-3">
                    <div class="font-mono text-slate-700">${p.date_of_birth}</div>
                    <div class="text-slate-500 text-[11px]">${age} yrs</div>
                </td>
                <td class="p-3">
                    <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${p.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}">${p.gender}</span>
                </td>
                <td class="p-3 text-slate-600 max-w-xs truncate" title="${p.address}">${p.address}</td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button onclick="viewPatient360(${p.patient_id})" class="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-2.5 py-1 rounded-md text-[11px] mr-1">
                        View 360°
                    </button>
                    <button onclick="deletePatient(${p.patient_id})" class="text-rose-500 hover:text-rose-700 p-1 text-[11px]" title="Delete Patient">
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
            showToast('Patient registered successfully in database!');
            closeModal('modal-add-patient');
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

async function deletePatient(id) {
    if (!confirm('Are you sure you want to delete this patient record? Associated appointments and bills will cascade delete.')) return;
    try {
        const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('Patient record deleted');
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
        if (!json.success) return showToast('Error fetching patient profile', 'error');

        const p = json.data;
        const container = document.getElementById('patient-details-content');

        container.innerHTML = `
            <!-- Top Details -->
            <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-base font-extrabold text-slate-900">${p.name}</h4>
                        <p class="text-slate-600 text-[11px] mt-0.5">Email: ${p.email} | Phone: ${p.phone}</p>
                        <p class="text-slate-600 text-[11px]">DOB: ${p.date_of_birth} | Gender: ${p.gender}</p>
                        <p class="text-slate-500 text-[11px] mt-1">Address: ${p.address}</p>
                    </div>
                    <span class="bg-blue-600 text-white font-mono font-bold px-2 py-0.5 rounded text-xs">Patient #${p.patient_id}</span>
                </div>
            </div>

            <!-- Medical History Timeline -->
            <div>
                <h5 class="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                    <i data-lucide="activity" class="w-3.5 h-3.5 text-rose-500"></i> Medical History & Diagnoses (${p.medicalHistory.length})
                </h5>
                ${p.medicalHistory.length === 0 ? '<div class="p-3 text-slate-400 bg-slate-50 rounded border text-[11px]">No medical history recorded.</div>' : `
                    <div class="space-y-2">
                        ${p.medicalHistory.map(m => `
                            <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                                <div class="flex justify-between text-slate-500 font-mono text-[10px]">
                                    <span>Date: ${m.record_date}</span>
                                    <span>Recorded by: ${m.doctor_name}</span>
                                </div>
                                <div class="font-bold text-slate-800 mt-1">Diagnosis: ${m.diagnosis}</div>
                                <div class="text-slate-600 mt-0.5">Condition: ${m.conditions}</div>
                                <div class="text-slate-700 font-medium mt-0.5">Treatment: ${m.treatment}</div>
                                ${m.notes ? `<div class="text-slate-500 mt-1 italic">Notes: ${m.notes}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Appointments -->
            <div>
                <h5 class="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                    <i data-lucide="calendar" class="w-3.5 h-3.5 text-blue-500"></i> Consultation Appointments (${p.appointments.length})
                </h5>
                ${p.appointments.length === 0 ? '<div class="p-3 text-slate-400 bg-slate-50 rounded border text-[11px]">No appointments booked.</div>' : `
                    <div class="space-y-2">
                        ${p.appointments.map(a => `
                            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-[11px]">
                                <div>
                                    <span class="font-bold text-slate-800">${a.doctor_name}</span> (${a.department_name})
                                    <div class="text-slate-500 text-[10.5px]">${a.appointment_date} • ${a.start_time} - ${a.end_time} • ${a.consultation_type}</div>
                                </div>
                                <span class="badge-status badge-${a.status}">${a.status}</span>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Invoices -->
            <div>
                <h5 class="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                    <i data-lucide="credit-card" class="w-3.5 h-3.5 text-emerald-500"></i> Invoices & Bills (${p.bills.length})
                </h5>
                ${p.bills.length === 0 ? '<div class="p-3 text-slate-400 bg-slate-50 rounded border text-[11px]">No bills on record.</div>' : `
                    <div class="space-y-2">
                        ${p.bills.map(b => `
                            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-[11px]">
                                <div>
                                    <span class="font-mono font-bold">Bill #${b.bill_id}</span> • Date: ${b.bill_date} • Mode: ${b.payment_mode}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-slate-900">₹${b.total_amount}</span>
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
// 3. DOCTORS & DEPARTMENTS CONTROLLER
// =====================================================================
async function loadDepartments() {
    try {
        const res = await fetch('/api/departments');
        const json = await res.json();
        if (json.success) {
            cachedDepartments = json.data;
            const container = document.getElementById('departments-grid');
            container.innerHTML = cachedDepartments.map(d => `
                <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-slate-800 text-sm">${d.department_name}</h4>
                            <span class="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full font-mono">${d.doctor_count} Doctors</span>
                        </div>
                        <p class="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <i data-lucide="map-pin" class="w-3 h-3 text-slate-400"></i> ${d.location}
                        </p>
                    </div>
                    <div class="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        Floor: <span class="font-semibold text-slate-600">${d.floor}</span>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        }
    } catch (err) {
        console.error('Error loading departments:', err);
    }
}

async function loadDoctors() {
    try {
        const res = await fetch('/api/doctors');
        const json = await res.json();
        if (json.success) {
            cachedDoctors = json.data;
            const container = document.getElementById('doctors-grid');

            // Fetch schedules for each doctor
            const schedRes = await fetch('/api/schedules');
            const schedJson = await schedRes.json();
            const schedules = schedJson.success ? schedJson.data : [];

            container.innerHTML = cachedDoctors.map(doc => {
                const docSchedules = schedules.filter(s => s.doctor_id === doc.doctor_id);

                return `
                    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between space-y-3">
                        <div>
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-bold text-slate-900 text-sm">${doc.name}</h4>
                                    <p class="text-purple-700 font-medium text-xs">${doc.specialization}</p>
                                </div>
                                <span class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                                    ${doc.experience_years} yrs exp
                                </span>
                            </div>
                            <div class="mt-2 text-xs text-slate-600 space-y-1">
                                <div><strong class="text-slate-700">Dept:</strong> ${doc.department_name} (${doc.location})</div>
                                <div><strong class="text-slate-700">Email:</strong> ${doc.email}</div>
                                <div><strong class="text-slate-700">Phone:</strong> <span class="font-mono text-[11px]">${doc.phone}</span></div>
                            </div>
                        </div>

                        <!-- Schedules Table -->
                        <div class="border-t border-slate-100 pt-2">
                            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <i data-lucide="clock" class="w-3 h-3 text-purple-600"></i> Working Hours & Schedule:
                            </div>
                            ${docSchedules.length === 0 ? '<p class="text-[10px] text-slate-400">No active schedule set.</p>' : `
                                <div class="space-y-1">
                                    ${docSchedules.map(s => `
                                        <div class="flex justify-between text-[10.5px] bg-slate-50 px-2 py-1 rounded">
                                            <span class="font-semibold text-slate-700">${s.day_of_week}</span>
                                            <span class="font-mono text-slate-600">${s.start_time} - ${s.end_time}</span>
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
    } catch (err) {
        console.error('Error loading doctors:', err);
    }
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
            showToast('Doctor profile created successfully!');
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
// 4. APPOINTMENTS CONTROLLER
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
        tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400">No appointments scheduled.</td></tr>';
        return;
    }

    tbody.innerHTML = appts.map(a => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-3 font-mono font-bold text-slate-500">#${a.appointment_id}</td>
            <td class="p-3">
                <div class="font-bold text-slate-800">${a.patient_name}</div>
                <div class="text-[11px] text-slate-500">${a.patient_phone}</div>
            </td>
            <td class="p-3">
                <div class="font-medium text-slate-800">${a.doctor_name}</div>
                <div class="text-[11px] text-slate-500">${a.department_name}</div>
            </td>
            <td class="p-3 font-mono text-slate-700">${a.appointment_date}</td>
            <td class="p-3 font-mono text-[11px] text-slate-600">${a.start_time} - ${a.end_time}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">${a.consultation_type}</span></td>
            <td class="p-3"><span class="badge-status badge-${a.status}">${a.status}</span></td>
            <td class="p-3">
                ${a.total_amount ? `
                    <div class="font-bold text-slate-800">₹${a.total_amount}</div>
                    <span class="badge-status badge-${a.payment_status} text-[10px]">${a.payment_status}</span>
                ` : '<span class="text-slate-400 text-[11px]">N/A</span>'}
            </td>
            <td class="p-3 text-right whitespace-nowrap">
                ${a.status === 'Scheduled' ? `
                    <button onclick="updateAppointmentStatus(${a.appointment_id}, 'Completed')" class="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded text-[10px] font-bold mr-1">
                        Complete
                    </button>
                    <button onclick="updateAppointmentStatus(${a.appointment_id}, 'Cancelled')" class="bg-rose-50 text-rose-700 hover:bg-rose-100 px-2 py-1 rounded text-[10px] font-bold">
                        Cancel
                    </button>
                ` : `<span class="text-slate-400 text-[10px] italic">Finalized</span>`}
            </td>
        </tr>
    `).join('');
}

function filterAppointments() {
    const filter = document.getElementById('appointment-status-filter').value;
    if (filter === 'ALL') {
        renderAppointments(cachedAppointments);
    } else {
        renderAppointments(cachedAppointments.filter(a => a.status === filter));
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
        fee: parseFloat(document.getElementById('appt-fee').value) || 600
    };

    try {
        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showToast(json.message);
            closeModal('modal-book-appointment');
            e.target.reset();
            loadAppointments();
            loadBilling();
            loadDashboardData();
            loadAuditLogs();
        } else {
            showToast(json.error || 'Conflict or error during booking', 'error');
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
            showToast(json.message);
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
// 5. MEDICAL HISTORY CONTROLLER
// =====================================================================
async function loadMedicalHistory() {
    try {
        const res = await fetch('/api/medical-history');
        const json = await res.json();
        if (json.success) {
            const container = document.getElementById('medical-history-cards');
            if (json.data.length === 0) {
                container.innerHTML = '<div class="p-6 text-slate-400 text-center col-span-2">No medical history records available.</div>';
                return;
            }

            container.innerHTML = json.data.map(m => `
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 font-mono">RECORD #${m.history_id}</span>
                            <h4 class="font-extrabold text-slate-900 text-sm mt-0.5">${m.patient_name}</h4>
                        </div>
                        <div class="text-right text-[11px] text-slate-500">
                            <span class="font-mono text-slate-700 font-semibold">${m.record_date}</span><br>
                            <span class="text-[10px]">By ${m.doctor_name}</span>
                        </div>
                    </div>
                    <div class="text-xs space-y-1 pt-1">
                        <div><strong class="text-slate-700">Diagnosis:</strong> <span class="font-semibold text-rose-700">${m.diagnosis}</span></div>
                        <div><strong class="text-slate-700">Condition:</strong> <span class="text-slate-600">${m.conditions}</span></div>
                        <div><strong class="text-slate-700">Treatment:</strong> <span class="text-slate-800">${m.treatment}</span></div>
                        ${m.notes ? `<div class="p-2 bg-slate-50 rounded text-slate-500 italic mt-2 text-[11px]">Notes: ${m.notes}</div>` : ''}
                    </div>
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
            showToast('Medical record documented successfully!');
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
// 6. PHARMACY & INVENTORY CONTROLLER
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
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="p-3 font-mono font-bold text-slate-500">#${m.medication_id}</td>
                        <td class="p-3 font-bold text-slate-800">${m.medicine_name}</td>
                        <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">${m.type}</span></td>
                        <td class="p-3 text-slate-600">${m.unit}</td>
                        <td class="p-3 font-bold text-slate-800 font-mono">₹${m.price.toFixed(2)}</td>
                        <td class="p-3 font-mono font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}">${m.stock_quantity} units</td>
                        <td class="p-3">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isLow ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}">
                                ${isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                        </td>
                        <td class="p-3 text-right">
                            <button onclick="restockMedication(${m.medication_id}, 50)" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-2 py-1 rounded text-[11px]">
                                +50 Units
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
            showToast(`Restocked +${qty} units!`);
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
            showToast('Medication added to pharmacy database!');
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
// 7. PRESCRIPTIONS CONTROLLER (Triggers Demo)
// =====================================================================
async function loadPrescriptions() {
    try {
        const res = await fetch('/api/prescriptions');
        const json = await res.json();
        if (json.success) {
            const tbody = document.getElementById('prescriptions-table-body');
            if (json.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400">No prescriptions written yet.</td></tr>';
                return;
            }

            tbody.innerHTML = json.data.map(pr => `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="p-3 font-mono font-bold text-slate-500">#${pr.prescription_id}</td>
                    <td class="p-3 font-bold text-slate-800">${pr.patient_name}</td>
                    <td class="p-3 text-slate-700">${pr.doctor_name}</td>
                    <td class="p-3">
                        <span class="font-bold text-indigo-700">${pr.medicine_name}</span>
                        <span class="text-[10px] text-slate-400 block">${pr.medicine_type}</span>
                    </td>
                    <td class="p-3">
                        <div class="font-semibold text-slate-800">${pr.dosage}</div>
                        <div class="text-[10.5px] text-slate-500">${pr.frequency}</div>
                    </td>
                    <td class="p-3 text-slate-600">${pr.duration}</td>
                    <td class="p-3 font-mono font-bold text-slate-700">${pr.quantity}</td>
                    <td class="p-3 text-slate-600 max-w-xs truncate" title="${pr.instructions || ''}">${pr.instructions || 'N/A'}</td>
                    <td class="p-3 font-mono text-[11px] text-slate-500">${pr.prescribed_date}</td>
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
            showToast(json.message);
            closeModal('modal-add-prescription');
            e.target.reset();
            loadPrescriptions();
            loadMedications();
            loadBilling();
            loadAuditLogs();
        } else {
            showToast(json.error, 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// =====================================================================
// 8. BILLING CONTROLLER
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
        tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400">No invoices generated.</td></tr>';
        return;
    }

    tbody.innerHTML = bills.map(b => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-3 font-mono font-bold text-slate-500">INV-#${b.bill_id}</td>
            <td class="p-3 font-bold text-slate-800">${b.patient_name}</td>
            <td class="p-3 text-slate-600">${b.doctor_name}</td>
            <td class="p-3 font-mono text-[11px] text-slate-500">${b.bill_date}</td>
            <td class="p-3 font-extrabold text-slate-900 font-mono text-sm">₹${b.total_amount.toFixed(2)}</td>
            <td class="p-3"><span class="badge-status badge-${b.payment_status}">${b.payment_status}</span></td>
            <td class="p-3">
                <span class="px-2 py-0.5 rounded text-[10.5px] bg-slate-100 text-slate-700 font-medium">${b.payment_mode}</span>
            </td>
            <td class="p-3 text-right whitespace-nowrap">
                ${b.payment_status === 'Pending' ? `
                    <button onclick="openPayBillModal(${b.bill_id}, '${b.patient_name}', ${b.total_amount})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold mr-1">
                        Pay Now
                    </button>
                ` : `
                    <button onclick="printInvoiceReceipt(${b.bill_id})" class="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 inline-flex">
                        <i data-lucide="receipt" class="w-3 h-3"></i> Receipt
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
    document.getElementById('pay-display-id').textContent = `INV-#${billId}`;
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
            showToast(json.message);
            closeModal('modal-pay-bill');
            loadBilling();
            loadAppointments();
            loadDashboardData();
            loadAuditLogs();
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
        <div class="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
            <div>
                <h2 class="text-xl font-black text-slate-900 tracking-tight">MediCare Super Speciality Hospital</h2>
                <p class="text-slate-500 text-[10px]">Opposite SPIT Campus, Andheri West, Mumbai - 400058</p>
                <p class="text-slate-500 text-[10px]">GSTIN: 27AAAAA0000A1Z5 | Ph: +91 22 2623 2102</p>
            </div>
            <div class="text-right">
                <span class="font-bold text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">TAX INVOICE - PAID</span>
                <p class="font-mono text-[11px] font-bold mt-1 text-slate-800">INV-${bill.bill_id}</p>
                <p class="text-slate-500 text-[10px]">Date: ${bill.bill_date}</p>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4 py-2 text-[11px]">
            <div>
                <p class="text-slate-400 font-bold uppercase text-[9px]">Billed To (Patient):</p>
                <p class="font-bold text-slate-800 text-sm">${bill.patient_name}</p>
                <p class="text-slate-600">${bill.patient_email || ''}</p>
                <p class="text-slate-600 font-mono">${bill.patient_phone || ''}</p>
            </div>
            <div class="text-right">
                <p class="text-slate-400 font-bold uppercase text-[9px]">Consultant In-Charge:</p>
                <p class="font-bold text-slate-800 text-sm">${bill.doctor_name}</p>
                <p class="text-slate-600">Appointment Ref: #${bill.appointment_id}</p>
                <p class="text-slate-600">Mode: <strong>${bill.payment_mode}</strong></p>
            </div>
        </div>

        <table class="w-full text-left text-xs border border-slate-200 mt-2">
            <thead class="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                    <th class="p-2">Description</th>
                    <th class="p-2 text-right">Qty</th>
                    <th class="p-2 text-right">Amount (₹)</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <tr>
                    <td class="p-2">Specialist OPD Consultation & Diagnostics</td>
                    <td class="p-2 text-right">1</td>
                    <td class="p-2 text-right">₹${(bill.total_amount).toFixed(2)}</td>
                </tr>
            </tbody>
            <tfoot class="border-t-2 border-slate-900 bg-slate-50 font-bold">
                <tr>
                    <td colspan="2" class="p-2 text-right text-slate-800">Grand Total Paid:</td>
                    <td class="p-2 text-right text-slate-900 text-sm font-mono">₹${(bill.total_amount).toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>

        <div class="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
            <span>Thank you for choosing MediCare. Wishing you good health!</span>
            <span class="font-bold font-mono">Authorized Signatory</span>
        </div>
    `;

    openModal('modal-invoice-receipt');
}

// =====================================================================
// 9. DBMS VIVA LAB & SQL PLAYGROUND CONTROLLER (Units 7, 8, 9, 10)
// =====================================================================
async function loadVivaQueries() {
    try {
        const res = await fetch('/api/viva/queries');
        const json = await res.json();
        if (json.success) {
            vivaQueries = json.queries;
            const container = document.getElementById('viva-query-buttons');
            container.innerHTML = Object.entries(vivaQueries).map(([key, q]) => `
                <button onclick="runPrebuiltVivaQuery('${key}')" class="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all hover:scale-[1.01] flex flex-col justify-between">
                    <span class="font-bold text-slate-800 text-[11px] leading-tight line-clamp-2">${q.title}</span>
                    <span class="text-[9.5px] text-blue-600 font-mono mt-2 font-semibold">Run Query &rarr;</span>
                </button>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading viva queries:', err);
    }
}

function runPrebuiltVivaQuery(key) {
    const q = vivaQueries[key];
    if (!q) return;

    document.getElementById('custom-sql-input').value = q.sql;
    executeCustomSQL();
}

function resetDefaultQuery() {
    document.getElementById('custom-sql-input').value = `SELECT 
    p.name AS Patient_Name,
    d.name AS Doctor_Name,
    dept.department_name AS Department,
    a.appointment_date,
    b.total_amount AS Bill_Amount,
    b.payment_status
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN doctors d ON a.doctor_id = d.doctor_id
JOIN departments dept ON d.department_id = dept.department_id
JOIN billing b ON a.appointment_id = b.appointment_id
ORDER BY a.appointment_date DESC;`;
}

async function executeCustomSQL() {
    const sql = document.getElementById('custom-sql-input').value.trim();
    const metaEl = document.getElementById('query-meta-info');
    const timeEl = document.getElementById('query-time');
    const thead = document.getElementById('query-result-head');
    const tbody = document.getElementById('query-result-body');

    metaEl.textContent = 'Executing SQL on hospital.db...';
    timeEl.textContent = '';

    try {
        const res = await fetch('/api/sql-playground', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });
        const json = await res.json();

        if (!json.success) {
            metaEl.innerHTML = `<span class="text-rose-600 font-bold">SQL Error:</span> ${json.error}`;
            thead.innerHTML = '<tr><th class="p-2.5 text-rose-600">Error Occurred</th></tr>';
            tbody.innerHTML = `<tr><td class="p-4 text-rose-500 font-mono text-xs">${json.error}</td></tr>`;
            return;
        }

        metaEl.innerHTML = `<span class="text-emerald-700 font-bold">${json.rowCount} rows</span> returned`;
        timeEl.textContent = `Speed: ${json.executionTimeMs}`;

        if (json.rowCount === 0) {
            thead.innerHTML = '<tr><th class="p-2.5">Empty Result Set</th></tr>';
            tbody.innerHTML = '<tr><td class="p-4 text-slate-400 text-center">Query returned 0 rows.</td></tr>';
            return;
        }

        // Render table header
        thead.innerHTML = `<tr>${json.columns.map(c => `<th class="p-2.5 bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">${c}</th>`).join('')}</tr>`;

        // Render table rows
        tbody.innerHTML = json.data.map(row => `
            <tr class="hover:bg-blue-50/50 transition-colors">
                ${json.columns.map(col => `<td class="p-2 text-slate-800 border-b border-slate-100 whitespace-nowrap">${row[col] !== null ? row[col] : '<span class="text-slate-300 italic">NULL</span>'}</td>`).join('')}
            </tr>
        `).join('');

    } catch (err) {
        metaEl.innerHTML = `<span class="text-rose-600 font-bold">Execution Error:</span> ${err.message}`;
    }
}

// UNIT 10: TRANSACTION SIMULATOR
async function runTransactionDemo(action) {
    const terminal = document.getElementById('transaction-log-container');
    terminal.innerHTML = '<div class="text-amber-400">// Opening ACID database transaction...</div>';

    try {
        const res = await fetch('/api/transaction-demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, medication_id: 1, quantity: 2 })
        });
        const json = await res.json();

        let outputHtml = '';
        if (json.logs && json.logs.length > 0) {
            outputHtml = json.logs.map(l => {
                let colorClass = 'text-slate-300';
                if (l.action.includes('START')) colorClass = 'text-blue-400 font-bold';
                if (l.action.includes('SAVEPOINT')) colorClass = 'text-indigo-400';
                if (l.action.includes('COMMIT')) colorClass = 'text-emerald-400 font-bold';
                if (l.action.includes('ROLLBACK') || l.action.includes('ERROR')) colorClass = 'text-rose-400 font-bold';

                return `<div><span class="text-slate-500">[Step ${l.step}]</span> <span class="${colorClass}">${l.action}:</span> <span class="text-slate-300">${l.detail}</span></div>`;
            }).join('');
        }

        if (json.outcome === 'COMMIT_SUCCESSFUL') {
            outputHtml += `<div class="mt-2 text-emerald-300 font-bold">>>> STATUS: TRANSACTION COMMITTED (ACID PRESERVED)</div>`;
            outputHtml += `<div class="text-emerald-200 text-[10px] mt-0.5">${json.explanation}</div>`;
            showToast('Transaction Committed successfully!');
            loadMedications();
            loadAuditLogs();
        } else {
            outputHtml += `<div class="mt-2 text-rose-300 font-bold">>>> STATUS: TRANSACTION ROLLED BACK (STATE RESTORED)</div>`;
            outputHtml += `<div class="text-rose-200 text-[10px] mt-0.5">${json.explanation}</div>`;
            showToast('Transaction simulated crash & Rollback successful!', 'info');
        }

        terminal.innerHTML = outputHtml;
    } catch (err) {
        terminal.innerHTML = `<div class="text-rose-400">Error: ${err.message}</div>`;
    }
}

// Helper: Populate select dropdowns for modals
function populateSelectDropdowns() {
    // Patients dropdowns
    const patientOptions = cachedPatients.map(p => `<option value="${p.patient_id}">${p.name} (#${p.patient_id})</option>`).join('');
    ['appt-patient-select', 'history-patient-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<option value="">-- Choose Patient --</option>` + patientOptions;
    });

    // Doctors dropdowns
    const docOptions = cachedDoctors.map(d => `<option value="${d.doctor_id}">${d.name} (${d.specialization})</option>`).join('');
    ['appt-doctor-select', 'history-doctor-select', 'presc-doctor-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<option value="">-- Choose Doctor --</option>` + docOptions;
    });

    // Departments dropdown
    const deptOptions = cachedDepartments.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join('');
    const docDeptEl = document.getElementById('new-doc-dept');
    if (docDeptEl) docDeptEl.innerHTML = deptOptions;

    // Medications dropdown
    const medOptions = cachedMedications.map(m => `<option value="${m.medication_id}">${m.medicine_name} (₹${m.price} - Stock: ${m.stock_quantity})</option>`).join('');
    const prescMedEl = document.getElementById('presc-med-select');
    if (prescMedEl) prescMedEl.innerHTML = medOptions;

    // Appointments dropdown for prescriptions
    const apptOptions = cachedAppointments.map(a => `<option value="${a.appointment_id}">Appt #${a.appointment_id} - ${a.patient_name} with ${a.doctor_name} (${a.appointment_date})</option>`).join('');
    const prescApptEl = document.getElementById('presc-appt-select');
    if (prescApptEl) prescApptEl.innerHTML = apptOptions;

    // Set today's date for date pickers
    const today = new Date().toISOString().split('T')[0];
    ['appt-date', 'history-date', 'presc-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = today;
    });
}
