# Gopher server runtime image: the generated capsule plus a small
# dependency-free Node listener (gopher-server/serve.mjs).
#
# IMPORTANT: like gemini-server/Dockerfile, this deliberately has NO `RUN`
# step. The runner cross-builds linux/amd64 (Bunny is amd64-only) on an
# arm64 machine, so any RUN would execute an amd64 binary under binfmt/qemu
# emulation — kernel state that a machine restart wipes, which is exactly
# what broke the gemini build on 2026-06-13. FROM + COPY + ENV/EXPOSE/USER/
# CMD execute nothing in the target architecture, so this build is immune to
# emulation being absent.
#
# Unlike the capsule, this needs no pre-built base image of its own: the
# server is one Node script with no dependencies, so stock node:alpine is
# the entire runtime and there is nothing to compile. That is also why a
# packaged daemon (gophernicus, geomyidae) was not used — both would need
# `apk add`, hence a RUN, hence a second base-image workflow alongside
# build-agate-base.yaml, to install a wrapper around the same file serving.
#
# Gopher is plaintext, so there is no certificate here and none of the
# capsule's TOFU-warning-on-redeploy problem.

FROM node:24-alpine

COPY gopher-server/serve.mjs /app/serve.mjs
COPY dist-gopher/ /content/

# Bunny's Anycast endpoint maps the exposed port (70) to the container
# port, so the process never binds a privileged port and never needs root.
ENV GOPHER_ROOT=/content
ENV GOPHER_PORT=7070
ENV GOPHER_BIND=0.0.0.0
EXPOSE 7070

# node:alpine ships an unprivileged `node` user; COPY leaves the content
# world-readable, which is all the server needs.
USER node

CMD ["node", "/app/serve.mjs"]
