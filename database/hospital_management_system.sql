-- =====================================================================
-- HOSPITAL MANAGEMENT SYSTEM (MediCare HMS)
-- Comprehensive Database Script (MySQL / phpMyAdmin / MySQL Workbench)
-- =====================================================================
-- Academic Course: Database Management Systems (DBMS Mini Project)
-- Group Members:
--   1. Tanay Bhutada    (UID: 2025300029) - Lead Developer
--   2. Hiten Bohra      (UID: 2025300030)
--   3. Aayush Chaudhari (UID: 2025300035)
--
-- Index of Contents:
--   1. DDL: Database & Table Creation with Constraints (Unit 7)
--   2. DML: Sample Data Insertion
--   3. Views: Reporting & Summary Views (Unit 9)
--   4. Triggers: Automated Business Rule Enforcement (Unit 9)
--   5. Advanced Queries: Joins, Aggregates, & Nested Subqueries (Unit 8)
--   6. Transactions: ACID Transaction Control Demo (Unit 10)
-- =====================================================================

-- Step 1: Create and Select the Database
DROP DATABASE IF EXISTS hospital_management_db;
CREATE DATABASE hospital_management_db;
USE hospital_management_db;

-- =====================================================================
-- SECTION 1: DDL - TABLES AND CONSTRAINTS (UNIT 7)
-- =====================================================================

-- 1. Departments Table
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(100) NOT NULL,
    floor VARCHAR(50) NOT NULL
);

-- 2. Doctors Table
CREATE TABLE doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL CHECK (experience_years >= 0),
    department_id INT NOT NULL,
    CONSTRAINT fk_doctors_department 
        FOREIGN KEY (department_id) REFERENCES departments(department_id) 
        ON DELETE RESTRICT
);

-- 3. Doctor Schedules Table
CREATE TABLE schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME NOT NULL,
    break_end TIME NOT NULL,
    CONSTRAINT fk_schedules_doctor 
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) 
        ON DELETE CASCADE
);

-- 4. Patients Table
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Appointments Table
CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No-Show')),
    consultation_type VARCHAR(30) NOT NULL CHECK (consultation_type IN ('In-Person', 'Online/Telehealth', 'Emergency', 'Follow-up')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointments_patient 
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_appointments_doctor 
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) 
        ON DELETE RESTRICT
);

-- 6. Medical History Table
CREATE TABLE medical_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    record_date DATE NOT NULL,
    conditions VARCHAR(255) NOT NULL,
    diagnosis VARCHAR(255) NOT NULL,
    treatment VARCHAR(255) NOT NULL,
    notes TEXT,
    CONSTRAINT fk_history_patient 
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_history_doctor 
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) 
        ON DELETE RESTRICT
);

-- 7. Medications Table
CREATE TABLE medications (
    medication_id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_name VARCHAR(150) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Drops')),
    unit VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
);

-- 8. Prescriptions Table (M:N Relationship between Doctors and Medications)
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    doctor_id INT NOT NULL,
    medication_id INT NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    instructions TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    prescribed_date DATE NOT NULL,
    CONSTRAINT fk_prescriptions_appointment 
        FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_prescriptions_doctor 
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_prescriptions_medication 
        FOREIGN KEY (medication_id) REFERENCES medications(medication_id) 
        ON DELETE RESTRICT
);

-- 9. Billing Table
CREATE TABLE billing (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    appointment_id INT NOT NULL,
    bill_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Refunded', 'Partially Paid')),
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('Cash', 'Credit Card', 'Debit Card', 'UPI', 'Insurance', 'Pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_billing_patient 
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_billing_appointment 
        FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) 
        ON DELETE CASCADE
);

-- 10. Audit Logs Table (Tracks Database Actions & Trigger Logs)
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Users Table (Authentication & Role-Based Access Control - RBAC)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
    doctor_id INT NULL,
    patient_id INT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    CONSTRAINT fk_users_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE SET NULL
);

-- =====================================================================
-- SECTION 2: DML - SAMPLE DATA INSERTS
-- =====================================================================

