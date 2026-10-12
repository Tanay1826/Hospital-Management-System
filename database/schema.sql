-- =====================================================================
-- DATABASE SCHEMA: HOSPITAL MANAGEMENT SYSTEM (DBMS MINI PROJECT)
-- Group Members:
--   1. Tanay Bhutada    (UID: 2025300029) - Lead Developer
--   2. Hiten Bohra      (UID: 2025300030)
--   3. Aayush Chaudhari (UID: 2025300035)
-- Compatible with SQLite & relational standards
-- =====================================================================

PRAGMA foreign_keys = ON;

-- 1. DEPARTMENT TABLE
CREATE TABLE IF NOT EXISTS departments (
    department_id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_name TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    floor TEXT NOT NULL
);

-- 2. DOCTOR TABLE
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    specialization TEXT NOT NULL,
    experience_years INTEGER NOT NULL CHECK (experience_years >= 0),
    department_id INTEGER NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT
);

-- 3. DOCTOR SCHEDULE TABLE
CREATE TABLE IF NOT EXISTS schedules (
    schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    break_start TEXT NOT NULL,
    break_end TEXT NOT NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
);

-- 4. PATIENT TABLE
CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    date_of_birth TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. APPOINTMENT TABLE
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No-Show')),
    consultation_type TEXT NOT NULL CHECK (consultation_type IN ('In-Person', 'Online/Telehealth', 'Emergency', 'Follow-up')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT
);

-- 6. MEDICAL HISTORY TABLE
CREATE TABLE IF NOT EXISTS medical_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    record_date TEXT NOT NULL,
    conditions TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    treatment TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT
);

-- 7. MEDICATION TABLE
CREATE TABLE IF NOT EXISTS medications (
    medication_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Drops')),
    unit TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
);

-- 8. PRESCRIPTION TABLE (Doctor Prescribes Medication - M:N Relationship)
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    medication_id INTEGER NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    prescribed_date TEXT NOT NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
    FOREIGN KEY (medication_id) REFERENCES medications(medication_id) ON DELETE RESTRICT
);

-- 9. BILLING TABLE
CREATE TABLE IF NOT EXISTS billing (
    bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER NOT NULL,
    bill_date TEXT NOT NULL,
    total_amount REAL NOT NULL CHECK (total_amount >= 0),
    payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Refunded', 'Partially Paid')),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'Credit Card', 'Debit Card', 'UPI', 'Insurance', 'Pending')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE
);

-- 10. AUDIT LOG TABLE (Advanced DBMS: Trigger & Transaction Tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- DATABASE VIEWS (Unit 9: Advanced Database Programming)
-- =====================================================================

-- View 1: Patient Appointment Full Summary with Doctor and Department
CREATE VIEW IF NOT EXISTS vw_PatientAppointmentSummary AS
SELECT 
    a.appointment_id,
    p.name AS patient_name,
    p.email AS patient_email,
    p.phone AS patient_phone,
    d.name AS doctor_name,
    dept.department_name,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.consultation_type
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN doctors d ON a.doctor_id = d.doctor_id
JOIN departments dept ON d.department_id = dept.department_id;

-- View 2: Doctor Schedule and Availability
CREATE VIEW IF NOT EXISTS vw_DoctorScheduleAvailability AS
SELECT 
    d.doctor_id,
    d.name AS doctor_name,
    d.specialization,
    dept.department_name,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.break_start,
    s.break_end
FROM schedules s
JOIN doctors d ON s.doctor_id = d.doctor_id
JOIN departments dept ON d.department_id = dept.department_id;

-- View 3: Billing & Revenue Report
CREATE VIEW IF NOT EXISTS vw_BillingRevenueReport AS
SELECT 
    b.bill_id,
    p.name AS patient_name,
    d.name AS consulting_doctor,
    b.appointment_id,
    b.bill_date,
    b.total_amount,
    b.payment_status,
    b.payment_mode
FROM billing b
JOIN patients p ON b.patient_id = p.patient_id
JOIN appointments a ON b.appointment_id = a.appointment_id
JOIN doctors d ON a.doctor_id = d.doctor_id;

-- View 4: Active Prescriptions & Medications
CREATE VIEW IF NOT EXISTS vw_ActivePrescriptions AS
SELECT 
    pr.prescription_id,
    p.name AS patient_name,
    d.name AS doctor_name,
    m.medicine_name,
    m.type AS medicine_type,
    pr.dosage,
    pr.frequency,
    pr.duration,
    pr.instructions,
    pr.quantity,
    pr.prescribed_date
FROM prescriptions pr
JOIN appointments a ON pr.appointment_id = a.appointment_id
JOIN patients p ON a.patient_id = p.patient_id
JOIN doctors d ON pr.doctor_id = d.doctor_id
JOIN medications m ON pr.medication_id = m.medication_id;

-- View 5: Department Analytics View
CREATE VIEW IF NOT EXISTS vw_DepartmentDoctorCount AS
SELECT 
    dept.department_id,
    dept.department_name,
    dept.location,
    dept.floor,
    COUNT(DISTINCT d.doctor_id) AS total_doctors,
    COUNT(DISTINCT a.appointment_id) AS total_appointments
FROM departments dept
LEFT JOIN doctors d ON dept.department_id = d.department_id
LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
GROUP BY dept.department_id, dept.department_name, dept.location, dept.floor;

-- =====================================================================
-- DATABASE TRIGGERS (Unit 9: Business Rule Enforcement)
-- =====================================================================

-- Trigger 1: Automatically reduce medication stock when a prescription is issued
CREATE TRIGGER IF NOT EXISTS trg_reduce_medicine_stock
AFTER INSERT ON prescriptions
BEGIN
    UPDATE medications 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE medication_id = NEW.medication_id;

    INSERT INTO audit_logs (action_type, table_name, record_id, details)
    VALUES (
        'INSERT_PRESCRIPTION',
        'prescriptions',
        NEW.prescription_id,
        'Stock deducted by ' || NEW.quantity || ' for medication ID ' || NEW.medication_id
    );
END;

-- Trigger 2: Log new appointment booking into Audit Trail
CREATE TRIGGER IF NOT EXISTS trg_appointment_booking_audit
AFTER INSERT ON appointments
BEGIN
    INSERT INTO audit_logs (action_type, table_name, record_id, details)
    VALUES (
        'BOOK_APPOINTMENT',
        'appointments',
        NEW.appointment_id,
        'Appointment booked for Patient ' || NEW.patient_id || ' with Doctor ' || NEW.doctor_id || ' on ' || NEW.appointment_date
    );
END;

-- Trigger 3: Log billing payment status updates
CREATE TRIGGER IF NOT EXISTS trg_billing_status_update_audit
AFTER UPDATE OF payment_status ON billing
BEGIN
    INSERT INTO audit_logs (action_type, table_name, record_id, details)
    VALUES (
        'PAYMENT_UPDATE',
        'billing',
        NEW.bill_id,
        'Payment status changed from ' || OLD.payment_status || ' to ' || NEW.payment_status || ' via ' || NEW.payment_mode
    );
END;
