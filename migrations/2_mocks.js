const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');
const UniswapV2OracleMock = artifacts.require('UniswapV2OracleMock');
const UrbanPandaTwapableMock = artifacts.require('UrbanPandaTwapableMock');

module.exports = async (deployer, network) => {
    if (network !== 'development') {
        return;
    }

    await deployUniswapV2Router02Mock(deployer);
    await deployUniswapV2OracleMock(deployer);
    await deployUrbanPandaTwapableMock(deployer);
};

const deployUniswapV2Router02Mock = async (deployer) => {
    await deployer.deploy(UniswapV2Router02Mock);
};

const deployUniswapV2OracleMock = async (deployer) => {
    await deployer.deploy(UniswapV2OracleMock);
};

const deployUrbanPandaTwapableMock = async (deployer) => {
    await deployer.deploy(UrbanPandaTwapableMock);
};
