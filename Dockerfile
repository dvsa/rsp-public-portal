FROM node:10.18

WORKDIR /app
RUN useradd -m -u 995 nodeuser
RUN chown -R nodeuser:nodeuser /app
RUN chmod 755 /app
USER nodeuser

# docker build -t rsp-lambda-build-image .   