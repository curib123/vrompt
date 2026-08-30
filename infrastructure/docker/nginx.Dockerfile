FROM nginx:1.27-alpine

COPY infrastructure/docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