-- 1. Departments Data
INSERT INTO departments (department_id, department_name, location, floor) VALUES
(1, 'Cardiology', 'Block A, North Wing', '2nd Floor'),
(2, 'Neurology', 'Block B, West Wing', '3rd Floor'),
(3, 'Pediatrics', 'Block A, East Wing', '1st Floor'),
(4, 'Orthopedics', 'Block C, South Wing', 'Ground Floor'),
(5, 'General Medicine', 'Block A, Main Atrium', 'Ground Floor'),
(6, 'Dermatology', 'Block B, East Wing', '2nd Floor'),
(7, 'Oncology', 'Block D, Specialized Care', '4th Floor');

-- 2. Doctors Data
INSERT INTO doctors (doctor_id, name, email, phone, specialization, experience_years, department_id) VALUES
(1, 'Dr. Rajesh Sharma', 'rajesh.sharma@medicare.com', '+91 98201 11223', 'Interventional Cardiologist', 15, 1),
(2, 'Dr. Priya Deshmukh', 'priya.deshmukh@medicare.com', '+91 98202 22334', 'Consultant Neurologist', 12, 2),
(3, 'Dr. Amitav Banerjee', 'amitav.banerjee@medicare.com', '+91 98203 33445', 'Senior Pediatrician', 18, 3),
(4, 'Dr. Sunita Kulkarni', 'sunita.kulkarni@medicare.com', '+91 98204 44556', 'Orthopedic Surgeon', 10, 4),
(5, 'Dr. Vikram Malhotra', 'vikram.malhotra@medicare.com', '+91 98205 55667', 'Internal Medicine Specialist', 8, 5),
(6, 'Dr. Ananya Nair', 'ananya.nair@medicare.com', '+91 98206 66778', 'Cosmetic Dermatologist', 7, 6);

