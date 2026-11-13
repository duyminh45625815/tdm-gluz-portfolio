import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
let server;
let baseUrl;

async function allocatePort() {
  const listener = createServer();
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

before(async () => {
  const port = await allocatePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    [
      resolve(projectRoot, "node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, BACKEND_API_URL: "" },
      stdio: "ignore",
    },
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next dev server exited with code ${server.exitCode}.`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/auth/expired`);
      if (response.status === 405) {
        return;
      }
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
    }
  }

  throw new Error("Next dev server did not become ready.");
});

after(async () => {
  if (!server || server.exitCode !== null) {
    return;
  }

  const exited = new Promise((resolveExit) => server.once("exit", resolveExit));
  server.kill();
  await exited;
});

test("GET does not clear an expired session cookie", async () => {
  const response = await fetch(`${baseUrl}/api/auth/expired`, {
    headers: { Cookie: "tdm_admin_session=test-token" },
    redirect: "manual",
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("valid same-origin POST clears the cookie and redirects to login", async () => {
  const response = await fetch(`${baseUrl}/api/auth/expired`, {
    method: "POST",
    headers: {
      Cookie: "tdm_admin_session=test-token",
      Origin: baseUrl,
    },
    redirect: "manual",
  });

  assert.equal(response.status, 303);
  assert.equal(new URL(response.headers.get("location")).pathname, "/admin/login");

  const cookie = response.headers.get("set-cookie") ?? "";
  assert.match(cookie, /tdm_admin_session=;/i);
  assert.match(cookie, /Path=\//i);
  assert.match(cookie, /Max-Age=0/i);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
});

test("cross-origin POST cannot clear the cookie", async () => {
  const response = await fetch(`${baseUrl}/api/auth/expired`, {
    method: "POST",
    headers: {
      Cookie: "tdm_admin_session=test-token",
      Origin: "https://attacker.example",
    },
    redirect: "manual",
  });

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("set-cookie"), null);
});
