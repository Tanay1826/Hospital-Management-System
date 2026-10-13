-- =====================================================================
-- HOSPITAL MANAGEMENT SYSTEM (MediCare HMS)
-- Comprehensive All-in-One Database Script
-- =====================================================================
-- Course: Database Management Systems (DBMS Mini Project)
-- Group Members:
--   1. Tanay Bhutada    (UID: 2025300029) - Lead Developer
--   2. Hiten Bohra      (UID: 2025300030)
--   3. Aayush Chaudhari (UID: 2025300035)
--
-- Contents:
--   1. DDL: Table Definitions & Integrity Constraints (Unit 7)
--   2. DML: Sample Data Inserts (Departments, Doctors, Patients, etc.)
--   3. Views: Relational Reporting Views (Unit 9)
--   4. Triggers: Automated Business Rule Enforcement (Unit 9)
--   5. Queries: Joins, Aggregations, & Subqueries (Unit 8)
--   6. Transactions: ACID Transaction Control Demo (Unit 10)
-- =====================================================================

PRAGMA foreign_keys = ON;

-- =====================================================================
-- SECTION 1: DDL - TABLE DEFINITIONS & INTEGRITY CONSTRAINTS (UNIT 7)
-- =====================================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    department_id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_name TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    floor TEXT NOT NULL
);

-- 2. Doctors Table
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

-- 3. Doctor Schedules Table
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

-- 4. Patients Table
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

-- 5. Appointments Table
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

-- 6. Medical History Table
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

-- 7. Medications Table
CREATE TABLE IF NOT EXISTS medications (
    medication_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Drops')),
    unit TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
);

-- 8. Prescriptions Table (M:N Associative Entity: Doctors Prescribe Medications)
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

-- 9. Billing Table
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

