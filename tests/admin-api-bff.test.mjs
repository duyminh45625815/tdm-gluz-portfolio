import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const backendRequests = [];
let backend;
let nextServer;
let baseUrl;
let backendUrl;

async function allocatePort() {
  const listener = createNetServer();
  await new Promise((resolveListen, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolveListen);
  });
  const address = listener.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not allocate a test port.");
  }
  await new Promise((resolveClose, reject) => {
    listener.close((error) => (error ? reject(error) : resolveClose()));
  });
  return address.port;
}

function sendJson(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}

function createToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 }),
  ).toString("base64url");
  return `header.${payload}.signature`;
}

before(async () => {
  backend = createServer(async (request, response) => {
    const requestInfo = {
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
    };
    backendRequests.push(requestInfo);

    if (request.url === "/api/auth/me") {
      if (request.headers.authorization === "Bearer expired-token") {
        sendJson(response, 401, { message: "Internal token detail" });
        return;
      }
      sendJson(response, 200, {
        id: "admin-id",
        email: "admin@example.test",
        role: "admin",
        isActive: true,
        lastLoginAt: null,
      });
      return;
    }

    if (request.url === "/api/admin/site-settings" && request.method === "GET") {
      sendJson(response, 200, {
        localization: { defaultLocale: "en", supportedLocales: ["ko", "ja", "vi", "en"] },
      });
      return;
    }

    if (request.url === "/api/admin/site-settings" && request.method === "PATCH") {
      let rawBody = "";
      for await (const chunk of request) {
        rawBody += chunk;
      }
      if (rawBody.includes("trigger-sanitized-error")) {
        sendJson(response, 400, { message: "private backend diagnostic" });
        return;
      }
      sendJson(response, 200, {
        localization: { defaultLocale: "en", supportedLocales: ["ko", "ja", "vi", "en"] },
        received: JSON.parse(rawBody),
      });
      return;
    }

    if (request.url?.startsWith("/api/admin/")) {
      let rawBody = "";
      for await (const chunk of request) {
        rawBody += chunk;
      }
      requestInfo.body = rawBody;
      if (request.method === "DELETE") {
        response.writeHead(204);
        response.end();
        return;
      }
      sendJson(response, 200, {
        ok: true,
        path: request.url,
        body: rawBody ? JSON.parse(rawBody) : undefined,
      });
      return;
    }

    sendJson(response, 404, { message: "Unexpected test route." });
  });
  await new Promise((resolveListen, reject) => {
    backend.once("error", reject);
    backend.listen(0, "127.0.0.1", resolveListen);
  });
  const backendAddress = backend.address();
  if (!backendAddress || typeof backendAddress === "string") {
    throw new Error("Could not start the mock backend.");
  }
  backendUrl = `http://127.0.0.1:${backendAddress.port}`;

  const nextPort = await allocatePort();
  baseUrl = `http://127.0.0.1:${nextPort}`;
  nextServer = spawn(
    process.execPath,
    [
      resolve(projectRoot, "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(nextPort),
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, BACKEND_API_URL: backendUrl },
      stdio: "ignore",
    },
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (nextServer.exitCode !== null) {
      throw new Error(`Next dev server exited with code ${nextServer.exitCode}.`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/admin/site-settings`);
      if (response.status === 401) {
        return;
      }
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
    }
  }

  throw new Error("Next dev server did not become ready.");
});

after(async () => {
  if (nextServer && nextServer.exitCode === null) {
    const exited = new Promise((resolveExit) => nextServer.once("exit", resolveExit));
    nextServer.kill();
    await exited;
  }
  if (backend?.listening) {
    await new Promise((resolveClose, reject) =>
      backend.close((error) => (error ? reject(error) : resolveClose())),
    );
  }
});

test("admin BFF verifies and forwards a no-store GET without exposing the token", async () => {
  const token = createToken();
  const response = await fetch(`${baseUrl}/api/admin/site-settings`, {
    headers: { Cookie: `tdm_admin_session=${token}` },
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await response.json(), {
    localization: { defaultLocale: "en", supportedLocales: ["ko", "ja", "vi", "en"] },
  });
  assert.ok(
    backendRequests.some(
      (request) =>
        request.url === "/api/admin/site-settings" &&
        request.authorization === `Bearer ${token}`,
    ),
  );
});

test("admin BFF rejects cross-origin mutations and forwards same-origin partial updates", async () => {
  const token = createToken();
  const beforeCount = backendRequests.filter(
    (request) => request.method === "PATCH",
  ).length;
  const blocked = await fetch(`${baseUrl}/api/admin/site-settings`, {
    method: "PATCH",
    headers: {
      Cookie: `tdm_admin_session=${token}`,
      Origin: "https://attacker.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identity: { name: { en: "No" } } }),
  });
  assert.equal(blocked.status, 403);
  assert.equal(
    backendRequests.filter((request) => request.method === "PATCH").length,
    beforeCount,
  );

  const payload = { identity: { name: { en: "Updated" } } };
  const forwarded = await fetch(`${baseUrl}/api/admin/site-settings`, {
    method: "PATCH",
    headers: {
      Cookie: `tdm_admin_session=${token}`,
      Origin: baseUrl,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  assert.equal(forwarded.status, 200);
  assert.deepEqual((await forwarded.json()).received, payload);
});

test("admin BFF sanitizes backend errors and clears rejected sessions", async () => {
  const token = createToken();
  const rejected = await fetch(`${baseUrl}/api/admin/site-settings`, {
    method: "PATCH",
    headers: {
      Cookie: `tdm_admin_session=${token}`,
      Origin: baseUrl,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ marker: "trigger-sanitized-error" }),
  });
  assert.equal(rejected.status, 400);
  assert.doesNotMatch(await rejected.text(), /private backend diagnostic/);

  const expired = await fetch(`${baseUrl}/api/admin/site-settings`, {
    headers: { Cookie: "tdm_admin_session=expired-token" },
  });
  assert.equal(expired.status, 401);
  assert.match(expired.headers.get("set-cookie") ?? "", /Max-Age=0/);
  assert.doesNotMatch(await expired.text(), /Internal token detail/);
});

test("admin BFF forwards Home, About, Projects, Skill Groups, and Education routes", async () => {
  const token = createToken();
  const operations = [
    { method: "GET", path: "/api/admin/pages/home" },
    {
      method: "PATCH",
      path: "/api/admin/pages/about/draft/en",
      body: { story: { title: "About draft" } },
    },
    { method: "POST", path: "/api/admin/pages/home/publish/vi" },
    { method: "GET", path: "/api/admin/projects" },
    {
      method: "DELETE",
      path: "/api/admin/projects/sample-project",
    },
    {
      method: "POST",
      path: "/api/admin/skill-groups",
      body: { key: "languages", displayOrder: 2 },
    },
    {
      method: "PATCH",
      path: "/api/admin/education/0123456789abcdef01234567/draft/ja",
      body: { title: "Degree draft" },
    },
  ];

  for (const operation of operations) {
    const response = await fetch(`${baseUrl}${operation.path}`, {
      method: operation.method,
      headers: {
        Cookie: `tdm_admin_session=${token}`,
        ...(operation.method !== "GET"
          ? {
              Origin: baseUrl,
              "Content-Type": "application/json",
            }
          : {}),
      },
      ...(operation.body ? { body: JSON.stringify(operation.body) } : {}),
    });
    assert.equal(response.status, operation.method === "DELETE" ? 204 : 200);
    if (operation.method !== "DELETE") {
      const body = await response.json();
      assert.equal(body.path, operation.path);
      if (operation.body) {
        assert.deepEqual(body.body, operation.body);
      }
    }
  }

  const forwarded = backendRequests.filter((request) =>
    operations.some(
      (operation) =>
        request.url === operation.path &&
        request.method === operation.method,
    ),
  );
  assert.equal(forwarded.length, operations.length);
  assert.ok(
    forwarded.every((request) => request.authorization === `Bearer ${token}`),
  );
});
