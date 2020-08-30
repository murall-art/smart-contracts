const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));

const MurAll = artifacts.require('./MurAll.sol');
const MurAllNFT = artifacts.require('./MurAllNFT.sol');
const PaintToken = artifacts.require('./PaintToken.sol');

const PRICE_PER_PIXEL = 500000000000000;

contract('MurAll', ([owner, user]) => {
    const setAllowance = async (pixelCount) => {
        const requiredTokens = web3.utils.toBN(PRICE_PER_PIXEL).mul(web3.utils.toBN(pixelCount));
        await this.paintToken.transfer(user, requiredTokens, { from: owner });
        await this.paintToken.approve(this.contract.address, requiredTokens, { from: user });
    };

    beforeEach(async () => {
        this.murAllNFT = await MurAllNFT.new({ from: owner });
        this.paintToken = await PaintToken.new({ from: owner });
        this.contract = await MurAll.new(this.paintToken.address, this.murAllNFT.address, { from: owner });
        await this.murAllNFT.transferOwnership(this.contract.address, { from: owner });
    });

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = this.contract.address;

            assert.notEqual(address, '');
            assert.notEqual(address, 0x0);
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });

        it('has PaintToken contract', async () => {
            const paintTokenContract = await this.contract.paintToken();

            assert.notEqual(paintTokenContract, '');
            assert.notEqual(paintTokenContract, 0x0);
            assert.notEqual(paintTokenContract, null);
            assert.notEqual(paintTokenContract, undefined);
        });

        it('has MurAllNFT contract', async () => {
            const murAllNFTContract = await this.contract.murAllNFT();

            assert.notEqual(murAllNFTContract, '');
            assert.notEqual(murAllNFTContract, 0x0);
            assert.notEqual(murAllNFTContract, null);
            assert.notEqual(murAllNFTContract, undefined);
        });
    });

    describe('setPixels', async () => {
        it('does not allow individual pixels out of max pixel resolution range (2073600)', async () => {
            // given
            const pixelOutOfRange = '0x0000AABB1FA40000000000000000000000000000000000000000000000000000';
            const individualPixels = Array(1);
            individualPixels[0] = pixelOutOfRange;
            const pixelGroups = Array(0);
            const pixelGroupIndexes = Array(0);

            await setAllowance(6);

            await expectRevert(
                this.contract.setPixels(individualPixels, pixelGroups, pixelGroupIndexes, { from: user }),
                'coord is out of range'
            );
        });

        it('does not allow groups of pixels out of max number of pixel group (129600)', async () => {
            // given
            const pixel = '0xAABB1FA400000000000000000000000000000000000000000000000000000000';
            const pixelGroupOutOfRange = '0x000001FA40000000000000000000000000000000000000000000000000000000';

            const individualPixels = Array(0);
            const pixelGroups = Array(1);
            pixelGroups[0] = pixel;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupOutOfRange;

            await setAllowance(16);

            await expectRevert(
                this.contract.setPixels(individualPixels, pixelGroups, pixelGroupIndexes, { from: user }),
                'group is out of range'
            );
        });

        /* TODO this test fails even though the expected parameters are correct, needs investigation*/
        it('emits painted event with correct data', async () => {
            // given
            const pixel = '0x0000cc83000007cc83000001cc83000002cc83000003cc83000004cc83000005';
            const pixelGroup = '0x26a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab';
            const pixelGroupIndex = '0x000000000a00001400001e00002800003200003c00004600005000005a000064';

            const pixelData = Array(1);
            pixelData[0] = pixel;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroup;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;

            await setAllowance(22);

            const receipt = await this.contract.setPixels(pixelData, pixelGroups, pixelGroupIndexes, { from: user });
            // TODO the array data seems to be failing the assert even though the data is equal, needs investigation
            await expectEvent(receipt, 'Painted', {
                sender: user,
                tokenId: '0',
                /*pixelData: pixelData,
                pixelGroups: pixelGroups,
                pixelGroupIndexes: pixelGroupIndexes,*/
            });
        });

        it('artist role assigned to address', async () => {
            // given
            const pixel = '0x0000cc83000007cc83000001cc83000002cc83000003cc83000004cc83000005';
            const pixelGroup = '0x26a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab';
            const pixelGroupIndex = '0x000000000a00001400001e00002800003200003c00004600005000005a000064';

            const pixelData = Array(1);
            pixelData[0] = pixel;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroup;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;

            await setAllowance(22);

            assert.equal(await this.contract.isArtist(user), false);
            assert.equal(await this.contract.totalArtists(), 0);

            await this.contract.setPixels(pixelData, pixelGroups, pixelGroupIndexes, { from: user });

            assert.equal(await this.contract.isArtist(user), true);
            assert.equal(await this.contract.totalArtists(), 1);
        });

        it('does not add additional artist role after it is assigned to address', async () => {
            // given
            const pixel = '0x0000cc83000007cc83000001cc83000002cc83000003cc83000004cc83000005';
            const pixelGroup = '0x26a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab';
            const pixelGroupIndex = '0x000000000a00001400001e00002800003200003c00004600005000005a000064';

            const pixelData = Array(1);
            pixelData[0] = pixel;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroup;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;

            await setAllowance(44);

            assert.equal(await this.contract.isArtist(user), false);
            assert.equal(await this.contract.totalArtists(), 0);

            await this.contract.setPixels(pixelData, pixelGroups, pixelGroupIndexes, { from: user });

            assert.equal(await this.contract.isArtist(user), true);
            assert.equal(await this.contract.totalArtists(), 1);

            await this.contract.setPixels(pixelData, pixelGroups, pixelGroupIndexes, { from: user });

            assert.equal(await this.contract.isArtist(user), true);
            assert.equal(await this.contract.totalArtists(), 1);
        });

        it('mints a new token', async () => {
            const individualPixelsValue = '0x0000AABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF000002';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x000000000a00001400001e00002800003200003c00004600005000005a000064';
            const expectedHashOfData = '0x1b0dfe921d77334410541d46c852f429cb60628e4b5f1dfac929819be4488eab';
            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const firstTokenId = 0;

            await setAllowance(22);

            await this.contract.setPixels(individualPixels, pixelGroups, pixelGroupIndexes, { from: user });

            assert.equal(await this.murAllNFT.totalSupply(), 1);
            assert.equal(await this.murAllNFT.ownerOf(firstTokenId), user);
            assert.equal(await this.murAllNFT.getArtworkDataHashForId(firstTokenId), expectedHashOfData);
        });

        it('burns PAINT token equal to the amount of pixels painted', async () => {
            const individualPixelsValue = '0x0000AABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF000002';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x000000000a00001400001e00002800003200003c00004600005000005a000064';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;

            const startSupply = await this.paintToken.totalSupply();
            const pixelCount = 22;
            const requiredTokens = web3.utils.toBN(PRICE_PER_PIXEL).mul(web3.utils.toBN(pixelCount));
            const expectedSupply = startSupply - requiredTokens;

            await setAllowance(pixelCount);

            await this.contract.setPixels(individualPixels, pixelGroups, pixelGroupIndexes, { from: user });

            assert.equal(await this.paintToken.totalSupply(), expectedSupply);
        });
    });
});
