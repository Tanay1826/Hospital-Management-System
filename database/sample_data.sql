-- =====================================================================
-- SAMPLE DATA: HOSPITAL MANAGEMENT SYSTEM
-- DBMS Mini Project - Seed Data
-- =====================================================================

-- 1. Departments
INSERT INTO departments (department_id, department_name, location, floor) VALUES
(1, 'Cardiology', 'Block A, North Wing', '2nd Floor'),
(2, 'Neurology', 'Block B, West Wing', '3rd Floor'),
(3, 'Pediatrics', 'Block A, East Wing', '1st Floor'),
(4, 'Orthopedics', 'Block C, South Wing', 'Ground Floor'),
(5, 'General Medicine', 'Block A, Main Atrium', 'Ground Floor'),
(6, 'Dermatology', 'Block B, East Wing', '2nd Floor'),
(7, 'Oncology', 'Block D, Specialized Care', '4th Floor');

-- 2. Doctors
INSERT INTO doctors (doctor_id, name, email, phone, specialization, experience_years, department_id) VALUES
(1, 'Dr. Rajesh Sharma', 'rajesh.sharma@medicare.com', '+91 98201 11223', 'Interventional Cardiologist', 15, 1),
(2, 'Dr. Priya Deshmukh', 'priya.deshmukh@medicare.com', '+91 98202 22334', 'Consultant Neurologist', 12, 2),
(3, 'Dr. Amitav Banerjee', 'amitav.banerjee@medicare.com', '+91 98203 33445', 'Senior Pediatrician', 18, 3),
(4, 'Dr. Sunita Kulkarni', 'sunita.kulkarni@medicare.com', '+91 98204 44556', 'Orthopedic Surgeon', 10, 4),
(5, 'Dr. Vikram Malhotra', 'vikram.malhotra@medicare.com', '+91 98205 55667', 'Internal Medicine Specialist', 8, 5),
(6, 'Dr. Ananya Nair', 'ananya.nair@medicare.com', '+91 98206 66778', 'Cosmetic Dermatologist', 7, 6);

-- 3. Doctor Schedules
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

-- 4. Patients
INSERT INTO patients (patient_id, name, email, date_of_birth, gender, phone, address) VALUES
(1, 'Rohan Verma', 'rohan.verma@example.com', '1988-04-14', 'Male', '+91 97001 00111', 'Flat 402, Sunshine Apts, Andheri West, Mumbai'),
(2, 'Sneha Patil', 'sneha.patil@example.com', '1995-11-23', 'Female', '+91 97002 00222', '12, Shanti Nagar, Pune, Maharashtra'),
(3, 'Kabir Mehta', 'kabir.mehta@example.com', '2016-08-05', 'Male', '+91 97003 00333', 'Plot 88, Vasant Vihar, New Delhi'),
(4, 'Meera Joshi', 'meera.joshi@example.com', '1972-02-19', 'Female', '+91 97004 00444', '204, Green Meadows, Jayanagar, Bengaluru'),
(5, 'Arjun Reddy', 'arjun.reddy@example.com', '1991-09-30', 'Male', '+91 97005 00555', 'H.No 3-5-102, Banjara Hills, Hyderabad'),
(6, 'Pooja Iyer', 'pooja.iyer@example.com', '2001-06-12', 'Female', '+91 97006 00666', 'Flat 101, Palm Court, Anna Nagar, Chennai');

-- 5. Appointments
INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, start_time, end_time, status, consultation_type) VALUES
(1, 1, 1, '2026-10-15', '09:30', '10:00', 'Scheduled', 'In-Person'),
(2, 2, 2, '2026-10-16', '10:30', '11:00', 'Scheduled', 'In-Person'),
(3, 3, 3, '2026-10-14', '09:00', '09:30', 'Scheduled', 'In-Person'),
(4, 4, 4, '2026-10-10', '11:00', '11:30', 'Completed', 'In-Person'),
(5, 5, 5, '2026-10-11', '10:00', '10:30', 'Completed', 'Follow-up'),
(6, 6, 6, '2026-10-12', '14:00', '14:30', 'Completed', 'In-Person'),
(7, 1, 5, '2026-10-08', '08:30', '09:00', 'Completed', 'Emergency'),
(8, 2, 1, '2026-10-19', '11:00', '11:30', 'Scheduled', 'Online/Telehealth');

-- 6. Medical History
INSERT INTO medical_history (history_id, patient_id, doctor_id, record_date, conditions, diagnosis, treatment, notes) VALUES
(1, 1, 1, '2026-06-15', 'Essential Hypertension', 'Elevated BP (150/95 mmHg) with intermittent chest discomfort', 'Started ACE inhibitor and dietary sodium restriction', 'Advised 30 min cardio daily and 3-month follow-up'),
(2, 2, 2, '2026-07-20', 'Chronic Migraine with Aura', 'Unilateral pulsating headache triggered by screen fatigue', 'Prescribed prophylactic beta-blocker and acute triptan therapy', 'Keep a headache diary and maintain regular sleep cycles'),
(3, 3, 3, '2026-08-10', 'Pediatric Allergic Rhinitis & Bronchospasm', 'Seasonal wheezing and nighttime coughing fits', 'Inhaled corticosteroid twice daily with spacer', 'Avoid pollen exposure and feather pillows'),
(4, 4, 4, '2026-10-10', 'Osteoarthritis of Left Knee', 'Grade II joint space narrowing and chronic stiffness', 'Physiotherapy regimen + Hyaluronic acid joint injection', 'Avoid squats and deep stair climbing; use knee brace'),
(5, 5, 5, '2026-10-11', 'Type 2 Diabetes Mellitus', 'Fasting Blood Sugar 165 mg/dL, HbA1c 7.8%', 'Metformin 500mg BD + lifestyle modification', 'Monitored renal profile; results normal');

-- 7. Medications
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

-- 8. Prescriptions
INSERT INTO prescriptions (prescription_id, appointment_id, doctor_id, medication_id, dosage, frequency, duration, instructions, quantity, prescribed_date) VALUES
(1, 4, 4, 7, '1 Capsule', 'Once daily with meals', '30 days', 'Take after breakfast with plenty of water', 1, '2026-10-10'),
(2, 4, 4, 6, '1 Tablet 650mg', 'As needed for knee pain', '5 days', 'Maximum 3 tablets in 24 hours', 1, '2026-10-10'),
(3, 5, 5, 8, '500mg', 'Twice daily after meals', '30 days', 'Check blood sugar fasting once weekly', 2, '2026-10-11'),
(4, 7, 5, 6, '650mg', 'Every 8 hours if fever persists', '3 days', 'Do not take on empty stomach', 1, '2026-10-08'),
(5, 6, 6, 10, 'Apply pea-sized amount', 'Twice daily on affected area', '10 days', 'Avoid contact with eyes and mucous membranes', 1, '2026-10-12');

-- 9. Billing
INSERT INTO billing (bill_id, patient_id, appointment_id, bill_date, total_amount, payment_status, payment_mode) VALUES
(1, 1, 1, '2026-10-15', 800.00, 'Pending', 'Pending'),
(2, 2, 2, '2026-10-16', 1000.00, 'Pending', 'Pending'),
(3, 3, 3, '2026-10-14', 600.00, 'Pending', 'Pending'),
(4, 4, 4, '2026-10-10', 1680.00, 'Paid', 'UPI'),
(5, 5, 5, '2026-10-11', 720.00, 'Paid', 'Credit Card'),
(6, 6, 6, '2026-10-12', 885.00, 'Paid', 'Cash'),
(7, 1, 7, '2026-10-08', 1230.00, 'Paid', 'Insurance');
