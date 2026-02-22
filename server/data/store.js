import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCANS_FILE = join(__dirname, 'scans.json');

/**
 * Read all scans from JSON file
 */
export async function readScans() {
    if (!existsSync(SCANS_FILE)) {
        return [];
    }
    try {
        const data = await readFile(SCANS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

/**
 * Write a new scan to the JSON file
 */
export async function writeScan(scan) {
    const scans = await readScans();
    scans.push(scan);
    // Keep only last 50 scans
    const trimmed = scans.slice(-50);
    await writeFile(SCANS_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
}