-- 10. Audit Logs Table (Transaction & Trigger Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- SECTION 2: DML - SAMPLE DATA INSERTS
-- =====================================================================

-- 1. Departments
INSERT OR IGNORE INTO departments (department_id, department_name, location, floor) VALUES
(1, 'Cardiology', 'Block A, North Wing', '2nd Floor'),
(2, 'Neurology', 'Block B, West Wing', '3rd Floor'),
(3, 'Pediatrics', 'Block A, East Wing', '1st Floor'),
(4, 'Orthopedics', 'Block C, South Wing', 'Ground Floor'),
(5, 'General Medicine', 'Block A, Main Atrium', 'Ground Floor'),
(6, 'Dermatology', 'Block B, East Wing', '2nd Floor'),
(7, 'Oncology', 'Block D, Specialized Care', '4th Floor');

-- 2. Doctors
INSERT OR IGNORE INTO doctors (doctor_id, name, email, phone, specialization, experience_years, department_id) VALUES
(1, 'Dr. Rajesh Sharma', 'rajesh.sharma@medicare.com', '+91 98201 11223', 'Interventional Cardiologist', 15, 1),
(2, 'Dr. Priya Deshmukh', 'priya.deshmukh@medicare.com', '+91 98202 22334', 'Consultant Neurologist', 12, 2),
(3, 'Dr. Amitav Banerjee', 'amitav.banerjee@medicare.com', '+91 98203 33445', 'Senior Pediatrician', 18, 3),
(4, 'Dr. Sunita Kulkarni', 'sunita.kulkarni@medicare.com', '+91 98204 44556', 'Orthopedic Surgeon', 10, 4),
(5, 'Dr. Vikram Malhotra', 'vikram.malhotra@medicare.com', '+91 98205 55667', 'Internal Medicine Specialist', 8, 5),
(6, 'Dr. Ananya Nair', 'ananya.nair@medicare.com', '+91 98206 66778', 'Cosmetic Dermatologist', 7, 6);

-- 3. Doctor Schedules
INSERT OR IGNORE INTO schedules (schedule_id, doctor_id, day_of_week, start_time, end_time, break_start, break_end) VALUES
(1, 1, 'Monday', '09:00', '17:00', '13:00', '14:00'),
(2, 1, 'Wednesday', '09:00', '17:00', '13:00', '14:00'),
(3, 1, 'Friday', '09:00', '17:00', '13:00', '14:00'),
(4, 2, 'Tuesday', '10:00', '18:00', '13:30', '14:30'),
(5, 2, 'Thursday', '10:00', '18:00', '13:30', '14:30'),
(6, 3, 'Monday', '08:30', '15:30', '12:30', '13:30'),
(7, 3, 'Wednesday', '08:30', '15:30', '12:30', '13:30'),
(8, 3, 'Saturday', '09:00', '13:00', '11:00', '11:30'),
(9, 4, 'Tuesday', '09:00', '17:00', '13:00', '14:00'),
(10, 4, 'Friday', '09:00', '17:00', '13:00', '14:00'),
(11, 5, 'Monday', '08:00', '16:00', '12:00', '13:00'),
(12, 5, 'Tuesday', '08:00', '16:00', '12:00', '13:00'),
(13, 5, 'Thursday', '08:00', '16:00', '12:00', '13:00'),
(14, 6, 'Wednesday', '10:00', '18:00', '14:00', '15:00'),
(15, 6, 'Saturday', '10:00', '16:00', '13:00', '13:30');

-- 4. Patients
INSERT OR IGNORE INTO patients (patient_id, name, email, date_of_birth, gender, phone, address) VALUES
(1, 'Rohan Verma', 'rohan.verma@example.com', '1988-04-14', 'Male', '+91 97001 00111', 'Flat 402, Sunshine Apts, Andheri West, Mumbai'),
(2, 'Sneha Patil', 'sneha.patil@example.com', '1995-11-23', 'Female', '+91 97002 00222', '12, Shanti Nagar, Pune, Maharashtra'),
(3, 'Kabir Mehta', 'kabir.mehta@example.com', '2016-08-05', 'Male', '+91 97003 00333', 'Plot 88, Vasant Vihar, New Delhi'),
(4, 'Meera Joshi', 'meera.joshi@example.com', '1972-02-19', 'Female', '+91 97004 00444', '204, Green Meadows, Jayanagar, Bengaluru'),
(5, 'Arjun Reddy', 'arjun.reddy@example.com', '1991-09-30', 'Male', '+91 97005 00555', 'H.No 3-5-102, Banjara Hills, Hyderabad'),
(6, 'Pooja Iyer', 'pooja.iyer@example.com', '2001-06-12', 'Female', '+91 97006 00666', 'Flat 101, Palm Court, Anna Nagar, Chennai');

-- 5. Appointments
INSERT OR IGNORE INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, start_time, end_time, status, consultation_type) VALUES
(1, 1, 1, '2026-10-15', '09:30', '10:00', 'Scheduled', 'In-Person'),
(2, 2, 2, '2026-10-16', '10:30', '11:00', 'Scheduled', 'In-Person'),
(3, 3, 3, '2026-10-14', '09:00', '09:30', 'Scheduled', 'In-Person'),
(4, 4, 4, '2026-10-10', '11:00', '11:30', 'Completed', 'In-Person'),
(5, 5, 5, '2026-10-11', '10:00', '10:30', 'Completed', 'Follow-up'),
(6, 6, 6, '2026-10-12', '14:00', '14:30', 'Completed', 'In-Person'),
(7, 1, 5, '2026-10-08', '08:30', '09:00', 'Completed', 'Emergency'),
(8, 2, 1, '2026-10-19', '11:00', '11:30', 'Scheduled', 'Online/Telehealth');

