CREATE DATABASE IF NOT EXISTS eventos_db;
USE eventos_db;

-- Tabla principal de eventos
CREATE TABLE eventos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha DATETIME NOT NULL,
    lugar VARCHAR(255) NOT NULL,
    capacidad INT NOT NULL,
    categoria ENUM('Concierto', 'Conferencia', 'Deportivo', 'Cultural', 'Corporativo', 'Otro') DEFAULT 'Otro',
    organizador_nombre VARCHAR(255),
    organizador_contacto VARCHAR(255),
    organizador_email VARCHAR(255),
    estado ENUM('Programado', 'En curso', 'Finalizado', 'Cancelado') DEFAULT 'Programado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fecha (fecha)
);

-- Tabla de tipos de tickets (RELACION 1:N con eventos)
CREATE TABLE tipos_ticket (
    id INT PRIMARY KEY AUTO_INCREMENT,
    evento_id INT NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    cantidad INT NOT NULL,
    caracteristicas JSON
);

-- Tabla de tickets (RELACION 1:N con tipos_ticket)
CREATE TABLE tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tipo_ticket_id INT NOT NULL,
    vendidos INT DEFAULT 0,
    FOREIGN KEY (tipo_ticket_id) REFERENCES tipos_ticket(id) ON DELETE CASCADE,
    INDEX idx_tipo_ticket_id (tipo_ticket_id)
);

-- Tabla de promociones (RELACION 1:N con eventos)
CREATE TABLE promociones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    evento_id INT NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    descuento DECIMAL(5,2) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    condiciones JSON,
    FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
    INDEX idx_evento_id (evento_id),
    INDEX idx_codigo (codigo)
);

-- Tabla principal de asistentes
CREATE TABLE asistentes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    documento VARCHAR(50),
    empresa VARCHAR(255),
    cargo VARCHAR(255),
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_nombre (nombre)
);

-- Tabla para preferencias dietarias (RELACION 1:N con asistentes)
CREATE TABLE preferencias_dietarias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asistente_id INT NOT NULL,
    preferencia VARCHAR(100) NOT NULL,
    FOREIGN KEY (asistente_id) REFERENCES asistentes(id) ON DELETE CASCADE
);

-- Tabla para intereses (RELACION 1:N con asistentes)
CREATE TABLE intereses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asistente_id INT NOT NULL,
    interes VARCHAR(100) NOT NULL,
    FOREIGN KEY (asistente_id) REFERENCES asistentes(id) ON DELETE CASCADE,
    INDEX idx_asistente_id_interes (asistente_id)
);

-- Tabla para datos adicionales (modelo EAV - Entity Attribute Value)
CREATE TABLE datos_adicionales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asistente_id INT NOT NULL,
    clave VARCHAR(100) NOT NULL,
    valor TEXT,
    FOREIGN KEY (asistente_id) REFERENCES asistentes(id) ON DELETE CASCADE,
    INDEX idx_asistente_id (asistente_id),
    INDEX idx_clave (clave)
);

-- Tabla de asistencias (TABLA INTERMEDIA M:N entre asistentes y eventos)
CREATE TABLE asistencias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asistente_id INT NOT NULL,
    evento_id INT NOT NULL,
    tipo_ticket_id INT NOT NULL,
    fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
    precio_final DECIMAL(10,2),
    estado ENUM('Confirmado', 'Pendiente', 'Cancelado') DEFAULT 'Confirmado',
    FOREIGN KEY (asistente_id) REFERENCES asistentes(id) ON DELETE CASCADE,
    FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_ticket_id) REFERENCES tipos_ticket(id) ON DELETE CASCADE,
    INDEX idx_asistente_id (asistente_id),
    INDEX idx_evento_id (evento_id),
    INDEX idx_fecha_compra (fecha_compra)
);
-- ============================================================================
-- DATOS DE PRUEBA PARA DEMOSTRAR LAS LIMITACIONES
-- ============================================================================

-- Eventos de ejemplo_generados
INSERT INTO eventos (nombre, descripcion, fecha, lugar, capacidad, categoria, organizador_nombre, organizador_contacto, organizador_email) VALUES
('Tech Conference 2025', 'La conferencia de tecnologia mas importante del ano con speakers internacionales y workshops practicos.', '2025-06-15 09:00:00', 'Centro de Convenciones Bogota', 500, 'Conferencia', 'TechEvents Colombia', '3101234567', 'info@techevents.co'),
('Concierto de Rock Nacional', 'Una noche inolvidable con las mejores bandas de rock del pais en un evento unico.', '2025-07-20 20:00:00', 'Movistar Arena', 1000, 'Concierto', 'Music Productions SAS', '3019876543', 'producciones@music.co'),
('Maraton Ciudad 2025', 'Carrera atletica anual que recorre los principales puntos de la ciudad, para todas las edades.', '2025-08-10 06:00:00', 'Parque Simon Bolivar', 2000, 'Deportivo', 'Deportes Extremos', '3154445566', 'info@deportesextremos.com');

