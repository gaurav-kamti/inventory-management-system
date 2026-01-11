const express = require('express');
const router = express.Router();
const { Settings } = require('../models');

// Get specific setting or all
router.get('/:key?', async (req, res) => {
    try {
        const { key } = req.params;
        if (key) {
            const setting = await Settings.findOne({ where: { key } });
            // Return default structure if not found (specifically for invoice)
            if (!setting && key === 'invoice_config') {
                return res.json({
                    prefix: 'RM/',
                    sequence: 1,
                    fiscalYear: '25-26'
                });
            }
            return res.json(setting ? setting.value : null);
        }
        const settings = await Settings.findAll();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update setting
router.post('/', async (req, res) => {
    try {
        const { key, value } = req.body;
        const [setting, created] = await Settings.findOrCreate({
            where: { key },
            defaults: { value }
        });

        if (!created) {
            setting.value = value;
            await setting.save();
        }

        res.json(setting);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
