const UptownPandaFarm = artifacts.require('UptownPandaFarm');
const fs = require('fs');

module.exports = async (deployer) => {
    const deployFarm = async () => {
        await deployer.deploy(UptownPandaFarm);
        const farm = await UptownPandaFarm.deployed();
        return farm.address;
    };

    const upFarmAddress = await deployFarm();
    const upEthFarmAddress = await deployFarm();
    const wethFarmAddress = await deployFarm();
    const wbtcFarmAddress = await deployFarm();

    const farmAddressesFileContent = `up:${upFarmAddress},upEth:${upEthFarmAddress},weth:${wethFarmAddress},wbtc:${wbtcFarmAddress}`;
    fs.writeFileSync('farm-addresses.txt', farmAddressesFileContent);
};
