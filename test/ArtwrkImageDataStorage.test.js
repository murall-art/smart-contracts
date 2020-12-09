const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));

const ArtwrkImageDataStorage = artifacts.require('./storage/ArtwrkImageDataStorage.sol');
const TEST_DATA_HASH = '0x3f6b2cbd90930fb7659aa6ba4c8c480fdc3395ca9652e48036d71e46ce186661';
contract('ArtwrkImageDataStorage', (accounts) => {
    const fillTestData = async (fromAddress) => {
        const colourIndexValue = '0xAABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899';
        const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
        const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
        const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';
        const transparentPixelGroup = web3.utils.toBN(
            '0x36a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab'
        );
        const transparentPixelGroupIndex = web3.utils.toBN(
            '0x4039303930393039303930393039303930393039303930393039303930393039'
        );

        const colourIndex = [colourIndexValue, colourIndexValue];
        const individualPixels = [individualPixelsValue, individualPixelsValue];
        const pixelGroups = [pixelGroupsValue, pixelGroupsValue];
        const pixelGroupIndexes = [pixelGroupIndexesValue, pixelGroupIndexesValue];
        const transparentPixelGroups = [transparentPixelGroup, transparentPixelGroup];
        const transparentPixelGroupIndexes = [transparentPixelGroupIndex, transparentPixelGroupIndex];

        const receipt = await contract.fillData(
            colourIndex,
            individualPixels,
            pixelGroups,
            pixelGroupIndexes,
            transparentPixelGroups,
            transparentPixelGroupIndexes,
            {
                from: fromAddress,
            }
        );
        return receipt;
    };
    let contract;

    beforeEach(async () => {
        contract = await ArtwrkImageDataStorage.new({ from: accounts[0] });
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

    describe('Fill data', async () => {
        it('does not allow fill from address that is not owner', async () => {
            const colourIndexValue = '0xAABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899';
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';
            const transparentPixelGroup = web3.utils.toBN(
                '0x36a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab'
            );
            const transparentPixelGroupIndex = web3.utils.toBN(
                '0x4039303930393039303930393039303930393039303930393039303930393039'
            );

            const colourIndex = [colourIndexValue];
            const individualPixels = [individualPixelsValue];
            const pixelGroups = [pixelGroupsValue];
            const pixelGroupIndexes = [pixelGroupIndexesValue];
            const transparentPixelGroups = [transparentPixelGroup];
            const transparentPixelGroupIndexes = [transparentPixelGroupIndex];

            await expectRevert(
                contract.fillData(
                    colourIndex,
                    individualPixels,
                    pixelGroups,
                    pixelGroupIndexes,
                    transparentPixelGroups,
                    transparentPixelGroupIndexes,
                    {
                        from: accounts[1],
                    }
                ),
                'Ownable: caller is not the owner'
            );
        });

        it('Allow fill from owner address', async () => {
            const receipt = await fillTestData(accounts[0]);

            await expectEvent(receipt, 'Filled', {
                dataHash: TEST_DATA_HASH,
                colorIndexCompleteToIndex: web3.utils.toBN(1),
                individualPixelsCompleteToIndex: web3.utils.toBN(1),
                pixelGroupsCompleteToIndex: web3.utils.toBN(1),
                pixelGroupIndexesCompleteToIndex: web3.utils.toBN(1),
                transparentPixelGroupsCompleteToIndex: web3.utils.toBN(1),
                transparentPixelGroupIndexesCompleteToIndex: web3.utils.toBN(1),
            });
        });

        it('allows fill of partial data', async () => {
            const colourIndexValue = '0xAABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899';

            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const colourIndex = [colourIndexValue, colourIndexValue];
            const pixelGroups = [pixelGroupsValue, pixelGroupsValue];
            const pixelGroupIndexes = [pixelGroupIndexesValue, pixelGroupIndexesValue];

            const receipt = await contract.fillData(colourIndex, [], pixelGroups, pixelGroupIndexes, [], [], {
                from: accounts[0],
            });
            await expectEvent(receipt, 'Filled', {
                dataHash: '0x15171ffa505d7f499148a5a45111d7370ff4d1a8ee63d2bd058cceacf8ed0a09',
                colorIndexCompleteToIndex: web3.utils.toBN(1),
                individualPixelsCompleteToIndex: web3.utils.toBN(0),
                pixelGroupsCompleteToIndex: web3.utils.toBN(1),
                pixelGroupIndexesCompleteToIndex: web3.utils.toBN(1),
                transparentPixelGroupsCompleteToIndex: web3.utils.toBN(0),
                transparentPixelGroupIndexesCompleteToIndex: web3.utils.toBN(0),
            });
        });
    });

    describe('isArtworkFilled', async () => {
        it('Returns true when artwork is filled', async () => {
            // given filled data
            await fillTestData(accounts[0]);
            const filled = await contract.isArtworkFilled(TEST_DATA_HASH);
            assert.isTrue(filled);
        });

        it('Returns false when artwork is filled', async () => {
            // given not filled data
            const filled = await contract.isArtworkFilled(TEST_DATA_HASH);
            assert.isFalse(filled);
        });
    });

    describe('getArtworkFillCompletionStatus', async () => {
        it('Returns correct values for fill status', async () => {
            // given filled data
            await fillTestData(accounts[0]);
            const filledStatus = await contract.getArtworkFillCompletionStatus(TEST_DATA_HASH);

            assert.isTrue(filledStatus.colorIndexCompleteToIndex.eq(web3.utils.toBN(1)));
            assert.isTrue(filledStatus.individualPixelsCompleteToIndex.eq(web3.utils.toBN(1)));
            assert.isTrue(filledStatus.pixelGroupsCompleteToIndex.eq(web3.utils.toBN(1)));
            assert.isTrue(filledStatus.pixelGroupIndexesCompleteToIndex.eq(web3.utils.toBN(1)));
            assert.isTrue(filledStatus.transparentPixelGroupsCompleteToIndex.eq(web3.utils.toBN(1)));
            assert.isTrue(filledStatus.transparentPixelGroupIndexesCompleteToIndex.eq(web3.utils.toBN(1)));
        });
    });

    describe('getArtworkForDataHash', async () => {
        it('Returns correct values for filled artwork', async () => {
            // given filled data
            const colourIndexValue = '0xAABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899';
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';
            const transparentPixelGroup = web3.utils.toBN(
                '0x36a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab'
            );
            const transparentPixelGroupIndex = web3.utils.toBN(
                '0x4039303930393039303930393039303930393039303930393039303930393039'
            );
            const dataHash = '0x1b4958f622d5d7035786c1daed26f31f7341b35d31610ceaea89fd7379aae768';

            const colourIndex = [colourIndexValue];
            const individualPixels = [individualPixelsValue];
            const pixelGroups = [pixelGroupsValue];
            const pixelGroupIndexes = [pixelGroupIndexesValue];
            const transparentPixelGroups = [transparentPixelGroup];
            const transparentPixelGroupIndexes = [transparentPixelGroupIndex];

            await contract.fillData(
                colourIndex,
                individualPixels,
                pixelGroups,
                pixelGroupIndexes,
                transparentPixelGroups,
                transparentPixelGroupIndexes,
                {
                    from: accounts[0],
                }
            );

            const artwork = await contract.getArtworkForDataHash(dataHash);

            assert.equal(artwork.colorIndex.length, 1);
            assert.equal(artwork.individualPixels.length, 1);
            assert.equal(artwork.pixelGroups.length, 1);
            assert.equal(artwork.pixelGroupIndexes.length, 1);
            assert.equal(artwork.transparentPixelGroups.length, 1);
            assert.equal(artwork.transparentPixelGroupIndexes.length, 1);

            assert.isTrue(artwork.colorIndex[0].eq(web3.utils.toBN(colourIndexValue)));
            assert.isTrue(artwork.individualPixels[0].eq(web3.utils.toBN(individualPixelsValue)));
            assert.isTrue(artwork.pixelGroups[0].eq(web3.utils.toBN(pixelGroupsValue)));
            assert.isTrue(artwork.pixelGroupIndexes[0].eq(web3.utils.toBN(pixelGroupIndexesValue)));
            assert.isTrue(artwork.transparentPixelGroups[0].eq(web3.utils.toBN(transparentPixelGroup)));
            assert.isTrue(artwork.transparentPixelGroupIndexes[0].eq(web3.utils.toBN(transparentPixelGroupIndex)));
        });

        it('reverts for unfilled artwork', async () => {
            const dataHash = '0x1b4958f622d5d7035786c1daed26f31f7341b35d31610ceaea89fd7379aae768';

            await expectRevert(contract.getArtworkForDataHash(dataHash), 'Artwork is not filled');
        });
    });

    describe('getColorIndexForDataHash', async () => {
        it('Returns correct values for colour index', async () => {
            // given filled data
            const colourIndexValue = '0xAABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899';
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';
            const transparentPixelGroup = web3.utils.toBN(
                '0x36a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab'
            );
            const transparentPixelGroupIndex = web3.utils.toBN(
                '0x4039303930393039303930393039303930393039303930393039303930393039'
            );
            const dataHash = '0x1b4958f622d5d7035786c1daed26f31f7341b35d31610ceaea89fd7379aae768';

            const colourIndex = [colourIndexValue];
            const individualPixels = [individualPixelsValue];
            const pixelGroups = [pixelGroupsValue];
            const pixelGroupIndexes = [pixelGroupIndexesValue];
            const transparentPixelGroups = [transparentPixelGroup];
            const transparentPixelGroupIndexes = [transparentPixelGroupIndex];

            await contract.fillData(
                colourIndex,
                individualPixels,
                pixelGroups,
                pixelGroupIndexes,
                transparentPixelGroups,
                transparentPixelGroupIndexes,
                {
                    from: accounts[0],
                }
            );

            const colorIndex = await contract.getColorIndexForDataHash(dataHash);

            assert.equal(colorIndex.length, 1);

            assert.isTrue(colorIndex[0].eq(web3.utils.toBN(colourIndexValue)));
        });

        it('reverts for unfilled artwork', async () => {
            const dataHash = '0x1b4958f622d5d7035786c1daed26f31f7341b35d31610ceaea89fd7379aae768';

            await expectRevert(contract.getColorIndexForDataHash(dataHash), 'Artwork is not filled');
        });
    });
});
