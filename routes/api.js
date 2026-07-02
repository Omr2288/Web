// ==========================================
//  TOMAHAWK SERVICES - API PRINCIPAL
//  Archivo limpio, ordenado y sin duplicados
// ==========================================

const jwt = require("jsonwebtoken");
const SECRET = "TOMAHAWK-2024";
const express = require("express");
const router = express.Router();

router.post("/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === "admin" && pass === "1234") {
    const token = jwt.sign({ user }, SECRET, { expiresIn: "12h" });
    return res.json({ ok: true, token });
  }

  res.json({ ok: false });
});

const path = require("path");
const fs = require("fs");
const os = require("os");
const db = require("../database/database");

const multer = require("multer");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");



// ==========================================
//  CONFIGURACIÓN DE MULTER (OFICIAL)
//  Carpeta única: Z:/WEB/uploads
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Z:/WEB/uploads");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ==========================================
//  FUNCIÓN DE LOG
// ==========================================

function log(msg) {
  fs.appendFileSync(
    "Z:/WEB/logs.txt",
    new Date().toISOString() + " - " + msg + "\n"
  );
}

// ==========================================
//  FUNCIÓN PARA ACTUALIZAR TOTAL DE COTIZACIÓN
// ==========================================

function actualizarTotal(cotizacion_id) {
  const items = db
    .prepare("SELECT cantidad, precio FROM items_cotizacion WHERE cotizacion_id = ?")
    .all(cotizacion_id);

  let total = 0;
  items.forEach(i => (total += i.cantidad * i.precio));

  db.prepare("UPDATE cotizaciones SET total = ? WHERE id = ?").run(
    total,
    cotizacion_id
  );
}

// ============================
// CRUD CLIENTES
// ============================

