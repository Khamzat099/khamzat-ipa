async function renderProducts() {
  const container = document.getElementById("products");
  container.innerHTML = '<p style="color:var(--text-muted)">Загрузка…</p>';

  try {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error("bad response");
    const products = await res.json();

    container.innerHTML = products
      .map(
        (p) => `
      <div class="card ${p.tagClass || ""}">
        <span class="tag">${p.tag}</span>
        <h3>${p.title}</h3>
        <p class="desc">${p.description}</p>
        <div class="row">
          <div class="price">${formatPrice(p.price)}<span class="sub">${p.priceNote}</span></div>
          <a class="buy-btn" href="${waLink(p)}" target="_blank" rel="noopener">Оплатить</a>
        </div>
      </div>
    `
      )
      .join("");
  } catch (e) {
    container.innerHTML =
      '<p style="color:var(--text-muted)">Не удалось загрузить товары. Обновите страницу.</p>';
  }
}

renderProducts();
