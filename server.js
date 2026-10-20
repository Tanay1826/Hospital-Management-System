const express = require('express');
const cors = require('cors');
const path = require('path');

// Automatically load .env file if present
try {
    if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile();
    }
} catch (_) {
    // .env is optional
}

const { query, get, run, transaction, getEngine, ready } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection Status API
app.get('/api/db-status', (req, res) => {
    const engine = getEngine();
    res.json({
        success: true,
        engine,
        message: engine === 'mysql' 
            ? 'Connected to MySQL Server 8.0 (hospital_management_db)' 
            : 'Connected to SQLite fallback (hospital.db)'
    });
});

// =====================================================================
// 0. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) API
// =====================================================================

// RBAC Security Middleware
function requireRole(allowedRoles) {
    return (req, res, next) => {
        const userRole = (req.headers['x-user-role'] || req.query.role || req.body?.current_user_role || '').toLowerCase();
        if (allowedRoles.includes(userRole)) {
            return next();
        }
        return res.status(403).json({
            success: false,
            error: `Permission Denied: This operation is strictly restricted to [${allowedRoles.join(' / ').toUpperCase()}]. Your active role is '${userRole ? userRole.toUpperCase() : 'UNAUTHENTICATED'}'.`
        });
    };
}

app.get('/api/auth/users', async (req, res) => {
    try {
        const rows = await query(`
            SELECT u.user_id, u.username, u.role, u.doctor_id, u.patient_id, u.full_name, u.email,
                   d.specialization, dept.department_name
            FROM users u
            LEFT JOIN doctors d ON u.doctor_id = d.doctor_id
            LEFT JOIN departments dept ON d.department_id = dept.department_id
            ORDER BY 
                CASE u.role 
                    WHEN 'admin' THEN 1 
                    WHEN 'doctor' THEN 2 
                    WHEN 'patient' THEN 3 
                    ELSE 4 
                END, u.user_id ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password, user_id } = req.body;

        let user;
        if (user_id) {
            // Quick 1-click login by user_id
            user = await get(`
                SELECT u.user_id, u.username, u.role, u.doctor_id, u.patient_id, u.full_name, u.email,
                       d.specialization, dept.department_name
                FROM users u
                LEFT JOIN doctors d ON u.doctor_id = d.doctor_id
                LEFT JOIN departments dept ON d.department_id = dept.department_id
                WHERE u.user_id = ?
            `, [user_id]);
        } else {
            // Standard credentials login
            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Username and password required' });
            }
            user = await get(`
                SELECT u.user_id, u.username, u.role, u.doctor_id, u.patient_id, u.full_name, u.email,
                       d.specialization, dept.department_name
                FROM users u
                LEFT JOIN doctors d ON u.doctor_id = d.doctor_id
                LEFT JOIN departments dept ON d.department_id = dept.department_id
                WHERE (u.username = ? OR u.email = ?) AND u.password = ?
            `, [username, username, password]);
        }

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        res.json({
            success: true,
            message: `Logged in as ${user.full_name} (${user.role.toUpperCase()})`,
            data: user,
            user: user
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Dedicated Schema Registration for Doctor
app.post('/api/auth/register-doctor', async (req, res) => {
    try {
        const { 
            name, email, phone, specialization, experience_years, 
            department_id, days, start_time, end_time, break_start, break_end,
            username, password 
        } = req.body;

        if (!name || !email || !phone || !specialization || !department_id) {
            return res.status(400).json({ success: false, error: 'Name, email, phone, specialization, and department are required' });
        }

        const cleanPhone = String(phone || '').replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Contact phone must be exactly 10 digits' });
        }

        const exp = parseInt(experience_years, 10) || 0;
        const deptId = parseInt(department_id, 10);
        const startTime = start_time || '09:00:00';
        const endTime = end_time || '17:00:00';
        const breakStart = break_start || '13:00:00';
        const breakEnd = break_end || '14:00:00';
        const userPass = password || 'doctor123';
        const userLogin = (username || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9._]/g, '');

        const result = await transaction(async () => {
            const docInfo = await run(`
                INSERT INTO doctors (name, email, phone, specialization, experience_years, department_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [name, email, cleanPhone, specialization, exp, deptId]);
            const doctorId = docInfo.lastInsertRowid;

            const scheduleDays = Array.isArray(days) && days.length > 0 
                ? days 
                : ['Monday', 'Wednesday', 'Friday'];

            for (const day of scheduleDays) {
                await run(`
                    INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, break_start, break_end)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [doctorId, day, startTime, endTime, breakStart, breakEnd]);
            }

            const userInfo = await run(`
                INSERT INTO users (username, password, role, doctor_id, full_name, email)
                VALUES (?, ?, 'doctor', ?, ?, ?)
            `, [userLogin, userPass, doctorId, name, email]);

            const newUser = await get(`
                SELECT u.user_id, u.username, u.role, u.doctor_id, u.patient_id, u.full_name, u.email,
                       d.specialization, dept.department_name
                FROM users u
                LEFT JOIN doctors d ON u.doctor_id = d.doctor_id
                LEFT JOIN departments dept ON d.department_id = dept.department_id
                WHERE u.user_id = ?
            `, [userInfo.lastInsertRowid]);

            return { doctorId, user: newUser };
        });

        res.status(201).json({
            success: true,
            message: `Doctor ${name} registered successfully with OPD schedule!`,
            data: result.user,
            user: result.user
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Dedicated Schema Registration for Patient
app.post('/api/auth/register-patient', async (req, res) => {
    try {
        const { name, email, phone, date_of_birth, gender, address, username, password } = req.body;
        if (!name || !email || !phone || !date_of_birth || !gender || !address) {
            return res.status(400).json({ success: false, error: 'All personal and demographic fields are required' });
        }

        const cleanPhone = String(phone || '').replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Contact phone must be exactly 10 digits' });
        }

        const userPass = password || 'patient123';
        const userLogin = (username || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9._]/g, '');

        const result = await transaction(async () => {
            const patInfo = await run(`
                INSERT INTO patients (name, email, date_of_birth, gender, phone, address)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [name, email, date_of_birth, gender, cleanPhone, address]);
            const patientId = patInfo.lastInsertRowid;

            const userInfo = await run(`
                INSERT INTO users (username, password, role, patient_id, full_name, email)
                VALUES (?, ?, 'patient', ?, ?, ?)
            `, [userLogin, userPass, patientId, name, email]);

            const newUser = await get(`
                SELECT u.user_id, u.username, u.role, u.doctor_id, u.patient_id, u.full_name, u.email
                FROM users u
                WHERE u.user_id = ?
            `, [userInfo.lastInsertRowid]);

            return { patientId, user: newUser };
        });

        res.status(201).json({
            success: true,
            message: `Patient account for ${name} registered successfully!`,
            data: result.user,
            user: result.user
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Dedicated Schema Registration for Admin
app.post('/api/auth/register-admin', async (req, res) => {
    try {
        const { full_name, username, email, password } = req.body;
        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Full name, email, and password required' });
        }

        const userLogin = (username || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9._]/g, '');

        const userInfo = await run(`
            INSERT INTO users (username, password, role, full_name, email)
            VALUES (?, ?, 'admin', ?, ?)
        `, [userLogin, password, full_name, email]);

        const newUser = await get(`
            SELECT u.user_id, u.username, u.role, u.doctor_id, u.patient_id, u.full_name, u.email
            FROM users u
            WHERE u.user_id = ?
        `, [userInfo.lastInsertRowid]);

        res.status(201).json({
            success: true,
            message: `Hospital Administrator ${full_name} registered successfully!`,
            data: newUser,
            user: newUser
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.delete('/api/auth/users/:id', async (req, res) => {
    try {
        await run('DELETE FROM users WHERE user_id = ?', [req.params.id]);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 1. DASHBOARD ANALYTICS API
// =====================================================================
app.get('/api/stats', async (req, res) => {
    try {
        const patientsRow = await get('SELECT COUNT(*) as count FROM patients');
        const doctorsRow = await get('SELECT COUNT(*) as count FROM doctors');
        const appointmentsRow = await get('SELECT COUNT(*) as count FROM appointments');
        const pendingAppointmentsRow = await get("SELECT COUNT(*) as count FROM appointments WHERE status = 'Scheduled'");
        const totalRevenueRow = await get("SELECT IFNULL(SUM(total_amount), 0) as total FROM billing WHERE payment_status = 'Paid'");
        const pendingBillingRow = await get("SELECT IFNULL(SUM(total_amount), 0) as total FROM billing WHERE payment_status = 'Pending'");
        const lowStockRow = await get('SELECT COUNT(*) as count FROM medications WHERE stock_quantity < 100');

        res.json({
            success: true,
            engine: getEngine(),
            data: {
                patientsCount: Number(patientsRow?.count || 0),
                doctorsCount: Number(doctorsRow?.count || 0),
                appointmentsCount: Number(appointmentsRow?.count || 0),
                pendingAppointments: Number(pendingAppointmentsRow?.count || 0),
                totalRevenue: Number(totalRevenueRow?.total || 0),
                pendingBilling: Number(pendingBillingRow?.total || 0),
                lowStockMedications: Number(lowStockRow?.count || 0)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 2. PATIENTS API
// =====================================================================
app.get('/api/patients', async (req, res) => {
    try {
        const search = req.query.q ? `%${req.query.q}%` : null;
        let rows;
        if (search) {
            rows = await query('SELECT * FROM patients WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY patient_id DESC', [search, search, search]);
        } else {
            rows = await query('SELECT * FROM patients ORDER BY patient_id DESC');
        }
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/patients/:id', async (req, res) => {
    try {
        const patient = await get('SELECT * FROM patients WHERE patient_id = ?', [req.params.id]);
        if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

        const appointments = await query(`
            SELECT a.*, d.name AS doctor_name, dept.department_name 
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.doctor_id
            JOIN departments dept ON d.department_id = dept.department_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `, [req.params.id]);

        const medicalHistory = await query(`
            SELECT m.*, d.name AS doctor_name 
            FROM medical_history m
            JOIN doctors d ON m.doctor_id = d.doctor_id
            WHERE m.patient_id = ?
            ORDER BY m.record_date DESC
        `, [req.params.id]);

        const bills = await query('SELECT * FROM billing WHERE patient_id = ? ORDER BY bill_id DESC', [req.params.id]);

        res.json({
            success: true,
            data: {
                ...patient,
                appointments,
                medicalHistory,
                bills
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/patients', async (req, res) => {
    try {
        const { name, email, date_of_birth, gender, phone, address } = req.body;
        if (!name || !email || !date_of_birth || !gender || !phone || !address) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const cleanPhone = String(phone || '').replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Contact phone must be exactly 10 digits' });
        }

        const info = await run(`
            INSERT INTO patients (name, email, date_of_birth, gender, phone, address)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, email, date_of_birth, gender, cleanPhone, address]);
        const patientId = info.lastInsertRowid;

        // Auto-create login credentials for new patient
        let newUser = null;
        try {
            const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            await run(`
                INSERT INTO users (username, password, role, patient_id, full_name, email)
                VALUES (?, 'patient123', 'patient', ?, ?, ?)
            `, [username, patientId, name, email]);
            newUser = await get('SELECT * FROM users WHERE patient_id = ?', [patientId]);
        } catch (_) {}

        res.status(201).json({ success: true, id: patientId, user: newUser, message: 'Patient registered successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.put('/api/patients/:id', async (req, res) => {
    try {
        const { name, email, date_of_birth, gender, phone, address } = req.body;
        const cleanPhone = String(phone || '').replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Contact phone must be exactly 10 digits' });
        }

        await run(`
            UPDATE patients 
            SET name = ?, email = ?, date_of_birth = ?, gender = ?, phone = ?, address = ?
            WHERE patient_id = ?
        `, [name, email, date_of_birth, gender, cleanPhone, address, req.params.id]);

        // Keep users table in sync if account exists
        try {
            await run('UPDATE users SET full_name = ?, email = ? WHERE patient_id = ?', [name, email, req.params.id]);
        } catch (_) {}

        res.json({ success: true, message: 'Patient updated successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.delete('/api/patients/:id', requireRole(['admin']), async (req, res) => {
    try {
        const patientId = req.params.id;
        await transaction(async () => {
            const appts = await query('SELECT appointment_id FROM appointments WHERE patient_id = ?', [patientId]);
            for (const a of appts) {
                await run('DELETE FROM prescriptions WHERE appointment_id = ?', [a.appointment_id]);
                await run('DELETE FROM billing WHERE appointment_id = ?', [a.appointment_id]);
            }
            await run('DELETE FROM appointments WHERE patient_id = ?', [patientId]);
            await run('DELETE FROM medical_history WHERE patient_id = ?', [patientId]);
            await run('DELETE FROM billing WHERE patient_id = ?', [patientId]);
            await run('DELETE FROM users WHERE patient_id = ?', [patientId]);
            await run('DELETE FROM patients WHERE patient_id = ?', [patientId]);
        });
        res.json({ success: true, message: 'Patient and all linked appointments, invoices, and medical records removed from MySQL' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 3. DOCTORS & DEPARTMENTS API
// =====================================================================
app.get('/api/departments', async (req, res) => {
    try {
        const rows = await query(`
            SELECT dept.department_id, dept.department_name, dept.location, dept.floor, 
                   COUNT(d.doctor_id) AS doctor_count 
            FROM departments dept
            LEFT JOIN doctors d ON dept.department_id = d.department_id
            GROUP BY dept.department_id, dept.department_name, dept.location, dept.floor
            ORDER BY dept.department_name ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/departments', async (req, res) => {
    try {
        const { department_name, location, floor } = req.body;
        const info = await run('INSERT INTO departments (department_name, location, floor) VALUES (?, ?, ?)', [department_name, location, floor]);
        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Department added' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.get('/api/doctors', async (req, res) => {
    try {
        const rows = await query(`
            SELECT d.*, dept.department_name, dept.location, dept.floor
            FROM doctors d
            JOIN departments dept ON d.department_id = dept.department_id
            ORDER BY d.doctor_id ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/doctors/:id', async (req, res) => {
    try {
        const doctor = await get(`
            SELECT d.*, dept.department_name, dept.location, dept.floor
            FROM doctors d
            JOIN departments dept ON d.department_id = dept.department_id
            WHERE d.doctor_id = ?
        `, [req.params.id]);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        const schedules = await query('SELECT * FROM schedules WHERE doctor_id = ? ORDER BY schedule_id ASC', [req.params.id]);
        const appointments = await query(`
            SELECT a.*, p.name AS patient_name, p.phone AS patient_phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ?
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `, [req.params.id]);

        res.json({ success: true, data: { ...doctor, schedules, appointments } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/doctors', requireRole(['admin']), async (req, res) => {
    try {
        const { name, email, phone, specialization, experience_years, department_id, days } = req.body;
        if (!name || !email || !phone || !specialization || !department_id) {
            return res.status(400).json({ success: false, error: 'Name, email, phone, department, and specialization are required' });
        }
        const cleanPhone = String(phone || '').replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Contact phone must be exactly 10 digits' });
        }
        const exp = parseInt(experience_years, 10) || 0;
        const deptId = parseInt(department_id, 10);

        const result = await transaction(async () => {
            const info = await run(`
                INSERT INTO doctors (name, email, phone, specialization, experience_years, department_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [name, email, cleanPhone, specialization, exp, deptId]);
            const doctorId = info.lastInsertRowid;

            // Automatically create weekly OPD schedule slots for the new doctor
            // so they appear in schedules table and doctor availability views in MySQL!
            const scheduleDays = Array.isArray(days) && days.length > 0 
                ? days 
                : ['Monday', 'Wednesday', 'Friday'];
            
            for (const day of scheduleDays) {
                await run(`
                    INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, break_start, break_end)
                    VALUES (?, ?, '09:00:00', '17:00:00', '13:00:00', '14:00:00')
                `, [doctorId, day]);
            }

            // Automatically create login account for the doctor
            try {
                const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                await run(`
                    INSERT INTO users (username, password, role, doctor_id, full_name, email)
                    VALUES (?, 'doctor123', 'doctor', ?, ?, ?)
                `, [username, doctorId, name, email]);
            } catch (_) {}

            return { doctorId };
        });

        res.status(201).json({ success: true, id: result.doctorId, message: 'Doctor and weekly schedule registered successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.put('/api/doctors/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { name, email, phone, specialization, experience_years, department_id } = req.body;
        if (!name || !email || !phone || !specialization || !department_id) {
            return res.status(400).json({ success: false, error: 'All fields are required to update doctor' });
        }
        const cleanPhone = String(phone || '').replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Contact phone must be exactly 10 digits' });
        }
        const exp = parseInt(experience_years, 10) || 0;
        const deptId = parseInt(department_id, 10);

        await run(`
            UPDATE doctors 
            SET name = ?, email = ?, phone = ?, specialization = ?, experience_years = ?, department_id = ?
            WHERE doctor_id = ?
        `, [name, email, cleanPhone, specialization, exp, deptId, req.params.id]);

        // Keep users table in sync if account exists
        try {
            await run('UPDATE users SET full_name = ?, email = ? WHERE doctor_id = ?', [name, email, req.params.id]);
        } catch (_) {}

        res.json({ success: true, message: 'Doctor updated successfully in MySQL!' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.delete('/api/doctors/:id', requireRole(['admin']), async (req, res) => {
    try {
        const doctorId = req.params.id;
        await transaction(async () => {
            const appts = await query('SELECT appointment_id FROM appointments WHERE doctor_id = ?', [doctorId]);
            for (const a of appts) {
                await run('DELETE FROM prescriptions WHERE appointment_id = ?', [a.appointment_id]);
                await run('DELETE FROM billing WHERE appointment_id = ?', [a.appointment_id]);
            }
            await run('DELETE FROM prescriptions WHERE doctor_id = ?', [doctorId]);
            await run('DELETE FROM appointments WHERE doctor_id = ?', [doctorId]);
            await run('DELETE FROM schedules WHERE doctor_id = ?', [doctorId]);
            await run('DELETE FROM medical_history WHERE doctor_id = ?', [doctorId]);
            await run('DELETE FROM users WHERE doctor_id = ?', [doctorId]);
            await run('DELETE FROM doctors WHERE doctor_id = ?', [doctorId]);
        });
        res.json({ success: true, message: 'Doctor and all linked schedules, appointments, and records removed from MySQL' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 4. DOCTOR SCHEDULES API
// =====================================================================
app.get('/api/schedules', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM vw_DoctorScheduleAvailability ORDER BY doctor_id, day_of_week');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/schedules', async (req, res) => {
    try {
        const { doctor_id, day_of_week, start_time, end_time, break_start, break_end } = req.body;
        const info = await run(`
            INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, break_start, break_end)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [parseInt(doctor_id, 10), day_of_week, start_time, end_time, break_start, break_end]);
        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Schedule added' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 5. APPOINTMENTS API (With Automatic Billing Generation in Transaction)
// =====================================================================
app.get('/api/appointments', async (req, res) => {
    try {
        const rows = await query(`
            SELECT a.*, p.name AS patient_name, p.email AS patient_email, p.phone AS patient_phone,
                   d.name AS doctor_name, d.specialization, dept.department_name,
                   b.bill_id, b.total_amount, b.payment_status, b.payment_mode
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            JOIN doctors d ON a.doctor_id = d.doctor_id
            JOIN departments dept ON d.department_id = dept.department_id
            LEFT JOIN billing b ON a.appointment_id = b.appointment_id
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_date, start_time, end_time, consultation_type, fee = 600 } = req.body;

        if (!patient_id || !doctor_id || !appointment_date || !start_time || !end_time || !consultation_type) {
            return res.status(400).json({ success: false, error: 'All appointment fields are required' });
        }

        const pId = parseInt(patient_id, 10);
        const dId = parseInt(doctor_id, 10);
        const f = parseFloat(fee) || 600;

        // Check for doctor slot conflict
        const conflict = await get(`
            SELECT COUNT(*) AS count FROM appointments 
            WHERE doctor_id = ? AND appointment_date = ? AND status != 'Cancelled'
              AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
        `, [dId, appointment_date, start_time, start_time, end_time, end_time]);

        if (Number(conflict?.count || 0) > 0) {
            return res.status(409).json({ success: false, error: 'Doctor already has a booking during this timeslot!' });
        }

        // ATOMIC TRANSACTION: Insert Appointment and Initial Billing
        const result = await transaction(async () => {
            const apptResult = await run(`
                INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, status, consultation_type)
                VALUES (?, ?, ?, ?, ?, 'Scheduled', ?)
            `, [pId, dId, appointment_date, start_time, end_time, consultation_type]);

            const apptId = apptResult.lastInsertRowid;

            const billResult = await run(`
                INSERT INTO billing (patient_id, appointment_id, bill_date, total_amount, payment_status, payment_mode)
                VALUES (?, ?, ?, ?, 'Pending', 'Pending')
            `, [pId, apptId, appointment_date, f]);

            return { apptId, billId: billResult.lastInsertRowid };
        });

        res.status(201).json({
            success: true,
            appointment_id: result.apptId,
            bill_id: result.billId,
            message: 'Appointment booked & invoice created successfully (Atomic Transaction Committed)'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Scheduled', 'Completed', 'Cancelled', 'No-Show'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        await run('UPDATE appointments SET status = ? WHERE appointment_id = ?', [status, req.params.id]);
        res.json({ success: true, message: `Appointment marked as ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/appointments/:id', requireRole(['admin']), async (req, res) => {
    try {
        const appointmentId = req.params.id;
        await transaction(async () => {
            await run('DELETE FROM prescriptions WHERE appointment_id = ?', [appointmentId]);
            await run('DELETE FROM billing WHERE appointment_id = ?', [appointmentId]);
            await run('DELETE FROM appointments WHERE appointment_id = ?', [appointmentId]);
        });
        res.json({ success: true, message: 'Appointment and linked invoice/prescriptions deleted successfully from MySQL' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 6. MEDICAL HISTORY API
// =====================================================================
app.get('/api/medical-history', async (req, res) => {
    try {
        const rows = await query(`
            SELECT m.*, p.name AS patient_name, d.name AS doctor_name, dept.department_name
            FROM medical_history m
            JOIN patients p ON m.patient_id = p.patient_id
            JOIN doctors d ON m.doctor_id = d.doctor_id
            JOIN departments dept ON d.department_id = dept.department_id
            ORDER BY m.record_date DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/medical-history', requireRole(['admin', 'doctor']), async (req, res) => {
    try {
        const { patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes } = req.body;
        const info = await run(`
            INSERT INTO medical_history (patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes]);
        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Medical history recorded successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.delete('/api/medical-history/:id', requireRole(['admin']), async (req, res) => {
    try {
        await run('DELETE FROM medical_history WHERE history_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Clinical case note removed successfully from MySQL' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 7. MEDICATIONS & PHARMACY API
// =====================================================================
app.get('/api/medications', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM medications ORDER BY medicine_name ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/medications', requireRole(['admin']), async (req, res) => {
    try {
        const { medicine_name, type, unit, price, stock_quantity } = req.body;
        const info = await run(`
            INSERT INTO medications (medicine_name, type, unit, price, stock_quantity)
            VALUES (?, ?, ?, ?, ?)
        `, [medicine_name, type, unit, price, stock_quantity]);
        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Medication added successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.patch('/api/medications/:id/stock', requireRole(['admin']), async (req, res) => {
    try {
        const { adjustment } = req.body;
        await run('UPDATE medications SET stock_quantity = stock_quantity + ? WHERE medication_id = ?', [adjustment, req.params.id]);
        res.json({ success: true, message: 'Stock updated successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.delete('/api/medications/:id', requireRole(['admin']), async (req, res) => {
    try {
        const medId = req.params.id;
        await transaction(async () => {
            await run('DELETE FROM prescriptions WHERE medication_id = ?', [medId]);
            await run('DELETE FROM medications WHERE medication_id = ?', [medId]);
        });
        res.json({ success: true, message: 'Medication and linked prescription records removed successfully from MySQL' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 8. PRESCRIPTIONS API (Triggers automatic stock reduction & audit log)
// =====================================================================
app.get('/api/prescriptions', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM vw_ActivePrescriptions ORDER BY prescription_id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/prescriptions', requireRole(['admin', 'doctor']), async (req, res) => {
    try {
        const { appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity = 1, prescribed_date } = req.body;

        // Verify medication stock availability
        const med = await get('SELECT stock_quantity, medicine_name, price FROM medications WHERE medication_id = ?', [medication_id]);
        if (!med) return res.status(404).json({ success: false, error: 'Medication not found' });
        if (med.stock_quantity < quantity) {
            return res.status(400).json({ success: false, error: `Insufficient stock! Only ${med.stock_quantity} units available for ${med.medicine_name}` });
        }

        // Inserting triggers `trg_reduce_medicine_stock` automatically
        const info = await run(`
            INSERT INTO prescriptions (appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity, prescribed_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity, prescribed_date]);

        // Auto add pharmacy charge to the appointment's bill
        const medCost = med.price * quantity;
        await run('UPDATE billing SET total_amount = total_amount + ? WHERE appointment_id = ?', [medCost, appointment_id]);

        const updatedMed = await get('SELECT stock_quantity FROM medications WHERE medication_id = ?', [medication_id]);

        res.status(201).json({
            success: true,
            prescription_id: info.lastInsertRowid,
            remaining_stock: updatedMed.stock_quantity,
            message: `Prescription created! Database Trigger automatically reduced stock to ${updatedMed.stock_quantity} and updated invoice.`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/prescriptions/:id', requireRole(['admin', 'doctor']), async (req, res) => {
    try {
        const prescId = req.params.id;
        const presc = await get('SELECT * FROM prescriptions WHERE prescription_id = ?', [prescId]);
        if (!presc) {
            return res.status(404).json({ success: false, error: 'Prescription not found' });
        }

        const med = await get('SELECT price FROM medications WHERE medication_id = ?', [presc.medication_id]);
        const cost = med ? (med.price * presc.quantity) : 0;

        await transaction(async () => {
            // 1. Restore medicine stock
            await run('UPDATE medications SET stock_quantity = stock_quantity + ? WHERE medication_id = ?', [presc.quantity, presc.medication_id]);
            // 2. Adjust billing total amount
            if (cost > 0) {
                await run('UPDATE billing SET total_amount = GREATEST(0, total_amount - ?) WHERE appointment_id = ?', [cost, presc.appointment_id]);
            }
            // 3. Delete prescription
            await run('DELETE FROM prescriptions WHERE prescription_id = ?', [prescId]);
        });

        res.json({ success: true, message: 'Prescription cancelled: stock restored and invoice adjusted in MySQL' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 9. BILLING & PAYMENTS API
// =====================================================================
app.get('/api/billing', async (req, res) => {
    try {
        const rows = await query(`
            SELECT b.*, p.name AS patient_name, p.email AS patient_email, p.phone AS patient_phone,
                   d.name AS doctor_name, a.appointment_date, a.status AS appointment_status
            FROM billing b
            JOIN patients p ON b.patient_id = p.patient_id
            JOIN appointments a ON b.appointment_id = a.appointment_id
            JOIN doctors d ON a.doctor_id = d.doctor_id
            ORDER BY b.bill_id DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/billing/:id/pay', async (req, res) => {
    try {
        const { payment_mode } = req.body;
        if (!['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Insurance'].includes(payment_mode)) {
            return res.status(400).json({ success: false, error: 'Valid payment mode required' });
        }

        const bill = await get('SELECT * FROM billing WHERE bill_id = ?', [req.params.id]);
        if (!bill) return res.status(404).json({ success: false, error: 'Bill record not found' });

        // TRANSACTION CONTROL: Update billing + Update appointment to Completed
        const result = await transaction(async () => {
            await run(`
                UPDATE billing 
                SET payment_status = 'Paid', payment_mode = ? 
                WHERE bill_id = ?
            `, [payment_mode, req.params.id]);

            await run(`
                UPDATE appointments 
                SET status = 'Completed' 
                WHERE appointment_id = ? AND status = 'Scheduled'
            `, [bill.appointment_id]);

            return { bill_id: req.params.id, amount: bill.total_amount, status: 'Paid' };
        });

        res.json({
            success: true,
            data: result,
            message: `Payment of ₹${bill.total_amount} processed via ${payment_mode} (Transaction Committed)`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 10. ADVANCED DBMS LAB & VIVA SUITE (Units 7, 8, 9, 10 Demonstrator)
// =====================================================================

const VIVA_QUERIES = {
    inner_join_appointments: {
        title: "Multi-Table INNER JOIN (Appointments + Patients + Doctors + Departments)",
        sql: `SELECT 
    a.appointment_id,
    p.name AS Patient_Name,
    d.name AS Doctor_Name,
    dept.department_name AS Department,
    a.appointment_date AS Date,
    a.start_time AS Time,
    a.status AS Status
FROM appointments a
INNER JOIN patients p ON a.patient_id = p.patient_id
INNER JOIN doctors d ON a.doctor_id = d.doctor_id
INNER JOIN departments dept ON d.department_id = dept.department_id
ORDER BY a.appointment_date DESC;`
    },
    left_join_prescriptions: {
        title: "LEFT OUTER JOIN (Doctors and Prescriptions count)",
        sql: `SELECT 
    d.doctor_id,
    d.name AS Doctor_Name,
    d.specialization,
    COUNT(pr.prescription_id) AS Total_Prescriptions_Issued
FROM doctors d
LEFT JOIN prescriptions pr ON d.doctor_id = pr.doctor_id
GROUP BY d.doctor_id, d.name, d.specialization
ORDER BY Total_Prescriptions_Issued DESC;`
    },
    department_revenue_aggregates: {
        title: "AGGREGATE FUNCTIONS with GROUP BY & HAVING (Revenue by Department)",
        sql: `SELECT 
    dept.department_name,
    COUNT(DISTINCT a.appointment_id) AS Total_Appointments,
    ROUND(AVG(d.experience_years), 1) AS Avg_Doctor_Experience_Yrs,
    SUM(b.total_amount) AS Total_Billed_Amount,
    SUM(CASE WHEN b.payment_status = 'Paid' THEN b.total_amount ELSE 0 END) AS Realized_Revenue
FROM departments dept
JOIN doctors d ON dept.department_id = d.department_id
JOIN appointments a ON d.doctor_id = a.doctor_id
JOIN billing b ON a.appointment_id = b.appointment_id
GROUP BY dept.department_id, dept.department_name
HAVING Total_Appointments >= 1
ORDER BY Realized_Revenue DESC;`
    },
    nested_subquery_above_avg: {
        title: "NESTED SUBQUERY (Patients with Billing Amount > Hospital Average)",
        sql: `SELECT 
    p.patient_id,
    p.name AS Patient_Name,
    b.total_amount AS Billed_Amount,
    b.payment_status,
    ROUND((SELECT AVG(total_amount) FROM billing), 2) AS Hospital_Avg_Bill
FROM billing b
JOIN patients p ON b.patient_id = p.patient_id
WHERE b.total_amount > (SELECT AVG(total_amount) FROM billing)
ORDER BY b.total_amount DESC;`
    },
    correlated_subquery: {
        title: "CORRELATED SUBQUERY (Doctors who have handled more appointments than average)",
        sql: `SELECT 
    d.doctor_id,
    d.name AS Doctor_Name,
    d.specialization,
    (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id) AS Doctor_Appointments
FROM doctors d
WHERE (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id) >= 1
ORDER BY Doctor_Appointments DESC;`
    },
    view_patient_summary: {
        title: "VIEW DEMONSTRATION (vw_PatientAppointmentSummary)",
        sql: `SELECT * FROM vw_PatientAppointmentSummary;`
    },
    view_active_prescriptions: {
        title: "VIEW DEMONSTRATION (vw_ActivePrescriptions)",
        sql: `SELECT * FROM vw_ActivePrescriptions;`
    },
    triggers_audit_log: {
        title: "TRIGGER AUDIT TRAIL (Generated by DB Triggers)",
        sql: `SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT 15;`
    }
};

app.get('/api/viva/queries', (req, res) => {
    res.json({ success: true, queries: VIVA_QUERIES });
});

app.post('/api/sql-playground', async (req, res) => {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ success: false, error: 'SQL query string is required' });
    }

    const trimmed = sql.trim();
    const isSelect = /^SELECT\b/i.test(trimmed);
    const isPragma = /^PRAGMA\b/i.test(trimmed);

    if (!isSelect && !isPragma) {
        return res.status(403).json({
            success: false,
            error: 'For safety, only SELECT queries and PRAGMA commands can be executed in the Live SQL Playground.'
        });
    }

    try {
        const startTime = process.hrtime();
        const rows = await query(trimmed);
        const diff = process.hrtime(startTime);
        const executionTimeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

        res.json({
            success: true,
            rowCount: rows.length,
            executionTimeMs: `${executionTimeMs} ms`,
            columns: rows.length > 0 ? Object.keys(rows[0]) : [],
            data: rows
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// UNIT 10: TRANSACTION SIMULATOR
app.post('/api/transaction-demo', async (req, res) => {
    const { action, medication_id, quantity = 5 } = req.body;

    const logs = [];
    logs.push({ step: 1, action: "START TRANSACTION", detail: "Transaction opened. ACID guarantees active." });

    const med = await get('SELECT * FROM medications WHERE medication_id = ?', [medication_id || 1]);
    if (!med) {
        return res.status(404).json({ success: false, error: 'Medication not found' });
    }
    logs.push({ step: 2, action: "CHECK CONSTRAINTS", detail: `Current stock for ${med.medicine_name}: ${med.stock_quantity}` });

    if (action === 'simulate_failure') {
        logs.push({ step: 3, action: "SAVEPOINT sp_before_purchase", detail: "Savepoint checkpoint created." });
        logs.push({ step: 4, action: "ARTIFICIAL ERROR ENCOUNTERED", detail: "Payment gateway failed / Insufficient balance simulation triggered!" });
        logs.push({ step: 5, action: "ROLLBACK TO SAVEPOINT / FULL ROLLBACK", detail: "Database state completely reverted! No records altered, stock unmodified." });

        return res.json({
            success: true,
            outcome: 'ROLLBACK_SUCCESSFUL',
            explanation: 'Transaction aborted cleanly. The database state returned to its initial snapshot (Atomicity & Consistency maintained).',
            logs
        });
    }

    try {
        await transaction(async () => {
            logs.push({ step: 3, action: "SAVEPOINT sp_before_purchase", detail: "Savepoint checkpoint created." });
            
            if (med.stock_quantity < quantity) {
                throw new Error("Insufficient medication stock");
            }

            await run('UPDATE medications SET stock_quantity = stock_quantity - ? WHERE medication_id = ?', [quantity, med.medication_id]);
            logs.push({ step: 4, action: "UPDATE EXECUTED", detail: `Deducted ${quantity} units from inventory.` });

            await run('INSERT INTO audit_logs (action_type, table_name, record_id, details) VALUES (?, ?, ?, ?)',
                ['TRANSACTION_DEMO', 'medications', med.medication_id, `Atomic purchase of ${quantity} units completed.`]);
            logs.push({ step: 5, action: "AUDIT LOGGED", detail: "Audit trail entry recorded." });

            logs.push({ step: 6, action: "COMMIT", detail: "Transaction committed to disk. Changes are durable (Durability)." });
        });

        const updatedMed = await get('SELECT stock_quantity FROM medications WHERE medication_id = ?', [med.medication_id]);

        return res.json({
            success: true,
            outcome: 'COMMIT_SUCCESSFUL',
            explanation: `Transaction executed and committed. New stock for ${med.medicine_name} is ${updatedMed.stock_quantity}.`,
            logs
        });
    } catch (err) {
        logs.push({ step: 7, action: "ROLLBACK", detail: `Error: ${err.message}. Changes rolled back automatically.` });
        return res.status(400).json({ success: false, outcome: 'ROLLED_BACK', error: err.message, logs });
    }
});

app.get('/api/views', (req, res) => {
    try {
        const views = [
            'vw_PatientAppointmentSummary',
            'vw_DoctorScheduleAvailability',
            'vw_BillingRevenueReport',
            'vw_ActivePrescriptions',
            'vw_DepartmentDoctorCount'
        ];
        res.json({ success: true, views });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/audit-logs', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT 30');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Fallback route for SPA
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    next();
});

app.listen(PORT, '0.0.0.0', async () => {
    await ready;
    console.log(`=======================================================`);
    console.log(`🏥 MediCare Hospital Management System`);
    console.log(`🚀 Server running on http://0.0.0.0:${PORT} (local: http://localhost:${PORT})`);
    console.log(`🗄️ Active Database Engine: [${getEngine().toUpperCase()}]`);
    console.log(`👥 Team: Tanay Bhutada | Hiten Bohra | Aayush Chaudhari`);
    console.log(`=======================================================`);
});
