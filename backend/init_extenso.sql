-- Archivo para insertar una gran cantidad de datos de prueba
-- Este script asume que la estructura de la base de datos ya ha sido creada por init.sql

USE eventos_db;

-- Desactivar temporalmente las comprobaciones de claves foraneas para inserciones masivas
SET FOREIGN_KEY_CHECKS = 0;

-- Limpiar tablas existentes para evitar duplicados si se ejecuta varias veces
TRUNCATE TABLE asistencias;
TRUNCATE TABLE datos_adicionales;
TRUNCATE TABLE intereses;
TRUNCATE TABLE preferencias_dietarias;
TRUNCATE TABLE tickets;
TRUNCATE TABLE tipos_ticket;
TRUNCATE TABLE promociones;
TRUNCATE TABLE asistentes;
TRUNCATE TABLE eventos;

-- Reiniciar AUTO_INCREMENT para todas las tablas
ALTER TABLE eventos AUTO_INCREMENT = 1;
ALTER TABLE asistentes AUTO_INCREMENT = 1;
ALTER TABLE tipos_ticket AUTO_INCREMENT = 1;
ALTER TABLE tickets AUTO_INCREMENT = 1;
ALTER TABLE promociones AUTO_INCREMENT = 1;
ALTER TABLE preferencias_dietarias AUTO_INCREMENT = 1;
ALTER TABLE intereses AUTO_INCREMENT = 1;
ALTER TABLE datos_adicionales AUTO_INCREMENT = 1;
ALTER TABLE asistencias AUTO_INCREMENT = 1;


