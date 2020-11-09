const UniswapV2OracleProxy = artifacts.require('UniswapV2OracleProxy');

module.exports = async (deployer) => {
    await deployer.deploy(UniswapV2OracleProxy);
};
