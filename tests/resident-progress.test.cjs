const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  ts = require("typescript");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "complices-f6-"));
process.env.COMPLICES_DATA_DIR = directory;
require.extensions[".ts"] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
const dbLib = require("../src/lib/db.ts");
const progress = require("../src/lib/resident-progress.ts");
const { awardResidentPoints } = require("../src/lib/resident-points.ts");
const { residentLevel } = require("../src/lib/resident-progress-options.ts");
const needs = require("../src/lib/resident-needs.ts");
const db = dbLib.getDb();
after(() => {
  globalThis.__complicesDb?.close();
  delete globalThis.__complicesDb;
  fs.rmSync(directory, { recursive: true, force: true });
});
let n = 0;
function user(type = "habitant") {
  const name = "f6-" + ++n;
  return dbLib.insertUser({
    email: name,
    password: "",
    displayName: name,
    accountType: type,
    sector: null,
    address: null,
    description: null,
  });
}
function idea(owner, place = "Lieu démo") {
  return dbLib.insertIdea(owner, {
    title: "Test profil",
    description: "Activité de test",
    category: "communautaire",
    place,
    startsAt: "2099-10-15T14:00:00Z",
    needs: ["participants"],
    images: [],
  });
}
const join = (i, u, contribution = "participer") =>
  dbLib.insertComplice(i, u, { contribution, message: "" });
const score = (u) =>
  db
    .prepare("SELECT COALESCE(SUM(points),0) AS n FROM points WHERE user_id=?")
    .get(u).n;
