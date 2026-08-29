import { route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("/", "routes/home.tsx"),
  route("/login/server", "routes/login-server.ts"),
  route("/auth/callback", "routes/callback.tsx"),
] satisfies RouteConfig;
