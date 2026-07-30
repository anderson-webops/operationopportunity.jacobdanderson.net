FROM node:24.18.0-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS build-stage

WORKDIR /app
RUN test "$(node --version)" = "v24.18.0" \
	&& test "$(npm --version)" = "11.16.0"

COPY .npmrc package.json package-lock.json ./
COPY front-end/package.json ./front-end/package.json
COPY back-end/package.json ./back-end/package.json
RUN --mount=type=cache,id=operation-opportunity-npm-cache,target=/root/.npm \
	npm ci --workspace front-end --include-workspace-root

COPY . .
ARG SOURCE_REVISION=unknown
ARG OPPORTUNITY_DEPLOYED_AT=
ENV SOURCE_REVISION=$SOURCE_REVISION
ENV OPPORTUNITY_DEPLOYED_AT=$OPPORTUNITY_DEPLOYED_AT
RUN node -e 'const [commit, deployedAt] = process.argv.slice(1); if (!/^[0-9a-f]{7,64}$/i.test(commit) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(deployedAt)) process.exit(1)' "$SOURCE_REVISION" "$OPPORTUNITY_DEPLOYED_AT" \
	&& npm run -w front-end build

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:44e36330f74d4f3a1d4e222acca9e23b401fb87811a7597024502bb759c4dd49 AS production-stage

COPY --from=build-stage /app/front-end/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/operation-security-headers.conf
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget --quiet --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
