import { Link, type MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "PanGit Gitea login" },
  {
    name: "description",
    content: "A minimal Gitea login example using PanGit.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm font-semibold text-blue-700">PanGit example</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Sign in to local Gitea
      </h1>
      <p className="mt-4 text-slate-600">
        This single login uses PanGit's Gitea OAuth adapter and generic REST request transport
        against the Gitea container.
      </p>
      <div className="card mt-8">
        <h2 className="text-xl font-semibold">Gitea 1.27.2</h2>
        <p className="mt-3 text-sm text-slate-600">
          Use the sandbox account or an existing account in the persisted Gitea instance.
        </p>
        <Link to="/login/server" className="button mt-6">
          Login with Gitea
        </Link>
      </div>
    </main>
  );
}
