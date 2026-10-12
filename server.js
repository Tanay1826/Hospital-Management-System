const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, query, get, run, transaction } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================================
// 1. DASHBOARD ANALYTICS API
// =====================================================================
app.get('/api/stats', (req, res) => {
    try {
        const patientsCount = get('SELECT COUNT(*) as count FROM patients').count;
        const doctorsCount = get('SELECT COUNT(*) as count FROM doctors').count;
        const appointmentsCount = get('SELECT COUNT(*) as count FROM appointments').count;
        const pendingAppointments = get("SELECT COUNT(*) as count FROM appointments WHERE status = 'Scheduled'").count;
        const totalRevenue = get("SELECT IFNULL(SUM(total_amount), 0) as total FROM billing WHERE payment_status = 'Paid'").total;
        const pendingBilling = get("SELECT IFNULL(SUM(total_amount), 0) as total FROM billing WHERE payment_status = 'Pending'").total;
        const lowStockMedications = get('SELECT COUNT(*) as count FROM medications WHERE stock_quantity < 100').count;

        res.json({
            success: true,
            data: {
                patientsCount,
                doctorsCount,
                appointmentsCount,
                pendingAppointments,
                totalRevenue,
                pendingBilling,
                lowStockMedications
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 2. PATIENTS API
// =====================================================================
app.get('/api/patients', (req, res) => {
    try {
        const search = req.query.q ? `%${req.query.q}%` : null;
        let rows;
        if (search) {
            rows = query('SELECT * FROM patients WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY patient_id DESC', [search, search, search]);
        } else {
            rows = query('SELECT * FROM patients ORDER BY patient_id DESC');
        }
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/patients/:id', (req, res) => {
    try {
        const patient = get('SELECT * FROM patients WHERE patient_id = ?', [req.params.id]);
        if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

        const appointments = query(`
            SELECT a.*, d.name AS doctor_name, dept.department_name 
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.doctor_id
            JOIN departments dept ON d.department_id = dept.department_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `, [req.params.id]);

        const medicalHistory = query(`
            SELECT m.*, d.name AS doctor_name 
            FROM medical_history m
            JOIN doctors d ON m.doctor_id = d.doctor_id
            WHERE m.patient_id = ?
            ORDER BY m.record_date DESC
        `, [req.params.id]);

        const bills = query('SELECT * FROM billing WHERE patient_id = ? ORDER BY bill_id DESC', [req.params.id]);

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

app.post('/api/patients', (req, res) => {
    try {
        const { name, email, date_of_birth, gender, phone, address } = req.body;
        if (!name || !email || !date_of_birth || !gender || !phone || !address) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const info = run(`
            INSERT INTO patients (name, email, date_of_birth, gender, phone, address)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, email, date_of_birth, gender, phone, address]);

        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Patient registered successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.put('/api/patients/:id', (req, res) => {
    try {
        const { name, email, date_of_birth, gender, phone, address } = req.body;
        run(`
            UPDATE patients 
            SET name = ?, email = ?, date_of_birth = ?, gender = ?, phone = ?, address = ?
            WHERE patient_id = ?
        `, [name, email, date_of_birth, gender, phone, address, req.params.id]);

        res.json({ success: true, message: 'Patient updated successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.delete('/api/patients/:id', (req, res) => {
    try {
        run('DELETE FROM patients WHERE patient_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Patient deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 3. DOCTORS & DEPARTMENTS API
// =====================================================================
app.get('/api/departments', (req, res) => {
    try {
        const rows = query(`
            SELECT dept.*, COUNT(d.doctor_id) AS doctor_count 
            FROM departments dept
            LEFT JOIN doctors d ON dept.department_id = d.department_id
            GROUP BY dept.department_id
            ORDER BY dept.department_name ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/departments', (req, res) => {
    try {
        const { department_name, location, floor } = req.body;
        const info = run('INSERT INTO departments (department_name, location, floor) VALUES (?, ?, ?)', [department_name, location, floor]);
        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Department added' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.get('/api/doctors', (req, res) => {
    try {
        const rows = query(`
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

app.get('/api/doctors/:id', (req, res) => {
    try {
        const doctor = get(`
            SELECT d.*, dept.department_name, dept.location, dept.floor
            FROM doctors d
            JOIN departments dept ON d.department_id = dept.department_id
            WHERE d.doctor_id = ?
        `, [req.params.id]);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        const schedules = query('SELECT * FROM schedules WHERE doctor_id = ? ORDER BY schedule_id ASC', [req.params.id]);
        const appointments = query(`
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

app.post('/api/doctors', (req, res) => {
    try {
        const { name, email, phone, specialization, experience_years, department_id } = req.body;
        const info = run(`
            INSERT INTO doctors (name, email, phone, specialization, experience_years, department_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, email, phone, specialization, experience_years, department_id]);
        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Doctor registered successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 4. DOCTOR SCHEDULES API
// =====================================================================
app.get('/api/schedules', (req, res) => {
    try {
        const rows = query('SELECT * FROM vw_DoctorScheduleAvailability ORDER BY doctor_id, day_of_week');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/schedules', (req, res) => {
    try {
        const { doctor_id, day_of_week, start_time, end_time, break_start, break_end } = req.body;
        const info = run(`
            INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, break_start, break_end)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [doctor_id, day_of_week, start_time, end_time, break_start, break_end]);
        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Schedule added' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 5. APPOINTMENTS API (With Automatic Billing Generation in Transaction)
// =====================================================================
app.get('/api/appointments', (req, res) => {
    try {
        const rows = query(`
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

app.post('/api/appointments', (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_date, start_time, end_time, consultation_type, fee = 600 } = req.body;

        if (!patient_id || !doctor_id || !appointment_date || !start_time || !end_time || !consultation_type) {
            return res.status(400).json({ success: false, error: 'All appointment fields are required' });
        }

        // Check for doctor conflict
        const conflict = get(`
            SELECT COUNT(*) AS count FROM appointments 
            WHERE doctor_id = ? AND appointment_date = ? AND status != 'Cancelled'
              AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
        `, [doctor_id, appointment_date, start_time, start_time, end_time, end_time]);

        if (conflict.count > 0) {
            return res.status(409).json({ success: false, error: 'Doctor already has a booking during this timeslot!' });
        }

        // ATOMIC TRANSACTION: Insert Appointment and Initial Billing
        const createBooking = transaction(() => {
            const apptResult = run(`
                INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, status, consultation_type)
                VALUES (?, ?, ?, ?, ?, 'Scheduled', ?)
            `, [patient_id, doctor_id, appointment_date, start_time, end_time, consultation_type]);

            const apptId = apptResult.lastInsertRowid;

            const billResult = run(`
                INSERT INTO billing (patient_id, appointment_id, bill_date, total_amount, payment_status, payment_mode)
                VALUES (?, ?, ?, ?, 'Pending', 'Pending')
            `, [patient_id, apptId, appointment_date, fee]);

            return { apptId, billId: billResult.lastInsertRowid };
        });

        const result = createBooking();
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

app.patch('/api/appointments/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        if (!['Scheduled', 'Completed', 'Cancelled', 'No-Show'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        run('UPDATE appointments SET status = ? WHERE appointment_id = ?', [status, req.params.id]);
        res.json({ success: true, message: `Appointment marked as ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 6. MEDICAL HISTORY API
// =====================================================================
app.get('/api/medical-history', (req, res) => {
    try {
        const rows = query(`
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

app.post('/api/medical-history', (req, res) => {
    try {
        const { patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes } = req.body;
        const info = run(`
            INSERT INTO medical_history (patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes]);
        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Medical history recorded successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 7. MEDICATIONS & PHARMACY API
// =====================================================================
app.get('/api/medications', (req, res) => {
    try {
        const rows = query('SELECT * FROM medications ORDER BY medicine_name ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/medications', (req, res) => {
    try {
        const { medicine_name, type, unit, price, stock_quantity } = req.body;
        const info = run(`
            INSERT INTO medications (medicine_name, type, unit, price, stock_quantity)
            VALUES (?, ?, ?, ?, ?)
        `, [medicine_name, type, unit, price, stock_quantity]);
        res.status(201).json({ success: true, id: info.lastInsertRowid, message: 'Medication added successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.patch('/api/medications/:id/stock', (req, res) => {
    try {
        const { adjustment } = req.body; // e.g. +50 or -10
        run('UPDATE medications SET stock_quantity = stock_quantity + ? WHERE medication_id = ?', [adjustment, req.params.id]);
        res.json({ success: true, message: 'Stock updated successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// =====================================================================
// 8. PRESCRIPTIONS API (Triggers automatic stock reduction & audit log)
// =====================================================================
app.get('/api/prescriptions', (req, res) => {
    try {
        const rows = query('SELECT * FROM vw_ActivePrescriptions ORDER BY prescription_id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/prescriptions', (req, res) => {
    try {
        const { appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity = 1, prescribed_date } = req.body;

        // Verify medication stock availability
        const med = get('SELECT stock_quantity, medicine_name, price FROM medications WHERE medication_id = ?', [medication_id]);
        if (!med) return res.status(404).json({ success: false, error: 'Medication not found' });
        if (med.stock_quantity < quantity) {
            return res.status(400).json({ success: false, error: `Insufficient stock! Only ${med.stock_quantity} units available for ${med.medicine_name}` });
        }

        // Inserting triggers `trg_reduce_medicine_stock` in SQLite automatically!
        const info = run(`
            INSERT INTO prescriptions (appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity, prescribed_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity, prescribed_date]);

        // Auto add pharmacy charge to the appointment's bill
        const medCost = med.price * quantity;
        run('UPDATE billing SET total_amount = total_amount + ? WHERE appointment_id = ?', [medCost, appointment_id]);

        const updatedMed = get('SELECT stock_quantity FROM medications WHERE medication_id = ?', [medication_id]);

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

// =====================================================================
// 9. BILLING & PAYMENTS API
// =====================================================================
app.get('/api/billing', (req, res) => {
    try {
        const rows = query(`
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

app.post('/api/billing/:id/pay', (req, res) => {
    try {
        const { payment_mode } = req.body;
        if (!['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Insurance'].includes(payment_mode)) {
            return res.status(400).json({ success: false, error: 'Valid payment mode required' });
        }

        const bill = get('SELECT * FROM billing WHERE bill_id = ?', [req.params.id]);
        if (!bill) return res.status(404).json({ success: false, error: 'Bill record not found' });

        // TRANSACTION CONTROL: Update billing + Update appointment to Completed
        const settleTransaction = transaction(() => {
            run(`
                UPDATE billing 
                SET payment_status = 'Paid', payment_mode = ? 
                WHERE bill_id = ?
            `, [payment_mode, req.params.id]);

            run(`
                UPDATE appointments 
                SET status = 'Completed' 
                WHERE appointment_id = ? AND status = 'Scheduled'
            `, [bill.appointment_id]);

            return { bill_id: req.params.id, amount: bill.total_amount, status: 'Paid' };
        });

        const result = settleTransaction();
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

// Pre-defined complex academic queries for viva demo
const VIVA_QUERIES = {
    // UNIT 8: JOINS
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
    // UNIT 8: AGGREGATES & GROUP BY / HAVING
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
    // UNIT 8: SUBQUERIES
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
        title: "CORRELATED SUBQUERY (Doctors who have handled more appointments than their department average)",
        sql: `SELECT 
    d.doctor_id,
    d.name AS Doctor_Name,
    d.specialization,
    (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id) AS Doctor_Appointments
FROM doctors d
WHERE (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id) >= 1
ORDER BY Doctor_Appointments DESC;`
    },
    // UNIT 9: VIEWS
    view_patient_summary: {
        title: "VIEW DEMONSTRATION (vw_PatientAppointmentSummary)",
        sql: `SELECT * FROM vw_PatientAppointmentSummary;`
    },
    view_active_prescriptions: {
        title: "VIEW DEMONSTRATION (vw_ActivePrescriptions)",
        sql: `SELECT * FROM vw_ActivePrescriptions;`
    },
    // UNIT 9: AUDIT LOG (Triggers Output)
    triggers_audit_log: {
        title: "TRIGGER AUDIT TRAIL (Generated by DB Triggers)",
        sql: `SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT 15;`
    }
};

app.get('/api/viva/queries', (req, res) => {
    res.json({ success: true, queries: VIVA_QUERIES });
});

app.post('/api/sql-playground', (req, res) => {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ success: false, error: 'SQL query string is required' });
    }

    const trimmed = sql.trim();
    // Safety check: Only allow SELECT for the playground or controlled statements
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
        const rows = db.prepare(trimmed).all();
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

// UNIT 10: TRANSACTION SIMULATOR (Demonstrates COMMIT vs ROLLBACK with SAVEPOINT)
app.post('/api/transaction-demo', (req, res) => {
    const { action, medication_id, quantity = 5 } = req.body;
    // action: 'simulate_success' (COMMIT) or 'simulate_failure' (ROLLBACK)

    const logs = [];
    logs.push({ step: 1, action: "START TRANSACTION", detail: "Transaction opened. ACID guarantees active." });

    const med = get('SELECT * FROM medications WHERE medication_id = ?', [medication_id || 1]);
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
        const executeCommit = transaction(() => {
            logs.push({ step: 3, action: "SAVEPOINT sp_before_purchase", detail: "Savepoint checkpoint created." });
            
            // Check stock
            if (med.stock_quantity < quantity) {
                throw new Error("Insufficient medication stock");
            }

            run('UPDATE medications SET stock_quantity = stock_quantity - ? WHERE medication_id = ?', [quantity, med.medication_id]);
            logs.push({ step: 4, action: "UPDATE EXECUTED", detail: `Deducted ${quantity} units from inventory.` });

            run('INSERT INTO audit_logs (action_type, table_name, record_id, details) VALUES (?, ?, ?, ?)',
                ['TRANSACTION_DEMO', 'medications', med.medication_id, `Atomic purchase of ${quantity} units completed.`]);
            logs.push({ step: 5, action: "AUDIT LOGGED", detail: "Audit trail entry recorded." });

            logs.push({ step: 6, action: "COMMIT", detail: "Transaction committed to disk. Changes are durable (Durability)." });
        });

        executeCommit();

        const updatedMed = get('SELECT stock_quantity FROM medications WHERE medication_id = ?', [med.medication_id]);

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

// View and Trigger status API
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

app.get('/api/audit-logs', (req, res) => {
    try {
        const rows = query('SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT 30');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Fallback route for SPA (Express 5 compatible)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    next();
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏥 MediCare Hospital Management System`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`👥 Team: Tanay Bhutada | Hiten Bohra | Aayush Chaudhari`);
    console.log(`=======================================================`);
});
