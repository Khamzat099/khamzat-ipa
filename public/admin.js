const TOKEN_KEY = "khamzat_admin_token";

const gate = document.getElementById("gate");
const adminMain = document.getElementById("adminMain");
const pwInput = document.getElementById("pwInput");
const gateBtn = document.getElementById("gateBtn");
const gateError = document.getElementById("gateError");
const gateTitle = document.getElementById("gateTitle");
const gateSub = document.getElementById("gateSub");

let currentProducts = [];

async function init() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    showAdmin();
    return;
  }
  try {
    const res = await fetch("/api/admin/status");
    const status = await res.json();
    if (!status.passwordSet) {
      gateTitle.textContent = "Задайте пароль";
      gateSub.textContent = "Пароль ещё не установлен — придумайте его при первом входе.";
    }
  } catch (e) {
    gateError.textContent = "Не удалось связаться с сервером";
  }
}

function showAdmin() {
  gate.style.display = "none";
  adminMain.classList.add("visible");
  loadEditList();
}

function forceRelogin(message) {
  sessionStorage.removeItem(TOKEN_KEY);
  adminMain.classList.remove("visible");
  gate.style.display = "flex";
  gateError.textContent = message || "";
}

async function handleGateSubmit() {
  const val = pwInput.value.trim();
  gateError.textContent = "";
  if (!val) {
    gateError.textContent = "Введите пароль";
    return;
  }

  try {
    const statusRes = await fetch("/api/admin/status");
    const status = await statusRes.json();

    let res;
    if (!status.passwordSet) {
      if (val.length < 4) {
        gateError.textContent = "Пароль должен быть не короче 4 символов";
        return;
      }
      res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: val }),
      });
    } else {
      res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: val }),
      });
    }

    const data = await res.json();
    if (!res.ok) {
      gateError.textContent = data.error || "Ошибка входа";
      return;
    }

    sessionStorage.setItem(TOKEN_KEY, data.token);
    pwInput.value = "";
    showAdmin();
  } catch (e) {
    gateError.textContent = "Не удалось связаться с сервером";
  }
}

gateBtn.addEventListener("click", handleGateSubmit);
pwInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleGateSubmit();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  sessionStorage.removeItem(TOKEN_KEY);
  location.reload();
});

async function loadEditList() {
  const res = await fetch("/api/products");
  currentProducts = await res.json();
  renderEditList();
}

function renderEditList() {
  const list = document.getElementById("editList");
  list.innerHTML = currentProducts
    .map(
      (p, i) => `
    <div class="edit-card">
      <div class="field">
        <label>Название</label>
        <input type="text" data-idx="${i}" data-field="title" value="${escapeAttr(p.title)}" />
      </div>
      <div class="field">
        <label>Описание</label>
        <textarea data-idx="${i}" data-field="description">${escapeHtml(p.description)}</textarea>
      </div>
      <div class="field">
        <label>Цена (₽)</label>
        <input type="number" data-idx="${i}" data-field="price" value="${p.price}" />
      </div>
      <div class="field">
        <label>Подпись под ценой</label>
        <input type="text" data-idx="${i}" data-field="priceNote" value="${escapeAttr(p.priceNote)}" />
      </div>
    </div>
  `
    )
    .join("");
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}
function escapeHtml(s) {
  return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.getElementById("saveBtn").addEventListener("click", async () => {
  const inputs = document.querySelectorAll("#editList [data-idx]");
  inputs.forEach((el) => {
    const idx = Number(el.dataset.idx);
    const field = el.dataset.field;
    const value = field === "price" ? Number(el.value) : el.value;
    currentProducts[idx][field] = value;
  });

  const token = sessionStorage.getItem(TOKEN_KEY);
  const msg = document.getElementById("saveMsg");

  try {
    const res = await fetch("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ products: currentProducts }),
    });

    if (res.status === 401) {
      forceRelogin("Сессия истекла, войдите заново");
      return;
    }

    if (res.ok) {
      currentProducts = await res.json();
      msg.textContent = "Сохранено ✓";
      msg.style.color = "var(--green)";
      msg.classList.add("visible");
    } else {
      const data = await res.json().catch(() => ({}));
      msg.textContent = data.error || "Ошибка сохранения";
      msg.style.color = "#ff6b6b";
      msg.classList.add("visible");
    }
  } catch (e) {
    msg.textContent = "Не удалось связаться с сервером";
    msg.style.color = "#ff6b6b";
    msg.classList.add("visible");
  }

  setTimeout(() => msg.classList.remove("visible"), 2200);
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (!confirm("Сбросить все товары к значениям по умолчанию?")) return;
  const token = sessionStorage.getItem(TOKEN_KEY);

  const res = await fetch("/api/admin/reset", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    forceRelogin("Сессия истекла, войдите заново");
    return;
  }
  if (res.ok) {
    currentProducts = await res.json();
    renderEditList();
  }
});

init();
