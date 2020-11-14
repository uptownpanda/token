const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');
const UniswapV2OracleMock = artifacts.require('UniswapV2OracleMock');
const UptownPandaTwapableMock = artifacts.require('UptownPandaTwapableMock');
const UptownPandaBurnableMock = artifacts.require('UptownPandaBurnableMock');

module.exports = async (deployer, network) => {
    if (network !== 'development') {
        return;
    }

    await deployer.deploy(UniswapV2Router02Mock);
    await deployer.deploy(UniswapV2OracleMock);
    await deployer.deploy(UptownPandaTwapableMock);
    await deployer.deploy(UptownPandaBurnableMock);
};
