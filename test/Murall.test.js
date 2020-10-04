const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));

const MurAll = artifacts.require('./MurAll.sol');
const MurAllNFT = artifacts.require('./MurAllNFT.sol');
const PaintToken = artifacts.require('./PaintToken.sol');

const PRICE_PER_PIXEL = 500000000000000000;

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

            const pixelOutOfRange = '0x001FA40100000000000000000000000000000000000000000000000000000000';
            const individualPixels = Array(1);
            individualPixels[0] = pixelOutOfRange;
            const colourIndexes = Array(0);
            const pixelGroups = Array(0);
            const pixelGroupIndexes = Array(0);
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await setAllowance(6);

            await expectRevert(
                this.contract.setPixels(colourIndexes, individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                    from: user,
                }),
                'coord is out of range'
            );
        });

        it('does not allow groups of pixels out of max number of pixel group (129600)', async () => {
            // given
            const pixel = '0xAABB1FA400000000000000000000000000000000000000000000000000000000';
            const pixelGroupOutOfRange = '0xFD21000000000000000000000000000000000000000000000000000000000000';

            const colourIndexes = Array(0);
            const individualPixels = Array(0);
            const pixelGroups = Array(1);
            pixelGroups[0] = pixel;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupOutOfRange;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await setAllowance(32);

            await expectRevert(
                this.contract.setPixels(colourIndexes, individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                    from: user,
                }),
                'group is out of range'
            );
        });

        it('emits painted event with correct data', async () => {
            // given
            const colourIndexValue = web3.utils.toBN(
                '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899'
            );
            const pixel = web3.utils.toBN('0x0012d6870012d6870012d6870012d6870012d6870012d6870012d6870012d687');
            const pixelGroup = web3.utils.toBN('0x26a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab');
            const pixelGroupIndex = web3.utils.toBN(
                '0x3039303930393039303930393039303930393039303930393039303930393039'
            );

            const colourIndexes = Array(1);
            colourIndexes[0] = colourIndexValue;
            const pixelData = Array(1);
            pixelData[0] = pixel;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroup;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;
            const metadata = Array(2);
            metadata[0] = web3.utils.toBN(1234);
            metadata[1] = web3.utils.toBN(5678);

            await setAllowance(40);

            const receipt = await this.contract.setPixels(
                colourIndexes,
                pixelData,
                pixelGroups,
                pixelGroupIndexes,
                metadata,
                {
                    from: user,
                }
            );
            // TODO Openzeppelin test helpers currently can't assert arrays of BigNumber https://github.com/OpenZeppelin/openzeppelin-test-helpers/issues/1
            await expectEvent(receipt, 'Painted', {
                artist: user,
                tokenId: '0',
                // pixelData: pixelData,
                // pixelGroups: pixelGroups,
                // pixelGroupIndexes: pixelGroupIndexes,
                // metadata: metadata,
            });
        });

        it('artist role assigned to address', async () => {
            // given
            const colourIndexValue = '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
            const pixel = '0x0012d6870012d6870012d6870012d6870012d6870012d6870012d6870012d687';
            const pixelGroup = '0x26a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab';
            const pixelGroupIndex = '0x3039303930393039303930393039303930393039303930393039303930393039';

            const colourIndexes = Array(1);
            colourIndexes[0] = colourIndexValue;
            const pixelData = Array(1);
            pixelData[0] = pixel;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroup;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await setAllowance(40);

            assert.isFalse(await this.contract.isArtist(user));
            assert.equal(await this.contract.totalArtists(), 0);

            await this.contract.setPixels(colourIndexes, pixelData, pixelGroups, pixelGroupIndexes, metadata, {
                from: user,
            });

            assert.isTrue(await this.contract.isArtist(user));
            assert.equal(await this.contract.totalArtists(), 1);
        });

        it('does not add additional artist role after it is assigned to address', async () => {
            // given
            const colourIndexValue = '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
            const pixel = '0x0012d6870012d6870012d6870012d6870012d6870012d6870012d6870012d687';
            const pixelGroup = '0x26a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab';
            const pixelGroupIndex = '0x3039303930393039303930393039303930393039303930393039303930393039';

            const colourIndexes = Array(1);
            colourIndexes[0] = colourIndexValue;
            const pixelData = Array(1);
            pixelData[0] = pixel;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroup;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await setAllowance(80);

            assert.isFalse(await this.contract.isArtist(user));
            assert.equal(await this.contract.totalArtists(), 0);

            await this.contract.setPixels(colourIndexes, pixelData, pixelGroups, pixelGroupIndexes, metadata, {
                from: user,
            });

            assert.isTrue(await this.contract.isArtist(user));
            assert.equal(await this.contract.totalArtists(), 1);

            await this.contract.setPixels(colourIndexes, pixelData, pixelGroups, pixelGroupIndexes, metadata, {
                from: user,
            });

            assert.isTrue(await this.contract.isArtist(user));
            assert.equal(await this.contract.totalArtists(), 1);
        });

        it('mints a new token', async () => {
            const colourIndexValue = '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
            const individualPixelsValue = '0x0012d6870012d6870012d6870012d6870012d6870012d6870012d6870012d687';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x3039303930393039303930393039303930393039303930393039303930393039';
            const expectedHashOfData = '0xe966bde86659c750437c8b6b8542999eec42a1599b5d26f51691bc935b0a8c40';

            const colourIndexes = Array(1);
            colourIndexes[0] = colourIndexValue;
            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const firstTokenId = 0;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await setAllowance(40);

            await this.contract.setPixels(colourIndexes, individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: user,
            });

            assert.equal(await this.murAllNFT.totalSupply(), 1);
            assert.equal(await this.murAllNFT.ownerOf(firstTokenId), user);
            assert.equal(await this.murAllNFT.getArtworkDataHashForId(firstTokenId), expectedHashOfData);
        });

        it('burns PAINT token equal to the amount of pixels painted', async () => {
            const colourIndexValue = '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
            const individualPixelsValue = '0x0012d6870012d6870012d6870012d6870012d6870012d6870012d6870012d687';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x3039303930393039303930393039303930393039303930393039303930393039';

            const colourIndexes = Array(1);
            colourIndexes[0] = colourIndexValue;
            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            const startSupply = await this.paintToken.totalSupply();
            const pixelCount = 40;
            const requiredTokens = web3.utils.toBN(PRICE_PER_PIXEL).mul(web3.utils.toBN(pixelCount));
            const expectedSupply = startSupply - requiredTokens;

            await setAllowance(pixelCount);

            await this.contract.setPixels(colourIndexes, individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: user,
            });

            assert.equal(await this.paintToken.totalSupply(), expectedSupply);
        });
    });

    describe('PAINT cost', async () => {
        it('getCostPerPixel returns correct PAINT cost', async () => {
            const costPerPixel = await this.contract.getCostPerPixel();

            assert.isTrue(costPerPixel.eq(web3.utils.toBN(PRICE_PER_PIXEL)));
        });
    });
});
