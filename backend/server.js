const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- INICIO DE LA CORRECCIÓN ---
// Usamos la variable de entorno MONGODB_URI de docker-compose
const dbURI = process.env.MONGODB_URI;

if (!dbURI) {
  console.error('❌ Error: La variable MONGODB_URI no está definida.');
  process.exit(1); // Detiene la app si la variable no existe
}

// Conexión a MongoDB
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log(`✅ Conectado a MongoDB en ${dbURI}`)) // Log mejorado
.catch((err) => console.error('❌ Error de conexión:', err));
// --- FIN DE LA CORRECCIÓN ---

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
  // Este log es correcto, ya que process.env.PORT viene de docker-compose (5500)
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});