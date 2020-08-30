FROM node:12-alpine

RUN apk add --no-cache python gcc g++ make git \
# we use nodemon to auto-restart the server when serverside code changes
    && npm install nodemon -g

RUN mkdir /log

# install smart-contracts dependencies
WORKDIR /app/smart-contracts
COPY package.json /app/smart-contracts/package.json
COPY package-lock.json /app/smart-contracts/package-lock.json
RUN npm install


COPY / /app/smart-contracts/

RUN chmod +x ./scripts/deploy.sh

# run deploy
ENTRYPOINT ["npm", "run"]
CMD ["deploy"]