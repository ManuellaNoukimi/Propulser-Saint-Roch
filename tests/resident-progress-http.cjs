const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "complices-resident-http-"),
);
const port = Number(process.env.RESIDENT_TEST_PORT || 3017);
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      COMPLICES_DATA_DIR: directory,
      COMPLICES_DIST_DIR: ".next-test",
      COMPLICES_STRICT_AUTH: "0",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
server.stdout.on("data", (chunk) => {
  output = (output + chunk).slice(-12000);
});
server.stderr.on("data", (chunk) => {
  output = (output + chunk).slice(-12000);
});
// L'inscription exige maintenant un courriel et un mot de passe (règle de Danny, 15 oct.) : identifiants uniques par compte.
let accountNumber = 0;
const credentials = () => ({ email: `f6-http-${++accountNumber}`, password: "x" });

async function request(url, method = "GET", body, cookie) {
  const response = await fetch(`http://127.0.0.1:${port}${url}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
    cache: response.headers.get("cache-control"),
  };
}
async function main() {
  const deadline = Date.now() + 45000;
  while (!output.includes("Ready in")) {
    if (server.exitCode !== null || Date.now() > deadline)
      throw new Error(output || "Server startup timeout");
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal((await request("/api/resident-progress")).status, 401);
  const signup = await request("/api/auth/signup", "POST", {
    ...credentials(),
    displayName: "F6 HTTP resident",
    accountType: "habitant",
  });
  assert.equal(signup.status, 201);
  const cookie = signup.cookie;
  const id = signup.body.user.id;
  let state = await request("/api/resident-progress", "GET", undefined, cookie);
  assert.equal((await request("/api/resident-progress/summary")).status, 401);
  const summary = await request(
    "/api/resident-progress/summary",
    "GET",
    undefined,
    cookie,
  );
  assert.equal(summary.status, 200);
  assert.equal(summary.body.score, 0);
  assert.equal(state.status, 200);
  assert.equal(state.body.score, 0);
  assert.match(state.cache, /no-store/);
  assert.equal((await request(`/api/residents/${id}`)).status, 404);
  assert.equal(
    (await request("/api/resident-progress", "PATCH", { publicProfile: true }))
      .status,
    401,
  );
  assert.equal(
    (
      await request(
        "/api/resident-progress",
        "PATCH",
        { publicProfile: true, score: 999 },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/resident-progress",
        "PATCH",
        { publicProfile: true },
        cookie,
      )
    ).status,
    200,
  );
  const pub = await request(`/api/residents/${id}`);
  assert.equal(pub.status, 200);
  assert.deepEqual(Object.keys(pub.body).sort(), ["badges", "level"]);
  const referred = await request("/api/auth/signup", "POST", {
    ...credentials(),
    displayName: "F6 referred",
    accountType: "habitant",
    referralCode: state.body.referralCode,
  });
  assert.equal(referred.status, 201);
  const other = await request(
    "/api/resident-progress",
    "GET",
    undefined,
    referred.cookie,
  );
  assert.equal(other.body.score, 0);
  assert.equal(other.body.history.length, 0);
  assert.equal(
    (await request("/api/resident-progress", "GET", undefined, cookie)).body
      .score,
    10,
  );
  assert.equal(
    (
      await request(
        "/api/resident-progress/midi",
        "POST",
        { code: "wrong" },
        cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/resident-progress/midi",
        "POST",
        { code: "MIDI-DEMO" },
        cookie,
      )
    ).body.points,
    10,
  );
  assert.equal(
    (
      await request(
        "/api/resident-progress/midi",
        "POST",
        { code: "MIDI-DEMO" },
        cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request("/api/resident-progress/reward", "POST", undefined, cookie))
      .status,
    409,
  );
  const company = await request("/api/auth/signup", "POST", {
    ...credentials(),
    displayName: "F6 company",
    accountType: "commerce",
  });
  assert.equal(company.status, 201);
  assert.equal(
    (await request("/api/resident-progress", "GET", undefined, company.cookie))
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        "/api/resident-progress/midi",
        "POST",
        { code: "MIDI-DEMO" },
        company.cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/auth/signup", "POST", {
    ...credentials(),
        displayName: "Invalid company referral",
        accountType: "commerce",
        referralCode: state.body.referralCode,
      })
    ).status,
    400,
  );
  state = await request("/api/resident-progress", "GET", undefined, cookie);
  const owner = await request("/api/auth/signup", "POST", {
    ...credentials(),
    displayName: "Jury organizer",
    accountType: "habitant",
  });
  const post = await request(
    "/api/ideas",
    "POST",
    {
      title: "Jury test initiative",
      category: "communautaire",
      description: "Test isolé",
      place: "Lieu jury",
      startsAt: "2099-10-15T14:00:00Z",
      needs: ["participants"],
      images: [],
    },
    owner.cookie,
  );
  assert.equal(post.status, 201);
  const activity = { id: post.body.id };
  const beforeJoin = (
    await request("/api/resident-progress/summary", "GET", undefined, cookie)
  ).body.score;
  const join = await request(
    `/api/ideas/${activity.id}/complices`,
    "POST",
    { contribution: "participer" },
    cookie,
  );
  assert.equal(join.status, 201);
  assert.equal(
    (await request("/api/resident-progress/summary", "GET", undefined, cookie))
      .body.score,
    beforeJoin + 15,
  );
  assert.equal(
    (
      await request(
        `/api/ideas/${activity.id}/complices`,
        "POST",
        { contribution: "participer" },
        cookie,
      )
    ).status,
    409,
  );
  const concurrent = await request("/api/auth/signup", "POST", {
    ...credentials(),
    displayName: "Concurrent resident",
    accountType: "habitant",
  });
  const repeated = await Promise.all(
    [1, 2].map(() =>
      request(
        `/api/ideas/${activity.id}/complices`,
        "POST",
        { contribution: "participer" },
        concurrent.cookie,
      ),
    ),
  );
  assert.deepEqual(repeated.map((r) => r.status).sort(), [201, 409]);
  assert.equal(
    (
      await request(
        "/api/resident-progress/summary",
        "GET",
        undefined,
        concurrent.cookie,
      )
    ).body.score,
    15,
  );

  assert.equal(
    (
      await request(
        `/api/ideas/${activity.id}/complices`,
        "POST",
        { contribution: "benevole" },
        referred.cookie,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        "/api/resident-progress/summary",
        "GET",
        undefined,
        owner.cookie,
      )
    ).body.score,
    30,
  );
  assert.equal(
    (
      await request(
        "/api/resident-progress/summary",
        "GET",
        undefined,
        company.cookie,
      )
    ).status,
    403,
  );

  assert.equal(
    (await request(`/api/resident-progress/checkin/${activity.id}`)).status,
    401,
  );
  assert.equal(
    (
      await request(
        `/api/resident-progress/checkin/${activity.id}`,
        "GET",
        undefined,
        company.cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `/api/resident-progress/checkin/${activity.id}`,
        "GET",
        undefined,
        cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        `/api/resident-progress/checkin/${activity.id}`,
        "POST",
        undefined,
        cookie,
      )
    ).body.points,
    10,
  );
  assert.equal(
    (
      await request(
        `/api/resident-progress/checkin/${activity.id}`,
        "POST",
        undefined,
        cookie,
      )
    ).status,
    409,
  );
  for (const page of ["/moi", `/residents/${id}`, `/checkin/${activity.id}`])
    assert.equal((await fetch(`http://127.0.0.1:${port}${page}`)).status, 200);
  await request(
    "/api/resident-progress",
    "PATCH",
    { publicProfile: false },
    cookie,
  );
  assert.equal((await request(`/api/residents/${id}`)).status, 404);
  console.log(
    "HTTP F6: sessions, privacy, resident restriction, referrals, joining, check-in, Midi and pages passed.",
  );
  if (process.env.F6_BROWSER_TEST) {
    console.log("BROWSER TEST READY http://localhost:3017/connexion");
    await new Promise((resolve) => setTimeout(resolve, 180000));
  }
}
main()
  .catch((error) => {
    console.error(error, output);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server.exitCode === null) {
      if (process.platform === "win32")
        spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      else server.kill("SIGTERM");
      await new Promise((resolve) =>
        server.exitCode !== null ? resolve() : server.once("exit", resolve),
      );
    }
    fs.rmSync(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  });
