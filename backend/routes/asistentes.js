const express = require('express');
const router = express.Router();
const Asistente = require('../models/Asistente');

// GET - Obtener todos los asistentes
router.get('/', async (req, res) => {
  try {
    const asistentes = await Asistente.find().populate('asistencias.eventoId', 'nombre fecha');
    res.json(asistentes);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener asistentes', error: err.message });
  }
});

// GET - Obtener asistente por ID
router.get('/:id', async (req, res) => {
  try {
    const asistente = await Asistente.findById(req.params.id).populate('asistencias.eventoId');
    if (!asistente) {
      return res.status(404).json({ mensaje: 'Asistente no encontrado' });
    }
    res.json(asistente);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener asistente', error: err.message });
  }
});

// POST - Crear nuevo asistente
router.post('/', async (req, res) => {
  try {
    const nuevoAsistente = new Asistente(req.body);
    const asistenteGuardado = await nuevoAsistente.save();
    res.status(201).json(asistenteGuardado);
  } catch (err) {
    res.status(400).json({ mensaje: 'Error al crear asistente', error: err.message });
  }
});

// PUT - Actualizar asistente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // 1. Buscar al asistente
    const asistente = await Asistente.findById(id);
    if (!asistente) {
      return res.status(404).json({ mensaje: 'Asistente no encontrado' });
    }

    // 2. Manejo especial para 'intereses'
    if (updateData.preferencias && typeof updateData.preferencias.intereses === 'string') {
      const nuevosIntereses = updateData.preferencias.intereses
        .split(',')
        .map(i => i.trim())
        .filter(i => i); // Eliminar strings vacíos

      // Combinar con los existentes sin duplicados
      const interesesActuales = asistente.preferencias.intereses || [];
      const interesesCombinados = [...new Set([...interesesActuales, ...nuevosIntereses])];
      
      // Actualizar el objeto de updateData
      updateData.preferencias.intereses = interesesCombinados;
    }

    // 3. Actualizar el asistente con los datos combinados
    const asistenteActualizado = await Asistente.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true, context: 'query' }
    );

    if (!asistenteActualizado) {
      return res.status(404).json({ mensaje: 'Asistente no encontrado' });
    }

    res.json(asistenteActualizado);
  } catch (err) {
    res.status(400).json({ mensaje: 'Error al actualizar asistente', error: err.message });
  }
});

// DELETE - Eliminar asistente
router.delete('/:id', async (req, res) => {
  try {
    const asistenteEliminado = await Asistente.findByIdAndDelete(req.params.id);
    if (!asistenteEliminado) {
      return res.status(404).json({ mensaje: 'Asistente no encontrado' });
    }
    res.json({ mensaje: 'Asistente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al eliminar asistente', error: err.message });
  }
});

// POST - Registrar asistencia a un evento
router.post('/:id/asistencias', async (req, res) => {
  try {
    const asistente = await Asistente.findById(req.params.id);
    if (!asistente) {
      return res.status(404).json({ mensaje: 'Asistente no encontrado' });
    }
    asistente.asistencias.push(req.body);
    await asistente.save();
    res.json(asistente);
  } catch (err) {
    res.status(400).json({ mensaje: 'Error al registrar asistencia', error: err.message });
  }
});

module.exports = router;