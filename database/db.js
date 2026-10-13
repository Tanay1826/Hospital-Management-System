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

// Initialize database schema and seed data
function initializeDatabase() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sampleDataPath = path.join(__dirname, 'sample_data.sql');

        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            db.exec(schemaSql);
        }

        // Check if departments table has data, if not, load sample data
        const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get();
        if (deptCount.count === 0 && fs.existsSync(sampleDataPath)) {
            const seedSql = fs.readFileSync(sampleDataPath, 'utf8');
            db.exec(seedSql);
            console.log('✅ Sample data loaded successfully into hospital.db');
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
