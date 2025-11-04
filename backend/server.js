const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/eventos_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch((err) => console.error('❌ Error de conexión:', err));

// Importar rutas
const eventosRoutes = require('./routes/eventos');
const asistentesRoutes = require('./routes/asistentes');
const ticketsRoutes = require('./routes/tickets');
const promocionesRoutes = require('./routes/promociones');

// Usar rutas
app.use('/api/eventos', eventosRoutes);
app.use('/api/asistentes', asistentesRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/promociones', promocionesRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: '🎉 API de Gestión de Eventos - MongoDB' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});