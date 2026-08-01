FROM node:24.18.1-alpine3.24@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS build-stage

WORKDIR /app
RUN npm install --global npm@12.0.2 --allow-scripts=npm \
	&& test "$(node --version)" = "v24.18.1" \
	&& test "$(npm --version)" = "12.0.2"

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
USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget --quiet --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
