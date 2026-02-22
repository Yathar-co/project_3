import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { analyzeCompliance } from '../services/complianceEngine.js';
import { readScans, writeScan } from '../data/store.js';

export const scanRouter = Router();

// POST /api/scan — Run a compliance analysis
scanRouter.post('/', async (req, res) => {
    try {
        const { company, regulation, dataPractices, documents } = req.body;

        // Validate required fields
        if (!company || !company.name) {
            return res.status(400).json({ error: 'Company name is required.' });
        }
        if (!regulation) {
            return res.status(400).json({ error: 'Regulation name is required.' });
        }

        const result = await analyzeCompliance(company, regulation, dataPractices, documents);

        // Save to history
        const scan = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            company,
            regulation,
            overall_risk: result.overall_risk,
            summary: result.summary,
            findings_count: result.findings?.length || 0,
            result
        };

        await writeScan(scan);

        res.json(result);
    } catch (err) {
        console.error('[ScanRoute] Error:', err.message);
        res.status(500).json({
            error: 'Compliance scan failed',
            message: err.message
        });
    }
});

// GET /api/scan/history — Get past scans
scanRouter.get('/history', async (req, res) => {
    try {
        const scans = await readScans();
        // Return summaries, not full results
        const summaries = scans.map(s => ({
            id: s.id,
            timestamp: s.timestamp,
            company_name: s.company?.name,
            regulation: s.regulation,
            overall_risk: s.overall_risk,
            summary: s.summary,
            findings_count: s.findings_count
        }));
        res.json(summaries.reverse()); // Newest first
    } catch (err) {
        res.status(500).json({ error: 'Failed to read scan history' });
    }
});

// GET /api/scan/:id — Get a specific scan
scanRouter.get('/:id', async (req, res) => {
    try {
        const scans = await readScans();
        const scan = scans.find(s => s.id === req.params.id);
        if (!scan) {
            return res.status(404).json({ error: 'Scan not found' });
        }
        res.json(scan.result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read scan' });
    }
});
