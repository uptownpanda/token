const increase = (duration) => {
    //first, let's increase time
    web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration], // there are 86400 seconds in a day
        id: new Date().getTime(),
    });

    //next, let's mine a new block
    web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: [],
        id: new Date().getTime(),
    });
};

const duration = {
    seconds: (val) => val,
    minutes: (val) => val * this.seconds(60),
    hours: (val) => val * this.minutes(60),
    days: (val) => val * this.hours(24),
};

module.exports = {
    increase,
    duration,
};
