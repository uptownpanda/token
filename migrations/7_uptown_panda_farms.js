const UptownPanda = artifacts.require('UptownPanda');
const UptownPandaFarm = artifacts.require('UptownPandaFarm');
const { ether } = require('@openzeppelin/test-helpers');

module.exports = async (deployer, network) => {
    if (network === 'development') {
        return;
    }

    const uptownPanda = await UptownPanda.deployed();

    const deployFarm = async (farmSupply, farmTokenAddress) => {
        const farmSupplyAsWei = ether(farmSupply.toString());
        await deployer.deploy(UptownPandaFarm, farmSupplyAsWei, uptownPanda.address, farmTokenAddress);
    };

    //const upFarm = await deployFarm(50000, uptownPanda.address);
    //const upEthFarm = await deployFarm(100000, uniswapTokenAddress);
    //const wethFarm = await deployFarm(20000, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2');
    //const wbtcFarm = await deployFarm(1000, '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599');
};
