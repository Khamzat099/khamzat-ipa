const express = require("express");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const validTokens = new Set();

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: "Не авторизовано, войдите заново" });
  }
  next();
}

app.get("/api/products", (req, res) => {
  res.json(db.getProducts());
});

app.get("/api/admin/status", (req, res) => {
  res.json({ passwordSet: db.hasPassword() });
});

app.post("/api/admin/setup", (req, res) => {
  if (db.hasPassword()) {
    return res.status(400).json({ error: "Пароль уже установлен" });
  }
  const password = (req.body && req.body.password) || "";
  if (password.length < 4) {
    return res.status(400).json({ error: "Пароль должен быть не короче 4 символов" });
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  db.setPassword(salt, hash);

  const token = makeToken();
  validTokens.add(token);
  res.json({ token });
});

app.post("/api/admin/login", (req, res) => {
  const password = (req.body && req.body.password) || "";
  const record = db.getPasswordRecord();
  if (!record) {
    return res.status(400).json({ error: "Пароль ещё не установлен" });
  }
  const hash = hashPassword(password, record.salt);
  if (hash !== record.hash) {
    return res.status(401).json({ error: "Неверный пароль" });
  }
  const token = makeToken();
  validTokens.add(token);
  res.json({ token });
});

app.post("/api/admin/logout", requireAuth, (req, res) => {
  const token = req.headers.authorization.slice(7);
  validTokens.delete(token);
  res.json({ ok: true });
});

app.put("/api/admin/products", requireAuth, (req, res) => {
  const products = req.body && req.body.products;
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: "Неверный формат данных" });
  }
  for (const p of products) {
    if (!p.id || typeof p.title !== "string" || typeof p.price !== "number") {
      return res.status(400).json({ error: "Неверные данные товара" });
    }
  }
  db.updateProducts(products);
  res.json(db.getProducts());
});

app.post("/api/admin/reset", requireAuth, (req, res) => {
  db.resetProducts();
  res.json(db.getProducts());
});

function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "item"
  );
}

app.post("/api/admin/products", requireAuth, (req, res) => {
  const { title, description, price, priceNote, tag, tagClass } = req.body || {};
  if (!title || typeof price !== "number" || Number.isNaN(price)) {
    return res.status(400).json({ error: "Укажите название и цену" });
  }
  const id = `${slugify(title)}-${crypto.randomBytes(3).toString("hex")}`;
  db.addProduct({
    id,
    tag: tag || "Товар",
    tagClass: tagClass || "",
    title,
    description: description || "",
    price,
    priceNote: priceNote || "",
  });
  res.json(db.getProducts());
});

app.delete("/api/admin/products/:id", requireAuth, (req, res) => {
  db.deleteProduct(req.params.id);
  res.json(db.getProducts());
});

app.listen(PORT, () => {
  console.log(`khamzat.ipa server running at http://localhost:${PORT}`);
});
