const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));

const NftMetadata = artifacts.require('./NftMetadata.sol');
const MurAllNFT = artifacts.require('./MurAllNFT.sol');
const NftImageDataStorage = artifacts.require('./storage/NftImageDataStorage.sol');

contract('NftMetadata', ([owner, user]) => {
    const mintTestToken = async (fromAddress, metadata, fill = false) => {
        // Given token from an ERC721 contract (not sure how to mock this)
        const colourIndexValue = '0x10e1ccddeeff00112233445566778899aabbccddeeff00112233445566778899';
        const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
        const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
        const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';
        const transparentPixelGroupsValue = '0xBABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
        const transparentPixelGroupIndexesValue = '0x00000B00001400001E00002800003200003C00004600005000005A0000640000';

        const colourIndexes = [colourIndexValue];
        const individualPixels = [individualPixelsValue];
        const pixelGroups = [pixelGroupsValue];
        const pixelGroupIndexes = [pixelGroupIndexesValue];
        const transparentPixelGroups = [transparentPixelGroupsValue];
        const transparentPixelGroupIndexes = [transparentPixelGroupIndexesValue];

        await this.murAllNFT.mint(
            fromAddress,
            colourIndexes,
            individualPixels,
            pixelGroups,
            pixelGroupIndexes,
            transparentPixelGroups,
            transparentPixelGroupIndexes,
            metadata,
            {
                from: owner,
            }
        );
        if (fill) {
            await this.murAllNFT.fillData(
                0,
                colourIndexes,
                individualPixels,
                pixelGroups,
                pixelGroupIndexes,
                transparentPixelGroups,
                transparentPixelGroupIndexes,
                {
                    from: fromAddress,
                }
            );
        }
    };
    const setupUris = async () => {
        await this.murAllNFT.setTokenUriBase('token uri', {
            from: owner,
        });
        await this.murAllNFT.setViewUriBase('view uri', {
            from: owner,
        });
        await this.murAllNFT.setMediaUriBase('media uri', {
            from: owner,
        });
    };

    const getAddressString = (address) => {
        return address.toString().toLowerCase().slice(2);
    };

    beforeEach(async () => {
        this.NftImageDataStorage = await NftImageDataStorage.new({ from: owner });
        this.murAllNFT = await MurAllNFT.new([owner], this.NftImageDataStorage.address, { from: owner });
        await this.NftImageDataStorage.transferOwnership(this.murAllNFT.address);
        this.contract = await NftMetadata.new(this.murAllNFT.address, { from: owner });
    });

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = this.contract.address;

            assert.notEqual(address, '');
            assert.notEqual(address, 0x0);
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });
        it('has MurAllNFT contract', async () => {
            const murAllNFTContract = await this.contract.murAllNFT();

            assert.notEqual(murAllNFTContract, '');
            assert.notEqual(murAllNFTContract, 0x0);
            assert.notEqual(murAllNFTContract, null);
            assert.notEqual(murAllNFTContract, undefined);
        });
    });

    describe('get metadata', async () => {
        it('returns correct metadata when filled', async () => {
            const metadata = [
                '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000',
                '0x0004D200162E0000000000000000000000000000000000000000000000000001',
            ];

            await setupUris();

            const expectedMetadata =
                '{\n  "name": "hello world!",\n  "description": "By Artist ' +
                getAddressString(user) +
                ', Number 1234 from Series 5678",\n  "external_url": "view uri0",\n  "image": "media uri0",\n  "attributes": [\n    {\n      "trait_type": "Name",\n      "value": "hello world!"\n    },\n    {\n      "trait_type": "Artist",\n      "value": "' +
                getAddressString(user) +
                '"\n    },\n    {\n      "trait_type": "Filled",\n      "value": "Filled"\n    },\n    {\n      "display_type": "number",\n      "trait_type": "Number",\n      "value": 1234\n    },\n    {\n      "display_type": "number",\n      "trait_type": "Series Id",\n      "value": 5678\n    }\n  ]\n}';
            const tokenId = 0;

            await mintTestToken(user, metadata, true);

            const metadataRaw = await this.contract.getNftMetadata(tokenId, {
                from: user,
            });

            assert.equal(metadataRaw, expectedMetadata);
        });

        it('returns correct metadata when not filled', async () => {
            const metadata = [
                '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000',
                '0x0004D200162E0000000000000000000000000000000000000000000000000000',
            ];
            await setupUris();
            const expectedMetadata =
                '{\n  "name": "hello world!",\n  "description": "By Artist ' +
                getAddressString(user) +
                ', Number 1234 from Series 5678",\n  "external_url": "view uri0",\n  "image": "media uri0",\n  "attributes": [\n    {\n      "trait_type": "Name",\n      "value": "hello world!"\n    },\n    {\n      "trait_type": "Artist",\n      "value": "' +
                getAddressString(user) +
                '"\n    },\n    {\n      "trait_type": "Filled",\n      "value": "Not filled"\n    },\n    {\n      "display_type": "number",\n      "trait_type": "Number",\n      "value": 1234\n    },\n    {\n      "display_type": "number",\n      "trait_type": "Series Id",\n      "value": 5678\n    }\n  ]\n}';
            const tokenId = 0;

            await mintTestToken(user, metadata);

            const metadataRaw = await this.contract.getNftMetadata(tokenId, {
                from: user,
            });

            assert.equal(metadataRaw, expectedMetadata);
        });
    });
});