-- 6. Medical History
INSERT OR IGNORE INTO medical_history (history_id, patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes) VALUES
(1, 1, 1, '2026-06-15', 'Essential Hypertension', 'Elevated BP (150/95 mmHg) with intermittent chest discomfort', 'Started ACE inhibitor and dietary sodium restriction', 'Advised 30 min cardio daily and 3-month follow-up'),
(2, 2, 2, '2026-07-20', 'Chronic Migraine with Aura', 'Unilateral pulsating headache triggered by screen fatigue', 'Prescribed prophylactic beta-blocker and acute triptan therapy', 'Keep a headache diary and maintain regular sleep cycles'),
(3, 3, 3, '2026-08-10', 'Pediatric Allergic Rhinitis & Bronchospasm', 'Seasonal wheezing and nighttime coughing fits', 'Inhaled corticosteroid twice daily with spacer', 'Avoid pollen exposure and feather pillows'),
(4, 4, 4, '2026-10-10', 'Osteoarthritis of Left Knee', 'Grade II joint space narrowing and chronic stiffness', 'Physiotherapy regimen + Hyaluronic acid joint injection', 'Avoid squats and deep stair climbing; use knee brace'),
(5, 5, 5, '2026-10-11', 'Type 2 Diabetes Mellitus', 'Fasting Blood Sugar 165 mg/dL, HbA1c 7.8%', 'Metformin 500mg BD + lifestyle modification', 'Monitored renal profile; results normal');

-- 7. Medications
INSERT OR IGNORE INTO medications (medication_id, medicine_name, type, unit, price, stock_quantity) VALUES
(1, 'Amlodipine Besylate 5mg', 'Tablet', '10 tablets', 45.00, 350),
(2, 'Telmisartan 40mg', 'Tablet', '14 tablets', 110.00, 200),
(3, 'Sumatriptan 50mg', 'Tablet', '4 tablets', 180.00, 85),
(4, 'Montelukast & Levocetirizine', 'Tablet', '10 tablets', 125.00, 150),
(5, 'Salbutamol Inhaler 100mcg', 'Drops', '200 doses', 220.00, 90),
(6, 'Paracetamol 650mg', 'Tablet', '15 tablets', 30.00, 500),
(7, 'Glucosamine & Chondroitin', 'Capsule', '30 capsules', 450.00, 60),
(8, 'Metformin Hydrochloride 500mg', 'Tablet', '20 tablets', 60.00, 280),
(9, 'Amoxicillin & Clavulanate 625mg', 'Tablet', '6 tablets', 195.00, 110),
(10, 'Hydrocortisone Cream 1%', 'Ointment', '30g tube', 85.00, 75);

-- 8. Prescriptions
INSERT OR IGNORE INTO prescriptions (prescription_id, appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity, prescribed_date) VALUES
(1, 4, 4, 7, '1 Capsule', 'Once daily with meals', '30 days', 'Take after breakfast with plenty of water', 1, '2026-10-10'),
(2, 4, 4, 6, '1 Tablet 650mg', 'As needed for knee pain', '5 days', 'Maximum 3 tablets in 24 hours', 1, '2026-10-10'),
(3, 5, 5, 8, '500mg', 'Twice daily after meals', '30 days', 'Check blood sugar fasting once weekly', 2, '2026-10-11'),
(4, 7, 5, 6, '650mg', 'Every 8 hours if fever persists', '3 days', 'Do not take on empty stomach', 1, '2026-10-08'),
(5, 6, 6, 10, 'Apply pea-sized amount', 'Twice daily on affected area', '10 days', 'Avoid contact with eyes and mucous membranes', 1, '2026-10-12');

-- 9. Billing
INSERT OR IGNORE INTO billing (bill_id, patient_id, appointment_id, bill_date, total_amount, payment_status, payment_mode) VALUES
(1, 1, 1, '2026-10-15', 800.00, 'Pending', 'Pending'),
(2, 2, 2, '2026-10-16', 1000.00, 'Pending', 'Pending'),
(3, 3, 3, '2026-10-14', 600.00, 'Pending', 'Pending'),
(4, 4, 4, '2026-10-10', 1680.00, 'Paid', 'UPI'),
(5, 5, 5, '2026-10-11', 720.00, 'Paid', 'Credit Card'),
(6, 6, 6, '2026-10-12', 885.00, 'Paid', 'Cash'),
(7, 1, 7, '2026-10-08', 1230.00, 'Paid', 'Insurance');

