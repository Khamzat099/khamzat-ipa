const WHATSAPP_NUMBER = "79687720202";

function waLink(product) {
  const text = `Здравствуйте! Хочу оформить: ${product.title} — ${product.price}₽. Подскажите, как оплатить?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function formatPrice(n) {
  return Number(n).toLocaleString("ru-RU") + " ₽";
}
