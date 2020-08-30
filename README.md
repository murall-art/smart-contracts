# MurAll smart contracts

All the smart contract code required for the MurAll project

## Commands

* `npm run test`: Runs smart contract tests
* `npm run test:coverage`: Reports on test coverage
* `npm run lint`: Runs linter
* `npm run lint:fix`: Fixes linting issues
* `npm run build`: Build smart contracts
* `npm run deploy`: Deploys smart contracts to default network

## Environment variables

You need to define a `.env` file at the root of this service with the following keys:
```
MNENOMIC = **your eth wallet private key or mnemonic here**

INFURA_API_KEY = **Infura api key here**
```
There is a `.env.sample` file that you can use as a reference
