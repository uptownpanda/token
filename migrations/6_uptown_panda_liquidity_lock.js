const UptownPanda = artifacts.require('UptownPanda');
const UptownPandaLiquidityLock = artifacts.require('UptownPandaLiquidityLock');

module.exports = async (deployer) => {
    const uptownPanda = await UptownPanda.deployed();
    const releaseTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 2;
    await deployer.deploy(UptownPandaLiquidityLock, uptownPanda.address, releaseTime);
};
