# DBMS MINI PROJECT REPORT
## HOSPITAL MANAGEMENT SYSTEM (HMS)

---

### Project Information
- **Course**: Database Management Systems (DBMS) Laboratory
- **Project Title**: Hospital Management System (MediCare HMS)
- **Academic Year**: 2026

### Group Members:
1. **Tanay Bhutada** (UID: 2025300029) - **Lead Developer & System Architecture**
2. **Hiten Bohra** (UID: 2025300030) - **Database Schema & Normalization**
3. **Aayush Chaudhari** (UID: 2025300035) - **SQL Implementation & Stored Procedures**

---

## 1. Introduction & Background
In traditional paper-based hospital management systems, patient medical files, appointment registers, doctor shifts, and pharmacy slips are scattered across separate physical ledgers. This leads to misplacement of critical diagnostic records, scheduling conflicts, duplicate entries, and zero data privacy.

Our **MediCare Hospital Management System** centralizes and links the entire patient journey:
- Maintaining complete historical medical diagnoses and treatments.
- Managing individual doctor shifts, working days, and breaks.
- Associating prescriptions with medications, automated stock deduction, and billing records under atomic transaction control.

---

## 2. Problems in Manual Systems vs Our Relational Solution

| Problems in Manual System | How Our Relational System Solves Them |
| :--- | :--- |
| **Files get lost**: Paper files easily damaged or misplaced. | **Safe Table Storage**: Persistent records indexed by primary keys. |
| **Slow searching**: Finding old files takes excessive time. | **Instant SQL Queries**: Sub-millisecond indexed search across records. |
| **Duplicate entries**: Inconsistent records with typo errors. | **PK & NOT NULL Rules**: Constraints ensure data integrity and uniqueness. |
| **Hard to track appointments**: Overlapping doctor bookings. | **Slot Conflict Validation**: Checks overlapping shifts and appointment times. |
| **History not handy**: Doctors cannot quickly retrieve past charts. | **MedicalHistory Table**: Historical diagnoses accessible in 1 click. |
| **No data privacy**: Paper registers open to unauthorized eyes. | **Role-based Authentication**: Secure database segregation. |

---

## 3. Unit 7: Database Design & Normalization

### 3.1 Entities and Attributes
1. **Department**: `department_id` (PK), `department_name` (UQ), `location`, `floor`.
2. **Doctor**: `doctor_id` (PK), `name`, `email` (UQ), `phone`, `specialization`, `experience_years`, `department_id` (FK).
3. **Schedule**: `schedule_id` (PK), `doctor_id` (FK), `day_of_week`, `start_time`, `end_time`, `break_start`, `break_end`.
4. **Patient**: `patient_id` (PK), `name`, `email` (UQ), `date_of_birth`, `gender`, `phone`, `address`.
5. **Appointment**: `appointment_id` (PK), `patient_id` (FK), `doctor_id` (FK), `appointment_date`, `start_time`, `end_time`, `status`, `consultation_type`.
6. **MedicalHistory**: `history_id` (PK), `patient_id` (FK), `doctor_id` (FK), `record_date`, `conditions`, `diagnosis`, `treatment`, `notes`.
7. **Medication**: `medication_id` (PK), `medicine_name` (UQ), `type`, `unit`, `price`, `stock_quantity`.
8. **Prescription**: `prescription_id` (PK), `appointment_id` (FK), `doctor_id` (FK), `medication_id` (FK), `dosage`, `frequency`, `duration`, `instructions`, `quantity`.
9. **Billing**: `bill_id` (PK), `patient_id` (FK), `appointment_id` (FK), `bill_date`, `total_amount`, `payment_status`, `payment_mode`.
10. **AuditLog**: `log_id` (PK), `action_type`, `table_name`, `record_id`, `details`, `timestamp`.

