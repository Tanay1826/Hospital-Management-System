# 🏥 MediCare - Hospital Management System (DBMS Mini Project)

![Database](https://img.shields.io/badge/Database-SQLite%20%7C%20MySQL%20InnoDB-blue)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green)
![Frontend](https://img.shields.io/badge/Frontend-TailwindCSS%20%7C%20Vanilla%20JS-teal)
![License](https://img.shields.io/badge/License-MIT-orange)

An end-to-end relational **Hospital Management System (HMS)** developed as a **DBMS Mini Project** adhering to university syllabus requirements (**Units 7, 8, 9, 10**). The system manages the complete patient journey from registration, doctor scheduling, and appointment booking to medical history logging, pharmacy prescriptions, and billing with **ACID transaction control**.

---

## 👥 Project Team & Contributors

| Student Name | UID | Role / Contribution |
| :--- | :--- | :--- |
| **Tanay Bhutada** | **2025300029** | **Lead Developer & System Architecture** |
| **Hiten Bohra** | **2025300030** | **Database Schema Design & Normalization (3NF/BCNF)** |
| **Aayush Chaudhari** | **2025300035** | **SQL Queries, Stored Procedures & Triggers** |

- **GitHub Repository**: [https://github.com/Tanay1826/hospital-management-system](https://github.com/Tanay1826/hospital-management-system)
- **Primary Contact**: tanaybhutada0607@gmail.com

---

## 📌 Syllabus & Academic Mapping

| Unit | Title | Implementation in MediCare HMS |
| :--- | :--- | :--- |
| **Unit 7** | **Requirement Analysis & Database Design** | ER Diagram, Relational Schema in 3NF/BCNF, Foreign Key & Check constraints, DDL/DML scripts. |
| **Unit 8** | **SQL Query Implementation** | Multi-table `INNER JOIN`, `LEFT JOIN`, Aggregate functions (`SUM`, `AVG`, `COUNT`, `GROUP BY`, `HAVING`), Nested & Correlated Subqueries. |
| **Unit 9** | **Advanced Database Programming** | Stored Procedures (`sp_BookAppointmentWithBilling`, `sp_SettleAppointmentBill`), Triggers (`trg_reduce_medicine_stock`), and 5 Relational Views. |
| **Unit 10** | **Transaction Management & Security** | `START TRANSACTION`, `SAVEPOINT`, `COMMIT` vs `ROLLBACK` simulation with atomic inventory & billing checks. |

---

## 🏗️ System Architecture & ER Diagram

```
 +-------------+       1 : N       +-----------------+       N : 1       +------------+
 |   Patient   | ----------------- |   Appointment   | ----------------- |   Doctor   |
 +-------------+                   +-----------------+                   +------------+
        |                                   |                                   |
        | 1 : N                             | 1 : 1                             | N : 1
        v                                   v                                   v
 +-----------------+               +-----------------+                   +------------+
 | MedicalHistory  |               |     Billing     |                   | Department |
 +-----------------+               +-----------------+                   +------------+
                                            ^                                   |
                                            |                                   | 1 : N
                                            |                                   v
                                   +-----------------+                   +------------+
                                   |  Prescriptions  | <---------------- |  Schedule  |
                                   +-----------------+ (Doctor Prescribes)
                                            |
                                            | N : 1
                                            v
                                   +-----------------+
                                   |   Medications   |
                                   +-----------------+
```

### Relational Schema Tables:
1. `departments` (`department_id` PK, `department_name` UQ, `location`, `floor`)
2. `doctors` (`doctor_id` PK, `name`, `email` UQ, `phone`, `specialization`, `experience_years`, `department_id` FK)
3. `schedules` (`schedule_id` PK, `doctor_id` FK, `day_of_week`, `start_time`, `end_time`, `break_start`, `break_end`)
4. `patients` (`patient_id` PK, `name`, `email` UQ, `date_of_birth`, `gender`, `phone`, `address`, `created_at`)
5. `appointments` (`appointment_id` PK, `patient_id` FK, `doctor_id` FK, `appointment_date`, `start_time`, `end_time`, `status`, `consultation_type`)
6. `medical_history` (`history_id` PK, `patient_id` FK, `doctor_id` FK, `record_date`, `conditions`, `diagnosis`, `treatment`, `notes`)
7. `medications` (`medication_id` PK, `medicine_name` UQ, `type`, `unit`, `price`, `stock_quantity`)
8. `prescriptions` (`prescription_id` PK, `appointment_id` FK, `doctor_id` FK, `medication_id` FK, `dosage`, `frequency`, `duration`, `instructions`, `quantity`, `prescribed_date`)
9. `billing` (`bill_id` PK, `patient_id` FK, `appointment_id` FK, `bill_date`, `total_amount`, `payment_status`, `payment_mode`)
10. `audit_logs` (`log_id` PK, `action_type`, `table_name`, `record_id`, `details`, `timestamp`)

---

## ⚡ Features

- 📊 **Executive Dashboard**: Real-time KPI counters for patient volume, doctors, appointments, revenue, and inventory.
- 👥 **Patient 360° Profile**: Continuous patient journey with complete history of past consultations, diagnoses, and bills.
- 👨‍⚕️ **Doctor & Schedule Management**: Shift and break management preventing double-booking during appointments.
- 📅 **Atomic Appointment Booking**: Atomically checks doctor time availability and generates an invoice in the `billing` table.
- 💊 **Pharmacy Inventory & Automated Triggers**: Prescribing medications triggers database-level stock deduction.
- 💳 **Billing & Printable Invoices**: Instant generation and printing of standardized hospital tax receipts.
- 🧪 **Interactive Viva & SQL Playground**:
  - 1-Click execution of all syllabus queries.
  - Live query runner with execution speed timer in milliseconds.
  - Interactive **COMMIT vs ROLLBACK Simulator** demonstrating ACID properties.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Git

### Installation & Local Run
```bash
# 1. Clone the repository
git clone https://github.com/Tanay1826/hospital-management-system.git

# 2. Navigate into the directory
cd hospital-management-system

# 3. Install dependencies
npm install

# 4. Start the server
npm start
```

Visit **`http://localhost:3000`** in your browser. The embedded database automatically initializes with sample data!

---

## 💻 For MySQL Workbench / phpMyAdmin Users
If your university lab evaluator requires demonstrating queries inside MySQL:
1. Open MySQL Workbench or phpMyAdmin.
2. Execute [`database/mysql_schema.sql`](./database/mysql_schema.sql).
3. Execute [`database/sample_data.sql`](./database/sample_data.sql).

---

## 🤝 Team Collaboration via GitHub

To collaborate with teammates **Hiten Bohra** and **Aayush Chaudhari**:
1. Tanay creates the repository on GitHub under his account: `https://github.com/Tanay1826/hospital-management-system`.
2. Push the local code:
   ```bash
   git remote add origin https://github.com/Tanay1826/hospital-management-system.git
   git branch -M main
   git push -u origin main
   ```
3. Add collaborators:
   - Go to **GitHub Repo > Settings > Collaborators > Add people**.
   - Invite Hiten Bohra and Aayush Chaudhari via their GitHub usernames or emails.
4. Teammates can then clone and push their contributions:
   ```bash
   git clone https://github.com/Tanay1826/hospital-management-system.git
   ```

---

## 📄 License
This project is open-source under the MIT License for educational and academic submission purposes.