-- =====================================================================
-- SECTION 3: DATABASE VIEWS (UNIT 9)
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
-- SECTION 4: DATABASE TRIGGERS (UNIT 9)
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

-- =====================================================================
-- SECTION 5: ADVANCED SQL QUERIES FOR EVALUATION & VIVA (UNIT 8)
-- =====================================================================

-- Query 1: Multi-Table INNER JOIN (Appointments + Patients + Doctors + Departments)
-- SELECT 
--     a.appointment_id,
--     p.name AS Patient_Name,
--     d.name AS Doctor_Name,
--     dept.department_name AS Department,
--     a.appointment_date AS Date,
--     a.start_time AS Time,
--     a.status AS Status
-- FROM appointments a
-- INNER JOIN patients p ON a.patient_id = p.patient_id
-- INNER JOIN doctors d ON a.doctor_id = d.doctor_id
-- INNER JOIN departments dept ON d.department_id = dept.department_id
-- ORDER BY a.appointment_date DESC;

-- Query 2: LEFT OUTER JOIN (Doctors and Prescriptions count)
-- SELECT 
--     d.doctor_id,
--     d.name AS Doctor_Name,
--     d.specialization,
--     COUNT(pr.prescription_id) AS Total_Prescriptions_Issued
-- FROM doctors d
-- LEFT JOIN prescriptions pr ON d.doctor_id = pr.doctor_id
-- GROUP BY d.doctor_id, d.name, d.specialization
-- ORDER BY Total_Prescriptions_Issued DESC;

-- Query 3: AGGREGATE FUNCTIONS with GROUP BY & HAVING (Revenue by Department)
-- SELECT 
--     dept.department_name,
--     COUNT(DISTINCT a.appointment_id) AS Total_Appointments,
--     ROUND(AVG(d.experience_years), 1) AS Avg_Doctor_Experience_Yrs,
--     SUM(b.total_amount) AS Total_Billed_Amount,
--     SUM(CASE WHEN b.payment_status = 'Paid' THEN b.total_amount ELSE 0 END) AS Realized_Revenue
-- FROM departments dept
-- JOIN doctors d ON dept.department_id = d.department_id
-- JOIN appointments a ON d.doctor_id = a.doctor_id
-- JOIN billing b ON a.appointment_id = b.appointment_id
-- GROUP BY dept.department_id, dept.department_name
-- HAVING Total_Appointments >= 1
-- ORDER BY Realized_Revenue DESC;

-- Query 4: NESTED SUBQUERY (Patients with Billing Amount > Hospital Average)
-- SELECT 
--     p.patient_id,
--     p.name AS Patient_Name,
--     b.total_amount AS Billed_Amount,
--     b.payment_status,
--     ROUND((SELECT AVG(total_amount) FROM billing), 2) AS Hospital_Avg_Bill
-- FROM billing b
-- JOIN patients p ON b.patient_id = p.patient_id
-- WHERE b.total_amount > (SELECT AVG(total_amount) FROM billing)
-- ORDER BY b.total_amount DESC;

-- Query 5: CORRELATED SUBQUERY (Doctors who handled appointments)
-- SELECT 
--     d.doctor_id,
--     d.name AS Doctor_Name,
--     d.specialization,
--     (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id) AS Doctor_Appointments
-- FROM doctors d
-- WHERE (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id) >= 1
-- ORDER BY Doctor_Appointments DESC;

-- =====================================================================
-- SECTION 6: TRANSACTION MANAGEMENT DEMONSTRATION (UNIT 10)
-- =====================================================================
-- BEGIN TRANSACTION;
-- SAVEPOINT sp_before_purchase;
-- UPDATE medications SET stock_quantity = stock_quantity - 2 WHERE medication_id = 1;
-- INSERT INTO audit_logs (action_type, table_name, record_id, details)
-- VALUES ('TRANSACTION_DEMO', 'medications', 1, 'Purchased 2 units atomically');
-- COMMIT;