-- Tickets para los eventos
INSERT INTO tipos_ticket (evento_id, tipo, precio, cantidad, caracteristicas) VALUES
(1, 'General', 150000.00, 300, '{"acceso": "General", "beneficios": ["Coffe break", "Material digital"]}'),
(1, 'VIP', 300000.00, 100, '{"acceso": "VIP", "beneficios": ["Parking", "Catering premium", "Networking session"]}'),
(1, 'Estudiante', 80000.00, 100, '{"acceso": "General", "requisitos": ["Carnet estudiantil"], "beneficios": ["Coffe break"]}'),
(2, 'Platea', 120000.00, 400, '{"zona": "Platea", "vista": "Frontal"}'),
(2, 'Palco', 250000.00, 200, '{"zona": "Palco", "servicios": ["Mesas", "Meseros", "Bano privado"]}'),
(2, 'General', 80000.00, 400, '{"zona": "General", "acceso": "Pie"}'),
(3, '5K', 50000.00, 800, '{"distancia": "5km", "incluye": ["Camiseta", "Medalla", "Hidratacion"]}'),
(3, '10K', 70000.00, 700, '{"distancia": "10km", "incluye": ["Camiseta", "Medalla", "Hidratacion", "Fruta"]}'),
(3, 'Media Maraton', 100000.00, 500, '{"distancia": "21km", "incluye": ["Camiseta tecnica", "Medalla", "Hidratacion", "Alimentacion", "Masaje"]}');

-- Datos de tickets vendidos
INSERT INTO tickets (tipo_ticket_id, vendidos) VALUES
(1, 120), (2, 45), (3, 78), (4, 200), (5, 80), (6, 350), (7, 600), (8, 450), (9, 200);

-- Promociones
INSERT INTO promociones (evento_id, codigo, descuento, fecha_inicio, fecha_fin, activa, condiciones) VALUES
(1, 'EARLYBIRD2025', 20.00, '2025-01-01 00:00:00', '2025-03-31 23:59:59', TRUE, '{"validoPara": ["General", "VIP"], "maximoUsos": 100}'),
(1, 'STUDENT25', 25.00, '2025-01-01 00:00:00', '2025-06-14 23:59:59', TRUE, '{"validoPara": ["Estudiante"], "requiereVerificacion": true}'),
(2, 'ROCKFAN15', 15.00, '2025-01-01 00:00:00', '2025-07-10 23:59:59', TRUE, '{"validoPara": ["Platea", "General"], "minimoCompra": 2}'),
(3, 'RUNNER10', 10.00, '2025-01-01 00:00:00', '2025-07-31 23:59:59', TRUE, '{"validoPara": ["5K", "10K"], "aplicableSoloWeb": true}');

-- Asistentes
INSERT INTO asistentes (nombre, email, telefono, documento, empresa, cargo, estado) VALUES
('Maria Gonzalez Perez', 'maria.gonzalez@techsolutions.com', '3201234567', '1234567890', 'Tech Solutions SAS', 'Desarrolladora Senior', 'Activo'),
('Carlos Rodriguez Mendoza', 'carlos.rodriguez@email.com', '3109876543', NULL, NULL, NULL, 'Activo'),
('Ana Martinez Lopez', 'ana.martinez@correo.com', '3157654321', '9876543210', NULL, NULL, 'Activo'),
('Pedro Sanchez Ruiz', 'pedro.sanchez@innovacion.com', '3186549870', '4567891230', 'Innovacion Digital Ltda', 'Director de Tecnologia', 'Activo'),
('Laura Diaz Castillo', 'laura.diaz@empresa.com', '3125558899', '7891234560', 'Consultoria Avanzada', 'Arquitecta de Software', 'Activo');

-- Preferencias dietarias
INSERT INTO preferencias_dietarias (asistente_id, preferencia) VALUES
(1, 'Vegetariano'),
(1, 'Sin lactosa'),
(2, 'Sin restricciones'),
(3, 'Vegano'),
(3, 'Sin gluten'),
(4, 'Vegetariano'),
(5, 'Sin mariscos');

-- Intereses
INSERT INTO intereses (asistente_id, interes) VALUES
(1, 'Inteligencia Artificial'),
(1, 'Cloud Computing'),
(2, 'Historia del Rock'),
(3, 'Running'),
(3, 'Nutricion Deportiva'),
(4, 'Liderazgo de equipos'),
(4, 'Transformacion Digital'),
(5, 'Etica en IA');

-- Datos adicionales 
INSERT INTO datos_adicionales (asistente_id, clave, valor) VALUES
(1, 'talla_camiseta', 'M'),
(1, 'nivel_experiencia', 'Senior'),
(1, 'tecnologias', 'JavaScript, Python, AWS'),
(1, 'linkedin', 'https://linkedin.com/in/mariagonzalez'),
(2, 'artista_favorito', 'Los Rolling Stones'),
(2, 'instrumento', 'Guitarra'),
(2, 'genero_musical_favorito', 'Rock Clasico'),
(3, 'talla_zapatos', '38'),
(3, 'mejor_tiempo_5k', '25:30'),
(3, 'tipo_corredor', 'Recreativo'),
(4, 'anos_experiencia', '10'),
(4, 'certificaciones', 'AWS Solutions Architect, Kubernetes Administrator'),
(4, 'tamano_empresa', '150'),
(5, 'especialidad', 'Machine Learning'),
(5, 'herramientas_analitica', 'Python, R, Tableau, Power BI'),
(5, 'nivel_ingles', 'Avanzado');

INSERT INTO asistencias (asistente_id, evento_id, tipo_ticket_id, precio_final, estado) VALUES
(1, 1, 2, 240000.00, 'Confirmado'),  
(1, 3, 8, 63000.00, 'Confirmado'),    
(2, 2, 4, 102000.00, 'Confirmado'),   
(3, 3, 7, 45000.00, 'Confirmado'),    
(4, 1, 1, 120000.00, 'Confirmado'),   
(5, 1, 2, 240000.00, 'Pendiente');  

-- Mensaje de confirmación
SELECT 'Base de datos eventos_db creada' as status;