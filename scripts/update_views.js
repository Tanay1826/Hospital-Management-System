const db = require('../database/db');

async function main() {
    await db.ready;
    console.log('Database ready! Updating MySQL views...');

    await db.run(`
        CREATE OR REPLACE VIEW vw_ActivePrescriptions AS
        SELECT 
            pr.prescription_id,
            a.patient_id,
            pr.doctor_id,
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
        JOIN medications m ON pr.medication_id = m.medication_id
    `);

    console.log('✅ vw_ActivePrescriptions updated in MySQL with patient_id and doctor_id');
    const sample = await db.query('SELECT * FROM vw_ActivePrescriptions LIMIT 1');
    console.log('Sample row:', sample);
    process.exit(0);
}

main().catch(err => {
    console.error('Error updating views:', err);
    process.exit(1);
});
