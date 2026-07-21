# Pin the bun version (== local dev) so the TS/JSX transpiler + module resolution
# are deterministic. ":latest" drifts and resolves the externalized CJS
# react/jsx-dev-runtime differently → "jsxDEV is not a function" → <Document>
# never mounts → the secondary "container.document.props is null".
FROM oven/bun:1.3.14
WORKDIR /app

# Explicit lockfile (no glob): a missing lock must FAIL the build, not silently
# fall back to a fresh, non-reproducible resolve of react-pdf's ~13 sub-packages.
COPY package.json bun.lock ./

# --frozen-lockfile: install EXACTLY the locally-tested @react-pdf/* tree.
RUN bun install --frozen-lockfile

COPY . .

# Run TS/TSX directly with Bun — NO bundling step. This makes production
# transpilation identical to dev (which renders correctly) and eliminates the
# fragile bundled `jsxDEV` import from the externalized react/jsx-dev-runtime.
# node_modules is present anyway (the old build used --packages=external), so the
# footprint is the same; only the brittle `bun build` output is dropped.
EXPOSE 5012
CMD ["bun", "src/main.ts"]
