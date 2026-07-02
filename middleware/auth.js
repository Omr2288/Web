function proteger(req, res, next) {
  // Permitir login y API de login
  if (req.path === "/login.html" || req.path === "/api/login") {
    return next();
  }

  // Permitir archivos estáticos
  if (
    req.path.startsWith("/uploads") ||
    req.path.startsWith("/pdfs") ||
    req.path.endsWith(".css") ||
    req.path.endsWith(".js") ||
    req.path.endsWith(".png") ||
    req.path.endsWith(".jpg") ||
    req.path.endsWith(".jpeg") ||
    req.path.endsWith(".svg") ||
    req.path.endsWith(".ico") ||
    req.path.endsWith(".html")
  ) {
    return next();
  }

  // Permitir API sin token (si quieres protegerla después lo hacemos)
  if (req.path.startsWith("/api")) {
    return next();
  }

  // Revisar token
  const token = req.headers.authorization?.replace("Bearer ", "");

  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    res.redirect("/login.html");
  }
}