-- Generar 1000 eventos
DELIMITER //
CREATE PROCEDURE GenerateLargeEventData()
BEGIN
    -- Declaracion de variables (TODAS DEBEN IR AL PRINCIPIO)
    DECLARE i INT DEFAULT 1;
    DECLARE event_id INT;
    DECLARE start_date DATETIME;
    DECLARE end_date DATETIME;
    DECLARE random_capacity INT;
    DECLARE random_discount DECIMAL(5,2);
    DECLARE random_day INT;
    DECLARE random_month INT;
    DECLARE random_year INT;
    DECLARE random_hour INT;
    DECLARE random_minute INT;
    DECLARE random_category VARCHAR(50);
    DECLARE categories_array VARCHAR(255) DEFAULT 'Conferencia,Concierto,Deportivo,Cultural,Corporativo,Otro';
    DECLARE current_category VARCHAR(50);
    DECLARE category_index INT;
    DECLARE asistente_id INT;
    DECLARE random_phone VARCHAR(10);
    DECLARE random_doc VARCHAR(10);
    DECLARE random_company VARCHAR(100);
    DECLARE random_job VARCHAR(100);

    WHILE i <= 1000 DO
        SET random_year = 2025 + FLOOR(RAND() * 2); -- 2025 o 2026
        SET random_month = 1 + FLOOR(RAND() * 12);
        SET random_day = 1 + FLOOR(RAND() * 28); -- Para evitar problemas con meses de 31 dias
        SET random_hour = FLOOR(RAND() * 24);
        SET random_minute = FLOOR(RAND() * 60);
        SET start_date = STR_TO_DATE(CONCAT(random_year, '-', random_month, '-', random_day, ' ', random_hour, ':', random_minute, ':00'), '%Y-%m-%d %H:%i:%s');
        SET random_capacity = 100 + FLOOR(RAND() * 900); -- 100 a 1000
        
        SET category_index = 1 + FLOOR(RAND() * 6);
        SET current_category = SUBSTRING_INDEX(SUBSTRING_INDEX(categories_array, ',', category_index), ',', -1);

        INSERT INTO eventos (nombre, descripcion, fecha, lugar, capacidad, categoria, organizador_nombre, organizador_contacto, organizador_email) VALUES
        (CONCAT('Evento Masivo ', i), CONCAT('Descripcion detallada del Evento Masivo ', i, '. Una experiencia unica.'), start_date, CONCAT('Lugar ', i), random_capacity, current_category, CONCAT('Organizador ', i), CONCAT('300', LPAD(FLOOR(RAND() * 10000000), 7, '0')), CONCAT('contacto', i, '@email.com'));
        
        SET event_id = LAST_INSERT_ID();

        -- Generar 2-3 tipos de tickets por evento
        INSERT INTO tipos_ticket (evento_id, tipo, precio, cantidad, caracteristicas) VALUES
        (event_id, 'General', 50000 + FLOOR(RAND() * 100000), FLOOR(random_capacity * 0.6), JSON_OBJECT('acceso', 'General')),
        (event_id, 'VIP', 150000 + FLOOR(RAND() * 200000), FLOOR(random_capacity * 0.2), JSON_OBJECT('acceso', 'VIP', 'beneficios', 'Catering')),
        (event_id, 'Estudiante', 30000 + FLOOR(RAND() * 50000), FLOOR(random_capacity * 0.2), JSON_OBJECT('acceso', 'General', 'requisitos', 'Carnet'));

        -- Generar tickets vendidos para cada tipo de ticket
        INSERT INTO tickets (tipo_ticket_id, vendidos)
        SELECT id, FLOOR(cantidad * RAND()) FROM tipos_ticket WHERE evento_id = event_id;

        -- Generar 1-2 promociones por evento
        SET random_discount = 5 + FLOOR(RAND() * 20); -- 5% a 25%
        SET end_date = DATE_ADD(start_date, INTERVAL FLOOR(RAND() * 30) DAY); -- Promocion dura hasta 30 dias despues
        INSERT INTO promociones (evento_id, codigo, descuento, fecha_inicio, fecha_fin, activa, condiciones) VALUES
        (event_id, CONCAT('PROMO', i, 'A'), random_discount, start_date, end_date, TRUE, JSON_OBJECT('minimoCompra', 1)),
        (event_id, CONCAT('PROMO', i, 'B'), random_discount + 5, start_date, DATE_ADD(end_date, INTERVAL 7 DAY), TRUE, JSON_OBJECT('validoPara', 'VIP'));

        SET i = i + 1;
    END WHILE;

    -- Generar 500 asistentes
    SET i = 1;
    WHILE i <= 500 DO
        SET random_phone = CONCAT('3', LPAD(FLOOR(RAND() * 1000000000), 9, '0'));
        SET random_doc = LPAD(FLOOR(RAND() * 1000000000), 10, '0');
        SET random_company = CONCAT('Empresa', FLOOR(RAND() * 100));
        SET random_job = CONCAT('Cargo', FLOOR(RAND() * 50));

        INSERT INTO asistentes (nombre, email, telefono, documento, empresa, cargo, estado) VALUES
        (CONCAT('Asistente ', i), CONCAT('asistente', i, '@mail.com'), random_phone, random_doc, random_company, random_job, 'Activo');
        
        SET asistente_id = LAST_INSERT_ID();

        -- Generar 1-3 preferencias dietarias
        IF RAND() > 0.3 THEN
            INSERT INTO preferencias_dietarias (asistente_id, preferencia) VALUES (asistente_id, 'Vegetariano');
        END IF;
        IF RAND() > 0.6 THEN
            INSERT INTO preferencias_dietarias (asistente_id, preferencia) VALUES (asistente_id, 'Sin gluten');
        END IF;

        -- Generar 1-3 intereses
        IF RAND() > 0.2 THEN
            INSERT INTO intereses (asistente_id, interes) VALUES (asistente_id, 'Tecnologia');
        END IF;
        IF RAND() > 0.5 THEN
            INSERT INTO intereses (asistente_id, interes) VALUES (asistente_id, 'Deportes');
        END IF;
        IF RAND() > 0.8 THEN
            INSERT INTO intereses (asistente_id, interes) VALUES (asistente_id, 'Musica');
        END IF;

        -- Generar 1-5 datos adicionales
        IF RAND() > 0.1 THEN
            INSERT INTO datos_adicionales (asistente_id, clave, valor) VALUES (asistente_id, 'CampoExtra1', CONCAT('Valor', FLOOR(RAND() * 100)));
        END IF;
        IF RAND() > 0.4 THEN
            INSERT INTO datos_adicionales (asistente_id, clave, valor) VALUES (asistente_id, 'CampoExtra2', CONCAT('OtroValor', FLOOR(RAND() * 50)));
        END IF;

        -- Generar 1-2 asistencias a eventos aleatorios
        IF RAND() > 0.2 THEN
            INSERT INTO asistencias (asistente_id, evento_id, tipo_ticket_id, precio_final, estado)
            SELECT asistente_id, e.id, tt.id, tt.precio, 'Confirmado'
            FROM eventos e
            JOIN tipos_ticket tt ON e.id = tt.evento_id
            ORDER BY RAND() LIMIT 1;
        END IF;
        IF RAND() > 0.7 THEN
            INSERT INTO asistencias (asistente_id, evento_id, tipo_ticket_id, precio_final, estado)
            SELECT asistente_id, e.id, tt.id, tt.precio, 'Pendiente'
            FROM eventos e
            JOIN tipos_ticket tt ON e.id = tt.evento_id
            ORDER BY RAND() LIMIT 1;
        END IF;

        SET i = i + 1;
    END WHILE;

END //
DELIMITER ;

CALL GenerateLargeEventData();
DROP PROCEDURE IF EXISTS GenerateLargeEventData;

-- Reactivar comprobaciones de claves foraneas
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Base de datos poblada con gran cantidad de datos de prueba' as status;