import { type ActionFunctionArgs, redirect } from "react-router";
import { siteConfig } from "../../site.config.ts";
import { siteUrls } from "../urls.ts";

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const theme = form.get("theme");
  if (theme !== "system" && theme !== "light" && theme !== "dark") {
    return new Response("Invalid theme", { status: 400 });
  }
  const returnTo = String(form.get("returnTo") ?? siteUrls.home);
  const safePath =
    returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")
      ? returnTo
      : siteUrls.home;
  return redirect(safePath, {
    headers: {
      "Set-Cookie": `${siteConfig.theme.cookie}=${
        theme === "system" ? "" : theme
      }; Path=/; Max-Age=${
        theme === "system" ? 0 : siteConfig.theme.maxAge
      }; HttpOnly; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    },
  });
}
