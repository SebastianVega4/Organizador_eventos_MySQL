const express = require('express');
const router = express.Router();
const Evento = require('../models/Evento');

// GET - Obtener todos los eventos
router.get('/', async (req, res) => {
  try {
    const eventos = await Evento.find().sort({ fecha: 1 });
    res.json(eventos);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener eventos', error: err.message });
  }
});

// GET - Obtener evento por ID
router.get('/:id', async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    res.json(evento);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener evento', error: err.message });
  }
});

// POST - Crear nuevo evento
router.post('/', async (req, res) => {
  try {
    const nuevoEvento = new Evento(req.body);
    const eventoGuardado = await nuevoEvento.save();
    res.status(201).json(eventoGuardado);
  } catch (err) {
    res.status(400).json({ mensaje: 'Error al crear evento', error: err.message });
  }
});

// PUT - Actualizar evento
router.put('/:id', async (req, res) => {
  try {
    const eventoActualizado = await Evento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!eventoActualizado) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    res.json(eventoActualizado);
  } catch (err) {
    res.status(400).json({ mensaje: 'Error al actualizar evento', error: err.message });
  }
});

// DELETE - Eliminar evento
router.delete('/:id', async (req, res) => {
  try {
    const eventoEliminado = await Evento.findByIdAndDelete(req.params.id);
    if (!eventoEliminado) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    res.json({ mensaje: 'Evento eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al eliminar evento', error: err.message });
  }
});

// POST - Agregar ticket a un evento
router.post('/:id/tickets', async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    evento.tickets.push(req.body);
    await evento.save();
    res.json(evento);
  } catch (err) {
    res.status(400).json({ mensaje: 'Error al agregar ticket', error: err.message });
  }
});

// POST - Agregar promoción a un evento
router.post('/:id/promociones', async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    evento.promociones.push(req.body);
    await evento.save();
    res.json(evento);
  } catch (err) {
    res.status(400).json({ mensaje: 'Error al agregar promoción', error: err.message });
  }
});

module.exports = router;