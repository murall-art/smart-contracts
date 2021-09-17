const { expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers')

const { ZERO_ADDRESS } = constants
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

const MontageNFTL2 = artifacts.require('./l2/MontageNFTL2.sol')
const RoyaltyGovernor = artifacts.require('./royalties/RoyaltyGovernor.sol')

const MontageMetadataDecoder = artifacts.require('./decoder/MontageMetadataDecoder.sol')
const NftImageDataStorage = artifacts.require('./storage/NftImageDataStorage.sol')

contract('MontageNFT', accounts => {
    const setTokenUriBase = async uriBase => {
        await contract.setTokenUriBase(uriBase, {
            from: accounts[0]
        })
    }
    const mintTestToken = async fromAddress => {
        const encodedAddress = fromAddress.slice(2).toLowerCase()
        const data = `0x000000000000000000000000${encodedAddress}00000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000000117375706572206d6172696f20776f726c64000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005d616e206974616c69616e20706c756d62657220636f6d6d697473206d6173732067656e6f63696465206f66206120776f726c647320696e6861626974616e747320746f20736176652061206b69646e6170706564207072696e6365737300000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000539000000000000000000000000000000000000000000000000000000000000004500000000000000000000000000000000000000000000000000000000000001a40000000000000000000000000000000000000000000000000000000000000010736f6d65206b696e64206f6620757269000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016756e6c6f636b20736f6d652073747566662c20796f2100000000000000000000`

        const metadata = web3.utils.hexToBytes(data)

        await contract.methods['mint(address,uint256,bytes)'](fromAddress, 0, metadata, {
            from: accounts[0]
        })
    }

    let contract

    beforeEach(async () => {
        this.RoyaltyGovernor = await RoyaltyGovernor.new(0, [accounts[0]], {
            from: accounts[0]
        })

        this.MontageMetadataDecoder = await MontageMetadataDecoder.new({
            from: accounts[0]
        })

        this.NftImageDataStorage = await NftImageDataStorage.new({
            from: accounts[0]
        })

        contract = await MontageNFTL2.new(
            accounts[0],
            'MurAll L2 Montage',
            'L2MONTAGE',
            this.MontageMetadataDecoder.address,
            [accounts[0]],
            {
                from: accounts[0]
            }
        )

        await contract.setRoyaltyGovernor(this.RoyaltyGovernor.address, {
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

        it('has a name', async function () {
            assert.equal(await contract.name(), 'MurAll L2 Montage')
        })

        it('has a symbol', async function () {
            assert.equal(await contract.symbol(), 'L2MONTAGE')
        })
    })

    describe('Minting', async () => {
        it('minting disallowed when contract not approved for transfer of NFTs', async () => {
            const name = 'hello world!'
            const description = 'description blah'
            await expectRevert(
                contract.createMontage(name, description, true, [0, 1], {
                    from: accounts[1]
                }),
                'createMontage: only montages from L2 can be minted here'
            )
        })

        it('minting disallowed from account that is not mintableERC721PredicateProxy', async () => {
            // Given minted token
            const encodedAddress = accounts[1].slice(2).toLowerCase()
            const data = `0x000000000000000000000000${encodedAddress}00000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000000117375706572206d6172696f20776f726c64000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005d616e206974616c69616e20706c756d62657220636f6d6d697473206d6173732067656e6f63696465206f66206120776f726c647320696e6861626974616e747320746f20736176652061206b69646e6170706564207072696e6365737300000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000539000000000000000000000000000000000000000000000000000000000000004500000000000000000000000000000000000000000000000000000000000001a40000000000000000000000000000000000000000000000000000000000000010736f6d65206b696e64206f6620757269000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016756e6c6f636b20736f6d652073747566662c20796f2100000000000000000000`

            const metadata = web3.utils.hexToBytes(data)

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
            const creator = accounts[1]
            const name = 'super mario world'
            const description =
                'an italian plumber commits mass genocide of a worlds inhabitants to save a kidnapped princess'
            const canBeUnpacked = true
            const tokenIds = [1337, 69, 420]
            const unlockableContentUri = 'some kind of uri'
            const unlockableContentDescription = 'unlock some stuff, yo!'

            assert.equal(await contract.totalSupply(), 1)
            assert.isTrue(await contract.exists(0))
            assert.equal(await contract.ownerOf(firstTokenId), accounts[1])
            assert.equal(await contract.getCreator(firstTokenId), creator)
            assert.equal(await contract.getName(firstTokenId), name)
            assert.equal(await contract.getDescription(firstTokenId), description)
            assert.equal(await contract.canBeUnpacked(firstTokenId), canBeUnpacked)
            assert.equal(
                await contract.getUnlockableContentUri(firstTokenId, { from: accounts[1] }),
                unlockableContentUri
            )
            assert.equal(await contract.getUnlockableDescription(firstTokenId), unlockableContentDescription)

            const returnedTokenIds = await contract.getTokenIds(firstTokenId)
            assert.equal(returnedTokenIds.length, tokenIds.length)
            assert.isTrue(web3.utils.toBN(returnedTokenIds[0]).eq(web3.utils.toBN(tokenIds[0])))
            assert.isTrue(web3.utils.toBN(returnedTokenIds[1]).eq(web3.utils.toBN(tokenIds[1])))
            assert.isTrue(web3.utils.toBN(returnedTokenIds[2]).eq(web3.utils.toBN(tokenIds[2])))
        })
    })

    describe('unpacking/burning', async () => {
        it('unpacking/burning disallowed from L1', async () => {
            await mintTestToken(accounts[1])

            await expectRevert(
                contract.unpackMontage(0, {
                    from: accounts[0]
                }),
                'Address not token owner'
            )
        })
    })

    describe('Getters', async () => {
        it('getName returns correct name', async () => {
            const firstTokenId = 0
            const name = 'super mario world'

            await mintTestToken(accounts[1])

            assert.equal(await contract.getName(firstTokenId), name)
        })

        it('getDescription returns correct description', async () => {
            const firstTokenId = 0
            const description =
                'an italian plumber commits mass genocide of a worlds inhabitants to save a kidnapped princess'

            await mintTestToken(accounts[1])

            assert.equal(await contract.getDescription(firstTokenId), description)
        })

        it('getCreator returns correct address of creator', async () => {
            const firstTokenId = 0

            await mintTestToken(accounts[1])

            assert.equal(await contract.getCreator(firstTokenId), accounts[1])
        })

        it('getMontageInformation returns all correct information', async () => {
            const firstTokenId = 0
            const creator = accounts[1]
            const name = 'super mario world'
            const description =
                'an italian plumber commits mass genocide of a worlds inhabitants to save a kidnapped princess'
            const canBeUnpacked = true
            const tokenIds = [1337, 69, 420]

            await mintTestToken(accounts[1])

            const montageInformation = await contract.getMontageInformation(firstTokenId)
            assert.equal(montageInformation.creator, creator)
            assert.equal(montageInformation.name, name)
            assert.equal(montageInformation.description, description)
            assert.equal(montageInformation.canBeUnpacked, canBeUnpacked)

            assert.equal(montageInformation.tokenIds.length, tokenIds.length)
            assert.isTrue(web3.utils.toBN(montageInformation.tokenIds[0]).eq(web3.utils.toBN(tokenIds[0])))
            assert.isTrue(web3.utils.toBN(montageInformation.tokenIds[1]).eq(web3.utils.toBN(tokenIds[1])))
            assert.isTrue(web3.utils.toBN(montageInformation.tokenIds[2]).eq(web3.utils.toBN(tokenIds[2])))
        })

        it('canBeUnpacked returns true if can be unpacked', async () => {
            const firstTokenId = 0
            await mintTestToken(accounts[1])

            assert.isTrue(await contract.canBeUnpacked(firstTokenId))
        })

        it('getTokenIds returns token ids in order of input array', async function () {
            const firstTokenId = 0
            const tokenIds = [1337, 69, 420]
            await mintTestToken(accounts[1])

            const returnedTokenIds = await contract.getTokenIds(firstTokenId)
            assert.equal(returnedTokenIds.length, tokenIds.length)
            assert.isTrue(web3.utils.toBN(returnedTokenIds[0]).eq(web3.utils.toBN(tokenIds[0])))
            assert.isTrue(web3.utils.toBN(returnedTokenIds[1]).eq(web3.utils.toBN(tokenIds[1])))
            assert.isTrue(web3.utils.toBN(returnedTokenIds[2]).eq(web3.utils.toBN(tokenIds[2])))
        })

        it('viewURIsInMontage returns json object of token uris', async function () {
            const firstTokenId = 0

            const uriBase = 'https://someurl.com/'

            await setTokenUriBase(uriBase)
            await mintTestToken(accounts[1])

            await expectRevert(
                contract.viewURIsInMontage(firstTokenId),
                'viewURIsInMontage: must be called from L2 contract'
            )
        })
    })

    describe('Unlockable Uri', async () => {
        it('setUnlockableContentUri from address other than creator disallowed', async () => {
            const firstTokenId = 0
            const unlockableContentUri = 'some kind of uri'
            const unlockableContentDescription = 'unlock some stuff, yo!'

            await mintTestToken(accounts[1])

            const uri = 'some kind of uri'
            const description = 'some kind of description'

            await expectRevert(
                contract.setUnlockableContentUri(firstTokenId, uri, description, {
                    from: accounts[0]
                }),
                'Address not token owner'
            )
            assert.equal(
                await contract.getUnlockableContentUri(firstTokenId, {
                    from: accounts[1]
                }),
                unlockableContentUri
            )
            assert.isTrue(await contract.hasUnlockableContentUri(firstTokenId))
        })

        it('setUnlockableContentUri from creator address when creator not owner disallowed', async () => {
            const firstTokenId = 0
            const unlockableContentUri = 'some kind of uri'
            const unlockableContentDescription = 'unlock some stuff, yo!'

            await mintTestToken(accounts[1])

            const uri = 'some kind of uri'
            const description = 'some kind of description'

            await contract.transferFrom(accounts[1], accounts[0], firstTokenId, {
                from: accounts[1]
            })

            await expectRevert(
                contract.setUnlockableContentUri(firstTokenId, uri, description, {
                    from: accounts[1]
                }),
                'Address not token owner'
            )
            assert.equal(
                await contract.getUnlockableContentUri(firstTokenId, {
                    from: accounts[0]
                }),
                unlockableContentUri
            )
            assert.equal(
                await contract.getUnlockableDescription(firstTokenId, {
                    from: accounts[0]
                }),
                unlockableContentDescription
            )
            assert.isTrue(await contract.hasUnlockableContentUri(firstTokenId))
        })

        it('setUnlockableContentUri from creator address when creator owns bundle sets unlockable uri', async () => {
            const firstTokenId = 0
            const name = 'hello world!'
            await mintTestToken(accounts[1])

            const uri = 'some kind of uri'
            const description = 'some kind of description'

            const receipt = await contract.setUnlockableContentUri(firstTokenId, uri, description, {
                from: accounts[1]
            })

            await expectEvent(receipt, 'MontageUnlockableUpdated', {
                tokenId: '0'
            })
            assert.equal(
                await contract.getUnlockableContentUri(firstTokenId, {
                    from: accounts[1]
                }),
                uri
            )
            assert.equal(
                await contract.getUnlockableDescription(firstTokenId, {
                    from: accounts[1]
                }),
                description
            )
            assert.isTrue(await contract.hasUnlockableContentUri(firstTokenId))
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

    describe('Admin functions', async () => {
        it('does not allow setRoyaltyGovernor from non admin address', async () => {
            await expectRevert(
                contract.setRoyaltyGovernor('0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC', {
                    from: accounts[1]
                }),
                'Does not have admin role'
            )
        })

        it('Allows setRoyaltyGovernor from admin address', async () => {
            const newRoyaltyGovernor = await RoyaltyGovernor.new(0, [accounts[0]], {
                from: accounts[0]
            })

            // when setRoyaltyGovernor
            const receipt = await contract.setRoyaltyGovernor(newRoyaltyGovernor.address, {
                from: accounts[0]
            })

            // Then
            await expectEvent(receipt, 'RoyaltyGovernorContractChanged', {
                royaltyGovernor: newRoyaltyGovernor.address
            })
        })

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

        it('does not allow setMetadataDecoder from non admin address', async () => {
            await expectRevert(
                contract.setMetadataDecoder('0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC', {
                    from: accounts[1]
                }),
                'Does not have admin role'
            )
        })

        it('Allows setMetadataDecoder from admin address', async () => {
            const newMetadataDecoder = await MontageMetadataDecoder.new({
                from: accounts[0]
            })

            // when setMetadataEncoder
            const receipt = await contract.setMetadataDecoder(newMetadataDecoder.address, {
                from: accounts[0]
            })

            // Then
            await expectEvent(receipt, 'NewMetadataDecoderSet', {
                metadataDecoder: newMetadataDecoder.address
            })
        })
    })
})
