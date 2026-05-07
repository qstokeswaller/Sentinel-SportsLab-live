import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3050;
const DB_FILE = path.join(__dirname, '../data/db.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Large limit for bulk data

// Helper to read DB
const readDb = () => {
    if (!fs.existsSync(DB_FILE)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

// Helper to write DB
const writeDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// GET /api/:key
app.get('/api/:key', (req, res) => {
    const { key } = req.params;
    const db = readDb();
    const value = db[key] || null;
    res.json(value);
});

// POST /api/:key
app.post('/api/:key', (req, res) => {
    const { key } = req.params;
    const data = req.body;
    const db = readDb();

    db[key] = data;
    writeDb(db);

    console.log(`Saved key: ${key}`);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Local Storage Server running on http://localhost:${PORT}`);
    console.log(`- GET /api/:key to retrieve data`);
    console.log(`- POST /api/:key to save data`);
});