test("new schema preserves seeds and adds no retroactive points", () => {
  assert.ok(db.prepare("SELECT COUNT(*) n FROM users").get().n > 0);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM points").get().n, 0);
  assert.equal(db.pragma("user_version", { simple: true }), 2);
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
test("daily caps, duplicate protection and establishments excluded", () => {
  const u = user();
  for (let i = 0; i < 8; i++) awardResidentPoints(db, u, "vote", "v" + i);
  assert.equal(score(u), 15);
  for (let i = 0; i < 6; i++) awardResidentPoints(db, u, "booking", "b" + i);
  assert.equal(score(u), 100);
  assert.equal(awardResidentPoints(db, u, "booking", "b0"), 0);
  db.prepare("UPDATE points SET day='2000-01-01' WHERE user_id=?").run(u);
  assert.equal(awardResidentPoints(db, u, "booking", "b5"), 0);
  assert.equal(score(u), 100);
  const company = user("commerce");
  assert.equal(awardResidentPoints(db, company, "join", "x"), 0);
  assert.throws(
    () => progress.getResidentProgress(company),
    (e) => e.status === 403,
  );
});
test("joins reward once per idea and idea needs two distinct other people", () => {
  const owner = user(),
    a = user(),
    b = user(),
    i = idea(owner);
  join(i, owner);
  assert.equal(score(owner), 0);
  join(i, a);
  join(i, a, "benevole");
  assert.equal(score(a), 15);
  assert.equal(score(owner), 0);
  join(i, b);
  assert.equal(score(owner), 30);
  join(i, b, "materiel");
  assert.equal(score(owner), 30);
  assert.ok(
    progress
      .getResidentProgress(owner)
      .badges.find((b) => b.id === "batisseur-idees").earned,
  );
  db.prepare("DELETE FROM ideas WHERE id=?").run(i);
  assert.equal(score(owner), 30);
  assert.equal(score(a), 15);
});
test("help requires organizer confirmation and rewards only once", () => {
  const owner = user(),
    helper = user(),
    stranger = user(),
    i = idea(owner),
    c = join(i, helper, "benevole");
  assert.equal(score(helper), 15);
  assert.throws(
    () => progress.confirmResidentHelp(stranger, c),
    (e) => e.status === 403,
  );
  assert.equal(progress.confirmResidentHelp(owner, c).points, 20);
  assert.equal(progress.confirmResidentHelp(owner, c).points, 0);
  assert.equal(score(helper), 35);
  const p = join(i, stranger);
  assert.throws(
    () => progress.confirmResidentHelp(owner, p),
    (e) => e.status === 400,
  );
});
test("simulated check-in limited by normalized place per day, not activity id", () => {
  const u = user(),
    owner = user(),
    a = idea(owner, "Café du Test"),
    b = idea(owner, "  cafe DU test  ");
  assert.equal(progress.checkinResident(u, a).points, 10);
  assert.throws(
    () => progress.checkinResident(u, b),
    (e) => e.status === 409,
  );
  assert.throws(
    () => progress.checkinResident(user("commerce"), a),
    (e) => e.status === 403,
  );
  assert.throws(
    () => progress.checkinResident(u, "missing"),
    (e) => e.status === 404,
  );
  db.prepare("DELETE FROM ideas WHERE id=?").run(a);
  assert.equal(score(u), 10);
});
test("Midi code once daily and reward card is permanent without spending score", () => {
  const u = user();
  assert.throws(
    () => progress.redeemResidentMidi(u, { code: "bad" }),
    (e) => e.status === 400,
  );
  assert.equal(
    progress.redeemResidentMidi(u, { code: "MIDI-DEMO" }).points,
    10,
  );
  assert.throws(
    () => progress.redeemResidentMidi(u, { code: "MIDI-DEMO" }),
    (e) => e.status === 409,
  );
  assert.throws(
    () => progress.claimResidentReward(u),
    (e) => e.status === 409,
  );
  for (let i = 0; i < 3; i++) awardResidentPoints(db, u, "idea", "i" + i);
  assert.equal(score(u), 100);
  const card = progress.claimResidentReward(u);
  assert.match(card.card.code, /^DEMO-/);
  assert.equal(progress.claimResidentReward(u).card.code, card.card.code);
  assert.equal(score(u), 100);
});
test("public profile defaults private and exposes only level and badges after opt-in", () => {
  const u = user();
  assert.throws(
    () => progress.publicResidentProgress(u),
    (e) => e.status === 404,
  );
  progress.getResidentProgress(u);
  progress.updateResidentProgressSettings(u, { publicProfile: true });
  assert.deepEqual(Object.keys(progress.publicResidentProgress(u)).sort(), [
    "badges",
    "level",
  ]);
  assert.throws(() =>
    progress.updateResidentProgressSettings(u, {
      publicProfile: true,
      score: 999,
    }),
  );
  progress.updateResidentProgressSettings(u, { publicProfile: false });
  assert.throws(
    () => progress.publicResidentProgress(u),
    (e) => e.status === 404,
  );
});
test("referral rewards one inviter once and never self or business", () => {
  const a = user(),
    b = user(),
    c = user();
  const code = progress.getResidentProgress(a).referralCode;
  assert.equal(progress.referralInviter(code.toLowerCase()), a);
  assert.equal(progress.registerResidentReferral(b, a), 10);
  assert.equal(progress.registerResidentReferral(b, c), 0);
  assert.equal(score(a), 10);
  assert.throws(
    () => progress.registerResidentReferral(a, a),
    (e) => e.status === 400,
  );
  assert.throws(
    () => progress.registerResidentReferral(user("commerce"), a),
    (e) => e.status === 403,
  );
});
test("need vote cannot be farmed by withdrawal and recreation", () => {
  const u = user();
  const input = {
    category: "cafe",
    frequency: 1,
    lat: 46.8132,
    lng: -71.2283,
    radiusMeters: 300,
  };
  const first = needs.expressResidentNeed(u, input);
  assert.equal(score(u), 5);
  needs.withdrawResidentSupport(u, first.id);
  const second = needs.expressResidentNeed(u, input);
  assert.notEqual(second.id, first.id);
  assert.equal(score(u), 5);
  needs.supportResidentNeed(u, second.id, { frequency: 3 });
  assert.equal(score(u), 5);
  assert.equal(residentLevel(50).level.id, "complice");
  assert.equal(residentLevel(400).next, null);
});

test("only the resident registration type is eligible, including future unknown roles", () => {
  for (const type of [
    "travailleur",
    "etudiant",
    "entreprise",
    "organisme",
    "admin",
    "unknown",
  ]) {
    const u = user(type);
    assert.equal(awardResidentPoints(db, u, "join", "test"), 0);
    assert.throws(
      () => progress.getResidentProgress(u),
      (e) => e.status === 403,
    );
  }
});
test("same activity cannot be rewarded on a different day", () => {
  const u = user(),
    owner = user(),
    i = idea(owner);
  progress.checkinResident(u, i);
  db.prepare(
    "UPDATE resident_checkins SET day='2000-01-01' WHERE user_id=?",
  ).run(u);
  db.prepare("UPDATE points SET day='2000-01-01' WHERE user_id=?").run(u);
  assert.throws(
    () => progress.checkinResident(u, i),
    (e) => e.status === 409,
  );
  assert.equal(score(u), 10);
});
test("all level boundaries and centralized award result", () => {
  const { awardPoints } = require("../src/lib/resident-points.ts");
  for (const [points, id] of [
    [0, "voisin"],
    [49, "voisin"],
    [50, "complice"],
    [149, "complice"],
    [150, "quartier"],
    [399, "quartier"],
    [400, "pilier"],
    [1000, "pilier"],
  ])
    assert.equal(residentLevel(points).level.id, id);
  const u = user();
  awardPoints(db, u, "idea", "one");
  const result = awardPoints(db, u, "idea", "two");
  assert.equal(result.points, 30);
  assert.equal(result.score, 60);
  assert.equal(result.levelChanged, true);
  assert.equal(result.level.id, "complice");
  assert.throws(() => awardPoints(db, u, "reports", "bad"), /inconnue/);
  assert.throws(() => awardPoints(db, u, "join", " "), /invalide/);
});
test("badges persist at the action before visiting the profile; vitrine badge requires three contributions", () => {
  const u = user();
  awardResidentPoints(db, u, "vote", "first");
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) n FROM resident_badges WHERE user_id=? AND badge_id='ami-vitrines'",
      )
      .get(u).n,
    0,
  );
  awardResidentPoints(db, u, "vote", "second");
  awardResidentPoints(db, u, "vote", "third");
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) n FROM resident_badges WHERE user_id=? AND badge_id='ami-vitrines'",
      )
      .get(u).n,
    1,
  );
  const owner = user(),
    a = user();
  const i = idea(owner);
  join(i, a);
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) n FROM resident_badges WHERE user_id=? AND badge_id='premier-complice'",
      )
      .get(a).n,
    1,
  );
  db.prepare("DELETE FROM ideas WHERE id=?").run(i);
  assert.ok(
    progress
      .getResidentProgress(a)
      .badges.find((b) => b.id === "premier-complice").earned,
  );
});
