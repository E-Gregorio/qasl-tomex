// ═══════════════════════════════════════════════════════════
// QASL·TOMEX — DEMO PATIENT APP
// Aplicación con vulnerabilidades plantadas para demostrar TOMEX
// ADVERTENCIA: Esta app tiene bugs INTENCIONALES
// Autor: Elyer Gregorio Maldonado
// ═══════════════════════════════════════════════════════════

const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

// ── BASE DE DATOS SIMULADA ──
let users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', balance: 10000 },
  { id: 2, username: 'user1', password: 'pass123', role: 'user', balance: 500 }
];
let products = [
  { id: 1, name: 'Laptop', price: 1200, stock: 5 },
  { id: 2, name: 'Phone', price: 800, stock: 3 }
];
let orders = [];

// ══════════════════════════════════════════════
// VULNERABILIDAD 1: SQL Injection simulada
// (en producción real sería con DB real)
// ══════════════════════════════════════════════
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // BUG CRÍTICO: No sanitiza inputs — vulnerable a injection
  const user = users.find(u =>
    u.username === username && u.password === password
  );

  if (user) {
    // BUG CRÍTICO: Token sin expiración
    const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');

    // BUG MEDIO: Credenciales en log
    console.log(`Login exitoso: ${username}:${password} token=${token}`);

    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
  } else {
    res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }
});

// ══════════════════════════════════════════════
// VULNERABILIDAD 2: XSS — Input no sanitizado
// ══════════════════════════════════════════════
app.post('/api/comments', (req, res) => {
  const { comment, userId } = req.body;

  // BUG CRÍTICO: Guarda HTML sin sanitizar — XSS stored
  const newComment = { id: Date.now(), userId, comment, date: new Date() };

  res.json({ success: true, comment: newComment });
});

// ══════════════════════════════════════════════
// VULNERABILIDAD 3: Race condition en checkout
// ══════════════════════════════════════════════
app.post('/api/checkout', async (req, res) => {
  const { productId, quantity, userId } = req.body;

  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  // BUG CRÍTICO: Race condition — dos requests simultáneos
  // pueden comprar el mismo stock sin verificación atómica
  if (product.stock >= quantity) {
    // Simular delay de DB (aquí ocurre la race condition)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Cuando llegan 2 requests al mismo tiempo, ambos pasan
    // la verificación de stock y ambos decrementan → stock negativo
    product.stock -= quantity;

    const order = { id: Date.now(), userId, productId, quantity, total: product.price * quantity };
    orders.push(order);

    res.json({ success: true, order, remainingStock: product.stock });
  } else {
    res.status(400).json({ error: 'Stock insuficiente' });
  }
});

// ══════════════════════════════════════════════
// VULNERABILIDAD 4: Auth bypass — no valida token
// ══════════════════════════════════════════════
app.get('/api/admin/users', (req, res) => {
  const token = req.headers.authorization;

  // BUG CRÍTICO: Acepta cualquier token sin validar firma ni expiración
  if (token) {
    res.json({ users: users.map(u => ({ ...u, password: u.password })) });
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
});

// ══════════════════════════════════════════════
// VULNERABILIDAD 5: No maneja errores async
// ══════════════════════════════════════════════
app.get('/api/products/:id', async (req, res) => {
  // BUG ALTO: Sin try/catch — si falla, el servidor se cae
  const product = products.find(p => p.id === parseInt(req.params.id));
  const enriched = await enrichProductData(product); // puede lanzar error
  res.json(enriched);
});

// Función que puede lanzar error sin aviso
async function enrichProductData(product) {
  if (!product) throw new Error('Product undefined'); // sin manejo
  return { ...product, enriched: true };
}

// ══════════════════════════════════════════════
// ENDPOINTS SANOS (para comparación)
// ══════════════════════════════════════════════
app.get('/api/products', (req, res) => {
  res.json({ products });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date() });
});

app.get('/api/orders', (req, res) => {
  res.json({ orders });
});

// ── SERVIDOR ──
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`\n🏥 QASL·TOMEX Demo Patient App`);
  console.log(`📍 Running on: http://localhost:${PORT}`);
  console.log(`⚠️  Esta app tiene vulnerabilidades INTENCIONALES para demostrar TOMEX\n`);
});

module.exports = app;