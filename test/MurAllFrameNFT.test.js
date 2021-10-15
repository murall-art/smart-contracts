const { expectEvent, expectRevert, BN, balance } = require('@openzeppelin/test-helpers')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))
const timeMachine = require('ganache-time-traveler')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const MurAllFrame = artifacts.require('./frames/MurAllFrame.sol')
const MockERC721 = artifacts.require('./mock/MockERC721.sol')
const MockERC1155 = artifacts.require('./mock/MockERC1155.sol')
const MockERC20 = artifacts.require('./mock/MockERC20.sol')
const TimeHelper = artifacts.require('./mock/TimeHelper.sol')
require('chai').should()
const { expect } = require('chai')

contract('MurAllFrame', ([owner, user, randomer]) => {
    const to18DP = value => {
        return new BN(value).mul(new BN('10').pow(new BN('18')))
    }
    const ONE_MILLION_TOKENS = to18DP('1000000')
    const SECONDS_IN_1_DAY = 86400 //86400 seconds in a day
    const MINT_MODE_DEVELOPMENT = 0
    const MINT_MODE_PUBLIC = 2
    const MINT_MODE_PRESALE = 1
    const VRF_COORDINATOR_RINKEBY = '0x8C7382F9D8f56b33781fE506E897a4F1e2d17255'
    const LINK_TOKEN_RINKEBY = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB'
    const KEYHASH_RINKEBY = '0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4'
    const FEE_RINKEBY = '100000000000000000' // 0.1 * 10**18 LINK for test chain
    const merkleData = {
        merkleRoot: '0x53a727f718138b0a08d032346812ae97b7c5dbf4d1a4f1da857c4d7dadff776c',
        tokenTotal: '0x03',
        claims: {
            '0x05dC289004121f99cd304Dc81897Ad2d4e534891': {
                index: 0,
                amount: '0x01',
                proof: [
                    '0x786d1d729082a078b96bf9b3b620f90d94b1a2a90cb53f7b40207176602cad26',
                    '0xe1aa9f70c713fd69cbc021cbb0505a48e85e379c5eb310b4ae9b9e5ea2b4209b'
                ]
            },
            '0x75E9a490D61f5eBCfFcB3d72391035d8D3a3AdbE': {
                index: 1,
                amount: '0x01',
                proof: ['0xfa99f9a5da53d341ca5ff589e76f1958fc19b395b09a89f15ed42d46aba41630']
            },
            '0xD48f118342ef5B50eF4Fa963554B552bfbFAE1d2': {
                index: 2,
                amount: '0x01',
                proof: [
                    '0xac99f3534f8c759fa3345208ba6eca73130d96f6754546c898156262d09a34d3',
                    '0xe1aa9f70c713fd69cbc021cbb0505a48e85e379c5eb310b4ae9b9e5ea2b4209b'
                ]
            }
        }
    }
    const approveERC721Transfer = async (fromAddress, toAddress) => {
        await this.mockERC721.setApprovalForAll(toAddress, true, {
            from: fromAddress
        })
    }

    const approveERC1155Transfer = async (fromAddress, toAddress) => {
        await this.mockERC1155.setApprovalForAll(toAddress, true, {
            from: fromAddress
        })
    }

    const mintTestERC721Token = async fromAddress => {
        await this.mockERC721.mintTestTokens(1, {
            from: fromAddress
        })
    }

    const mintTestERC721TokenWithId = async (fromAddress, id = 0) => {
        await this.mockERC721.mintTokenForId(id, {
            from: fromAddress
        })
    }

    const mintTestERC1155Token = async (fromAddress, id = 0, amount = 1) => {
        await this.mockERC1155.mint(fromAddress, id, amount, {
            from: fromAddress
        })
    }

    const obtainTotalGasUsedForTransaction = async receipt => {
        // Obtain gas used
        const gasUsed = receipt.receipt.gasUsed

        // Obtain gasPrice from the transaction
        const tx = await web3.eth.getTransaction(receipt.tx)
        const gasPrice = tx.gasPrice

        // Calculate total gas used at gas price
        return web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasUsed))
    }

    const fundAccount = async (account, amount) => {
        await this.mockERC20.setBalance(account, amount)
    }

    const approveERC20Transfer = async (account, amount) => {
        await this.mockERC20.approve(this.contract.address, amount, {
            from: account
        })
    }

    let contract

    beforeEach(async () => {
        contract = await MurAllFrame.new(
            [owner],
            VRF_COORDINATOR_RINKEBY,
            LINK_TOKEN_RINKEBY,
            KEYHASH_RINKEBY,
            BigInt(FEE_RINKEBY),
            {
                from: owner
            }
        )

        this.mockERC721 = await MockERC721.new('Return of the mock', 'ROTM', {
            from: owner
        })

        this.mockERC1155 = await MockERC1155.new('some uri', {
            from: owner
        })

        this.mockERC20 = await MockERC20.new('The Mocktagon', 'TM', ONE_MILLION_TOKENS, {
            from: owner
        })
        this.TimeHelper = await TimeHelper.new({ from: owner })
    })

    describe('Deployment', async () => {
        it('deploys successfully', async () => {
            const address = contract.address

            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        it('has a name', async function () {
            assert.equal(await contract.name(), 'Frames by MurAll')
        })

        it('has a symbol', async function () {
            assert.equal(await contract.symbol(), 'FRAMES')
        })

        it('has a max supply', async function () {
            assert.equal(await contract.MAX_SUPPLY(), 4444)
        })

        it('has a max number initially mintable by admins', async function () {
            assert.equal(await contract.NUM_INITIAL_MINTABLE(), 436)
        })

        it('has a max number mintable by presale', async function () {
            assert.equal(await contract.NUM_PRESALE_MINTABLE(), 1004)
        })

        it('has presale mint price', async function () {
            const presaleMintPrice = await contract.MINT_PRICE_PRESALE()
            presaleMintPrice.should.be.bignumber.equal(web3.utils.toWei('0.144', 'ether'))
        })

        it('has public mint price', async function () {
            const publicMintPrice = await contract.MINT_PRICE_PUBLIC()
            publicMintPrice.should.be.bignumber.equal(web3.utils.toWei('0.244', 'ether'))
        })
    })

    describe('Frame content management', async () => {
        let tokenId
        let amount
        let frameTokenIdRandomer
        let frameTokenIdUser
        beforeEach(async () => {
            tokenId = 123
            amount = 456
            await mintTestERC1155Token(randomer, tokenId, amount)
            await mintTestERC721TokenWithId(randomer, tokenId)

            await contract.setMintingMode(MINT_MODE_PUBLIC, {
                from: owner
            })

            await contract.mint(1, {
                from: randomer,
                value: web3.utils.toWei('0.244', 'ether')
            })

            await contract.mint(1, {
                from: user,
                value: web3.utils.toWei('0.244', 'ether')
            })

            frameTokenIdRandomer = 0
            frameTokenIdUser = 1

            await approveERC721Transfer(randomer, contract.address)
            await approveERC1155Transfer(randomer, contract.address)
        })

        describe('Setting frame content', async () => {
            it('setFrameContents erc721 on frame not owned by sender fails', async () => {
                await expectRevert(
                    contract.setFrameContents(frameTokenIdUser, this.mockERC721.address, tokenId, 1, false, {
                        from: randomer
                    }),
                    'Not token owner'
                )
            })

            it('setFrameContents erc1155 on frame not owned by sender fails', async () => {
                await expectRevert(
                    contract.setFrameContents(frameTokenIdUser, this.mockERC1155.address, tokenId, amount, false, {
                        from: randomer
                    }),
                    'Not token owner'
                )
            })

            it('setFrameContents on frame that does not exist fails', async () => {
                await expectRevert(
                    contract.setFrameContents(123, this.mockERC1155.address, tokenId, amount, false, {
                        from: randomer
                    }),
                    'ERC721: owner query for nonexistent token'
                )
            })

            it('setFrameContents with non supported contract type fails', async () => {
                await expectRevert.unspecified(
                    contract.setFrameContents(frameTokenIdRandomer, this.mockERC20.address, tokenId, amount, false, {
                        from: randomer
                    })
                )
            })

            it('setFrameContents with mockERC1155 without binding succeeds with correct info', async () => {
                const receipt = await contract.setFrameContents(
                    frameTokenIdRandomer,
                    this.mockERC1155.address,
                    tokenId,
                    1,
                    false,
                    {
                        from: randomer
                    }
                )

                await expectEvent(receipt, 'FrameContentsUpdated', {
                    id: web3.utils.toBN(frameTokenIdRandomer),
                    contentsContract: this.mockERC1155.address,
                    contentsId: web3.utils.toBN(tokenId),
                    amount: web3.utils.toBN(1),
                    bound: false
                })
            })

            it('setFrameContents with ERC721 without binding succeeds with correct info', async () => {
                const receipt = await contract.setFrameContents(
                    frameTokenIdRandomer,
                    this.mockERC721.address,
                    tokenId,
                    1,
                    false,
                    {
                        from: randomer
                    }
                )

                await expectEvent(receipt, 'FrameContentsUpdated', {
                    id: web3.utils.toBN(frameTokenIdRandomer),
                    contentsContract: this.mockERC721.address,
                    contentsId: web3.utils.toBN(tokenId),
                    amount: web3.utils.toBN(1),
                    bound: false
                })
            })

            it('setFrameContents with ERC721 when frame already has contents that is not bound succeeds', async () => {
                await contract.setFrameContents(frameTokenIdRandomer, this.mockERC721.address, tokenId, 1, false, {
                    from: randomer
                })

                await mintTestERC721TokenWithId(randomer, tokenId + 1)

                const receipt = await contract.setFrameContents(
                    frameTokenIdRandomer,
                    this.mockERC721.address,
                    tokenId + 1,
                    1,
                    true,
                    {
                        from: randomer
                    }
                )

                await expectEvent(receipt, 'FrameContentsUpdated', {
                    id: web3.utils.toBN(frameTokenIdRandomer),
                    contentsContract: this.mockERC721.address,
                    contentsId: web3.utils.toBN(tokenId + 1),
                    amount: web3.utils.toBN(1),
                    bound: true
                })
            })

            it('setFrameContents with ERC721 when frame already has contents fails', async () => {
                await contract.setFrameContents(frameTokenIdRandomer, this.mockERC721.address, tokenId, 1, true, {
                    from: randomer
                })

                await mintTestERC721TokenWithId(randomer, tokenId + 1)

                await expectRevert(
                    contract.setFrameContents(frameTokenIdRandomer, this.mockERC721.address, tokenId + 1, 1, true, {
                        from: randomer
                    }),
                    'Frame already contains bound content'
                )
            })

            it('setFrameContents with ERC721 NFT sets contents', async () => {
                const receipt = await contract.setFrameContents(
                    frameTokenIdRandomer,
                    this.mockERC721.address,
                    tokenId,
                    1,
                    true,
                    {
                        from: randomer
                    }
                )
                await expectEvent(receipt, 'FrameContentsUpdated', {
                    id: web3.utils.toBN(frameTokenIdRandomer),
                    contentsContract: this.mockERC721.address,
                    contentsId: web3.utils.toBN(tokenId),
                    amount: web3.utils.toBN(1),
                    bound: true
                })

                assert.equal(await this.mockERC721.ownerOf(tokenId), contract.address)

                assert.isTrue(await contract.hasContentsInFrame(frameTokenIdRandomer))
                const frameContents = await contract.frameContents(frameTokenIdRandomer)

                assert.equal(frameContents.contractAddress, this.mockERC721.address)
                assert.equal(frameContents.tokenId, tokenId)
                assert.equal(frameContents.amount, 1)
            })

            it('sending ERC721 NFT to Frame contract for frame you do not own fails', async () => {
                const data = web3.eth.abi.encodeParameters(
                    ['uint256', 'address'],
                    [frameTokenIdUser, this.mockERC721.address]
                )

                await expectRevert(
                    this.mockERC721.methods['safeTransferFrom(address,address,uint256,bytes)'](
                        randomer,
                        contract.address,
                        tokenId,
                        data,
                        {
                            from: randomer
                        }
                    ),
                    'Owner of target frame does not own the contents'
                )
            })

            it('sending ERC721 NFT to Frame contract for frame that already contains contents fails', async () => {
                await contract.setFrameContents(frameTokenIdRandomer, this.mockERC721.address, tokenId, 1, true, {
                    from: randomer
                })

                await mintTestERC721TokenWithId(randomer, tokenId + 1)

                const data = web3.eth.abi.encodeParameters(
                    ['uint256', 'address'],
                    [frameTokenIdRandomer, this.mockERC721.address]
                )

                await expectRevert(
                    this.mockERC721.methods['safeTransferFrom(address,address,uint256,bytes)'](
                        randomer,
                        contract.address,
                        tokenId + 1,
                        data,
                        {
                            from: randomer
                        }
                    ),
                    'Frame already contains bound content'
                )
                await this.mockERC721.transferFrom(randomer, contract.address, tokenId + 1, {
                    from: randomer
                })
            })

            it('sending ERC721 NFT to Frame contract with correct data sets contents', async () => {
                const data = web3.eth.abi.encodeParameters(
                    ['uint256', 'address'],
                    [frameTokenIdRandomer, this.mockERC721.address]
                )

                await this.mockERC721.methods['safeTransferFrom(address,address,uint256,bytes)'](
                    randomer,
                    contract.address,
                    tokenId,
                    data,
                    {
                        from: randomer
                    }
                )

                assert.isTrue(await contract.hasContentsInFrame(frameTokenIdRandomer))
                const frameContents = await contract.frameContents(frameTokenIdRandomer)

                assert.equal(frameContents.contractAddress, this.mockERC721.address)
                assert.equal(frameContents.tokenId, tokenId)
                assert.equal(frameContents.amount, 1)
            })

            it('sending ERC1155 NFT to Frame contract for frame you do not own fails', async () => {
                const data = web3.eth.abi.encodeParameters(
                    ['uint256', 'address'],
                    [frameTokenIdUser, this.mockERC1155.address]
                )

                await expectRevert(
                    this.mockERC1155.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](
                        randomer,
                        contract.address,
                        tokenId,
                        amount,
                        data,
                        {
                            from: randomer
                        }
                    ),
                    'Owner of target frame does not own the contents'
                )
            })

            it('sending ERC1155 NFT to Frame contract for frame you do not own fails', async () => {
                await contract.setFrameContents(frameTokenIdRandomer, this.mockERC1155.address, tokenId, amount, true, {
                    from: randomer
                })
                await mintTestERC1155Token(randomer, tokenId + 1, amount)

                const data = web3.eth.abi.encodeParameters(
                    ['uint256', 'address'],
                    [frameTokenIdRandomer, this.mockERC1155.address]
                )

                await expectRevert(
                    this.mockERC1155.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](
                        randomer,
                        contract.address,
                        tokenId + 1,
                        amount,
                        data,
                        {
                            from: randomer
                        }
                    ),
                    'Frame already contains bound content'
                )
            })

            it('sending batch ERC1155 NFT to Frame contract fails', async () => {
                const data = web3.eth.abi.encodeParameters(
                    ['uint256', 'address'],
                    [frameTokenIdUser, this.mockERC1155.address]
                )

                await expectRevert.unspecified(
                    this.mockERC1155.methods['safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'](
                        randomer,
                        contract.address,
                        [tokenId],
                        [amount],
                        data,
                        {
                            from: randomer
                        }
                    )
                )
            })

            it('sending ERC1155 NFT to Frame contract with correct data sets contents', async () => {
                const data = web3.eth.abi.encodeParameters(
                    ['uint256', 'address'],
                    [frameTokenIdRandomer, this.mockERC1155.address]
                )

                await this.mockERC1155.methods['safeTransferFrom(address,address,uint256,uint256,bytes)'](
                    randomer,
                    contract.address,
                    tokenId,
                    amount,
                    data,
                    {
                        from: randomer
                    }
                )

                assert.isTrue(await contract.hasContentsInFrame(frameTokenIdRandomer))
                const frameContents = await contract.frameContents(frameTokenIdRandomer)

                assert.equal(frameContents.contractAddress, this.mockERC1155.address)
                assert.equal(frameContents.tokenId, tokenId)
                assert.equal(frameContents.amount, amount)
            })

            it('setFrameContents with ERC1155 NFT when frame already has contents fails', async () => {
                await contract.setFrameContents(frameTokenIdRandomer, this.mockERC1155.address, tokenId, amount, true, {
                    from: randomer
                })
                await mintTestERC1155Token(randomer, tokenId + 1, amount)

                await expectRevert(
                    contract.setFrameContents(frameTokenIdRandomer, this.mockERC1155.address, tokenId, amount, true, {
                        from: randomer
                    }),
                    'Frame already contains bound content'
                )
            })

            it('setFrameContents with ERC1155 NFT sets contents', async () => {
                const receipt = await contract.setFrameContents(
                    frameTokenIdRandomer,
                    this.mockERC1155.address,
                    tokenId,
                    amount,
                    true,
                    {
                        from: randomer
                    }
                )
                await expectEvent(receipt, 'FrameContentsUpdated', {
                    id: web3.utils.toBN(frameTokenIdRandomer),
                    contentsContract: this.mockERC1155.address,
                    contentsId: web3.utils.toBN(tokenId),
                    amount: web3.utils.toBN(amount),
                    bound: true
                })

                assert.equal(await this.mockERC1155.balanceOf(contract.address, tokenId), amount)

                assert.isTrue(await contract.hasContentsInFrame(frameTokenIdRandomer))
                const frameContents = await contract.frameContents(frameTokenIdRandomer)

                assert.equal(frameContents.contractAddress, this.mockERC1155.address)
                assert.equal(frameContents.tokenId, tokenId)
                assert.equal(frameContents.amount, amount)
            })
        })

        describe('Removing frame content', async () => {
            let frameTokenIdRandomer2 = 2
            beforeEach(async () => {
                await contract.setFrameContents(frameTokenIdRandomer, this.mockERC1155.address, tokenId, amount, true, {
                    from: randomer
                })

                await contract.mint(1, {
                    from: randomer,
                    value: web3.utils.toWei('0.25', 'ether')
                })

                await contract.setFrameContents(frameTokenIdRandomer2, this.mockERC721.address, tokenId, 1, true, {
                    from: randomer
                })
            })

            it('removeFrameContents erc721 on frame with contents owned by sender succeeds', async () => {
                const receipt = await contract.removeFrameContents(frameTokenIdRandomer2, {
                    from: randomer
                })
                await expectEvent(receipt, 'FrameContentsRemoved', {
                    id: web3.utils.toBN(frameTokenIdRandomer2)
                })

                assert.equal(await this.mockERC721.ownerOf(tokenId), randomer)

                const frameContents = await contract.frameContents(frameTokenIdRandomer2)

                assert.equal(frameContents.contractAddress, ZERO_ADDRESS)
                assert.equal(frameContents.tokenId, 0)
                assert.equal(frameContents.amount, 0)
            })

            it('removeFrameContents erc1155 on frame with contents owned by sender succeeds', async () => {
                const receipt = await contract.removeFrameContents(frameTokenIdRandomer, {
                    from: randomer
                })
                await expectEvent(receipt, 'FrameContentsRemoved', {
                    id: web3.utils.toBN(frameTokenIdRandomer)
                })

                assert.equal(await this.mockERC1155.balanceOf(randomer, tokenId), amount)
                const frameContents = await contract.frameContents(frameTokenIdRandomer)

                assert.equal(frameContents.contractAddress, ZERO_ADDRESS)
                assert.equal(frameContents.tokenId, 0)
                assert.equal(frameContents.amount, 0)
            })

            it('removeFrameContents on frame not owned by sender fails', async () => {
                await expectRevert(
                    contract.removeFrameContents(frameTokenIdUser, {
                        from: randomer
                    }),
                    'Not token owner'
                )
            })

            it('removeFrameContents on frame that doesnt exist fails', async () => {
                await expectRevert(
                    contract.removeFrameContents(123, {
                        from: randomer
                    }),
                    'ERC721: owner query for nonexistent token'
                )
            })

            it('removeFrameContents on frame without contents fails', async () => {
                await expectRevert(
                    contract.removeFrameContents(frameTokenIdUser, {
                        from: user
                    }),
                    'Frame does not contain any content'
                )
            })
        })
    })

    describe('Admin functions', async () => {
        it('requestTraitSeed disallowed from non admin account', async () => {
            await expectRevert(
                contract.requestTraitSeed({
                    from: randomer
                }),
                'Does not have admin role'
            )
        })

        it('setRoyaltyGovernor disallowed from non admin account', async () => {
            await expectRevert(
                contract.setRoyaltyGovernor(ZERO_ADDRESS, {
                    from: randomer
                }),
                'Does not have admin role'
            )
        })

        it('setFrameTraitImageStorage disallowed from non admin account', async () => {
            await expectRevert(
                contract.setFrameTraitImageStorage(ZERO_ADDRESS, {
                    from: randomer
                }),
                'Does not have admin role'
            )
        })

        describe('setTokenUriBase', async () => {
            it('setTokenUriBase disallowed from non admin account', async () => {
                await expectRevert(
                    contract.setTokenUriBase('some url', {
                        from: randomer
                    }),
                    'Does not have admin role'
                )
            })

            it('setTokenUriBase from admin account sets base uri', async () => {
                const uri = 'some url'
                await contract.setTokenUriBase(uri, {
                    from: owner
                })

                assert.equal(await contract.baseURI(), uri)

                await contract.mintInitial(1, {
                    from: owner
                })
                assert.equal(await contract.tokenURI(0), uri + '0')
            })
        })
    })
})