-- 3. Doctor Schedules Data
INSERT INTO schedules (schedule_id, doctor_id, day_of_week, start_time, end_time, break_start, break_end) VALUES
(1, 1, 'Monday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(2, 1, 'Wednesday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(3, 1, 'Friday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(4, 2, 'Tuesday', '10:00:00', '18:00:00', '13:30:00', '14:30:00'),
(5, 2, 'Thursday', '10:00:00', '18:00:00', '13:30:00', '14:30:00'),
(6, 3, 'Monday', '08:30:00', '15:30:00', '12:30:00', '13:30:00'),
(7, 3, 'Wednesday', '08:30:00', '15:30:00', '12:30:00', '13:30:00'),
(8, 3, 'Saturday', '09:00:00', '13:00:00', '11:00:00', '11:30:00'),
(9, 4, 'Tuesday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(10, 4, 'Friday', '09:00:00', '17:00:00', '13:00:00', '14:00:00'),
(11, 5, 'Monday', '08:00:00', '16:00:00', '12:00:00', '13:00:00'),
(12, 5, 'Tuesday', '08:00:00', '16:00:00', '12:00:00', '13:00:00'),
(13, 5, 'Thursday', '08:00:00', '16:00:00', '12:00:00', '13:00:00'),
(14, 6, 'Wednesday', '10:00:00', '18:00:00', '14:00:00', '15:00:00'),
(15, 6, 'Saturday', '10:00:00', '16:00:00', '13:00:00', '13:30:00');

-- 4. Patients Data
INSERT INTO patients (patient_id, name, email, date_of_birth, gender, phone, address) VALUES
(1, 'Rohan Verma', 'rohan.verma@example.com', '1988-04-14', 'Male', '+91 97001 00111', 'Flat 402, Sunshine Apts, Andheri West, Mumbai'),
(2, 'Sneha Patil', 'sneha.patil@example.com', '1995-11-23', 'Female', '+91 97002 00222', '12, Shanti Nagar, Pune, Maharashtra'),
(3, 'Kabir Mehta', 'kabir.mehta@example.com', '2016-08-05', 'Male', '+91 97003 00333', 'Plot 88, Vasant Vihar, New Delhi'),
(4, 'Meera Joshi', 'meera.joshi@example.com', '1972-02-19', 'Female', '+91 97004 00444', '204, Green Meadows, Jayanagar, Bengaluru'),
(5, 'Arjun Reddy', 'arjun.reddy@example.com', '1991-09-30', 'Male', '+91 97005 00555', 'H.No 3-5-102, Banjara Hills, Hyderabad'),
(6, 'Pooja Iyer', 'pooja.iyer@example.com', '2001-06-12', 'Female', '+91 97006 00666', 'Flat 101, Palm Court, Anna Nagar, Chennai');

-- 5. Appointments Data
INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, start_time, end_time, status, consultation_type) VALUES
(1, 1, 1, '2026-10-15', '09:30:00', '10:00:00', 'Scheduled', 'In-Person'),
(2, 2, 2, '2026-10-16', '10:30:00', '11:00:00', 'Scheduled', 'In-Person'),
(3, 3, 3, '2026-10-14', '09:00:00', '09:30:00', 'Scheduled', 'In-Person'),
(4, 4, 4, '2026-10-10', '11:00:00', '11:30:00', 'Completed', 'In-Person'),
(5, 5, 5, '2026-10-11', '10:00:00', '10:30:00', 'Completed', 'Follow-up'),
(6, 6, 6, '2026-10-12', '14:00:00', '14:30:00', 'Completed', 'In-Person'),
(7, 1, 5, '2026-10-08', '08:30:00', '09:00:00', 'Completed', 'Emergency'),
(8, 2, 1, '2026-10-19', '11:00:00', '11:30:00', 'Scheduled', 'Online/Telehealth');

-- 6. Medical History Data
INSERT INTO medical_history (history_id, patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes) VALUES
(1, 1, 1, '2026-06-15', 'Essential Hypertension', 'Elevated BP (150/95 mmHg) with intermittent chest discomfort', 'Started ACE inhibitor and dietary sodium restriction', 'Advised 30 min cardio daily and 3-month follow-up'),
(2, 2, 2, '2026-07-20', 'Chronic Migraine with Aura', 'Unilateral pulsating headache triggered by screen fatigue', 'Prescribed prophylactic beta-blocker and acute triptan therapy', 'Keep a headache diary and maintain regular sleep cycles'),
(3, 3, 3, '2026-08-10', 'Pediatric Allergic Rhinitis & Bronchospasm', 'Seasonal wheezing and nighttime coughing fits', 'Inhaled corticosteroid twice daily with spacer', 'Avoid pollen exposure and feather pillows'),
(4, 4, 4, '2026-10-10', 'Osteoarthritis of Left Knee', 'Grade II joint space narrowing and chronic stiffness', 'Physiotherapy regimen + Hyaluronic acid joint injection', 'Avoid squats and deep stair climbing; use knee brace'),
(5, 5, 5, '2026-10-11', 'Type 2 Diabetes Mellitus', 'Fasting Blood Sugar 165 mg/dL, HbA1c 7.8%', 'Metformin 500mg BD + lifestyle modification', 'Monitored renal profile; results normal');

-- 7. Medications Data
INSERT INTO medications (medication_id, medicine_name, type, unit, price, stock_quantity) VALUES
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

-- 8. Prescriptions Data
INSERT INTO prescriptions (prescription_id, appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity, prescribed_date) VALUES
(1, 4, 4, 7, '1 Capsule', 'Once daily with meals', '30 days', 'Take after breakfast with plenty of water', 1, '2026-10-10'),
(2, 4, 4, 6, '1 Tablet 650mg', 'As needed for knee pain', '5 days', 'Maximum 3 tablets in 24 hours', 1, '2026-10-10'),
(3, 5, 5, 8, '500mg', 'Twice daily after meals', '30 days', 'Check blood sugar fasting once weekly', 2, '2026-10-11'),
(4, 7, 5, 6, '650mg', 'Every 8 hours if fever persists', '3 days', 'Do not take on empty stomach', 1, '2026-10-08'),
(5, 6, 6, 10, 'Apply pea-sized amount', 'Twice daily on affected area', '10 days', 'Avoid contact with eyes and mucous membranes', 1, '2026-10-12');

-- 9. Billing Data
INSERT INTO billing (bill_id, patient_id, appointment_id, bill_date, total_amount, payment_status, payment_mode) VALUES
(1, 1, 1, '2026-10-15', 800.00, 'Pending', 'Pending'),
(2, 2, 2, '2026-10-16', 1000.00, 'Pending', 'Pending'),
(3, 3, 3, '2026-10-14', 600.00, 'Pending', 'Pending'),
(4, 4, 4, '2026-10-10', 1680.00, 'Paid', 'UPI'),
(5, 5, 5, '2026-10-11', 720.00, 'Paid', 'Credit Card'),
(6, 6, 6, '2026-10-12', 885.00, 'Paid', 'Cash'),
(7, 1, 7, '2026-10-08', 1230.00, 'Paid', 'Insurance');

-- 10. Users Data (Login Credentials & Role Assignment)
INSERT INTO users (user_id, username, password, role, doctor_id, patient_id, full_name, email) VALUES
(1, 'admin', 'admin123', 'admin', NULL, NULL, 'Dr. Tanay Bhutada (Admin)', 'admin@medicare.com'),
(2, 'dr.sharma', 'doctor123', 'doctor', 1, NULL, 'Dr. Rajesh Sharma', 'rajesh.sharma@medicare.com'),
(3, 'dr.priya', 'doctor123', 'doctor', 2, NULL, 'Dr. Priya Deshmukh', 'priya.deshmukh@medicare.com'),
(4, 'rohan.verma', 'patient123', 'patient', NULL, 1, 'Rohan Verma', 'rohan.verma@example.com'),
(5, 'sneha.patil', 'patient123', 'patient', NULL, 2, 'Sneha Patil', 'sneha.patil@example.com');

-- =====================================================================
-- SECTION 3: DATABASE VIEWS (UNIT 9)
-- =====================================================================

-- View 1: Patient Appointment Full Summary with Doctor and Department
CREATE OR REPLACE VIEW vw_PatientAppointmentSummary AS
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
CREATE OR REPLACE VIEW vw_DoctorScheduleAvailability AS
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
CREATE OR REPLACE VIEW vw_BillingRevenueReport AS
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
CREATE OR REPLACE VIEW vw_ActivePrescriptions AS
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
CREATE OR REPLACE VIEW vw_DepartmentDoctorCount AS
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

DELIMITER //

-- Trigger 1: Automatically reduce medication stock when a prescription is issued
CREATE TRIGGER trg_reduce_medicine_stock
AFTER INSERT ON prescriptions
FOR EACH ROW
BEGIN
    UPDATE medications 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE medication_id = NEW.medication_id;

    INSERT INTO audit_logs (action_type, table_name, record_id, details)
    VALUES (
        'INSERT_PRESCRIPTION',
        'prescriptions',
        NEW.prescription_id,
        CONCAT('Stock deducted by ', NEW.quantity, ' for medication ID ', NEW.medication_id)
    );
END//

-- Trigger 2: Log new appointment booking into Audit Trail
CREATE TRIGGER trg_appointment_booking_audit
AFTER INSERT ON appointments
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (action_type, table_name, record_id, details)
    VALUES (
        'BOOK_APPOINTMENT',
        'appointments',
        NEW.appointment_id,
        CONCAT('Appointment booked for Patient ', NEW.patient_id, ' with Doctor ', NEW.doctor_id, ' on ', NEW.appointment_date)
    );
END//

-- Trigger 3: Log billing payment status updates
CREATE TRIGGER trg_billing_status_update_audit
AFTER UPDATE ON billing
FOR EACH ROW
BEGIN
    IF OLD.payment_status <> NEW.payment_status THEN
        INSERT INTO audit_logs (action_type, table_name, record_id, details)
        VALUES (
            'PAYMENT_UPDATE',
            'billing',
            NEW.bill_id,
            CONCAT('Payment status changed from ', OLD.payment_status, ' to ', NEW.payment_status, ' via ', NEW.payment_mode)
        );
    END IF;
END//

-- =====================================================================
-- SECTION 4.5: STORED PROCEDURES (UNIT 9 & 10)
-- =====================================================================

-- Procedure 1: Atomic Appointment Booking with Pending Bill Generation
CREATE PROCEDURE sp_BookAppointmentWithBilling(
    IN p_patient_id INT,
    IN p_doctor_id INT,
    IN p_date DATE,
    IN p_start TIME,
    IN p_end TIME,
    IN p_type VARCHAR(50),
    IN p_consultation_fee DECIMAL(10,2),
    OUT p_appointment_id INT,
    OUT p_bill_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, status, consultation_type)
    VALUES (p_patient_id, p_doctor_id, p_date, p_start, p_end, 'Scheduled', p_type);

    SET p_appointment_id = LAST_INSERT_ID();

    INSERT INTO billing (patient_id, appointment_id, bill_date, total_amount, payment_status, payment_mode)
    VALUES (p_patient_id, p_appointment_id, p_date, p_consultation_fee, 'Pending', 'Pending');

    SET p_bill_id = LAST_INSERT_ID();

    COMMIT;
END//

-- Procedure 2: Complete Appointment & Settle Billing
CREATE PROCEDURE sp_SettleAppointmentBill(
    IN p_bill_id INT,
    IN p_payment_mode VARCHAR(50),
    OUT p_result_message VARCHAR(100)
)
BEGIN
    DECLARE v_appt_id INT;

    START TRANSACTION;
    SAVEPOINT before_settle;

    SELECT appointment_id INTO v_appt_id FROM billing WHERE bill_id = p_bill_id;

    IF v_appt_id IS NULL THEN
        ROLLBACK TO SAVEPOINT before_settle;
        SET p_result_message = 'Bill ID not found.';
    ELSE
        UPDATE billing 
        SET payment_status = 'Paid', payment_mode = p_payment_mode 
        WHERE bill_id = p_bill_id;

        UPDATE appointments 
        SET status = 'Completed' 
        WHERE appointment_id = v_appt_id;

        COMMIT;
        SET p_result_message = 'Bill settled and appointment completed successfully.';
    END IF;
END//

DELIMITER ;

-- =====================================================================
-- SECTION 5: ADVANCED SQL QUERIES FOR LAB & VIVA (UNIT 8)
-- =====================================================================

-- Query 1: Multi-Table INNER JOIN (Appointments + Patients + Doctors + Departments)
SELECT 
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
ORDER BY a.appointment_date DESC;

-- Query 2: LEFT OUTER JOIN (Doctors and Prescriptions count)
SELECT 
    d.doctor_id,
    d.name AS Doctor_Name,
    d.specialization,
    COUNT(pr.prescription_id) AS Total_Prescriptions_Issued
FROM doctors d
LEFT JOIN prescriptions pr ON d.doctor_id = pr.doctor_id
GROUP BY d.doctor_id, d.name, d.specialization
ORDER BY Total_Prescriptions_Issued DESC;

-- Query 3: AGGREGATE FUNCTIONS with GROUP BY & HAVING (Revenue by Department)
SELECT 
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
ORDER BY Realized_Revenue DESC;

-- Query 4: NESTED SUBQUERY (Patients with Billing Amount > Hospital Average)
SELECT 
    p.patient_id,
    p.name AS Patient_Name,
    b.total_amount AS Billed_Amount,
    b.payment_status,
    ROUND((SELECT AVG(total_amount) FROM billing), 2) AS Hospital_Avg_Bill
FROM billing b
JOIN patients p ON b.patient_id = p.patient_id
WHERE b.total_amount > (SELECT AVG(total_amount) FROM billing)
ORDER BY b.total_amount DESC;

-- Query 5: CORRELATED SUBQUERY (Doctors who have handled more appointments than average)
SELECT 
    d.doctor_id,
    d.name AS Doctor_Name,
    d.specialization,
    (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id) AS Doctor_Appointments
FROM doctors d
WHERE (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = d.doctor_id) >= 1
ORDER BY Doctor_Appointments DESC;

-- =====================================================================
-- SECTION 6: ACID TRANSACTION DEMONSTRATION (UNIT 10)
-- =====================================================================

-- Step A: Start Transaction
START TRANSACTION;

-- Step B: Set Savepoint Checkpoint
SAVEPOINT sp_before_purchase;

-- Step C: Perform Inventory Deduction
UPDATE medications 
SET stock_quantity = stock_quantity - 2 
WHERE medication_id = 1;

-- Step D: Record Audit Trail
INSERT INTO audit_logs (action_type, table_name, record_id, details)
VALUES ('TRANSACTION_DEMO', 'medications', 1, 'Purchased 2 units atomically');

-- Step E: Commit Changes (Or ROLLBACK TO SAVEPOINT sp_before_purchase on failure)
COMMIT;
