const mongoose = require('mongoose');

// Esquema flexible para tickets embebidos
const ticketSchema = new mongoose.Schema({
  tipo: { type: String, required: true },
  precio: { type: Number, required: true },
  cantidad: { type: Number, required: true },
  vendidos: { type: Number, default: 0 },
  caracteristicas: { type: mongoose.Schema.Types.Mixed } // Flexible
}, { _id: true });

// Esquema flexible para promociones embebidas
const promocionSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, sparse: true },
  descuento: { type: Number, required: true }, // Porcentaje
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  activa: { type: Boolean, default: true },
  condiciones: { type: mongoose.Schema.Types.Mixed } // Flexible
}, { _id: true });

// Esquema principal del Evento
const eventoSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: true,
    trim: true 
  },
  descripcion: { 
    type: String,
    required: true 
  },
  fecha: { 
    type: Date, 
    required: true 
  },
  lugar: { 
    type: String, 
    required: true 
  },
  capacidad: { 
    type: Number, 
    required: true 
  },
  categoria: {
    type: String,
    enum: ['Concierto', 'Conferencia', 'Deportivo', 'Cultural', 'Corporativo', 'Otro'],
    default: 'Otro'
  },
  
  // Documentos embebidos - Evita JOINs
  tickets: [ticketSchema],
  promociones: [promocionSchema],
  
  // Información adicional flexible
  organizador: {
    nombre: String,
    contacto: String,
    email: String
  },
  
  // Campos dinámicos opcionales
  extras: { type: mongoose.Schema.Types.Mixed }, // Completamente flexible
  
  estado: {
    type: String,
    enum: ['Programado', 'En curso', 'Finalizado', 'Cancelado'],
    default: 'Programado'
  }
}, {
  timestamps: true // Agrega createdAt y updatedAt automáticamente
});

// Índices para optimizar búsquedas
eventoSchema.index({ fecha: 1 });
eventoSchema.index({ categoria: 1 });
eventoSchema.index({ nombre: 'text', descripcion: 'text' });

module.exports = mongoose.model('Evento', eventoSchema);