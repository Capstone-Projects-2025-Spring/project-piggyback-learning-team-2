FROM node:18.16.0-alpine3.18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start","--host", "0.0.0.0", "--port", "3000"]

