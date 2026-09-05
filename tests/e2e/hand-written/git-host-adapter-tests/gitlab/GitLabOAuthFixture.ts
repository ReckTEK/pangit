/** Minimal browser-session fixture for the real GitLab authorization-code/PKCE flow. */
export class GitLabOAuthFixture {
  readonly #cookies = new Map<string, string>();
  constructor(readonly baseUrl: string, readonly username: string, readonly password: string) {}
  async #request(url: string | URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Cookie", [...this.#cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const index = pair.indexOf("=");
      this.#cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return response;
  }
  #csrf(html: string): string {
    const tag = [...html.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]).find((s) =>
      /name="authenticity_token"/.test(s)
    );
    const value = tag?.match(/value="([^"]+)"/)?.[1];
    if (!value) throw new Error("GitLab browser form has no CSRF token");
    return value.replaceAll("&amp;", "&");
  }
  async download(url: string) {
    if (new URL(url).origin !== new URL(this.baseUrl).origin) {
      throw new Error("Download escaped GitLab fixture");
    }
    return await this.#request(url);
  }
  async login() {
    const response = await this.#request(`${this.baseUrl}/users/sign_in`);
    const token = this.#csrf(await response.text());
    const result = await this.#request(`${this.baseUrl}/users/sign_in`, {
      method: "POST",
      body: new URLSearchParams({
        authenticity_token: token,
        "user[login]": this.username,
        "user[password]": this.password,
      }),
    });
    await result.body?.cancel();
    if (result.status !== 302) throw new Error(`GitLab browser login returned ${result.status}`);
  }
  async authorize(url: URL): Promise<Request> {
    let response = await this.#request(url);
    if (response.status === 200) {
      const csrf = this.#csrf(await response.text());
      const form = new URLSearchParams(url.searchParams);
      form.set("authenticity_token", csrf);
      response = await this.#request(`${this.baseUrl}/oauth/authorize`, {
        method: "POST",
        body: form,
      });
    }
    await response.body?.cancel();
    const location = response.headers.get("location");
    if (response.status !== 302 || !location) {
      throw new Error(`GitLab OAuth approval returned ${response.status}`);
    }
    return new Request(location);
  }
}
