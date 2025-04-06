FROM node:alpine3.20

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start","--host", "0.0.0.0", "--port", "8080"]

