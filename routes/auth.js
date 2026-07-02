const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = "TOMAHawkSuperClaveUltraSegura123";

// Usuario único por ahora
const USER = {
  username: "octavio",
  passwordHash: bcrypt.hashSync("1234", 10)
};

// Login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username !== USER.username) {
    return res.status(401).json({ error: "Usuario incorrecto" });
  }

  if (!bcrypt.compareSync(password, USER.passwordHash)) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  const token = jwt.sign({ username }, SECRET, { expiresIn: "1h" });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "strict"
  });

  res.json({ ok: true, message: "Login exitoso" });
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true, message: "Sesión cerrada" });
});

// Verificar sesión
router.get("/me", (req, res) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ error: "No autenticado" });

  try {
    const data = jwt.verify(token, SECRET);
    res.json({ ok: true, user: data.username });
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
});

module.exports = router;