// Obtener TODOS los clientes
router.get("/clientes", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM clientes ORDER BY id DESC");
    const clientes = stmt.all();
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener cliente por ID
router.get("/clientes/:id", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM clientes WHERE id = ?");
    const cliente = stmt.get(req.params.id);

    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json(cliente);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear cliente
router.post("/clientes", (req, res) => {
  const { nombre, telefono, email, direccion } = req.body;

  try {
    // Validar duplicado por nombre
    const existe = db.prepare("SELECT id FROM clientes WHERE nombre = ?").get(nombre);

    if (existe) {
      return res.status(400).json({ error: "El cliente ya existe" });
    }

    const stmt = db.prepare(`
      INSERT INTO clientes (nombre, telefono, email, direccion)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(nombre, telefono, email, direccion);

    res.json({ id: info.lastInsertRowid, mensaje: "Cliente creado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar cliente
router.put("/clientes/:id", (req, res) => {
  const { nombre, telefono, email, direccion } = req.body;

  try {
    // Validar duplicado (excepto el mismo ID)
    const existe = db.prepare(`
      SELECT id FROM clientes 
      WHERE nombre = ? AND id != ?
    `).get(nombre, req.params.id);

    if (existe) {
      return res.status(400).json({ error: "Ya existe otro cliente con ese nombre" });
    }

    const stmt = db.prepare(`
      UPDATE clientes
      SET nombre = ?, telefono = ?, email = ?, direccion = ?
      WHERE id = ?
    `);

    const info = stmt.run(nombre, telefono, email, direccion, req.params.id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json({ mensaje: "Cliente actualizado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar cliente
router.delete("/clientes/:id", (req, res) => {
  try {
    const stmt = db.prepare("DELETE FROM clientes WHERE id = ?");
    const info = stmt.run(req.params.id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json({ mensaje: "Cliente eliminado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
//  PROYECTOS (API PROFESIONAL)
// ==========================================

// Obtener TODOS los proyectos
router.get("/proyectos", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, c.nombre AS cliente
      FROM proyectos p
      LEFT JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.id DESC
    `);
    const proyectos = stmt.all();
    res.json(proyectos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener proyectos por cliente
router.get("/proyectos/cliente/:cliente_id", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, c.nombre AS cliente
      FROM proyectos p
      LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.cliente_id = ?
      ORDER BY p.id DESC
    `);
    const proyectos = stmt.all(req.params.cliente_id);
    res.json(proyectos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener detalle de proyecto
router.get("/proyectos/detalle/:id", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, c.nombre AS cliente
      FROM proyectos p
      LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.id = ?
    `);
    const proyecto = stmt.get(req.params.id);

    if (!proyecto) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    res.json(proyecto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear proyecto
router.post("/proyectos", (req, res) => {
  const { cliente_id, nombre, descripcion, fecha_inicio, estatus } = req.body;

  try {
    // Validar cliente existente
    const cliente = db.prepare("SELECT id FROM clientes WHERE id = ?").get(cliente_id);
    if (!cliente) {
      return res.status(400).json({ error: "El cliente no existe" });
    }

    // Validar duplicado por nombre + cliente
    const existe = db.prepare(`
      SELECT id FROM proyectos 
      WHERE nombre = ? AND cliente_id = ?
    `).get(nombre, cliente_id);

    if (existe) {
      return res.status(400).json({ error: "Ya existe un proyecto con ese nombre para este cliente" });
    }

    const stmt = db.prepare(`
      INSERT INTO proyectos (cliente_id, nombre, descripcion, fecha_inicio, estatus)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(cliente_id, nombre, descripcion, fecha_inicio, estatus);

    res.json({ ok: true, id: result.lastInsertRowid, mensaje: "Proyecto creado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar proyecto
router.put("/proyectos/:id", (req, res) => {
  const { nombre, descripcion, fecha_inicio, estatus, cliente_id } = req.body;

  try {
    // Validar duplicado (excepto el mismo ID)
    const existe = db.prepare(`
      SELECT id FROM proyectos 
      WHERE nombre = ? AND cliente_id = ? AND id != ?
    `).get(nombre, cliente_id, req.params.id);

    if (existe) {
      return res.status(400).json({ error: "Ya existe otro proyecto con ese nombre para este cliente" });
    }

    const stmt = db.prepare(`
      UPDATE proyectos
      SET nombre=?, descripcion=?, fecha_inicio=?, estatus=?, cliente_id=?
      WHERE id=?
    `);

    const info = stmt.run(nombre, descripcion, fecha_inicio, estatus, cliente_id, req.params.id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    res.json({ ok: true, mensaje: "Proyecto actualizado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar proyecto
router.delete("/proyectos/:id", (req, res) => {
  try {
    const stmt = db.prepare("DELETE FROM proyectos WHERE id = ?");
    const info = stmt.run(req.params.id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    res.json({ ok: true, mensaje: "Proyecto eliminado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ==========================================
//  COTIZACIONES
// ==========================================

// Crear cotización
router.post("/cotizaciones", (req, res) => {
  const { proyecto_id } = req.body;

  const stmt = db.prepare(`
    INSERT INTO cotizaciones (proyecto_id, total)
    VALUES (?, 0)
  `);

  const result = stmt.run(proyecto_id);

  res.json({ ok: true, id: result.lastInsertRowid });
});

// Obtener cotizaciones por proyecto
router.get("/cotizaciones/:proyecto_id", (req, res) => {
  const stmt = db.prepare("SELECT * FROM cotizaciones WHERE proyecto_id = ?");
  const cotizaciones = stmt.all(req.params.proyecto_id);
  res.json(cotizaciones);
});

// Eliminar cotización
router.delete("/cotizaciones/:id", (req, res) => {
  db.prepare("DELETE FROM items_cotizacion WHERE cotizacion_id = ?").run(req.params.id);
  db.prepare("DELETE FROM cotizaciones WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});


// ==========================================
//  ITEMS DE COTIZACIÓN
// ==========================================

// Crear item
router.post("/items", (req, res) => {
  const { cotizacion_id, descripcion, cantidad, precio } = req.body;

  const stmt = db.prepare(`
    INSERT INTO items_cotizacion (cotizacion_id, descripcion, cantidad, precio)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(cotizacion_id, descripcion, cantidad, precio);

  actualizarTotal(cotizacion_id);

  res.json({ ok: true });
});

// Obtener items por cotización
router.get("/items/:cotizacion_id", (req, res) => {
  const stmt = db.prepare("SELECT * FROM items_cotizacion WHERE cotizacion_id = ?");
  const items = stmt.all(req.params.cotizacion_id);
  res.json(items);
});

// Obtener detalle de item
router.get("/items/detalle/:id", (req, res) => {
  const stmt = db.prepare("SELECT * FROM items_cotizacion WHERE id = ?");
  const item = stmt.get(req.params.id);
  res.json(item);
});

// Actualizar item
router.put("/items/:id", (req, res) => {
  const { descripcion, cantidad, precio, cotizacion_id } = req.body;

  const stmt = db.prepare(`
    UPDATE items_cotizacion SET descripcion=?, cantidad=?, precio=?
    WHERE id=?
  `);

  stmt.run(descripcion, cantidad, precio, req.params.id);

  actualizarTotal(cotizacion_id);

  res.json({ ok: true });
});

// Eliminar item
router.delete("/items/:id", (req, res) => {
  const item = db.prepare("SELECT * FROM items_cotizacion WHERE id = ?").get(req.params.id);

  db.prepare("DELETE FROM items_cotizacion WHERE id = ?").run(req.params.id);

  actualizarTotal(item.cotizacion_id);

  res.json({ ok: true });
});


// ==========================================
//  MATERIALES
// ==========================================

// Crear material
router.post("/materiales", (req, res) => {
  const { proyecto_id, nombre, cantidad, costo_unitario } = req.body;

  const stmt = db.prepare(`
    INSERT INTO materiales (proyecto_id, nombre, cantidad, costo_unitario)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(proyecto_id, nombre, cantidad, costo_unitario);

  res.json({ ok: true });
});

// Obtener materiales por proyecto
router.get("/materiales/:proyecto_id", (req, res) => {
  const stmt = db.prepare("SELECT * FROM materiales WHERE proyecto_id = ?");
  const materiales = stmt.all(req.params.proyecto_id);
  res.json(materiales);
});

// Obtener detalle de material
router.get("/materiales/detalle/:id", (req, res) => {
  const stmt = db.prepare("SELECT * FROM materiales WHERE id = ?");
  const material = stmt.get(req.params.id);
  res.json(material);
});

// Actualizar material
router.put("/materiales/:id", (req, res) => {
  const { nombre, cantidad, costo_unitario } = req.body;

  const stmt = db.prepare(`
    UPDATE materiales SET nombre=?, cantidad=?, costo_unitario=?
    WHERE id=?
  `);

  stmt.run(nombre, cantidad, costo_unitario, req.params.id);

  res.json({ ok: true });
});

// Eliminar material
router.delete("/materiales/:id", (req, res) => {
  const stmt = db.prepare("DELETE FROM materiales WHERE id = ?");
  stmt.run(req.params.id);
  res.json({ ok: true });
});

// Obtener TODOS los materiales
router.get("/materiales", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT m.*, p.nombre AS proyecto
      FROM materiales m
      LEFT JOIN proyectos p ON p.id = m.proyecto_id
      ORDER BY m.id DESC
    `);
    const materiales = stmt.all();
    res.json(materiales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
//  FOTOS (carpeta oficial: Z:/WEB/uploads)
// ==========================================

// Subir foto
router.post("/fotos", upload.single("foto"), (req, res) => {
  const { proyecto_id } = req.body;

  const stmt = db.prepare(`
    INSERT INTO fotos_proyecto (proyecto_id, archivo)
    VALUES (?, ?)
  `);

  stmt.run(proyecto_id, req.file.filename);

  res.json({ ok: true });
});

// Obtener fotos por proyecto
router.get("/fotos/:proyecto_id", (req, res) => {
  const stmt = db.prepare("SELECT * FROM fotos_proyecto WHERE proyecto_id = ?");
  const fotos = stmt.all(req.params.proyecto_id);
  res.json(fotos);
});

// Eliminar foto
router.delete("/fotos/:id", (req, res) => {
  const foto = db.prepare("SELECT * FROM fotos_proyecto WHERE id = ?").get(req.params.id);

  if (foto) {
    const filePath = "Z:/WEB/uploads/" + foto.archivo;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare("DELETE FROM fotos_proyecto WHERE id = ?").run(req.params.id);

  res.json({ ok: true });
});


// ==========================================
//  DASHBOARD
// ==========================================

router.get("/dashboard", (req, res) => {
  const totalClientes = db.prepare("SELECT COUNT(*) AS n FROM clientes").get().n;
  const totalProyectos = db.prepare("SELECT COUNT(*) AS n FROM proyectos").get().n;

  const proyectosActivos = db.prepare(`
    SELECT COUNT(*) AS n FROM proyectos
    WHERE estatus = 'pendiente' OR estatus = 'en proceso'
  `).get().n;

  const cotizacionesPendientes = db.prepare(`
    SELECT COUNT(*) AS n FROM cotizaciones
    WHERE total = 0
  `).get().n;

  const ultimosProyectos = db.prepare(`
    SELECT p.*, c.nombre AS cliente
    FROM proyectos p
    JOIN clientes c ON c.id = p.cliente_id
    ORDER BY p.id DESC
    LIMIT 5
  `).all();

  const ultimasCotizaciones = db.prepare(`
    SELECT co.*, p.nombre AS proyecto
    FROM cotizaciones co
    JOIN proyectos p ON p.id = co.proyecto_id
    ORDER BY co.id DESC
    LIMIT 5
  `).all();

  res.json({
    totalClientes,
    totalProyectos,
    proyectosActivos,
    cotizacionesPendientes,
    ultimosProyectos,
    ultimasCotizaciones
  });
});

// ==========================================
//  PDF PROFESIONAL TOMAHAWK
// ==========================================

router.get("/cotizacion/pdf/:id", async (req, res) => {
  const cotizacion_id = req.params.id;

  // Obtener cotización + cliente + proyecto
  const cot = db.prepare(`
    SELECT c.*, p.nombre AS proyecto, cli.nombre AS cliente, cli.telefono, cli.email
    FROM cotizaciones c
    JOIN proyectos p ON p.id = c.proyecto_id
    JOIN clientes cli ON cli.id = p.cliente_id
    WHERE c.id = ?
  `).get(cotizacion_id);

  const items = db.prepare(`
    SELECT * FROM items_cotizacion WHERE cotizacion_id = ?
  `).all(cotizacion_id);

  // Crear PDF
  const doc = new PDFDocument({ margin: 40 });
  const filename = `cotizacion-${cotizacion_id}.pdf`;
  const filepath = `Z:/WEB/pdfs/${filename}`;
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // Colores corporativos Tomahawk
  const verde = "#00C853";
  const verdeOscuro = "#0A5C3B";
  const dorado = "#D4AF37";
  const gris = "#555555";
  const negro = "#000000";

  // ENCABEZADO
  doc.image("public/logo.png", 40, 40, { width: 120 });
  doc.moveTo(40, 90).lineTo(550, 90).strokeColor(verde).stroke();

  doc.fontSize(26).fillColor(negro).text("COTIZACIÓN", 400, 50);
  doc.fontSize(12).fillColor(gris)
    .text(`ID: ${cotizacion_id}`, 400, 80)
    .text(`Fecha: ${cot.fecha_creado}`, 400, 95);

  doc.moveDown(3);

  // DATOS DEL CLIENTE
  doc.fontSize(14).fillColor(verde).text("Datos del cliente", { underline: true });
  doc.fontSize(12).fillColor(gris)
    .text(`Nombre: ${cot.cliente}`)
    .text(`Teléfono: ${cot.telefono || "N/A"}`)
    .text(`Email: ${cot.email || "N/A"}`);

  doc.moveDown(2);

  // PROYECTO
  doc.fontSize(14).fillColor(verde).text("Proyecto", { underline: true });
  doc.fontSize(12).fillColor(gris).text(cot.proyecto);
  doc.moveDown(2);

  // TABLA
  doc.fontSize(14).fillColor(verde).text("Detalle de cotización", { underline: true });
  doc.moveDown(1);

  doc.fontSize(12).fillColor(negro)
    .text("Descripción", 40)
    .text("Cantidad", 250)
    .text("Precio", 330)
    .text("Total", 420);

  doc.moveTo(40, doc.y + 5).lineTo(550, doc.y + 5).strokeColor(dorado).stroke();
  doc.moveDown(1);

  items.forEach(i => {
    const total = i.cantidad * i.precio;

    doc.fillColor(gris)
      .text(i.descripcion, 40)
      .text(i.cantidad.toString(), 250)
      .text(`$${i.precio.toFixed(2)}`, 330)
      .text(`$${total.toFixed(2)}`, 420);

    doc.moveDown(0.5);
  });

  doc.moveDown(2);

  // TOTAL
  doc.fontSize(18).fillColor(dorado)
    .text(`TOTAL: $${cot.total.toFixed(2)}`, { align: "right" });

  doc.moveDown(3);

  // FIRMAS
  doc.fontSize(14).fillColor(verde).text("Firmas", { underline: true });
  doc.moveDown(1);

  doc.fontSize(12).fillColor(gris)
    .text("______________________________", 40)
    .text("Firma del cliente", 40, doc.y + 5);

  doc.text("______________________________", 300)
    .text("Firma Tomahawk Services", 300, doc.y + 5);

  doc.moveDown(3);

  // QR
  const qrData = `https://tomahawk-services.com/cotizacion/${cotizacion_id}`;
  const qrImage = await QRCode.toDataURL(qrData);

  doc.image(qrImage, 40, doc.y, { width: 100 });
  doc.fontSize(10).fillColor(gris)
    .text("Escanea para ver esta cotización en línea", 150, doc.y + 40);

  // PIE DE PÁGINA
  doc.moveTo(40, 750).lineTo(550, 750).strokeColor(verde).stroke();

  doc.fontSize(10).fillColor(verdeOscuro)
    .text("📞 214-854-5658", 60, 760)
    .text("✉️ tomahawk.servi@gmail.com", 180, 760)
    .text("📍 972 W Walcott St., Pilot Point, TX 75258", 360, 760);

  doc.moveTo(40, 780).lineTo(550, 780).strokeColor(verdeOscuro).stroke();
  doc.fontSize(9).fillColor(verdeOscuro)
    .text("www.tomahawk-services.com", 250, 785);

  doc.end();

  stream.on("finish", () => res.download(filepath));
});


// ==========================================
//  EXPORTAR ROUTER
// ==========================================

module.exports = router;