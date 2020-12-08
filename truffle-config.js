require('dotenv').config(); // Store environment-specific variable from '.env' to process.env
const HDWalletProvider = require('@truffle/hdwallet-provider');
const path = require('path');
const { ETHEREUM_HOST, ETHEREUM_PORT, MNENOMIC, INFURA_API_KEY } = process.env;

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    contracts_build_directory: path.join(__dirname, 'build'),
    networks: {
        development: {
            host: ETHEREUM_HOST,
            port: ETHEREUM_PORT,
            network_id: '*',
        },
        test: {
            host: '127.0.0.1',
            port: 7545,
            network_id: '*',
        },
        ropsten: {
            provider: new HDWalletProvider(MNENOMIC, 'https://ropsten.infura.io/v3/' + INFURA_API_KEY),
            network_id: 3,
        },
        rinkeby: {
            provider: new HDWalletProvider(MNENOMIC, 'https://rinkeby.infura.io/v3/' + INFURA_API_KEY),
            network_id: 4,
        },
    },
    compilers: {
        solc: {
            version: '0.6.2',
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 21000,
                },
                evmVersion: 'constantinople',
            },
        },
    },
    plugins: ['solidity-coverage'],
};
