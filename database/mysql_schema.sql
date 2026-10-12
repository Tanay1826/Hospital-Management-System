-- =====================================================================
-- DATABASE SCHEMA: HOSPITAL MANAGEMENT SYSTEM (FOR MYSQL WORKBENCH / PHPMYADMIN)
-- DBMS Mini Project - SPIT / University Submission
-- Team Members:
--   1. Tanay Bhutada    (UID: 2025300029) - Team Lead
--   2. Hiten Bohra      (UID: 2025300030)
--   3. Aayush Chaudhari (UID: 2025300035)
-- =====================================================================

DROP DATABASE IF EXISTS hospital_management_db;
CREATE DATABASE hospital_management_db;
USE hospital_management_db;

-- ---------------------------------------------------------------------
-- UNIT 7: TABLES & CONSTRAINTS (1NF, 2NF, 3NF, BCNF COMPLIANT)
-- ---------------------------------------------------------------------

-- 1. Departments Table
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(100) NOT NULL,
    floor VARCHAR(20) NOT NULL
) ENGINE=InnoDB;

-- 2. Doctors Table
CREATE TABLE doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL CHECK (experience_years >= 0),
    department_id INT NOT NULL,
    CONSTRAINT fk_doctor_department FOREIGN KEY (department_id) 
        REFERENCES departments(department_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. Doctor Schedules Table
CREATE TABLE schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME NOT NULL,
    break_end TIME NOT NULL,
    CONSTRAINT fk_schedule_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctors(doctor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Patients Table
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    gender ENUM('Male','Female','Other') NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Appointments Table
CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('Scheduled','Completed','Cancelled','No-Show') DEFAULT 'Scheduled',
    consultation_type ENUM('In-Person','Online/Telehealth','Emergency','Follow-up') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) 
        REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctors(doctor_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 6. Medical History Table
CREATE TABLE medical_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    record_date DATE NOT NULL,
    conditions TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    treatment TEXT NOT NULL,
    notes TEXT,
    CONSTRAINT fk_medhistory_patient FOREIGN KEY (patient_id) 
        REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_medhistory_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctors(doctor_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 7. Medications Table
CREATE TABLE medications (
    medication_id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_name VARCHAR(150) NOT NULL UNIQUE,
    type ENUM('Tablet','Syrup','Injection','Capsule','Ointment','Drops') NOT NULL,
    unit VARCHAR(30) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
) ENGINE=InnoDB;

-- 8. Prescriptions Table (M:N relationship)
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    doctor_id INT NOT NULL,
    medication_id INT NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    instructions TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    prescribed_date DATE NOT NULL,
    CONSTRAINT fk_presc_appointment FOREIGN KEY (appointment_id) 
        REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    CONSTRAINT fk_presc_doctor FOREIGN KEY (doctor_id) 
        REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
    CONSTRAINT fk_presc_medication FOREIGN KEY (medication_id) 
        REFERENCES medications(medication_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 9. Billing Table
CREATE TABLE billing (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    appointment_id INT NOT NULL,
    bill_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_status ENUM('Pending','Paid','Refunded','Partially Paid') DEFAULT 'Pending',
    payment_mode ENUM('Cash','Credit Card','Debit Card','UPI','Insurance','Pending') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bill_patient FOREIGN KEY (patient_id) 
        REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_bill_appointment FOREIGN KEY (appointment_id) 
        REFERENCES appointments(appointment_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Audit Logs Table
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- UNIT 9: VIEWS
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- UNIT 9: TRIGGERS
-- ---------------------------------------------------------------------

DELIMITER //

-- Trigger 1: Stock deduction trigger on prescription
CREATE TRIGGER trg_reduce_medicine_stock_mysql
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
        CONCAT('Deducted ', NEW.quantity, ' units from medication ID ', NEW.medication_id)
    );
END//

-- Trigger 2: Prevent appointment slot collision
CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT ON appointments
FOR EACH ROW
BEGIN
    DECLARE clash_count INT;
    SELECT COUNT(*) INTO clash_count
    FROM appointments
    WHERE doctor_id = NEW.doctor_id 
      AND appointment_date = NEW.appointment_date
      AND status NOT IN ('Cancelled')
      AND (
          (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
          (NEW.end_time > start_time AND NEW.end_time <= end_time)
      );
      
    IF clash_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Doctor already has an overlapping appointment at this time!';
    END IF;
END//

-- Trigger 3: Audit log on bill status change
CREATE TRIGGER trg_billing_status_audit_mysql
AFTER UPDATE ON billing
FOR EACH ROW
BEGIN
    IF OLD.payment_status <> NEW.payment_status THEN
        INSERT INTO audit_logs (action_type, table_name, record_id, details)
        VALUES (
            'PAYMENT_STATUS_UPDATE',
            'billing',
            NEW.bill_id,
            CONCAT('Status updated from ', OLD.payment_status, ' to ', NEW.payment_status, ' via ', NEW.payment_mode)
        );
    END IF;
END//

-- ---------------------------------------------------------------------
-- UNIT 9: STORED PROCEDURES
-- ---------------------------------------------------------------------

-- Procedure 1: Book Appointment and Auto-Generate Pending Bill
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
    -- UNIT 10: TRANSACTION MANAGEMENT
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
        SET p_result_message = 'Bill settled and appointment marked Completed successfully.';
    END IF;
END//

DELIMITER ;
