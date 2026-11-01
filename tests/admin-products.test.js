const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const rules = JSON.parse(fs.readFileSync("database.rules.json", "utf8")).rules;
const config = fs.readFileSync("firebase-config.js", "utf8");

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
