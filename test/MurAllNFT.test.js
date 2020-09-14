const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));

const MurAllNFT = artifacts.require('./MurAllNFT.sol');

contract('MurAllNFT', (accounts) => {
    let contract;

    beforeEach(async () => {
        contract = await MurAllNFT.new({ from: accounts[0] });
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

    describe('Minting', async () => {
        it('minting disallowed from account that is not contract owner', async () => {
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await expectRevert(
                contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                    from: accounts[1],
                }),
                'caller is not the owner'
            );
        });

        it('mints a new token from contract owner', async () => {
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';
            const expectedHashOfData = '0x8a51668637b536f71338ddad3fc694db601f971ea2b1f6ef485269cc4fce8220';
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

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            assert.equal(await contract.totalSupply(), 1);
            assert.equal(await contract.ownerOf(firstTokenId), accounts[1]);
            assert.equal(await contract.getArtworkDataHashForId(firstTokenId), expectedHashOfData);
        });
    });

    describe('Get data hash ', async () => {
        it('returns correct data hash for minted token', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';
            const expectedHashOfData = '0x8a51668637b536f71338ddad3fc694db601f971ea2b1f6ef485269cc4fce8220';
            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            // when getArtworkDataHashForId
            const hash = await contract.getArtworkDataHashForId(tokenId);

            // returns expected hash
            assert.equal(hash, expectedHashOfData);
        });
    });

    describe('Get NFT artwork', async () => {
        it('reverts if artwork of minted token is not filled in NFT', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            await expectRevert(contract.getArtworkForId(tokenId), 'Artwork is unfinished');
        });

        it('returns correct artwork when NFT is filled', async () => {
            const individualPixelsValue = '0xaabb000064aabb0000c8ddee00012cffee000190ccbb0001f4aaff0000020000';
            const pixelGroupsValue = '0xaabbccddeeffabcdefaaaaaabbbbbbccccccddddddeeeeeeffffff1122331234';
            const pixelGroupIndexesValue = '0x00000a00001400001e00002800003200003c00004600005000005a0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;
            const receipt = await contract.fillData(tokenId, individualPixels, pixelGroups, pixelGroupIndexes, {
                from: accounts[1],
            });

            const data = await contract.getArtworkForId(tokenId);
            assert.equal(data[0].length, 1);
            assert.equal(web3.utils.padLeft(web3.utils.toHex(data[0][0]), 64), individualPixelsValue);
            assert.equal(data[2].length, 1);
            assert.equal(web3.utils.padLeft(web3.utils.toHex(data[1][0]), 64), pixelGroupsValue);
            assert.equal(data[2].length, 1);
            assert.equal(web3.utils.padLeft(web3.utils.toHex(data[2][0]), 64), pixelGroupIndexesValue);
        });
    });

    describe('Get full NFT data', async () => {
        it('reverts if artwork of minted token is not filled in NFT', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            await expectRevert(contract.getFullDataForId(tokenId), 'Artwork is unfinished');
        });

        it('returns correct data when NFT is filled', async () => {
            const individualPixelsValue = '0xaabb000064aabb0000c8ddee00012cffee000190ccbb0001f4aaff0000020000';
            const pixelGroupsValue = '0xaabbccddeeffabcdefaaaaaabbbbbbccccccddddddeeeeeeffffff1122331234';
            const pixelGroupIndexesValue = '0x00000a00001400001e00002800003200003c00004600005000005a0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;
            const receipt = await contract.fillData(tokenId, individualPixels, pixelGroups, pixelGroupIndexes, {
                from: accounts[1],
            });

            const data = await contract.getFullDataForId(tokenId);
            assert.equal(data.individualPixels.length, 1);
            assert.equal(data.artist, accounts[1]);
            assert.equal(web3.utils.padLeft(web3.utils.toHex(data.individualPixels[0]), 64), individualPixelsValue);
            assert.equal(data.pixelGroups.length, 1);
            assert.equal(web3.utils.padLeft(web3.utils.toHex(data.pixelGroups[0]), 64), pixelGroupsValue);
            assert.equal(data.pixelGroupIndexes.length, 1);
            assert.equal(web3.utils.padLeft(web3.utils.toHex(data.pixelGroupIndexes[0]), 64), pixelGroupIndexesValue);
            assert.isTrue(web3.utils.toBN(metadata[0]).eq(data.name));
            assert.isTrue(web3.utils.toBN(metadata[1]).eq(data.metadata));
        });
    });

    describe('Fill NFT data', async () => {
        it('fails when individualPixels data not matching original data', async () => {
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const wrongIndividualPixelsValue = '0xBABBCC000064AABBCC0000C8DDEEFF00012CFFEEDD000190CCBBAA0001F40000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const wrongIndividualPixels = Array(1);
            wrongIndividualPixels[0] = wrongIndividualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            const firstTokenId = 0;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            await expectRevert(
                contract.fillData(firstTokenId, wrongIndividualPixels, pixelGroups, pixelGroupIndexes, {
                    from: accounts[1],
                }),
                'Incorrect data'
            );
        });

        it('fails when pixelGroups data not matching original data', async () => {
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const wrongPixelGroupsValue = '0xBABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122330000';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const wrongPixelGroups = Array(1);
            wrongPixelGroups[0] = wrongPixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const firstTokenId = 0;

            await expectRevert(
                contract.fillData(firstTokenId, individualPixels, wrongPixelGroups, pixelGroupIndexes, {
                    from: accounts[1],
                }),
                'Incorrect data'
            );
        });

        it('fails when pixelGroupIndexes data not matching original data', async () => {
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';
            const wrongPixelGroupIndexesValue = '0x00000B00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const wrongPixelGroupIndexes = Array(1);
            wrongPixelGroupIndexes[0] = wrongPixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const firstTokenId = 0;

            await expectRevert(
                contract.fillData(firstTokenId, individualPixels, pixelGroups, wrongPixelGroupIndexes, {
                    from: accounts[1],
                }),
                'Incorrect data'
            );
        });

        it('fails when address not ownder of NFT', async () => {
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const firstTokenId = 0;

            await expectRevert(
                contract.fillData(firstTokenId, individualPixels, pixelGroups, pixelGroupIndexes, {
                    from: accounts[0],
                }),
                'Not approved or not owner of token'
            );
        });

        it('succeeds when all data matches original data', async () => {
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const metadata = Array(2);
            metadata[0] = 1234;
            metadata[1] = 5678;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const firstTokenId = 0;

            const receipt = await contract.fillData(firstTokenId, individualPixels, pixelGroups, pixelGroupIndexes, {
                from: accounts[1],
            });

            await expectEvent(receipt, 'ArtworkFilled', {
                id: '0',
                finished: true,
                lastIndividualPixelsIndex: '0',
                lastPixelGroupsIndex: '0',
                lastPixelGroupIndexesIndex: '0',
            });
        });
    });

    describe('Get metadata', async () => {
        it('get name returns correct name for minted token', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;

            const name = 1234;
            const otherInfo = 5678;

            const metadata = Array(2);
            metadata[0] = name;
            metadata[1] = otherInfo;
            expectedName = await contract.mint(
                accounts[1],
                individualPixels,
                pixelGroups,
                pixelGroupIndexes,
                metadata,
                {
                    from: accounts[0],
                }
            );

            const tokenId = 0;

            // when getName
            const returnedName = await contract.getName(tokenId);

            // returns expected name
            assert.equal(returnedName, name);
        });

        it('get number returns correct number for minted token', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            const otherInfo = '0x0004D200162E0000000000000000000000000000000000000000000000010E11';

            const metadata = Array(2);
            metadata[0] = name;
            metadata[1] = otherInfo;
            const expectedNumber = 1234;
            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            // when getNumber
            const returnedNumber = await contract.getNumber(tokenId);

            // returns expected number
            assert.equal(returnedNumber, expectedNumber);
        });

        it('get SeriesId returns correct series id for minted token', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            const otherInfo = '0x0004D200162E0000000000000000000000000000000000000000000000010E11';

            const metadata = Array(2);
            metadata[0] = name;
            metadata[1] = otherInfo;
            const expectedSeriesId = 5678;
            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            // when getSeriesId
            const returnedSeriesId = await contract.getSeriesId(tokenId);

            // returns expected series id
            assert.equal(returnedSeriesId, expectedSeriesId);
        });

        it('get alpha channel returns correct alpha channel for minted token when has alpha', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            const otherInfo = '0x0004D200162E0000000000000000000000000000000000000000000000010E11';

            const metadata = Array(2);
            metadata[0] = name;
            metadata[1] = otherInfo;
            const expectedAlpha = 4321;
            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            // when getAlphaChannel
            const returnedAlpha = await contract.getAlphaChannel(tokenId);

            // returns expected alpha channel
            assert.equal(returnedAlpha, expectedAlpha);
        });

        it('get alpha channel reverts when minted token has no alpha', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            const otherInfo = '0x0004D200162E0000000000000000000000000000000000000000000000010E10';

            const metadata = Array(2);
            metadata[0] = name;
            metadata[1] = otherInfo;
            const expectedAlpha = 4321;
            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            // reverts when getAlphaChannel
            await expectRevert(contract.getAlphaChannel(tokenId), 'Artwork has no alpha');
        });

        it('has alpha channel returns true if alpha channel exists for minted token', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            // last bit represents the alpha channel existing
            const otherInfo = '0x0004D200162E0000000000000000000000000000000000000000000000010E11';

            const metadata = Array(2);
            metadata[0] = name;
            metadata[1] = otherInfo;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            // when getAlphaChannel
            const hasAlpha = await contract.hasAlphaChannel(tokenId);

            // returns true
            assert.isTrue(hasAlpha);
        });

        it('has alpha channel returns false if alpha channel does not exist for minted token', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000';
            // last bit represents the alpha channel existing
            const otherInfo = '0x0004D200162E0000000000000000000000000000000000000000000000010E10';

            const metadata = Array(2);
            metadata[0] = name;
            metadata[1] = otherInfo;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            // when getAlphaChannel
            const hasAlpha = await contract.hasAlphaChannel(tokenId);

            // returns false
            assert.isFalse(hasAlpha);
        });

        it('get artist returns correct artist address for minted token', async () => {
            // Given minted token
            const individualPixelsValue = '0xAABB000064AABB0000C8DDEE00012CFFEE000190CCBB0001F4AAFF0000020000';
            const pixelGroupsValue = '0xAABBCCDDEEFFABCDEFAAAAAABBBBBBCCCCCCDDDDDDEEEEEEFFFFFF1122331234';
            const pixelGroupIndexesValue = '0x00000A00001400001E00002800003200003C00004600005000005A0000640000';

            const individualPixels = Array(1);
            individualPixels[0] = individualPixelsValue;
            const pixelGroups = Array(1);
            pixelGroups[0] = pixelGroupsValue;
            const pixelGroupIndexes = Array(1);
            pixelGroupIndexes[0] = pixelGroupIndexesValue;
            const name = 1234;
            const number = 5678;

            const metadata = Array(2);
            metadata[0] = name;
            metadata[1] = number;

            await contract.mint(accounts[1], individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
                from: accounts[0],
            });

            const tokenId = 0;

            // when getArtist
            const returnedArtist = await contract.getArtist(tokenId);

            // returns expected artist address
            assert.equal(returnedArtist, accounts[1]);
        });
    });
});
