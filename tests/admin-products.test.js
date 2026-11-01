const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const rules = JSON.parse(fs.readFileSync("database.rules.json", "utf8")).rules;
const config = fs.readFileSync("firebase-config.js", "utf8");
const adminUi = fs.readFileSync("admin/admin.js", "utf8");
const adminGuard = fs.readFileSync("admin/admin-guard.js", "utf8");
const adminHtml = fs.readFileSync("admin/index.html", "utf8");

test("Realtime Database denies root access by default", () => {
  assert.equal(rules[".read"], false);
  assert.equal(rules[".write"], false);
});

test("admin catalogue reads and writes require the trusted admin claim", () => {
  assert.match(rules.products[".read"], /auth\.token\.admin/);
  assert.match(rules.products[".write"], /auth\.token\.admin/);
});

test("public storefront catalogue is readable but admin-write-only", () => {
  assert.equal(rules.storefrontProducts[".read"], true);
  assert.match(rules.storefrontProducts[".write"], /auth\.token\.admin/);
  assert.equal(rules.storefrontProducts.$productId.status[".validate"], "newData.val() === 'active'");
});

test("Firebase web config targets the Aera parent-company project", () => {
  assert.match(config, /projectId:\s*"aera-s-store"/);
  assert.match(config, /databaseURL:\s*"https:\/\/aera-s-store-default-rtdb\.europe-west1\.firebasedatabase\.app"/);
});

test("Firebase web config contains no service-account private key material", () => {
  assert.doesNotMatch(config, /private_key|client_email|BEGIN PRIVATE KEY/);
});

test("admin product form supports editing and active/draft visibility", () => {
  assert.match(adminUi, /data-edit=/);
  assert.match(adminUi, /method:editingProductId\?"PATCH":"POST"/);
  assert.match(adminUi, /Product updated in Firebase/);
  assert.match(adminHtml, /id="productDescription"/);
  assert.match(adminHtml, /id="productStatus"/);
});

test("Firebase create and update handlers validate product fields", () => {
  assert.match(adminGuard, /body\.price_pkr > 100000000/);
  assert.match(adminGuard, /description\.length > 5000/);
  assert.match(adminGuard, /const compareAt/);
  assert.match(adminGuard, /storefrontProducts/);
});
