const UniswapV2Helper = artifacts.require('UniswapV2Helper');
const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');
const UniswapV2OracleMock = artifacts.require('UniswapV2OracleMock');
const UniswapV2OracleProxy = artifacts.require('UniswapV2OracleProxy');

module.exports = async (deployer, network) => {
    const uniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    const uniswapV2Router02Address = await getUniswapV2Router02Address(network);
    const uniswapV2OracleAddress = await getUniswapV2OracleAddress(network);
    await deployer.deploy(UniswapV2Helper, uniswapV2FactoryAddress, uniswapV2Router02Address, uniswapV2OracleAddress);
};

const getUniswapV2Router02Address = async (network) => {
    if (network !== 'development') {
        return '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    }
    const uniswapV2Router02Mock = await UniswapV2Router02Mock.deployed();
    return uniswapV2Router02Mock.address;
};

const getUniswapV2OracleAddress = async (network) => {
    const uniswapV2OracleDeployed =
        network === 'development' ? UniswapV2OracleMock.deployed() : UniswapV2OracleProxy.deployed();
    const uniswapV2Oracle = await uniswapV2OracleDeployed;
    return uniswapV2Oracle.address;
};
