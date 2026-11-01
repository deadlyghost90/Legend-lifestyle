const test = require("node:test");
const assert = require("node:assert/strict");
const { validateProduct } = require("../api/admin/products.js");

test("normalizes product slug and trims user input", () => {
  const result = validateProduct({ name: "  Legend Active One  ", category: " Watches ", price_pkr: 8999, stock: 0 });
  assert.equal(typeof result, "object");
  assert.equal(result.name, "Legend Active One");
  assert.equal(result.category, "Watches");
  assert.equal(result.slug, "legend-active-one");
  assert.equal(result.stock, 0);
});

test("rejects invalid prices and negative stock", () => {
  assert.match(validateProduct({ name: "Test", category: "Audio", price_pkr: 0, stock: 2 }), /Price must/);
  assert.match(validateProduct({ name: "Test", category: "Audio", price_pkr: 100, stock: -1 }), /Stock must/);
});

test("rejects unknown fields instead of passing them to the database", () => {
  assert.match(validateProduct({ name: "Test", category: "Audio", price_pkr: 100, stock: 2, is_admin: true }), /fields are not allowed/);
});

test("allows a partial stock update with zero units", () => {
  assert.deepEqual(validateProduct({ stock: 0 }, true), { stock: 0 });
});

test("rejects invalid status values", () => {
  assert.match(validateProduct({ name: "Test", category: "Audio", price_pkr: 100, stock: 2, status: "published" }), /Status must/);
});
