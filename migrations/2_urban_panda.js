const UrbanPanda = artifacts.require('UrbanPanda');

module.exports = async (deployer) => {
    await deployer.deploy(UrbanPanda);
};
