const UniswapV2Helper = artifacts.require('UniswapV2Helper');

module.exports = async (deployer) => {
    await deployer.deploy(UniswapV2Helper);
};
