const mongoose = require('mongoose');
const Evento = require('./models/Evento');
const Asistente = require('./models/Asistente');

mongoose.connect('mongodb://mongodb:27017/eventos_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch((err) => console.error('❌ Error:', err));

const eventosData = [
  {
    nombre: 'Tech Conference 2025',
    descripcion: 'La conferencia de tecnología más importante del año',
    fecha: new Date('2025-06-15'),
    lugar: 'Centro de Convenciones Bogotá',
    capacidad: 500,
    categoria: 'Conferencia',
    tickets: [
      { tipo: 'General', precio: 150000, cantidad: 300, vendidos: 120 },
      { tipo: 'VIP', precio: 300000, cantidad: 100, vendidos: 45 },
      { tipo: 'Estudiante', precio: 80000, cantidad: 100, vendidos: 78, caracteristicas: { descuentoEstudiante: true } }
    ],
    promociones: [
      { 
        codigo: 'EARLYBIRD', 
        descuento: 20, 
        fechaInicio: new Date('2025-01-01'), 
        fechaFin: new Date('2025-03-31'),
        activa: true
      }
    ],
    organizador: {
      nombre: 'TechEvents Colombia',
      contacto: '3101234567',
      email: 'info@techevents.co'
    },
    estado: 'Programado'
  },
  {
    nombre: 'Concierto de Rock',
    descripcion: 'Una noche de rock inolvidable con las mejores bandas',
    fecha: new Date('2025-07-20'),
    lugar: 'Movistar Arena',
    capacidad: 1000,
    categoria: 'Concierto',
    tickets: [
      { tipo: 'Platea', precio: 120000, cantidad: 400, vendidos: 200 },
      { tipo: 'Palco', precio: 250000, cantidad: 200, vendidos: 80 },
      { tipo: 'General', precio: 80000, cantidad: 400, vendidos: 350 }
    ],
    promociones: [
      { 
        codigo: 'ROCKFAN', 
        descuento: 15, 
        fechaInicio: new Date('2025-01-01'), 
        fechaFin: new Date('2025-07-10'),
        activa: true
      }
    ],
    estado: 'Programado'
  },
  {
    nombre: 'Maratón Bogotá 2025',
    descripcion: 'Carrera atlética por las calles de Bogotá',
    fecha: new Date('2025-08-10'),
    lugar: 'Parque Simón Bolívar',
    capacidad: 2000,
    categoria: 'Deportivo',
    tickets: [
      { tipo: '5K', precio: 50000, cantidad: 800, vendidos: 600 },
      { tipo: '10K', precio: 70000, cantidad: 700, vendidos: 450 },
      { tipo: 'Media Maratón', precio: 100000, cantidad: 500, vendidos: 200 }
    ],
    extras: {
      incluye: ['Camiseta', 'Medalla', 'Hidratación'],
      tipoTerreno: 'Urbano'
    },
    estado: 'Programado'
  }
];

const asistentesData = [
  {
    nombre: 'María González',
    email: 'maria.gonzalez@email.com',
    telefono: '3201234567',
    documento: '1234567890',
    preferencias: {
      dietarias: ['Vegetariano'],
      intereses: ['Tecnología', 'Inteligencia Artificial', 'Desarrollo Web'],
      accesibilidad: 'Ninguna'
    },
    empresa: 'Tech Solutions SAS',
    cargo: 'Desarrolladora Senior',
    estado: 'Activo'
  },
  {
    nombre: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@email.com',
    telefono: '3109876543',
    preferencias: {
      intereses: ['Música', 'Conciertos', 'Rock'],
    },
    datosAdicionales: {
      tallaCamiseta: 'L',
      grupoSanguineo: 'O+'
    },
    estado: 'Activo'
  },
  {
    nombre: 'Ana Martínez',
    email: 'ana.martinez@email.com',
    telefono: '3157654321',
    documento: '9876543210',
    preferencias: {
      dietarias: ['Sin gluten', 'Vegano'],
      intereses: ['Deportes', 'Running', 'Vida saludable']
    },
    estado: 'Activo'
  },
  {
    nombre: 'Pedro Sánchez',
    email: 'pedro.sanchez@empresa.com',
    telefono: '3186549870',
    empresa: 'Innovación Digital',
    cargo: 'Director de TI',
    preferencias: {
      intereses: ['Cloud Computing', 'DevOps', 'Ciberseguridad']
    },
    datosAdicionales: {
      nivelSeniority: 'Senior',
      añosExperiencia: 10
    },
    estado: 'Activo'
  }
];

async function seedDatabase() {
  try {
    // Limpiar colecciones
    await Evento.deleteMany({});
    await Asistente.deleteMany({});
    console.log('🗑️  Base de datos limpiada');

    // Insertar eventos
    const eventosInsertados = await Evento.insertMany(eventosData);
    console.log(`✅ ${eventosInsertados.length} eventos insertados`);

    // Insertar asistentes
    const asistentesInsertados = await Asistente.insertMany(asistentesData);
    console.log(`✅ ${asistentesInsertados.length} asistentes insertados`);

    // Agregar algunas asistencias de ejemplo
    const maria = asistentesInsertados[0];
    const techConf = eventosInsertados[0];
    
    maria.asistencias.push({
      eventoId: techConf._id,
      ticketId: techConf.tickets[1]._id,
      fechaCompra: new Date(),
      precioFinal: 240000, // Precio VIP con descuento
      estado: 'Confirmado'
    });
    await maria.save();
    console.log('✅ Asistencia de ejemplo agregada');

    console.log('\n🎉 ¡Base de datos poblada exitosamente!');
    console.log('\nPuedes probar la API en:');
    console.log(`- GET http://localhost:5500/api/eventos`);
    console.log(`- GET http://localhost:5500/api/asistentes`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedDatabase();