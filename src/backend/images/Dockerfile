FROM index.alauda.cn/alaudaorg/alaudabase-alpine-run:alpine3.10

COPY backend /diablo/backend
CMD ["/diablo/backend", "--enable-anonymous=true"]

ARG commit_id=dev
ARG app_version=dev
ENV COMMIT_ID=${commit_id}
ENV APP_VERSION=${app_version}
