const { expectEvent, expectRevert, BN, balance } = require('@openzeppelin/test-helpers')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))
const timeMachine = require('ganache-time-traveler')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const MurAllFrame = artifacts.require('./frames/MurAllFrame.sol')
const TestMurAllFrame = artifacts.require('./frames/TestMurAllFrame.sol')
const MockERC721 = artifacts.require('./mock/MockERC721.sol')
const MockERC1155 = artifacts.require('./mock/MockERC1155.sol')
const MockERC20 = artifacts.require('./mock/MockERC20.sol')
const TimeHelper = artifacts.require('./mock/TimeHelper.sol')
const MintManager = artifacts.require('./distribution/MintManager.sol')

require('chai').should()
const { expect } = require('chai')

contract('MurAllFrame', ([owner, user, randomer]) => {
    const to18DP = value => {
        return new BN(value).mul(new BN('10').pow(new BN('18')))
    }
    const toBN = value => {
        return new BN(value)
    }
    const ONE_MILLION_TOKENS = to18DP('1000000')
    const SECONDS_IN_1_DAY = 86400 //86400 seconds in a day

    const MAX_SUPPLY = 4444
    const INITIAL_MINTABLE = 436
    const NUM_PRESALE_MINTABLE = 1004
    const PRESALE_MINT_PRICE = web3.utils.toWei('0.144', 'ether')
    const PUBLIC_MINT_PRICE = web3.utils.toWei('0.244', 'ether')

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
        this.mintManager = await MintManager.new(
            [owner],
            INITIAL_MINTABLE,
            NUM_PRESALE_MINTABLE,
            PRESALE_MINT_PRICE,
            PUBLIC_MINT_PRICE,
            { from: owner }
        )

        contract = await MurAllFrame.new(
            [owner],
            this.mintManager.address,
            VRF_COORDINATOR_RINKEBY,
            LINK_TOKEN_RINKEBY,
            KEYHASH_RINKEBY,
            BigInt(FEE_RINKEBY),
            {
                from: owner
            }
        )
        this.mintManager.setToken(contract.address, { from: owner })

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

        it('sets admin role correctly', async function () {
            assert.isTrue(await contract.hasRole(web3.utils.sha3('ADMIN_ROLE'), owner))
        })
    })

    describe('Minting', async () => {
        it('public minting disallowed when public minting flag is false', async () => {
            await expectRevert(
                contract.mint(1, {
                    from: randomer
                }),
                'Public minting not enabled'
            )
        })

        it('presale minting disallowed when presale minting flag is false', async () => {
            await expectRevert(
                contract.mintPresale(1, 1, [], 1, {
                    from: randomer
                }),
                'Presale minting not enabled'
            )
        })

        it('presale minting disallowed when merkle root has not been set', async () => {
            this.mintManager.setMintingMode(MINT_MODE_PRESALE, {
                from: owner
            })

            await expectRevert(
                contract.mintPresale(1, 1, [], 1, {
                    from: randomer,
                    value: PRESALE_MINT_PRICE
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

        describe('Initial minting', async () => {
            beforeEach(async () => {
                this.mintManager.setMintingMode(MINT_MODE_DEVELOPMENT, {
                    from: owner
                })
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
                this.mintManager.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })
            })

            it('public minting disallowed when no value passed', async () => {
                await expectRevert(
                    contract.mint(1, {
                        from: randomer
                    }),
                    'Insufficient funds'
                )
            })

            it('public minting disallowed when value passed is less than public minting value', async () => {
                await expectRevert(
                    contract.mint(1, {
                        from: randomer,
                        value: web3.utils.toWei('0.2399999999', 'ether')
                    }),
                    'Insufficient funds'
                )
            })

            it('public minting disallowed when attempting to mint more than 4 in a transaction', async () => {
                await expectRevert(
                    contract.mint(5, {
                        from: randomer,
                        value: web3.utils.toWei('1.25', 'ether')
                    }),
                    'Amount exceeds allowance per tx'
                )
            })

            it('public minting allowed when value passed is equal to public minting value', async () => {
                assert.equal(await contract.balanceOf(randomer), 0)

                const receipt = await contract.mint(1, {
                    from: randomer,
                    value: PUBLIC_MINT_PRICE
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
                this.mintManager.setMintingMode(MINT_MODE_PRESALE, {
                    from: owner
                })
                this.mintManager.setPresaleMintingMerkleRoot(merkleData.merkleRoot, {
                    from: owner
                })
            })

            it('presale minting disallowed when no value is passed', async () => {
                await expectRevert(
                    contract.mintPresale(1, 1, [], 1, {
                        from: randomer
                    }),
                    'Insufficient funds'
                )
            })

            it('presale minting disallowed when value passed is less than presale minting value', async () => {
                await expectRevert(
                    contract.mintPresale(1, 1, [], 1, {
                        from: randomer,
                        value: web3.utils.toWei('0.139999999999', 'ether')
                    }),
                    'Insufficient funds'
                )
            })

            it('presale minting disallowed account when proofs do not match', async () => {
                await expectRevert(
                    contract.mintPresale(1, 1, [], 1, {
                        from: randomer,
                        value: PRESALE_MINT_PRICE
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
            //         value: PRESALE_MINT_PRICE
            //     })

            //     await expectEvent(receipt, 'Minted', {
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
            //         value: PRESALE_MINT_PRICE
            //     })

            //     await expectRevert(
            //         contract.mintPresale(claimData.index, randomer, claimData.proof, {
            //             from: randomer,
            //             value: PRESALE_MINT_PRICE
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

            await this.mintManager.setMintingMode(MINT_MODE_PUBLIC, {
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
                    value: PUBLIC_MINT_PRICE
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
    describe('VRF tests', async () => {
        let randomness = 4321
        let randomnessId = '0x0000000000000000000000000000000000000000000000000000000000000001'
        beforeEach(async () => {
            contract = await TestMurAllFrame.new(
                [owner],
                this.mintManager.address,
                VRF_COORDINATOR_RINKEBY,
                LINK_TOKEN_RINKEBY,
                KEYHASH_RINKEBY,
                BigInt(FEE_RINKEBY),
                {
                    from: owner
                }
            )

            await contract.testFulfillRandomness(randomnessId, randomness, { from: owner })
        })

        it('setCustomTraits disallowed when token ids array shorter than new traits length', async () => {
            await expectRevert(
                contract.setCustomTraits([1, 2, 3, 4], [0, 1, 2], {
                    from: owner
                }),
                'Trait hash and indexes length mismatch'
            )
        })

        it('setCustomTraits disallowed when token ids array longer than new traits length', async () => {
            await expectRevert(
                contract.setCustomTraits([1, 2], [0, 1, 2], {
                    from: owner
                }),
                'Trait hash and indexes length mismatch'
            )
        })

        it('setCustomTraits from admin account sets traits randomising from trait seed', async () => {
            const expectedId = 2818
            await contract.mintId(owner, expectedId, { from: owner })
            let traits = await contract.getTraits(expectedId, {
                from: owner
            })

            const newTrait = toBN(1)
            const receipt = await contract.setCustomTraits([newTrait], [expectedId], {
                from: owner
            })

            traits = await contract.getTraits(expectedId, {
                from: owner
            })
            expect(traits).to.be.bignumber.equal(newTrait)
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

        it('setFrameTraitManager disallowed from non admin account', async () => {
            await expectRevert(
                contract.setFrameTraitManager(ZERO_ADDRESS, {
                    from: randomer
                }),
                'Does not have admin role'
            )
        })

        it('setCustomTraits disallowed from non admin account', async () => {
            await expectRevert(
                contract.setCustomTraits([1, 2, 3, 4], [0, 0, 0, 0], {
                    from: randomer
                }),
                'Does not have admin role'
            )
        })

        it('setCustomTraits disallowed when trait seed not set', async () => {
            await expectRevert(
                contract.setCustomTraits([1, 2, 3, 4], [0, 0, 0, 0], {
                    from: owner
                }),
                'Trait seed not set yet'
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
                this.mintManager.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })

                await contract.mint(1, {
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
        describe('setContractUri', async () => {
            it('setContractUri disallowed from non admin account', async () => {
                await expectRevert(
                    contract.setContractUri('some url', {
                        from: randomer
                    }),
                    'Does not have admin role'
                )
            })

            it('setContractUri from admin account sets base uri', async () => {
                const uri = 'some url'
                await contract.setContractUri(uri, {
                    from: owner
                })

                assert.equal(await contract.contractURI(), uri)
            })
        })
    })
})
