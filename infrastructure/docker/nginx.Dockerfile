FROM nginx:1.27-alpine

COPY infrastructure/docker/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/docker/nginx.conf.template /etc/nginx/templates/vrompt.conf.template

RUN rm -f /etc/nginx/conf.d/default.conf

ENV NGINX_ENVSUBST_FILTER=^VROMPT_

EXPOSE 80
