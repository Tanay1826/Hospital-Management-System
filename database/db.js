const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'hospital.db');

// Ensure database directory exists if custom path is provided
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: null });

// Enable Foreign Key constraints in SQLite
db.pragma('foreign_keys = ON');

// Initialize database schema and seed data for the web application
function initializeDatabase() {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS departments (
                department_id INTEGER PRIMARY KEY AUTOINCREMENT,
                department_name TEXT NOT NULL UNIQUE,
                location TEXT NOT NULL,
                floor TEXT NOT NULL
            );

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

            CREATE TABLE IF NOT EXISTS medications (
                medication_id INTEGER PRIMARY KEY AUTOINCREMENT,
                medicine_name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL CHECK (type IN ('Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Drops')),
                unit TEXT NOT NULL,
                price REAL NOT NULL CHECK (price >= 0),
                stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
            );

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

            CREATE TABLE IF NOT EXISTS audit_logs (
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                table_name TEXT NOT NULL,
                record_id INTEGER,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Views
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

            -- Triggers
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
        `);

        // Check if sample data needs seeding
        const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get();
        if (deptCount.count === 0) {
            db.exec(`
                INSERT INTO departments (department_id, department_name, location, floor) VALUES
                (1, 'Cardiology', 'Block A, North Wing', '2nd Floor'),
                (2, 'Neurology', 'Block B, West Wing', '3rd Floor'),
                (3, 'Pediatrics', 'Block A, East Wing', '1st Floor'),
                (4, 'Orthopedics', 'Block C, South Wing', 'Ground Floor'),
                (5, 'General Medicine', 'Block A, Main Atrium', 'Ground Floor'),
                (6, 'Dermatology', 'Block B, East Wing', '2nd Floor'),
                (7, 'Oncology', 'Block D, Specialized Care', '4th Floor');

                INSERT INTO doctors (doctor_id, name, email, phone, specialization, experience_years, department_id) VALUES
                (1, 'Dr. Rajesh Sharma', 'rajesh.sharma@medicare.com', '+91 98201 11223', 'Interventional Cardiologist', 15, 1),
                (2, 'Dr. Priya Deshmukh', 'priya.deshmukh@medicare.com', '+91 98202 22334', 'Consultant Neurologist', 12, 2),
                (3, 'Dr. Amitav Banerjee', 'amitav.banerjee@medicare.com', '+91 98203 33445', 'Senior Pediatrician', 18, 3),
                (4, 'Dr. Sunita Kulkarni', 'sunita.kulkarni@medicare.com', '+91 98204 44556', 'Orthopedic Surgeon', 10, 4),
                (5, 'Dr. Vikram Malhotra', 'vikram.malhotra@medicare.com', '+91 98205 55667', 'Internal Medicine Specialist', 8, 5),
                (6, 'Dr. Ananya Nair', 'ananya.nair@medicare.com', '+91 98206 66778', 'Cosmetic Dermatologist', 7, 6);

                INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, break_start, break_end) VALUES
                (1, 'Monday', '09:00', '17:00', '13:00', '14:00'),
                (1, 'Wednesday', '09:00', '17:00', '13:00', '14:00'),
                (1, 'Friday', '09:00', '17:00', '13:00', '14:00'),
                (2, 'Tuesday', '10:00', '18:00', '13:30', '14:30'),
                (2, 'Thursday', '10:00', '18:00', '13:30', '14:30'),
                (3, 'Monday', '08:30', '15:30', '12:30', '13:30'),
                (3, 'Wednesday', '08:30', '15:30', '12:30', '13:30'),
                (3, 'Saturday', '09:00', '13:00', '11:00', '11:30'),
                (4, 'Tuesday', '09:00', '17:00', '13:00', '14:00'),
                (4, 'Friday', '09:00', '17:00', '13:00', '14:00'),
                (5, 'Monday', '08:00', '16:00', '12:00', '13:00'),
                (5, 'Tuesday', '08:00', '16:00', '12:00', '13:00'),
                (5, 'Thursday', '08:00', '16:00', '12:00', '13:00'),
                (6, 'Wednesday', '10:00', '18:00', '14:00', '15:00'),
                (6, 'Saturday', '10:00', '16:00', '13:00', '13:30');

                INSERT INTO patients (patient_id, name, email, date_of_birth, gender, phone, address) VALUES
                (1, 'Rohan Verma', 'rohan.verma@example.com', '1988-04-14', 'Male', '+91 97001 00111', 'Flat 402, Sunshine Apts, Andheri West, Mumbai'),
                (2, 'Sneha Patil', 'sneha.patil@example.com', '1995-11-23', 'Female', '+91 97002 00222', '12, Shanti Nagar, Pune, Maharashtra'),
                (3, 'Kabir Mehta', 'kabir.mehta@example.com', '2016-08-05', 'Male', '+91 97003 00333', 'Plot 88, Vasant Vihar, New Delhi'),
                (4, 'Meera Joshi', 'meera.joshi@example.com', '1972-02-19', 'Female', '+91 97004 00444', '204, Green Meadows, Jayanagar, Bengaluru'),
                (5, 'Arjun Reddy', 'arjun.reddy@example.com', '1991-09-30', 'Male', '+91 97005 00555', 'H.No 3-5-102, Banjara Hills, Hyderabad'),
                (6, 'Pooja Iyer', 'pooja.iyer@example.com', '2001-06-12', 'Female', '+91 97006 00666', 'Flat 101, Palm Court, Anna Nagar, Chennai');

                INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, start_time, end_time, status, consultation_type) VALUES
                (1, 1, 1, '2026-10-15', '09:30', '10:00', 'Scheduled', 'In-Person'),
                (2, 2, 2, '2026-10-16', '10:30', '11:00', 'Scheduled', 'In-Person'),
                (3, 3, 3, '2026-10-14', '09:00', '09:30', 'Scheduled', 'In-Person'),
                (4, 4, 4, '2026-10-10', '11:00', '11:30', 'Completed', 'In-Person'),
                (5, 5, 5, '2026-10-11', '10:00', '10:30', 'Completed', 'Follow-up'),
                (6, 6, 6, '2026-10-12', '14:00', '14:30', 'Completed', 'In-Person'),
                (7, 1, 5, '2026-10-08', '08:30', '09:00', 'Completed', 'Emergency'),
                (8, 2, 1, '2026-10-19', '11:00', '11:30', 'Scheduled', 'Online/Telehealth');

                INSERT INTO medical_history (history_id, patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes) VALUES
                (1, 1, 1, '2026-06-15', 'Essential Hypertension', 'Elevated BP (150/95 mmHg) with intermittent chest discomfort', 'Started ACE inhibitor and dietary sodium restriction', 'Advised 30 min cardio daily and 3-month follow-up'),
                (2, 2, 2, '2026-07-20', 'Chronic Migraine with Aura', 'Unilateral pulsating headache triggered by screen fatigue', 'Prescribed prophylactic beta-blocker and acute triptan therapy', 'Keep a headache diary and maintain regular sleep cycles'),
                (3, 3, 3, '2026-08-10', 'Pediatric Allergic Rhinitis & Bronchospasm', 'Seasonal wheezing and nighttime coughing fits', 'Inhaled corticosteroid twice daily with spacer', 'Avoid pollen exposure and feather pillows'),
                (4, 4, 4, '2026-10-10', 'Osteoarthritis of Left Knee', 'Grade II joint space narrowing and chronic stiffness', 'Physiotherapy regimen + Hyaluronic acid joint injection', 'Avoid squats and deep stair climbing; use knee brace'),
                (5, 5, 5, '2026-10-11', 'Type 2 Diabetes Mellitus', 'Fasting Blood Sugar 165 mg/dL, HbA1c 7.8%', 'Metformin 500mg BD + lifestyle modification', 'Monitored renal profile; results normal');

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

                INSERT INTO prescriptions (prescription_id, appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity, prescribed_date) VALUES
                (1, 4, 4, 7, '1 Capsule', 'Once daily with meals', '30 days', 'Take after breakfast with plenty of water', 1, '2026-10-10'),
                (2, 4, 4, 6, '1 Tablet 650mg', 'As needed for knee pain', '5 days', 'Maximum 3 tablets in 24 hours', 1, '2026-10-10'),
                (3, 5, 5, 8, '500mg', 'Twice daily after meals', '30 days', 'Check blood sugar fasting once weekly', 2, '2026-10-11'),
                (4, 7, 5, 6, '650mg', 'Every 8 hours if fever persists', '3 days', 'Do not take on empty stomach', 1, '2026-10-08'),
                (5, 6, 6, 10, 'Apply pea-sized amount', 'Twice daily on affected area', '10 days', 'Avoid contact with eyes and mucous membranes', 1, '2026-10-12');

                INSERT INTO billing (bill_id, patient_id, appointment_id, bill_date, total_amount, payment_status, payment_mode) VALUES
                (1, 1, 1, '2026-10-15', 800.00, 'Pending', 'Pending'),
                (2, 2, 2, '2026-10-16', 1000.00, 'Pending', 'Pending'),
                (3, 3, 3, '2026-10-14', 600.00, 'Pending', 'Pending'),
                (4, 4, 4, '2026-10-10', 1680.00, 'Paid', 'UPI'),
                (5, 5, 5, '2026-10-11', 720.00, 'Paid', 'Credit Card'),
                (6, 6, 6, '2026-10-12', 885.00, 'Paid', 'Cash'),
                (7, 1, 7, '2026-10-08', 1230.00, 'Paid', 'Insurance');
            `);
        }
        console.log('✅ Hospital Management System Database connected & ready');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
}

initializeDatabase();

module.exports = {
    db,
    query: (sql, params = []) => db.prepare(sql).all(params),
    get: (sql, params = []) => db.prepare(sql).get(params),
    run: (sql, params = []) => db.prepare(sql).run(params),
    transaction: (fn) => db.transaction(fn)
};
