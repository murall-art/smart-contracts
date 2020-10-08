const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));

const MurAllDataValidator = artifacts.require('./validator/MurAllDataValidator.sol');

contract('MurAllDataValidator', ([owner, user]) => {
    beforeEach(async () => {
        this.contract = await MurAllDataValidator.new({ from: owner });
    });

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = this.contract.address;

            assert.notEqual(address, '');
            assert.notEqual(address, 0x0);
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });
    });

    describe('validate', async () => {
        it('does not allow individual pixels out of max pixel resolution range (2097152)', async () => {
            // given

            const pixelOutOfRange = '0x0020000100000000000000000000000000000000000000000000000000000000';
            const individualPixels = Array(1);
            individualPixels[0] = pixelOutOfRange;
            const pixelGroups = Array(0);
            const pixelGroupIndexes = Array(0);
            const metadata = Array(2);
            metadata[0] = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            metadata[1] = '0x0004D200162E0000000000000000000000000000000000000000000000000001';

            await expectRevert.unspecified(
                this.contract.validate(individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                    from: user,
                })
            );
        });


        it('does not allow group index array with incorrect amount', async () => {
            // given
            const pixelGroup = web3.utils.toBN('0x26a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab');
            const pixelGroupIndex = web3.utils.toBN(
                '0x3039303930393039303930393039303930393039303930393039303930393039'
            );
            const metadata = Array(2);
            metadata[0] = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            metadata[1] = '0x0004D200162E0000000000000000000000000000000000000000000000000001';
            const individualPixels = Array(0);
            const pixelGroups = [
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
                pixelGroup,
            ];

            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;

            await expectRevert(
                this.contract.validate(individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                    from: user,
                }),
                'unexpected group index array length'
            );
        });

        it('allows pixels and groups within boundaries and returns correct pixel count', async () => {
            // given
            const pixel = web3.utils.toBN('0x0012d6870012d6870012d6870012d6870012d6870012d6870012d6870012d687');
            const pixelGroup = web3.utils.toBN('0x26a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab');
            const pixelGroupIndex = web3.utils.toBN(
                '0x3039303930393039303930393039303930393039303930393039303930393039'
            );

            const metadata = Array(2);
            metadata[0] = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            metadata[1] = '0x0004D200162E0000000000000000000000000000000000000000000000000001';
            const pixelData = Array(1);
            pixelData[0] = pixel;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroup;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;

            const pixelCount = await this.contract.validate(pixelData, pixelGroups, pixelGroupIndexes, metadata);
            assert.equal(pixelCount, 40);
        });

        it('returns pixel count minus transparent pixels from group when alpha is enabled', async () => {
            // given
            const pixel = web3.utils.toBN('0x0012d6870012d6870012d6870012d6870012d6870012d6870012d6870012d687');
            const pixelGroup = web3.utils.toBN('0x00a4d3a4007ad100efa1004d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab');
            const pixelGroupIndex = web3.utils.toBN(
                '0x3039303930393039303930393039303930393039303930393039303930393039'
            );

            const metadata = Array(2);
            metadata[0] = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            metadata[1] = '0x0004D200162E0000000000000000000000000000000000000000000000000001';
            const pixelData = Array(1);
            pixelData[0] = pixel;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroup;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;

            const pixelCount = await this.contract.validate(pixelData, pixelGroups, pixelGroupIndexes, metadata);
            assert.equal(pixelCount, 36);
        });

        it('returns pixel count including all colours when alpha is disabled', async () => {
            // given
            const pixel = web3.utils.toBN('0x0012d6870012d6870012d6870012d6870012d6870012d6870012d6870012d687');
            const pixelGroup = web3.utils.toBN('0x00a4d3a4007ad100efa1004d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab');
            const pixelGroupIndex = web3.utils.toBN(
                '0x3039303930393039303930393039303930393039303930393039303930393039'
            );

            const metadata = Array(2);
            metadata[0] = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            metadata[1] = '0x0004D200162E0000000000000000000000000000000000000000000000000000';
            const pixelData = Array(1);
            pixelData[0] = pixel;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroup;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndex;

            const pixelCount = await this.contract.validate(pixelData, pixelGroups, pixelGroupIndexes, metadata);
            assert.equal(pixelCount, 40);
        });
    });
});
