# Pre-built agate base image. Cached in Docker Hub so the per-deploy
# gemini-server build doesn't have to compile agate from cargo every
# time — that step takes several minutes (worse under emulation when
# building amd64 on the arm64 runner).
#
# Push manually via the build-agate-base workflow (.forgejo/workflows/),
# triggered by workflow_dispatch. Re-run when agate gets a release
# you want to pick up.

FROM rust:1-alpine AS build
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
RUN cargo install --root /out agate

FROM alpine:3.22
# /certs is created here (not in the per-deploy Dockerfile) so the
# frequent per-push gemini-server build has NO RUN step — it stays
# FROM + COPY + metadata, which need no amd64 emulation on the arm64
# runner. Only this base build (rare, manual) executes amd64 code.
RUN apk add --no-cache ca-certificates && mkdir -p /certs
COPY --from=build /out/bin/agate /usr/local/bin/agate
