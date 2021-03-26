const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

const MurAllNFTL2 = artifacts.require('./l2/MurAllNFTL2.sol')

contract('MurAllNFTL2', accounts => {
    const mintTestToken = async (fromAddress, tokenId = 0) => {
        // Given minted token

        const metadata = web3.utils.hexToBytes(
            '0x49930065f0061848b051b234fc58bd7a43db72fd07512ebb749eddd1a43a7dae000000000000000000000000' +
                fromAddress.slice(2).toLowerCase() +
                '68656c6c6f20776f726c642100000000000000000000000000000000000000000004d200162e0000000000000000000000000000000000000000000000000001'
        )

        await contract.methods['mint(address,uint256,bytes)'](fromAddress, tokenId, metadata, {
            from: accounts[0]
        })
    }

    let contract

    beforeEach(async () => {
        contract = await MurAllNFTL2.new(accounts[0], [accounts[0]], {
            from: accounts[0]
        })
    })

    describe('Deployment', async () => {
        it('deploys successfully', async () => {
            const address = contract.address
            //console.log(address)

            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })
    })

    describe('Minting', async () => {
        it('minting disallowed from account that is not mintableERC721PredicateProxy', async () => {
            // Given minted token
            const metadata = web3.utils.hexToBytes(
                '0x49930065f0061848b051b234fc58bd7a43db72fd07512ebb749eddd1a43a7dae000000000000000000000000d48ada39d6d93fc6108e008230ead2329a0d1e0768656c6c6f20776f726c642100000000000000000000000000000000000000000004d200162e0000000000000000000000000000000000000000000000000001'
            )
            await expectRevert(
                contract.methods['mint(address,uint256,bytes)'](accounts[0], 0, metadata, {
                    from: accounts[1]
                }),
                'Address is not MintableERC721PredicateProxy'
            )

            assert.isFalse(await contract.exists(0))
        })

        it('mints a new token from mintableERC721PredicateProxy', async () => {
            await mintTestToken(accounts[1])
            const firstTokenId = 0
            const expectedHashOfData = '0x49930065f0061848b051b234fc58bd7a43db72fd07512ebb749eddd1a43a7dae'

            assert.equal(await contract.totalSupply(), 1)
            assert.isTrue(await contract.exists(0))
            assert.equal(await contract.ownerOf(firstTokenId), accounts[1])
            assert.equal(await contract.getArtworkDataHashForId(firstTokenId), expectedHashOfData)
            assert.equal(await contract.getArtist(firstTokenId), accounts[1])
            assert.equal(await contract.getName(firstTokenId), 'hello world!')
            assert.equal(await contract.getNumber(firstTokenId), 1234)
            assert.equal(await contract.getSeriesId(firstTokenId), 5678)
        })

        it('mints test data from burned matic token ', async () => {
            const metadata = web3.utils.hexToBytes(
                '0xa24b273e5a0ddf2d5990220b8f07303fcb0c391fd978750380eca381ea3d7cfa000000000000000000000000448bc77754c4c2bc35c2d69d3ba91ee9705d784b5241574b000000000000000000000000000000000000000000000000000000000000010000010000000000000000000000000000000000000000000000000001'
            )
            const expectedAddress = '0x448BC77754c4c2Bc35c2d69D3bA91Ee9705d784b'
            const firstTokenId = 1

            await contract.methods['mint(address,uint256,bytes)'](expectedAddress, firstTokenId, metadata, {
                from: accounts[0]
            })

            const expectedHashOfData = '0xa24b273e5a0ddf2d5990220b8f07303fcb0c391fd978750380eca381ea3d7cfa'

            assert.equal(await contract.totalSupply(), 1)
            assert.isTrue(await contract.exists(1))
            assert.equal(await contract.ownerOf(firstTokenId), expectedAddress)
            assert.equal(await contract.getArtworkDataHashForId(firstTokenId), expectedHashOfData)
            assert.equal(await contract.getArtist(firstTokenId), expectedAddress)
            assert.equal(await contract.getName(firstTokenId), 'RAWK')
            assert.equal(await contract.getNumber(firstTokenId), 1)
            assert.equal(await contract.getSeriesId(firstTokenId), 1)
        })
    })

    describe('RootChainManager', async () => {
        it('updateMintableERC721PredicateProxy disallowed from account that is not admin', async () => {
            await expectRevert(
                contract.updateMintableERC721PredicateProxy(accounts[1], {
                    from: accounts[1]
                }),
                'Does not have admin role'
            )

            assert.equal(await contract.mintableERC721PredicateProxy(), accounts[0])
        })

        it('updateMintableERC721PredicateProxy reverts when 0 address is attempted to set', async () => {
            await expectRevert(
                contract.updateMintableERC721PredicateProxy(ZERO_ADDRESS, {
                    from: accounts[0]
                }),
                'Bad MintableERC721PredicateProxy address'
            )

            assert.equal(await contract.mintableERC721PredicateProxy(), accounts[0])
        })
        it('updateMintableERC721PredicateProxy allowed from admin address', async () => {
            // Given minted token
            contract.updateMintableERC721PredicateProxy(accounts[1], {
                from: accounts[0]
            })

            assert.equal(await contract.mintableERC721PredicateProxy(), accounts[1])
        })
    })

    describe('Get metadata', async () => {
        it('get name returns correct name for minted token', async () => {
            // Given minted token
            await mintTestToken(accounts[1])
            const name = 'hello world!'
            const tokenId = 0

            // when getName
            const returnedName = await contract.getName(tokenId)

            // returns expected name
            assert.equal(returnedName, name)
        })

        it('get number returns correct number for minted token', async () => {
            // Given minted token
            await mintTestToken(accounts[1])
            const expectedNumber = 1234

            const tokenId = 0

            // when getNumber
            const returnedNumber = await contract.getNumber(tokenId)

            // returns expected number
            assert.equal(returnedNumber, expectedNumber)
        })

        it('get SeriesId returns correct series id for minted token', async () => {
            // Given minted token
            await mintTestToken(accounts[1])
            const expectedSeriesId = 5678

            const tokenId = 0

            // when getSeriesId
            const returnedSeriesId = await contract.getSeriesId(tokenId)

            // returns expected series id
            assert.equal(returnedSeriesId, expectedSeriesId)
        })

        it('has alpha channel returns true if alpha channel exists for minted token', async () => {
            // Given minted token
            await mintTestToken(accounts[1])

            const tokenId = 0

            // when getAlphaChannel
            const hasAlpha = await contract.hasAlphaChannel(tokenId)

            // returns true
            assert.isTrue(hasAlpha)
        })

        it('get artist returns correct artist address for minted token', async () => {
            // Given minted token
            await mintTestToken(accounts[1])
            const expectedArtist = accounts[1]
            const tokenId = 0

            // when getArtist
            const returnedArtist = await contract.getArtist(tokenId)

            // returns expected artist address
            assert.equal(returnedArtist, expectedArtist)
        })
    })

    describe('Uri management', async () => {
        it('setting token uri disallowed from account that is not contract owner', async () => {
            const uri = 'some kind of uri'

            await expectRevert(
                contract.setTokenUriBase(uri, {
                    from: accounts[1]
                }),
                'Does not have admin role'
            )
        })

        it('setting media uri disallowed from account that is not contract owner', async () => {
            const uri = 'some kind of uri'

            await expectRevert(
                contract.setMediaUriBase(uri, {
                    from: accounts[1]
                }),
                'Does not have admin role'
            )
        })

        it('setting view uri disallowed from account that is not contract owner', async () => {
            const uri = 'some kind of uri'

            await expectRevert(
                contract.setViewUriBase(uri, {
                    from: accounts[1]
                }),
                'Does not have admin role'
            )
        })

        it('setting token uri allowed from contract owner', async () => {
            const uri = 'some kind of uri'

            const receipt = await contract.setTokenUriBase(uri, {
                from: accounts[0]
            })

            await mintTestToken(accounts[1])

            assert.equal(await contract.tokenURI(0), uri + '0')
        })

        it('setting media uri allowed from contract owner', async () => {
            const uri = 'some kind of uri'

            const receipt = await contract.setMediaUriBase(uri, {
                from: accounts[0]
            })
            await mintTestToken(accounts[1])

            assert.equal(await contract.mediaURI(0), uri + '0')
        })

        it('setting view uri allowed from contract owner', async () => {
            const uri = 'some kind of uri'

            const receipt = await contract.setViewUriBase(uri, {
                from: accounts[0]
            })

            await mintTestToken(accounts[1])

            assert.equal(await contract.viewURI(0), uri + '0')
        })

        it('once token uri set token uris with ids outside total supply throws error', async () => {
            const uri = 'some kind of uri'

            const receipt = await contract.setTokenUriBase(uri, {
                from: accounts[0]
            })

            await expectRevert(
                contract.tokenURI(0, {
                    from: accounts[0]
                }),
                'ERC721Metadata: URI query for nonexistent token'
            )
        })

        it('once media uri set token uris with ids outside total supply throws error', async () => {
            const uri = 'some kind of uri'

            const receipt = await contract.setMediaUriBase(uri, {
                from: accounts[0]
            })

            await expectRevert(
                contract.mediaURI(0, {
                    from: accounts[0]
                }),
                'Invalid Token ID'
            )
        })

        it('once view uri set token uris with ids outside total supply throws error', async () => {
            const uri = 'some kind of uri'

            const receipt = await contract.setViewUriBase(uri, {
                from: accounts[0]
            })

            await expectRevert(
                contract.viewURI(0, {
                    from: accounts[0]
                }),
                'Invalid Token ID'
            )
        })
    })
})
