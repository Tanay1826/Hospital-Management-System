const fs = require('fs');
const path = require('path');
const { query } = require('./db');

const SQL_FILE_PATH = path.join(__dirname, 'hospital_management_system.sql');

function formatSqlValue(val, col) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') {
        if (col === 'total_amount' || col === 'price') {
            return val.toFixed(2);
        }
        return val;
    }
    if (typeof val === 'boolean') return val ? 1 : 0;

    if (val instanceof Date) {
        const yyyy = val.getFullYear();
        const mm = String(val.getMonth() + 1).padStart(2, '0');
        const dd = String(val.getDate()).padStart(2, '0');
        return `'${yyyy}-${mm}-${dd}'`;
    }

    let str = String(val);
    if ((col === 'start_time' || col === 'end_time' || col === 'break_start' || col === 'break_end') && /^\d{2}:\d{2}$/.test(str)) {
        str = str + ':00';
    }
    if ((col === 'total_amount' || col === 'price') && !isNaN(Number(str))) {
        return Number(str).toFixed(2);
    }
    str = str.replace(/'/g, "''");
    return `'${str}'`;
}

function buildInsertStatement(tableName, columns, rows) {
    if (!rows || rows.length === 0) return `-- No records for ${tableName}\n`;
    const colList = columns.join(', ');
    const valuesList = rows.map(r => {
        const vals = columns.map(col => formatSqlValue(r[col], col));
        return `(${vals.join(', ')})`;
    }).join(',\n');
    return `INSERT INTO ${tableName} (${colList}) VALUES\n${valuesList};\n`;
}

// Sequential queue to strictly prevent Windows EBUSY file collisions on concurrent writes
let syncQueue = Promise.resolve();

function syncDatabaseToSqlFile() {
    syncQueue = syncQueue.catch(() => {}).then(() => _performSync());
    return syncQueue;
}

