FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

ENV PORT=80
ENV BACKEND_URL=http://localhost:8000

EXPOSE 80

# startup.sh replaces NGINX_PORT in nginx.conf and QUANTEDGE_API_URL in index.html,
# then starts nginx. Using awk (not sed) so URLs with / don't break substitution.
CMD ["/startup.sh"]
