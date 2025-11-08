const express = require('express');
const router = express.Router();
const Evento = require('../models/Evento'); // Las promos se gestionan a través de Eventos

// GET /api/promociones (Obtener TODAS las promociones)
router.get('/', async (req, res) => {
  try {
    const todasLasPromos = await Evento.aggregate([
      { $unwind: '$promociones' },
      { $replaceRoot: { newRoot: '$promociones' } }
    ]);
    res.json(todasLasPromos);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener promociones', error: err.message });
  }
});

module.exports = router;