async function _performSync() {
    try {
        if (!fs.existsSync(SQL_FILE_PATH)) {
            console.warn(`[SQL SYNC] Warning: ${SQL_FILE_PATH} not found.`);
            return false;
        }

        const existingContent = fs.readFileSync(SQL_FILE_PATH, 'utf8');

        // Locate Section 2 header and Section 3 header
        const section2Marker = '-- SECTION 2: DML';
        const section3Marker = '-- SECTION 3: DATABASE VIEWS';

        const s2Index = existingContent.indexOf(section2Marker);
        const s3Index = existingContent.indexOf(section3Marker);

        if (s2Index === -1 || s3Index === -1 || s2Index >= s3Index) {
            console.warn('[SQL SYNC] Could not find SECTION 2 and SECTION 3 markers in hospital_management_system.sql');
            return false;
        }

        // Find the delimiter line before Section 2
        const s2Start = existingContent.lastIndexOf('-- ===', s2Index);
        const prefix = existingContent.substring(0, s2Start !== -1 ? s2Start : s2Index);

        // Find the delimiter line before Section 3
        const s3Start = existingContent.lastIndexOf('-- ===', s3Index);
        const suffix = existingContent.substring(s3Start !== -1 ? s3Start : s3Index);

        // Fetch current rows from active database
        const departments = await query('SELECT department_id, department_name, location, floor FROM departments ORDER BY department_id ASC');
        const doctors = await query('SELECT doctor_id, name, email, phone, specialization, experience_years, department_id FROM doctors ORDER BY doctor_id ASC');
        const schedules = await query('SELECT schedule_id, doctor_id, day_of_week, start_time, end_time, break_start, break_end FROM schedules ORDER BY schedule_id ASC');
        const patients = await query('SELECT patient_id, name, email, date_of_birth, gender, phone, address FROM patients ORDER BY patient_id ASC');
        const appointments = await query('SELECT appointment_id, patient_id, doctor_id, appointment_date, start_time, end_time, status, consultation_type FROM appointments ORDER BY appointment_id ASC');
        const medicalHistory = await query('SELECT history_id, patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes FROM medical_history ORDER BY history_id ASC');
        const medications = await query('SELECT medication_id, medicine_name, type, unit, price, stock_quantity FROM medications ORDER BY medication_id ASC');
        const prescriptions = await query('SELECT prescription_id, appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity, prescribed_date FROM prescriptions ORDER BY prescription_id ASC');
        const billing = await query('SELECT bill_id, patient_id, appointment_id, bill_date, total_amount, payment_status, payment_mode FROM billing ORDER BY bill_id ASC');
        const users = await query('SELECT user_id, username, password, role, doctor_id, patient_id, full_name, email FROM users ORDER BY user_id ASC');

        const now = new Date().toLocaleString();

        let s2Content = `-- =====================================================================\n`;
        s2Content += `-- SECTION 2: DML - CURRENT DATABASE DATA (Live Synchronized on ${now})\n`;
        s2Content += `-- =====================================================================\n\n`;

        s2Content += `-- 1. Departments Data\n`;
        s2Content += buildInsertStatement('departments', ['department_id', 'department_name', 'location', 'floor'], departments) + '\n';

        s2Content += `-- 2. Doctors Data\n`;
        s2Content += buildInsertStatement('doctors', ['doctor_id', 'name', 'email', 'phone', 'specialization', 'experience_years', 'department_id'], doctors) + '\n';

        s2Content += `-- 3. Doctor Schedules Data\n`;
        s2Content += buildInsertStatement('schedules', ['schedule_id', 'doctor_id', 'day_of_week', 'start_time', 'end_time', 'break_start', 'break_end'], schedules) + '\n';

        s2Content += `-- 4. Patients Data\n`;
        s2Content += buildInsertStatement('patients', ['patient_id', 'name', 'email', 'date_of_birth', 'gender', 'phone', 'address'], patients) + '\n';

        s2Content += `-- 5. Appointments Data\n`;
        s2Content += buildInsertStatement('appointments', ['appointment_id', 'patient_id', 'doctor_id', 'appointment_date', 'start_time', 'end_time', 'status', 'consultation_type'], appointments) + '\n';

        s2Content += `-- 6. Medical History Data\n`;
        s2Content += buildInsertStatement('medical_history', ['history_id', 'patient_id', 'doctor_id', 'record_date', 'conditions', 'diagnosis', 'treatment', 'notes'], medicalHistory) + '\n';

        s2Content += `-- 7. Medications Data\n`;
        s2Content += buildInsertStatement('medications', ['medication_id', 'medicine_name', 'type', 'unit', 'price', 'stock_quantity'], medications) + '\n';

        s2Content += `-- 8. Prescriptions Data\n`;
        s2Content += buildInsertStatement('prescriptions', ['prescription_id', 'appointment_id', 'doctor_id', 'medication_id', 'dosage', 'frequency', 'duration', 'instructions', 'quantity', 'prescribed_date'], prescriptions) + '\n';

        s2Content += `-- 9. Billing Data\n`;
        s2Content += buildInsertStatement('billing', ['bill_id', 'patient_id', 'appointment_id', 'bill_date', 'total_amount', 'payment_status', 'payment_mode'], billing) + '\n';

        s2Content += `-- 10. Users Data (Login Credentials & Role Assignment)\n`;
        s2Content += buildInsertStatement('users', ['user_id', 'username', 'password', 'role', 'doctor_id', 'patient_id', 'full_name', 'email'], users) + '\n';

        const updatedFileContent = prefix + s2Content + suffix;
        fs.writeFileSync(SQL_FILE_PATH, updatedFileContent, 'utf8');

        console.log(`💾 [SQL SYNC SUCCESS]: 'database/hospital_management_system.sql' successfully synchronized with live database (${doctors.length} doctors, ${patients.length} patients, ${appointments.length} appointments).`);
        return true;
    } catch (err) {
        console.error('[SQL SYNC ERROR]: Failed to synchronize hospital_management_system.sql:', err.message);
        return false;
    }
}

module.exports = {
    syncDatabaseToSqlFile
};
