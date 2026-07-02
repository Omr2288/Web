const Database = require("better-sqlite3");
const db = new Database("Z:/WEB/database/data.db");

// Crear tablas si no existen
db.exec(`
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  fecha_creado TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proyectos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estatus TEXT DEFAULT 'pendiente',
  fecha_inicio TEXT,
  fecha_fin TEXT,
  fecha_creado TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS materiales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proyecto_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  cantidad REAL NOT NULL,
  costo_unitario REAL NOT NULL,
  FOREIGN KEY(proyecto_id) REFERENCES proyectos(id)
);

CREATE TABLE IF NOT EXISTS cotizaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proyecto_id INTEGER NOT NULL,
  total REAL DEFAULT 0,
  fecha_creado TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(proyecto_id) REFERENCES proyectos(id)
);

CREATE TABLE IF NOT EXISTS items_cotizacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cotizacion_id INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad REAL NOT NULL,
  precio REAL NOT NULL,
  FOREIGN KEY(cotizacion_id) REFERENCES cotizaciones(id)
);

CREATE TABLE IF NOT EXISTS fotos_proyecto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proyecto_id INTEGER NOT NULL,
  archivo TEXT NOT NULL,
  fecha_creado TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(proyecto_id) REFERENCES proyectos(id)
);
`);

module.exports = db;
