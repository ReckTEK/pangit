This is all AI Generated, strategy was to AI generate the code generates to download specifications for all the public git apis from their schemas
then normalize them (also with ai code gen and leaning on a package to normalize them into 1 spec)
then using AI to design the base rest client contract and generating whole rest clients off the specifications
for each provider.  Then generating e2e tests and isolated docker runtimes to run them against a real gitea/gitlab in docker compose (tear downable, repeatable)

Even some readme stuff, and docs are generated.

PanGit-Site is generated, but with a tight skill and refactoring loops.

