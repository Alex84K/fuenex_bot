# Pin the bun version (== local dev) so the runtime/transpiler is deterministic.
# ":latest" drifts and can transpile JSX / resolve deps differently than tested.
FROM oven/bun:1.3.14
WORKDIR /app

# Copy the lockfile explicitly (no glob) — a missing lock must FAIL the build,
# not silently fall back to a fresh non-reproducible resolve.
COPY package.json bun.lock ./

# --frozen-lockfile: install EXACTLY the tree in bun.lock (the locally-tested,
# working @react-pdf/* constellation). Without it, react-pdf's ~13 sub-packages
# (^-ranges) can resolve to a mismatched combo → renderToBuffer crashes with
# "container.document.props is null" (Document primitive not recognized).
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build
EXPOSE 5012
CMD ["bun", "run", "start:prod"]
