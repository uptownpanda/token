const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');

module.exports = async (deployer, network) => {
    if (network !== 'development') {
        return;
    }
    await deployUniswapV2Router02Mock(deployer);
};

const deployUniswapV2Router02Mock = async (deployer) => {
    await deployer.deploy(UniswapV2Router02Mock);
};
