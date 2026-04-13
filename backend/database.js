const { Pool } = require('pg');

const path = require('path');

let db;
const isProd = process.env.VERCEL || process.env.RENDER || process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NODE_ENV === 'production';

if (isProd) {
    console.log('Using Postgres database on Vercel.');
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    // Shim to match sqlite3 API for easier migration (minimal changes to server.js)
    db = {
        all: (sql, params, callback) => {
            pool.query(sql, params)
                .then(res => callback(null, res.rows))
                .catch(err => callback(err));
        },
        run: function(sql, params, callback) {
            // Postgres uses $1, $2 instead of ? 
            const pgSql = sql.replace(/\?/g, (_, offset) => {
                let count = 0;
                for (let i = 0; i < offset; i++) if (sql[i] === '?') count++;
                return `$${count + 1}`;
            });
            
            pool.query(pgSql, params)
                .then(res => {
                    const result = { lastID: res.insertId, changes: res.rowCount };
                    if (callback) callback.call(result, null);
                })
                .catch(err => callback ? callback(err) : null);
        },
        exec: (sql, callback) => {
            pool.query(sql)
                .then(() => callback && callback(null))
                .catch(err => callback && callback(err));
        }
    };

    // Initialize table in Postgres
    db.exec(`CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        title TEXT DEFAULT 'Untitled Note',
        content TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

} else {
    console.log('Using SQLite database locally.');
    const sqlite3 = require('@louislam/sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'notes.db');
    const sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
        } else {
            sqliteDb.run(`CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT DEFAULT 'Untitled Note',
                content TEXT DEFAULT '',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        }
    });
    db = sqliteDb;
}

module.exports = db;
