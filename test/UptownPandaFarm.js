const { shouldThrow } = require('./helpers/utils');
const { expect } = require('chai');
const { BN, ether, time } = require('@openzeppelin/test-helpers');
const UptownPandaMock = artifacts.require('UptownPandaMock');
const UptownPandaFarmMock = artifacts.require('UptownPandaFarmMock');

contract('UptownPandaFarm', (accounts) => {
    const [alice, bob, curtis] = accounts;
    const farmSupplyInEth = 50000;
    const farmSupply = ether(new BN(farmSupplyInEth));
    let uptownPanda;
    let uptownPandaFarm;

    const startFarming = async (fromAccount) => {
        const from = fromAccount || alice;
        await uptownPanda.setBalance(uptownPandaFarm.address, farmSupply);
        const result = await uptownPandaFarm.startFarming(uptownPanda.address, uptownPanda.address, farmSupply, { from });
        logEvents('started farming', result);
    };

    const initAccountForFarming = async (account, amount) => {
        await uptownPanda.setBalance(account, amount);
        await uptownPanda.approve(uptownPandaFarm.address, ether(new BN(99999999)), { from: account });
    };

    beforeEach(async () => {
        uptownPanda = await UptownPandaMock.new();
        uptownPandaFarm = await UptownPandaFarmMock.new();
    });

    it('should allow starting farm only if $UP supply set correctly', async () => {
        let hasFarmingStarted = await uptownPandaFarm.hasFarmingStarted();
        expect(hasFarmingStarted).to.equal(false);
        const invalidBalance = ether(new BN(farmSupplyInEth - 1));
        await uptownPanda.setBalance(uptownPandaFarm.address, invalidBalance);
        await shouldThrow(uptownPandaFarm.startFarming(uptownPanda.address, uptownPanda.address, farmSupply));
        await startFarming();
        hasFarmingStarted = await uptownPandaFarm.hasFarmingStarted();
        expect(hasFarmingStarted).to.equal(true);
    });

    it('should allow starting farm only once', async () => {
        let hasFarmingStarted = await uptownPandaFarm.hasFarmingStarted();
        expect(hasFarmingStarted).to.equal(false);
        await startFarming();
        hasFarmingStarted = await uptownPandaFarm.hasFarmingStarted();
        expect(hasFarmingStarted).to.equal(true);
        await shouldThrow(startFarming());
    });

    it('should allow only owner to start farming', async () => {
        let hasFarmingStarted = await uptownPandaFarm.hasFarmingStarted();
        expect(hasFarmingStarted).to.equal(false);
        await shouldThrow(startFarming(bob));
        await startFarming(alice);
        hasFarmingStarted = await uptownPandaFarm.hasFarmingStarted();
        expect(hasFarmingStarted).to.equal(true);
    });

    it('should stake some amounts and then succefully claim the rewards', async () => {
        await startFarming();

        const bobBalance = ether(new BN(500));
        await initAccountForFarming(bob, bobBalance);
        let result = await uptownPandaFarm.stake(bobBalance, { from: bob });
        logEvents('bob staked', result);

        time.increase(time.duration.days(5));

        const curtisBalance = ether(new BN(500));
        await initAccountForFarming(curtis, curtisBalance);
        result = await uptownPandaFarm.stake(curtisBalance, { from: curtis });
        logEvents('curtis staked', result);

        time.increase(time.duration.days(15));

        result = await uptownPandaFarm.claim({ from: bob });
        logEvents('bob claimed', result);
        const bobAfterBalance = await uptownPanda.balanceOf(bob);

        result = await uptownPandaFarm.claim({ from: curtis });
        logEvents('curtis claimed', result);
        const curtisAfterBalance = await uptownPanda.balanceOf(curtis);
        
        console.log('this is balance', bobAfterBalance.toString(), curtisAfterBalance.toString());
    });
});

const logEvents = (logText, result) => {
    for (let i = 0; i < result.logs.length; i++) {
        switch (result.logs[i].event) {
            case 'SupplySnapshotUpdated':
                const { idx, intervalIdx, timestamp, totalAmount } = result.logs[i].args;
                console.log(
                    `${logText} - Updated snapshot ${idx}: inverval ${intervalIdx}, timestamp ${timestamp}, amount ${totalAmount.toString()}`
                );
                break;

            case 'SupplySnapshotAdded':
                const {
                    intervalIdx: addIntervalIdx,
                    timestamp: addTimestamp,
                    totalAmount: addTotalAmount,
                } = result.logs[i].args;
                console.log(
                    `${logText} - Added snapshot: interval ${addIntervalIdx}, timestamp ${addTimestamp}, amount ${addTotalAmount.toString()}`
                );
                break;
        }
    }
};
