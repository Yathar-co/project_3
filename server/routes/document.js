import { Router } from 'express';
import { generateDocument, getAvailableDocTypes } from '../services/documentGenerator.js';

export const documentRouter = Router();

// GET /api/docs/types — List available document types
documentRouter.get('/types', (req, res) => {
    res.json(getAvailableDocTypes());
});

// POST /api/docs/generate — Generate a compliance document
documentRouter.post('/generate', async (req, res) => {
    try {
        const { type, company, regulation } = req.body;

        if (!type) {
            return res.status(400).json({ error: 'Document type is required.' });
        }
        if (!company || !company.name) {
            return res.status(400).json({ error: 'Company name is required.' });
        }
        if (!regulation) {
            return res.status(400).json({ error: 'Regulation name is required.' });
        }

        const doc = await generateDocument(type, company, regulation);
        res.json(doc);
    } catch (err) {
        console.error('[DocumentRoute] Error:', err.message);
        res.status(500).json({
            error: 'Document generation failed',
            message: err.message
        });
    }
});
