const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const MurAllBlacklist = artifacts.require('./MurAllBlockList.sol');

contract('MurAllBlockList', (accounts) => {
    let contract;

    beforeEach(async () => {
        contract = await MurAllBlacklist.new({ from: accounts[0] });
    });

    describe('Deployment', async () => {
        it('deploys successfully', async () => {
            const address = contract.address;
            //console.log(address)

            assert.notEqual(address, '');
            assert.notEqual(address, 0x0);
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });
    });

    describe('Blocking items', async () => {
        it('returns correct size of blocked tokens', async () => {
            assert.equal(await contract.totalBlockedItems({ from: accounts[0] }), 0);

            const tokenId = 1234;
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';
            await contract.addTokenToBlockList(tokenId, address, { from: accounts[0] });

            assert.equal(await contract.totalBlockedItems({ from: accounts[0] }), 1);
        });

        it('item not blocked returns false', async () => {
            const tokenId = 1234;
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            assert.isFalse(
                await contract.isItemBlocked(tokenId, address),
                'item is not blocked so should return false'
            );
        });

        it('item blocked returns true', async () => {
            const tokenId = 1234;
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            await contract.addTokenToBlockList(tokenId, address, { from: accounts[0] });

            assert.isTrue(await contract.isItemBlocked(tokenId, address), 'item is blocked so should return true');
        });

        it('item blocked emits ArtworkBlocked event', async () => {
            const tokenId = 1234;
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            const receipt = await contract.addTokenToBlockList(tokenId, address, { from: accounts[0] });

            await expectEvent(receipt, 'ArtworkBlocked', {
                tokenId: '1234',
                contractAddress: '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b',
            });
        });

        it('attempts to block the same item multiple times does not increase list or emits ArtworkBlocked event', async () => {
            const tokenId = 1234;
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            const receipt = await contract.addTokenToBlockList(tokenId, address, { from: accounts[0] });

            await expectEvent(receipt, 'ArtworkBlocked', {
                tokenId: '1234',
                contractAddress: '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b',
            });

            assert.equal(await contract.totalBlockedItems(), 1);

            const nextReceipt = await contract.addTokenToBlockList(tokenId, address, { from: accounts[0] });

            await expectEvent.notEmitted(nextReceipt, 'ArtworkBlocked', {
                tokenId: '1234',
                contractAddress: '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b',
            });
            assert.equal(await contract.totalBlockedItems(), 1);
        });
        it('only owner allowed to block list', async () => {
            const tokenId = 1234;
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            const receipt = await contract.addTokenToBlockList(tokenId, address, { from: accounts[0] });

            await expectEvent(receipt, 'ArtworkBlocked', {
                tokenId: '1234',
                contractAddress: '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b',
            });

            assert.equal(await contract.totalBlockedItems(), 1);

            const nextTokenId = 1235;
            const nextAddress = '0x0e7c732cE374A37c223f1A27BE28E5102eE7781f';

            await expectRevert(
                contract.addTokenToBlockList(nextTokenId, nextAddress, { from: accounts[1] }),
                'caller is not the owner'
            );

            assert.equal(await contract.totalBlockedItems(), 1);
        });
    });

    describe('Blocking contracts', async () => {
        it('returns correct size of blocked contracts', async () => {
            assert.equal(await contract.totalBlockedContracts({ from: accounts[0] }), 0);

            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';
            await contract.addContractToBlockList(address, { from: accounts[0] });

            assert.equal(await contract.totalBlockedContracts({ from: accounts[0] }), 1);
        });

        it('contract not blocked returns false', async () => {
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            assert.isFalse(await contract.isContractBlocked(address), 'contract is not blocked so should return false');
        });

        it('contract blocked returns true', async () => {
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            await contract.addContractToBlockList(address, { from: accounts[0] });

            assert.isTrue(await contract.isContractBlocked(address), 'contract is blocked so should return true');
        });

        it('contract blocked emits ContractBlocked event', async () => {
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            const receipt = await contract.addContractToBlockList(address, { from: accounts[0] });

            await expectEvent(receipt, 'ContractBlocked', {
                contractAddress: '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b',
            });
        });

        it('attempts to block the same contract multiple times does not increase list or emit ContractBlocked event', async () => {
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            const receipt = await contract.addContractToBlockList(address, { from: accounts[0] });

            await expectEvent(receipt, 'ContractBlocked', {
                contractAddress: '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b',
            });

            assert.equal(await contract.totalBlockedContracts(), 1);

            const nextReceipt = await contract.addContractToBlockList(address, { from: accounts[0] });

            await expectEvent.notEmitted(nextReceipt, 'ContractBlocked', {
                contractAddress: '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b',
            });
            assert.equal(await contract.totalBlockedContracts(), 1);
        });
        it('only owner allowed to block contract', async () => {
            const address = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b';

            const receipt = await contract.addContractToBlockList(address, { from: accounts[0] });

            await expectEvent(receipt, 'ContractBlocked', {
                contractAddress: '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b',
            });

            assert.equal(await contract.totalBlockedContracts(), 1);

            const nextAddress = '0x0e7c732cE374A37c223f1A27BE28E5102eE7781f';

            await expectRevert(
                contract.addContractToBlockList(nextAddress, { from: accounts[1] }),
                'caller is not the owner'
            );

            assert.equal(await contract.totalBlockedContracts(), 1);
        });
    });
});
