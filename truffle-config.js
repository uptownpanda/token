const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const ownerWalletPrivateKey = fs.readFileSync('.owner-wallet-private-key').toString().trim();
const etherscanApiKey = fs.readFileSync('.etherscan.apikey').toString().trim();

module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",     // Localhost (default: none)
            port: 8545,            // Standard Ethereum port (default: none)
            network_id: "*",       // Any network (default: none)
        },
        rinkeby: {
            provider: () => new HDWalletProvider(ownerWalletPrivateKey, 'https://rinkeby.infura.io/v3/279400e6697640b99c89a6e13ec48b38'),
            network_id: 4,
            gas: 5000000,
            gasPrice: 25000000000,
            skipDryRun: true,
        },
        kovan: {
            provider: () => new HDWalletProvider([ownerWalletPrivateKey], 'https://kovan.infura.io/v3/279400e6697640b99c89a6e13ec48b38'),
            network_id: 42,
            gas: 5000000,
            gasPrice: 25000000000,
            skipDryRun: true,
        },
        mainnet: {
            provider: () => new HDWalletProvider([ownerWalletPrivateKey], 'https://mainnet.infura.io/v3/279400e6697640b99c89a6e13ec48b38'),
            network_id: 1,
            gas: 5000000,
            gasPrice: 100000000000,
            skipDryRun: true,
        },
    },

    // Set default mocha options here, use special reporters etc.
    mocha: {
        // timeout: 100000
    },

    // Configure your compilers
    compilers: {
        solc: {
            version: '0.6.6',      // Fetch exact version from solc-bin (default: truffle's version)
            // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
            // settings: {          // See the solidity docs for advice about optimization and evmVersion
            //  optimizer: {
            //    enabled: false,
            //    runs: 200
            //  },
            //  evmVersion: "byzantium"
            // }
        },
    },
    plugins: [
        'truffle-plugin-verify',
    ],
    api_keys: {
        etherscan: etherscanApiKey,
    },
};
