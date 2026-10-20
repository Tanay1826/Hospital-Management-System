const db = require('../database/db');

async function main() {
    await db.ready;
    console.log('Database ready! Starting cleanup and user synchronization...');

    // 1. Update Admin Name to Anurag
    await db.run(`
        UPDATE users 
        SET full_name = 'Anurag (Admin)' 
        WHERE user_id = 1 OR role = 'admin'
    `);
    console.log('✅ Admin full_name updated to "Anurag (Admin)"');

    // 2. Remove duplicate doctor (doctor_id 9 - Dr. Vikram Malhotra)
    try {
        await db.run('DELETE FROM appointments WHERE doctor_id = 9');
        await db.run('DELETE FROM schedules WHERE doctor_id = 9');
        await db.run('DELETE FROM users WHERE doctor_id = 9');
        await db.run('DELETE FROM doctors WHERE doctor_id = 9');
        console.log('✅ Removed duplicate doctor_id 9 (Dr. Vikram Malhotra duplicate)');
    } catch (e) {
        console.log('Note on doctor_id 9 removal:', e.message);
    }

    // 3. Ensure ALL remaining doctors in doctors table have a corresponding user account
    const doctors = await db.query('SELECT * FROM doctors');
    console.log(`Found ${doctors.length} doctors in database:`);

    for (const d of doctors) {
        console.log(`- Doctor ID ${d.doctor_id}: ${d.name} (${d.specialization})`);
        const existingUser = await db.get('SELECT * FROM users WHERE doctor_id = ?', [d.doctor_id]);
        if (!existingUser) {
            const cleanName = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const username = `dr.${d.name.split(' ').pop().toLowerCase()}`;
            await db.run(`
                INSERT INTO users (username, password, role, doctor_id, full_name, email)
                VALUES (?, 'doctor123', 'doctor', ?, ?, ?)
            `, [username, d.doctor_id, d.name, d.email || `${cleanName}@medicare.com`]);
            console.log(`  ➕ Created login account for ${d.name}: username="${username}", password="doctor123"`);
        } else {
            console.log(`  ✓ Login account exists: username="${existingUser.username}"`);
        }
    }

    // 4. Ensure ALL patients in patients table have a corresponding user account
    const patients = await db.query('SELECT * FROM patients');
    console.log(`Found ${patients.length} patients in database:`);

    for (const p of patients) {
        const existingUser = await db.get('SELECT * FROM users WHERE patient_id = ?', [p.patient_id]);
        if (!existingUser) {
            const username = p.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
            await db.run(`
                INSERT INTO users (username, password, role, patient_id, full_name, email)
                VALUES (?, 'patient123', 'patient', ?, ?, ?)
            `, [username, p.patient_id, p.name, p.email || `${username}@example.com`]);
            console.log(`  ➕ Created login account for ${p.name}: username="${username}", password="patient123"`);
        } else {
            console.log(`  ✓ Login account exists: username="${existingUser.username}"`);
        }
    }

    console.log('\n--- VERIFICATION OF USERS ---');
    const allUsers = await db.query('SELECT user_id, username, role, doctor_id, patient_id, full_name FROM users ORDER BY role, user_id');
    console.table(allUsers);

    console.log('\n--- VERIFICATION OF DOCTORS ---');
    const allDoctors = await db.query('SELECT doctor_id, name, specialization, phone FROM doctors');
    console.table(allDoctors);

    process.exit(0);
}

main().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});
