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

// Initialize database schema, views, triggers, and seed data from the single master SQL file
function initializeDatabase() {
    try {
        const sqlPath = path.join(__dirname, 'hospital_management_system.sql');

        if (fs.existsSync(sqlPath)) {
            const sqlContent = fs.readFileSync(sqlPath, 'utf8');
            db.exec(sqlContent);
            console.log('✅ Database initialized successfully from hospital_management_system.sql');
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
