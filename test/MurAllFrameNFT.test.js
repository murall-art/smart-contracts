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
            assert.equal(await contract.name(), 'MurAll Frame')
        })

        it('has a symbol', async function () {
            assert.equal(await contract.symbol(), 'FRAME')
        })
    })
    describe('Minting', async () => {
        it('public minting disallowed when public minting flag is false', async () => {
            await expectRevert(
                contract.mint({
                    from: randomer
                }),
                'Public minting not enabled'
            )
        })

        it('presale minting disallowed when presale minting flag is false', async () => {
            await expectRevert(
                contract.mintPresale(1, randomer, [], {
                    from: randomer
                }),
                'Presale minting not enabled'
            )
        })

        it('presale minting disallowed when merkle root has not been set', async () => {
            contract.setMintingMode(MINT_MODE_PRESALE, {
                from: owner
            })

            await expectRevert(
                contract.mintPresale(1, randomer, [], {
                    from: randomer,
                    value: web3.utils.toWei('0.15', 'ether')
                }),
                'Merkle root not set'
            )
        })

        it('initial minting disallowed from non-admin account', async () => {
            await expectRevert(
                contract.mintInitial(1, {
                    from: randomer
                }),
                'Does not have admin role'
            )
        })

        it('initial minting with custom traits disallowed from non-admin account', async () => {
            await expectRevert(
                contract.mintCustomInitial([1], {
                    from: randomer
                }),
                'Does not have admin role'
            )
        })

        describe('Initial minting', async () => {
            beforeEach(async () => {
                contract.setMintingMode(MINT_MODE_DEVELOPMENT, {
                    from: owner
                })
            })

            it('mintCustomInitial mints NFT with given traits', async () => {
                assert.equal(await contract.balanceOf(owner), 0)
                const expectedTokenId = 0
                const expectedTokenId2 = 1
                const traits = 1234
                const traits2 = 5678
                const receipt = await contract.mintCustomInitial([traits, traits2], {
                    from: owner
                })

                await expectEvent(receipt, 'FrameMinted', {
                    id: '0',
                    owner: owner
                })
                await expectEvent(receipt, 'FrameMinted', {
                    id: '1',
                    owner: owner
                })
                assert.equal(await contract.balanceOf(owner), 2)
                assert.equal(await contract.ownerOf(expectedTokenId), owner)
                assert.equal(await contract.ownerOf(expectedTokenId2), owner)
                assert.equal(await contract.getTraits(expectedTokenId), traits)
                assert.equal(await contract.getTraits(expectedTokenId2), traits2)
            })

            it('mintInitial mints amount of NFTs specified', async () => {
                assert.equal(await contract.balanceOf(owner), 0)

                const mintAmount = 4

                const receipt = await contract.mintInitial(mintAmount, {
                    from: owner
                })
                assert.equal(await contract.balanceOf(owner), mintAmount)

                for (let tokenId = 0; tokenId < mintAmount; tokenId++) {
                    await expectEvent(receipt, 'FrameMinted', {
                        id: tokenId.toString(),
                        owner: owner
                    })

                    assert.equal(await contract.ownerOf(tokenId), owner)
                }
            })
        })

        describe('Public minting', async () => {
            beforeEach(async () => {
                contract.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })
            })

            it('public minting disallowed when no value passed', async () => {
                await expectRevert(
                    contract.mint({
                        from: randomer
                    }),
                    'Insufficient funds'
                )
            })

            it('public minting disallowed when value passed is less than public minting value', async () => {
                await expectRevert(
                    contract.mint({
                        from: randomer,
                        value: web3.utils.toWei('0.2499999999', 'ether')
                    }),
                    'Insufficient funds'
                )
            })

            it('public minting allowed when value passed is equal to public minting value', async () => {
                assert.equal(await contract.balanceOf(randomer), 0)

                const receipt = await contract.mint({
                    from: randomer,
                    value: web3.utils.toWei('0.25', 'ether')
                })

                await expectEvent(receipt, 'FrameMinted', {
                    id: '0',
                    owner: randomer
                })
                assert.equal(await contract.balanceOf(randomer), 1)
                assert.equal(await contract.ownerOf(0), randomer)
            })
        })

        describe('Presale minting', async () => {
            beforeEach(async () => {
                contract.setMintingMode(MINT_MODE_PRESALE, {
                    from: owner
                })
                contract.setPresaleMintingMerkleRoot(merkleData.merkleRoot, {
                    from: owner
                })
            })

            it('presale minting disallowed when no value is passed', async () => {
                await expectRevert(
                    contract.mintPresale(1, randomer, [], {
                        from: randomer
                    }),
                    'Insufficient funds'
                )
            })

            it('presale minting disallowed when value passed is less than presale minting value', async () => {
                await expectRevert(
                    contract.mintPresale(1, randomer, [], {
                        from: randomer,
                        value: web3.utils.toWei('0.149999999999', 'ether')
                    }),
                    'Insufficient funds'
                )
            })

            it('presale minting disallowed account passed does not match account used for transaction', async () => {
                await expectRevert(
                    contract.mintPresale(1, randomer, [], {
                        from: user,
                        value: web3.utils.toWei('0.15', 'ether')
                    }),
                    'Account is not the presale account'
                )
            })
            it('presale minting disallowed account when proofs do not match', async () => {
                await expectRevert(
                    contract.mintPresale(1, randomer, [], {
                        from: randomer,
                        value: web3.utils.toWei('0.15', 'ether')
                    }),
                    'Invalid proof.'
                )
            })
            // TODO These tests pass when merkle data is correct but the addresses change when launching new ganache cli so need consistent addresses
            // it('presale minting allowed when account passed matches account used for transaction and proofs match', async () => {
            //     const claimData = merkleData.claims[randomer]

            //     assert.equal(await contract.balanceOf(randomer), 0)
            //     const receipt = await contract.mintPresale(claimData.index, randomer, claimData.proof, {
            //         from: randomer,
            //         value: web3.utils.toWei('0.15', 'ether')
            //     })

            //     await expectEvent(receipt, 'FrameMinted', {
            //         id: '0',
            //         owner: randomer
            //     })
            //     assert.equal(await contract.balanceOf(randomer), 1)
            //     assert.equal(await contract.ownerOf(0), randomer)
            // })

            // it('presale minting disallowed after account has already minted', async () => {
            //     const claimData = merkleData.claims[randomer]

            //     await contract.mintPresale(claimData.index, randomer, claimData.proof, {
            //         from: randomer,
            //         value: web3.utils.toWei('0.15', 'ether')
            //     })

            //     await expectRevert(
            //         contract.mintPresale(claimData.index, randomer, claimData.proof, {
            //             from: randomer,
            //             value: web3.utils.toWei('0.15', 'ether')
            //         }),
            //         'Address already minted'
            //     )

            //     assert.equal(await contract.ownerOf(0), randomer)
            //     assert.equal(await contract.balanceOf(randomer), 1)
            // })
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

            await contract.mint({
                from: randomer,
                value: web3.utils.toWei('0.25', 'ether')
            })
            await contract.mint({
                from: user,
                value: web3.utils.toWei('0.25', 'ether')
            })
            frameTokenIdRandomer = 0
            frameTokenIdUser = 1

            await approveERC721Transfer(randomer, contract.address)
            await approveERC1155Transfer(randomer, contract.address)
        })

        describe('Setting frame content', async () => {
            it('setFrameContents erc721 on frame not owned by sender fails', async () => {
                await expectRevert(
                    contract.setFrameContents(frameTokenIdUser, this.mockERC721.address, tokenId, 1, {
                        from: randomer
                    }),
                    'Not token owner'
                )
            })

            it('setFrameContents erc1155 on frame not owned by sender fails', async () => {
                await expectRevert(
                    contract.setFrameContents(frameTokenIdUser, this.mockERC1155.address, tokenId, amount, {
                        from: randomer
                    }),
                    'Not token owner'
                )
            })

            it('setFrameContents on frame that does not exist fails', async () => {
                await expectRevert(
                    contract.setFrameContents(123, this.mockERC1155.address, tokenId, amount, {
                        from: randomer
                    }),
                    'Invalid Token ID'
                )
            })

            it('setFrameContents with non supported contract type fails', async () => {
                await expectRevert.unspecified(
                    contract.setFrameContents(frameTokenIdRandomer, this.mockERC20.address, tokenId, amount, {
                        from: randomer
                    })
                )
            })

            it('setFrameContents with ERC721 NFT sets contents', async () => {
                const receipt = await contract.setFrameContents(
                    frameTokenIdRandomer,
                    this.mockERC721.address,
                    tokenId,
                    1,
                    {
                        from: randomer
                    }
                )
                await expectEvent(receipt, 'FrameContentsUpdated', {
                    id: web3.utils.toBN(frameTokenIdRandomer),
                    contentsContract: this.mockERC721.address,
                    contentsId: web3.utils.toBN(tokenId),
                    amount: web3.utils.toBN(1)
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

            it('setFrameContents with ERC1155 NFT sets contents', async () => {
                const receipt = await contract.setFrameContents(
                    frameTokenIdRandomer,
                    this.mockERC1155.address,
                    tokenId,
                    amount,
                    {
                        from: randomer
                    }
                )
                await expectEvent(receipt, 'FrameContentsUpdated', {
                    id: web3.utils.toBN(frameTokenIdRandomer),
                    contentsContract: this.mockERC1155.address,
                    contentsId: web3.utils.toBN(tokenId),
                    amount: web3.utils.toBN(amount)
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
                await contract.setFrameContents(frameTokenIdRandomer, this.mockERC1155.address, tokenId, amount, {
                    from: randomer
                })

                await contract.mint({
                    from: randomer,
                    value: web3.utils.toWei('0.25', 'ether')
                })

                await contract.setFrameContents(frameTokenIdRandomer2, this.mockERC721.address, tokenId, 1, {
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
                    'Invalid Token ID'
                )
            })

            it('removeFrameContents on frame without contents fails', async () => {
                await expectRevert(
                    contract.removeFrameContents(frameTokenIdUser, {
                        from: user
                    }),
                    'Frame does not contain an NFT'
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

        describe('rescueTokens', async () => {
            beforeEach(async () => {
                fundAccount(randomer, ONE_MILLION_TOKENS)
                this.mockERC20.transfer(contract.address, ONE_MILLION_TOKENS, {
                    from: randomer
                })
            })

            it('rescueTokens disallowed from non admin account', async () => {
                await expectRevert(
                    contract.rescueTokens(this.mockERC20.address, {
                        from: randomer
                    }),
                    'Does not have admin role'
                )
            })

            it('rescueTokens allowed from admin account and transfers tokens to sender', async () => {
                const ownerBalance = await this.mockERC20.balanceOf(owner)
                await contract.rescueTokens(this.mockERC20.address, {
                    from: owner
                })

                const contractBalanceAfter = await this.mockERC20.balanceOf(contract.address)
                const ownerBalanceAfter = await this.mockERC20.balanceOf(owner)

                contractBalanceAfter.should.be.bignumber.equal(new BN('0'))

                ownerBalanceAfter.sub(ownerBalance).should.be.bignumber.equal(ONE_MILLION_TOKENS)
            })
        })

        describe('withdrawFunds', async () => {
            beforeEach(async () => {
                contract.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })

                await contract.mint({
                    from: randomer,
                    value: web3.utils.toWei('0.25', 'ether')
                })
            })

            it('withdrawFunds disallowed from non admin account', async () => {
                await expectRevert(
                    contract.withdrawFunds(user, {
                        from: randomer
                    }),
                    'Does not have admin role'
                )
            })

            it('withdrawFunds allowed from admin account and transfers funds to specified address', async () => {
                const tracker = await balance.tracker(user) // instantiation

                await contract.withdrawFunds(user, {
                    from: owner
                })

                const deltaBalance = await tracker.delta()
                deltaBalance.should.be.bignumber.equal(web3.utils.toWei('0.25', 'ether'))
            })
        })

        describe('setPresaleMintingMerkleRoot', async () => {
            it('setPresaleMintingMerkleRoot disallowed from non admin account', async () => {
                await expectRevert(
                    contract.setPresaleMintingMerkleRoot(merkleData.merkleRoot, {
                        from: randomer
                    }),
                    'Does not have admin role'
                )
            })

            it('setPresaleMintingMerkleRoot allowed from admin account', async () => {
                const receipt = await contract.setPresaleMintingMerkleRoot(merkleData.merkleRoot, {
                    from: owner
                })
                await expectEvent(receipt, 'PresaleMerkleRootSet', {
                    merkleRoot: merkleData.merkleRoot
                })
            })

            it('setPresaleMintingMerkleRoot not allowed to be changed once it has been set', async () => {
                await contract.setPresaleMintingMerkleRoot(merkleData.merkleRoot, {
                    from: owner
                })
                await expectRevert(
                    contract.setPresaleMintingMerkleRoot(
                        '0x63a727f718138b0a08d032346812ae97b7c5dbf4d1a4f1da857c4d7dadff776c',
                        {
                            from: owner
                        }
                    ),
                    'Merkle root already set'
                )
            })
        })

        describe('setMintingMode', async () => {
            it('setMintingMode disallowed from non admin account', async () => {
                await expectRevert(
                    contract.setMintingMode(MINT_MODE_DEVELOPMENT, {
                        from: randomer
                    }),
                    'Does not have admin role'
                )
            })

            it('setMintingMode fails if trying to set unsupported mode', async () => {
                await expectRevert(
                    contract.setMintingMode(4, {
                        from: owner
                    }),
                    'Invalid mode'
                )
            })

            it('setMintingMode to MINT_MODE_PRESALE sets mode successfully', async () => {
                await contract.setMintingMode(MINT_MODE_PRESALE, {
                    from: owner
                })
                assert.equal(await contract.mintMode(), MINT_MODE_PRESALE)
            })

            it('setMintingMode to MINT_MODE_PUBLIC sets mode successfully', async () => {
                await contract.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })
                assert.equal(await contract.mintMode(), MINT_MODE_PUBLIC)
            })

            it('setMintingMode to MINT_MODE_DEVELOPMENT sets mode successfully', async () => {
                await contract.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })
                await contract.setMintingMode(MINT_MODE_DEVELOPMENT, {
                    from: owner
                })
                assert.equal(await contract.mintMode(), MINT_MODE_DEVELOPMENT)
            })
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
