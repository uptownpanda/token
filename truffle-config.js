const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const etherscanApiKey = fs.readFileSync('.etherscan.apikey').toString().trim();
const infuraKey = fs.readFileSync('.infura-key').toString().trim();
const projectFolder = process.cwd();
const getHDWalletProvider = (network) => {
    const privateKeyPath = `${projectFolder}/.owner-wallet-private-key.${network}`;
    const ownerWalletPrivateKey = fs.readFileSync(privateKeyPath).toString().trim();
    return new HDWalletProvider(ownerWalletPrivateKey, `https://${network}.infura.io/v3/${infuraKey}`);
};

module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",     // Localhost (default: none)
            port: 8545,            // Standard Ethereum port (default: none)
            network_id: "*",       // Any network (default: none)
        },
        rinkeby: {
            provider: () => getHDWalletProvider('rinkeby'),
            network_id: 4,
            gas: 5000000,
            gasPrice: 100000000000,
            skipDryRun: true,
        },
        kovan: {
            provider: () => getHDWalletProvider('kovan'),
            network_id: 42,
            gas: 5000000,
            gasPrice: 25000000000,
            skipDryRun: true,
        },
        mainnet: {
            provider: () => getHDWalletProvider('mainnet'),
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
