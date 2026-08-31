const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "data.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tag TEXT NOT NULL,
    tagClass TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    priceNote TEXT NOT NULL DEFAULT '',
    sortOrder INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const DEFAULT_PRODUCTS = [
  {
    id: "ios-cert",
    tag: "Сертификат",
    tagClass: "",
    title: "iOS-сертификат",
    description:
      "Устанавливается на iPhone и открывает доступ к WhatsApp+, Instagram+ и Telegram+ — расширенным версиям привычных приложений с дополнительными функциями.",
    price: 1300,
    priceNote: "разовая установка",
    sortOrder: 1,
  },
  {
    id: "tg-premium",
    tag: "Подписка",
    tagClass: "tag-sub",
    title: "Telegram Premium",
    description:
      "Официальная подписка Telegram Premium на 12 месяцев: увеличенные лимиты, эксклюзивные стикеры и реакции, без рекламы в каналах.",
    price: 3500,
    priceNote: "на 12 месяцев",
    sortOrder: 2,
  },
  {
    id: "chatgpt-go",
    tag: "ИИ-подписка",
    tagClass: "tag-ai",
    title: "ChatGPT Go",
    description:
      "Подписка ChatGPT Go — расширенные лимиты на сообщения и доступ к более быстрым ответам по сравнению с бесплатной версией.",
    price: 2500,
    priceNote: "на 1 месяц",
    sortOrder: 3,
  },
  {
    id: "chatgpt-plus",
    tag: "ИИ-подписка",
    tagClass: "tag-ai",
    title: "ChatGPT Plus",
    description:
      "Подписка ChatGPT Plus — приоритетный доступ, старшие модели и самые высокие лимиты среди доступных тарифов.",
    price: 4000,
    priceNote: "на 1 месяц",
    sortOrder: 4,
  },
];

function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO products (id, tag, tagClass, title, description, price, priceNote, sortOrder)
      VALUES (@id, @tag, @tagClass, @title, @description, @price, @priceNote, @sortOrder)
    `);
    const tx = db.transaction((items) => items.forEach((p) => insert.run(p)));
    tx(DEFAULT_PRODUCTS);
  }
}
seedIfEmpty();

function getProducts() {
  return db.prepare("SELECT * FROM products ORDER BY sortOrder ASC").all();
}

function updateProducts(products) {
  const update = db.prepare(`
    UPDATE products
    SET title = @title, description = @description, price = @price, priceNote = @priceNote
    WHERE id = @id
  `);
  const tx = db.transaction((items) => items.forEach((p) => update.run(p)));
  tx(products);
}

function resetProducts() {
  db.prepare("DELETE FROM products").run();
  seedIfEmpty();
}

function hasPassword() {
  return !!db.prepare("SELECT value FROM settings WHERE key = 'admin_salt'").get();
}

function getPasswordRecord() {
  const salt = db.prepare("SELECT value FROM settings WHERE key = 'admin_salt'").get();
  const hash = db.prepare("SELECT value FROM settings WHERE key = 'admin_hash'").get();
  if (!salt || !hash) return null;
  return { salt: salt.value, hash: hash.value };
}

function setPassword(salt, hash) {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  upsert.run("admin_salt", salt);
  upsert.run("admin_hash", hash);
}

module.exports = {
  getProducts,
  updateProducts,
  resetProducts,
  hasPassword,
  getPasswordRecord,
  setPassword,
};
