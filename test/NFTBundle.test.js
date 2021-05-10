const { expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = constants
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

const MurAllNFT = artifacts.require('./mock/MockMurAllNFT.sol')
const NFTBundle = artifacts.require('./bundle/NFTBundle.sol')
const NftImageDataStorage = artifacts.require('./storage/NftImageDataStorage.sol')

contract('NFTBundle', accounts => {
    const mintTestTokensOfSize = async (size, address) => {
        await this.MurAllNFT.mintTestTokens(size, {
            from: address
        })

        const array = [...Array(parseInt(size)).keys()]

        return array
    }
    const createBundleOfSize = async (
        size,
        name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'
    ) => {
        const array = await mintTestTokensOfSize(size, accounts[1])

        await approveMurAllNftForContract(accounts[1])

        await contract.bundleNfts(
            name,
            array,

            {
                from: accounts[1]
            }
        )
    }

    const approveMurAllNftForContract = async fromAddress => {
        await this.MurAllNFT.setApprovalForAll(contract.address, true, {
            from: fromAddress
        })
    }

    const setTokenUriBase = async uriBase => {
        await this.MurAllNFT.setTokenUriBase(uriBase, {
            from: accounts[0]
        })
    }
    const mintTestToken = async fromAddress => {
        await this.MurAllNFT.mintTestTokens(1, {
            from: fromAddress
        })
    }

    let contract

    beforeEach(async () => {
        this.NftImageDataStorage = await NftImageDataStorage.new({
            from: accounts[0]
        })

        this.MurAllNFT = await MurAllNFT.new(
            [accounts[0]],
            this.NftImageDataStorage.address,

            { from: accounts[0] }
        )

        await this.NftImageDataStorage.transferOwnership(this.MurAllNFT.address)

        contract = await NFTBundle.new('MurAll Bundle', 'BMURALL', this.MurAllNFT.address, [accounts[0]], {
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
            assert.equal(await contract.name(), 'MurAll Bundle')
        })

        it('has a symbol', async function () {
            assert.equal(await contract.symbol(), 'BMURALL')
        })
    })

    describe('Bundling/Minting', async () => {
        it('bundling/minting disallowed when contract not approved for transfer of NFTs', async () => {
            await mintTestToken(accounts[0])
            await mintTestToken(accounts[2])
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'

            await expectRevert(
                contract.bundleNfts(name, [0, 1], {
                    from: accounts[1]
                }),
                'ERC721: transfer caller is not owner nor approved.'
            )
        })

        it('bundling/minting disallowed when account does not own NFTs', async () => {
            await mintTestToken(accounts[0])
            await mintTestToken(accounts[2])
            await approveMurAllNftForContract(accounts[0])
            await approveMurAllNftForContract(accounts[2])
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'

            await expectRevert(
                contract.bundleNfts(name, [0, 1], {
                    from: accounts[1]
                }),
                'ERC721: transfer of token that is not own.'
            )
        })

        it('bundling/minting disallowed when tokenIds list is too large', async () => {
            await mintTestToken(accounts[0])

            await approveMurAllNftForContract(accounts[0])

            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'
            const longArray = new Array(51).fill(0)
            await expectRevert(
                contract.bundleNfts(name, longArray, {
                    from: accounts[1]
                }),
                'bundle size exceeds limit'
            )
        })

        it('bundling/minting disallowed when tokenIds list is zero', async () => {
            await mintTestToken(accounts[0])

            await approveMurAllNftForContract(accounts[0])

            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'

            await expectRevert(
                contract.bundleNfts(name, [], {
                    from: accounts[0]
                }),
                'bundle size exceeds limit'
            )
        })

        it('bundling/minting creates a new token from token owner when tokenId list is at the upper limit', async () => {
            const array = await mintTestTokensOfSize(50, accounts[1])

            await approveMurAllNftForContract(accounts[1])
            const firstTokenId = 0
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'
            const receipt = await contract.bundleNfts(name, array, {
                from: accounts[1]
            })

            // TODO Openzeppelin test helpers currently can't assert arrays of BigNumber https://github.com/OpenZeppelin/openzeppelin-test-helpers/issues/1
            await expectEvent(receipt, 'BundleCreated', {
                creator: accounts[1],
                bundleTokenId: '0'
                //tokenIds: [web3.utils.toBN(0), web3.utils.toBN(1)]
            })
            assert.equal(await contract.totalSupply(), 1)

            assert.equal(await contract.ownerOf(firstTokenId), accounts[1])
            assert.equal(await contract.getBundleName(firstTokenId), 'hello world!')
        })

        it('bundling/minting creates a new token from token owner and transfers nfts to bundle contract', async () => {
            await mintTestToken(accounts[1])
            await mintTestToken(accounts[1])
            await approveMurAllNftForContract(accounts[1])
            const firstTokenId = 0
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'
            const receipt = await contract.bundleNfts(name, [0, 1], {
                from: accounts[1]
            })

            // TODO Openzeppelin test helpers currently can't assert arrays of BigNumber https://github.com/OpenZeppelin/openzeppelin-test-helpers/issues/1
            await expectEvent(receipt, 'BundleCreated', {
                creator: accounts[1],
                bundleTokenId: '0'
                //tokenIds: [web3.utils.toBN(0), web3.utils.toBN(1)]
            })
            assert.equal(await contract.totalSupply(), 1)
            assert.equal(await this.MurAllNFT.ownerOf(0), contract.address)
            assert.equal(await this.MurAllNFT.ownerOf(1), contract.address)
            assert.equal(await contract.ownerOf(firstTokenId), accounts[1])
            assert.equal(await contract.getBundleName(firstTokenId), 'hello world!')
            assert.equal(
                await contract.getUnlockableContentUri(firstTokenId, {
                    from: accounts[1]
                }),
                ''
            )
            const ids = await contract.getBundleTokenIds(firstTokenId)
            assert.isTrue(web3.utils.toBN(ids[0]).eq(web3.utils.toBN(0)))
            assert.isTrue(web3.utils.toBN(ids[1]).eq(web3.utils.toBN(1)))
        })
    })

    describe('Unbundling/burning', async () => {
        it('unbundling/burning disallowed when address not NFT owner', async () => {
            await createBundleOfSize(2)

            await expectRevert(
                contract.unbundleNfts(0, {
                    from: accounts[0]
                }),
                'Address not token owner'
            )
        })

        it('unbundling/burning burns the token and transfers bundled nfts to token owner', async () => {
            await createBundleOfSize(2)

            const receipt = await contract.unbundleNfts(0, {
                from: accounts[1]
            })

            await expectEvent(receipt, 'BundleUnpacked', {
                bundleTokenId: '0'
            })
            assert.equal(await contract.totalSupply(), 0)
            assert.equal(await this.MurAllNFT.ownerOf(0), accounts[1])
            assert.equal(await this.MurAllNFT.ownerOf(1), accounts[1])

            assert.isFalse(await contract.exists(0))
        })

        it('unbundling/burning does not affect other bundles with later ids', async () => {
            const array = await mintTestTokensOfSize(10, accounts[1])

            await approveMurAllNftForContract(accounts[1])
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'

            await contract.bundleNfts(
                name,
                [0, 1, 2, 3],

                {
                    from: accounts[1]
                }
            )

            await contract.bundleNfts(
                name,
                [4, 5, 6, 7],

                {
                    from: accounts[1]
                }
            )

            const receipt = await contract.unbundleNfts(0, {
                from: accounts[1]
            })

            await expectEvent(receipt, 'BundleUnpacked', {
                bundleTokenId: '0'
            })
            assert.equal(await contract.totalSupply(), 1)
            assert.equal(await this.MurAllNFT.ownerOf(0), accounts[1])
            assert.equal(await this.MurAllNFT.ownerOf(1), accounts[1])
            assert.equal(await this.MurAllNFT.ownerOf(2), accounts[1])
            assert.equal(await this.MurAllNFT.ownerOf(3), accounts[1])

            assert.equal(await this.MurAllNFT.ownerOf(4), contract.address)
            assert.equal(await this.MurAllNFT.ownerOf(5), contract.address)
            assert.equal(await this.MurAllNFT.ownerOf(6), contract.address)
            assert.equal(await this.MurAllNFT.ownerOf(7), contract.address)

            assert.isFalse(await contract.exists(0))
            assert.isTrue(await contract.exists(1))
        })
    })

    describe('Getters', async () => {
        it('getBundleName returns correct name', async () => {
            const firstTokenId = 0
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'

            await createBundleOfSize(2, name)

            assert.equal(await contract.getBundleName(firstTokenId), 'hello world!')
        })
        it('getBundleTokenIds returns token ids in order of input array', async function () {
            const firstTokenId = 0

            await createBundleOfSize(2)

            const ids = await contract.getBundleTokenIds(firstTokenId)
            assert.isTrue(web3.utils.toBN(ids[0]).eq(web3.utils.toBN(0)))
            assert.isTrue(web3.utils.toBN(ids[1]).eq(web3.utils.toBN(1)))
        })

        it('viewURIsInBundle returns json object of token uris', async function () {
            const firstTokenId = 0

            const uriBase = 'https://someurl.com/'
            const expectedJson = `{\n  "uris": [\n"https://someurl.com/0", "https://someurl.com/1"\n  ]\n}`
            await setTokenUriBase(uriBase)
            await createBundleOfSize(2)

            const actualJson = await contract.viewURIsInBundle(firstTokenId)

            assert.equal(actualJson, expectedJson)
        })
    })

    describe('Unlockable Uri', async () => {
        it('setUnlockableContentUri from address other than creator disallowed', async () => {
            const firstTokenId = 0
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'

            await createBundleOfSize(2, name)

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
                ''
            )
            assert.isFalse(await contract.hasUnlockableContentUri(firstTokenId))
        })

        it('setUnlockableContentUri from creator address when creator not owner disallowed', async () => {
            const firstTokenId = 0
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'

            await createBundleOfSize(2, name)

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
                ''
            )
            assert.equal(
                await contract.getUnlockableDescription(firstTokenId, {
                    from: accounts[0]
                }),
                ''
            )
            assert.isFalse(await contract.hasUnlockableContentUri(firstTokenId))
        })

        it('setUnlockableContentUri from creator address when creator owns bundle sets unlockable uri', async () => {
            const firstTokenId = 0
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'

            await createBundleOfSize(2, name)

            const uri = 'some kind of uri'
            const description = 'some kind of description'

            const receipt = await contract.setUnlockableContentUri(firstTokenId, uri, description, {
                from: accounts[1]
            })

            await expectEvent(receipt, 'BundleUnlockableUpdated', {
                bundleTokenId: '0'
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

            await createBundleOfSize(2)

            assert.equal(await contract.tokenURI(0), uri + '0')
        })

        it('setting media uri allowed from contract owner', async () => {
            const uri = 'some kind of uri'

            const receipt = await contract.setMediaUriBase(uri, {
                from: accounts[0]
            })
            await createBundleOfSize(2)

            assert.equal(await contract.mediaURI(0), uri + '0')
        })

        it('setting view uri allowed from contract owner', async () => {
            const uri = 'some kind of uri'

            const receipt = await contract.setViewUriBase(uri, {
                from: accounts[0]
            })

            await createBundleOfSize(2)

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