### 3.2 Normalization Analysis
- **First Normal Form (1NF)**: All attributes are atomic (no repeating groups, multi-valued attributes like phone numbers or medication lists are normalized into distinct rows and associative entities).
- **Second Normal Form (2NF)**: The database is in 1NF and every non-prime attribute is fully functionally dependent on the primary key (no partial dependency on composite keys).
- **Third Normal Form (3NF)**: The database is in 2NF and contains no transitive dependencies ($X \rightarrow Y$ where $Y$ is non-prime only holds when $X$ is a superkey). Doctor details depend on `doctor_id`, and department details depend strictly on `department_id`.
- **Boyce-Codd Normal Form (BCNF)**: For every non-trivial functional dependency $X \rightarrow A$, $X$ is a candidate key.

---

## 4. Unit 8: SQL Query Implementation

### 4.1 Multi-Table INNER JOIN
Retrieves complete appointment information by joining 4 related tables:
```sql
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
```

### 4.2 LEFT OUTER JOIN
Lists all doctors and their count of prescriptions issued, including doctors who have not issued any prescriptions:
```sql
SELECT 
    d.doctor_id,
    d.name AS Doctor_Name,
    d.specialization,
    COUNT(pr.prescription_id) AS Total_Prescriptions_Issued
FROM doctors d
LEFT JOIN prescriptions pr ON d.doctor_id = pr.doctor_id
GROUP BY d.doctor_id, d.name, d.specialization
ORDER BY Total_Prescriptions_Issued DESC;
```

### 4.3 Aggregate Functions with GROUP BY & HAVING
Calculates appointment volume, average doctor experience, and collected revenue grouped by department:
```sql
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
```

### 4.4 Nested Subquery
Finds patients whose total billed amount exceeds the hospital-wide average bill:
```sql
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
```

---

## 5. Unit 9: Advanced Database Programming

### 5.1 Database Views
1. `vw_PatientAppointmentSummary`: Flattens patient, doctor, and department details for quick appointment lookups.
2. `vw_DoctorScheduleAvailability`: Displays doctor shift timings and break hours.
3. `vw_BillingRevenueReport`: Provides real-time financial tracking across consultations.
4. `vw_ActivePrescriptions`: Consolidates prescription dosages and directions.
5. `vw_DepartmentDoctorCount`: Aggregates doctor count per department.

### 5.2 Triggers
- `trg_reduce_medicine_stock`: Whenever an entry is inserted into `prescriptions`, it automatically deducts the prescribed quantity from `medications.stock_quantity` and logs the action into `audit_logs`.
- `trg_prevent_double_booking`: Enforces that no doctor can be scheduled for overlapping times on the same date.
- `trg_billing_status_update_audit`: Automatically captures payment updates and audit trails into `audit_logs`.

---

## 6. Unit 10: Transaction Management & Security

### 6.1 ACID Properties Guarantee
- **Atomicity**: The booking process creates both an `appointments` row and a `billing` row inside an explicit transaction. If any constraint fails, the entire transaction is rolled back with no partial entries.
- **Consistency**: Foreign keys and check constraints (`stock_quantity >= 0`, `total_amount >= 0`) guarantee valid states before and after transactions.
- **Isolation**: Concurrent read and write locks prevent dirty reads.
- **Durability**: Committed data is persistently written to disk.

### 6.2 Transaction Control Simulation
```sql
START TRANSACTION;
SAVEPOINT sp_before_purchase;

-- Check inventory & deduct
UPDATE medications SET stock_quantity = stock_quantity - 2 WHERE medication_id = 1;

-- If payment fails:
-- ROLLBACK TO SAVEPOINT sp_before_purchase;

-- If payment succeeds:
COMMIT;
```

---

## 7. Conclusion
MediCare Hospital Management System successfully integrates database normalization, advanced query processing, procedural business logic, triggers, and transactional integrity into a modern full-stack web application. The application delivers robust data consistency and an interactive platform for evaluating database performance.
