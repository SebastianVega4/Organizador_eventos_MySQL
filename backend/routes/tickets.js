
const express = require('express');
const router = express.Router();
const Evento = require('../models/Evento'); // Los tickets se gestionan a través de Eventos

// Este archivo podría no ser necesario si SOLO gestionas tickets
// a través de las rutas de /api/eventos/:id/tickets

// GET /api/tickets (Obtener TODOS los tickets de TODOS los eventos)
// (Esto es costoso, pero un ejemplo)
router.get('/', async (req, res) => {
  try {
    // Usamos 'aggregate' para desenrollar (unwind) los tickets de cada evento
    const todosLosTickets = await Evento.aggregate([
      { $unwind: '$tickets' },
      { $replaceRoot: { newRoot: '$tickets' } }
    ]);
    res.json(todosLosTickets);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener tickets', error: err.message });
  }
});

module.exports = router;