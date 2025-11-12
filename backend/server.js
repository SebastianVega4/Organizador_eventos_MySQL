const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de MySQL
const dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "1234",
  database: process.env.MYSQL_DATABASE || "eventos_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

// Función para formatear la fecha para MySQL
const formatDateForMySQL = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Verificar conexión
pool
  .getConnection()
  .then((connection) => {
    console.log(" Conectado a MySQL");
    connection.release();
  })
  .catch((err) => {
    console.error(" Error conectando a MySQL:", err);
  });

// --- RUTAS DE EVENTOS ---
const eventosRoutes = require('./routes/eventos')(pool, formatDateForMySQL);
app.use('/api/eventos', eventosRoutes);

// --- RUTAS DE ASISTENTES ---
const asistentesRoutes = require('./routes/asistentes')(pool, formatDateForMySQL);
app.use('/api/asistentes', asistentesRoutes);

// Ruta de prueba


// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    mensaje: " API de Gestión de Eventos - MySQL (Sistema Antiguo)",
    advertencia:
      "Este sistema presenta limitaciones de escalabilidad y flexibilidad",
  });
});

app.listen(PORT, () => {
  console.log(` Servidor MySQL corriendo en http://localhost:${PORT}`);
  console.log(" Este es el sistema ANTIGUO con limitaciones de escalabilidad");
});
