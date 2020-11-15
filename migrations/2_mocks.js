const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');
const UniswapV2OracleMock = artifacts.require('UniswapV2OracleMock');
const UptownPandaTwapableMock = artifacts.require('UptownPandaTwapableMock');
const UptownPandaBurnableMock = artifacts.require('UptownPandaBurnableMock');
const UptownPandaMock = artifacts.require('UptownPandaMock');
const UptownPandaFarmMock = artifacts.require('UptownPandaFarmMock');
const { BN, ether } = require('@openzeppelin/test-helpers');

module.exports = async (deployer, network) => {
    if (network !== 'development') {
        return;
    }

    await deployer.deploy(UniswapV2Router02Mock);
    await deployer.deploy(UniswapV2OracleMock);
    await deployer.deploy(UptownPandaTwapableMock);
    await deployer.deploy(UptownPandaBurnableMock);
    await deployUptownPandaFarmMock(deployer);
};

const deployUptownPandaFarmMock = async (deployer) => {
    await deployer.deploy(UptownPandaMock);
    const uptownPandaMock = await UptownPandaMock.deployed();
    const farmSupply = ether(new BN(50000)); // 50000 $UPS
    await deployer.deploy(UptownPandaFarmMock, farmSupply, uptownPandaMock.address, uptownPandaMock.address);
};
