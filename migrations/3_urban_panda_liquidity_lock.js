const UrbanPanda = artifacts.require('UrbanPanda');
const UrbanPandaLiquidityLock = artifacts.require('UrbanPandaLiquidityLock');

module.exports = async (deployer) => {
    const urbanPanda = await UrbanPanda.deployed();
    const releaseTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 2;
    await deployer.deploy(UrbanPandaLiquidityLock, urbanPanda.address, releaseTime);
};
