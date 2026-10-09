type FetchInput = Parameters<typeof fetch>[0];

function resolveUrl(input: FetchInput) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

async function readBody(init?: RequestInit) {
  const body = init?.body;
  if (!body) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return { raw: body.slice(0, 500) };
    }
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return { simulatedUpload: true };
  }
  return { unsupportedBody: true };
}

export function installDemoFetchBridge() {
  if (typeof window === "undefined") return () => {};
  const win = window as Window & { __invistimoDemoFetch?: typeof fetch };
  if (win.__invistimoDemoFetch) return () => {};

  const original = window.fetch.bind(window);
  win.__invistimoDemoFetch = original;

  window.fetch = async (input: FetchInput, init?: RequestInit) => {
    const url = resolveUrl(input);
    let parsed: URL;
    try {
      parsed = new URL(url, window.location.origin);
    } catch {
      return original(input, init);
    }

    const sameOrigin = parsed.origin === window.location.origin;
    const path = `${parsed.pathname}${parsed.search}`;
    if (
      !sameOrigin ||
      !parsed.pathname.startsWith("/api/") ||
      parsed.pathname.startsWith("/api/demo/") ||
      parsed.pathname === "/api/me" ||
      parsed.pathname.startsWith("/api/auth/")
    ) {
      return original(input, init);
    }

    const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const payload = await readBody(init);
    const response = await original("/api/demo/interactive/bridge", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-invistimo-surface": "demo",
      },
      body: JSON.stringify({ method, path, body: payload }),
    });

    if (
      response.ok &&
      (parsed.pathname === "/api/whatsapp/send-template" ||
        parsed.pathname === "/api/sms/send")
    ) {
      window.dispatchEvent(
        new CustomEvent("invistimo:demo-action", { detail: { action: "simulate-send" } })
      );
    }

    window.dispatchEvent(new CustomEvent("invistimo:demo-sync"));
    return response;
  };

  return () => {
    window.fetch = original;
    delete win.__invistimoDemoFetch;
  };
}
