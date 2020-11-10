const UniswapV2OracleProxy = artifacts.require('UniswapV2OracleProxy');

module.exports = async (deployer, network) => {
    if (network === 'development') {
        return;
    }
    await deployer.deploy(UniswapV2OracleProxy);
};
