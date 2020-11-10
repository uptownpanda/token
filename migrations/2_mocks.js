const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');
const UniswapV2OracleMock = artifacts.require('UniswapV2OracleMock');
const UrbanPandaTwapableMock = artifacts.require('UrbanPandaTwapableMock');
const UrbanPandaBurnableMock = artifacts.require('UrbanPandaBurnableMock');

module.exports = async (deployer, network) => {
    if (network !== 'development') {
        return;
    }

    await deployer.deploy(UniswapV2Router02Mock);
    await deployer.deploy(UniswapV2OracleMock);
    await deployer.deploy(UrbanPandaTwapableMock);
    await deployer.deploy(UrbanPandaBurnableMock);
};
