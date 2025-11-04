const mongoose = require('mongoose');

const asistenciaSchema = new mongoose.Schema({
  eventoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Evento',
    required: true 
  },
  ticketId: { type: mongoose.Schema.Types.ObjectId },
  fechaCompra: { type: Date, default: Date.now },
  precioFinal: { type: Number },
  estado: {
    type: String,
    enum: ['Confirmado', 'Pendiente', 'Cancelado'],
    default: 'Confirmado'
  }
}, { _id: true });

const asistenteSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  telefono: String,
  documento: String,
  
  // Información flexible y personalizable
  preferencias: {
    dietarias: [String], // ej: ['Vegetariano', 'Sin gluten']
    intereses: [String], // ej: ['Música', 'Tecnología']
    accesibilidad: String
  },
  
  // Datos corporativos opcionales
  empresa: String,
  cargo: String,
  
  // Historial de asistencias embebido
  asistencias: [asistenciaSchema],
  
  // Campos completamente dinámicos
  datosAdicionales: { type: mongoose.Schema.Types.Mixed },
  
  estado: {
    type: String,
    enum: ['Activo', 'Inactivo'],
    default: 'Activo'
  }
}, {
  timestamps: true
});

// Índices
asistenteSchema.index({ email: 1 });
asistenteSchema.index({ nombre: 'text' });

module.exports = mongoose.model('Asistente', asistenteSchema);