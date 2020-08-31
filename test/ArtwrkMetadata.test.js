const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));

const ArtwrkMetadata = artifacts.require('./ArtwrkMetadata.sol');
const MurAllNFT = artifacts.require('./MurAllNFT.sol');

contract('ArtwrkMetadata', ([owner, user]) => {
    const mintTestToken = async (fromAddress, metadata) => {
        // Given token from an ERC721 contract (not sure how to mock this)
        const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
        const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
        const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

        const individualPixels = Array(1);
        individualPixels[0] = individualPixelsValue;
        const pixelGroups = Array(1);
        pixelGroups[0] = pixelGroupsValue;
        const pixelGroupIndexes = Array(1);
        pixelGroupIndexes[0] = pixelGroupIndexesValue;

        await this.murAllNFT.mint(fromAddress, individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
            from: owner,
        });
    };

    beforeEach(async () => {
        this.murAllNFT = await MurAllNFT.new({ from: owner });

        this.contract = await ArtwrkMetadata.new(this.murAllNFT.address, { from: owner });
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
        it('returns correct metadata', async () => {
            const metadata = Array(3);
            metadata[0] = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            metadata[1] = '0x00000000000000000000000000000000000000000000000000000000000004D2';
            metadata[2] = '0x000000000000000000000000000000000000000000000000000000000000162E';
            const expectedMetadata =
                '{\n  "name": "hello world!",\n  "description": "By Artist d0214cc91e1e611843ebc9afc0ed11c5daa48906, Number 1234 from Series 5678",\n  "attributes": [\n    {\n      "trait_type": "name",\n      "value": "hello world!"\n    },\n    {\n      "trait_type": "artist",\n      "value": "d0214cc91e1e611843ebc9afc0ed11c5daa48906"\n    },\n    {\n      "display_type": "number",\n      "trait_type": "number",\n      "value": 1234\n    },\n    {\n      "display_type": "number",\n      "trait_type": "Series Id",\n      "value": 5678\n    }\n  ]\n}';
            const tokenId = 0;

            await mintTestToken(user, metadata);

            const metadataRaw = await this.contract.getArtwrkMetadata(tokenId, {
                from: user,
            });

            assert.equal(metadataRaw, expectedMetadata);
        });
    });
});