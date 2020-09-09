const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

const MurAllMarketplace = artifacts.require('./MurAllMarketplace.sol');
const MurAllBlockList = artifacts.require('./MurAllBlockList.sol');
const MurAllNFT = artifacts.require('./MurAllNFT.sol');
const PaintToken = artifacts.require('./PaintToken.sol');

contract('MurAllMarketplace', ([owner, user]) => {
    const approveTransfer = async (fromAddress, toAddress) => {
        await this.murAllNFT.setApprovalForAll(toAddress, true, { from: fromAddress });
    };

    const mintTestToken = async (fromAddress) => {
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
        const metadata = Array(2);
        metadata[0] = 1234;
        metadata[1] = 5678;

        await this.murAllNFT.mint(fromAddress, individualPixels, pixelGroups, pixelGroupIndexes, metadata, {
            from: owner,
        });
    };

    const obtainTotalGasUsedForTransaction = async (receipt) => {
        // Obtain gas used
        const gasUsed = receipt.receipt.gasUsed;

        // Obtain gasPrice from the transaction
        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;

        // Calculate total gas used at gas price
        return web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasUsed));
    };

    beforeEach(async () => {
        this.murAllBlockList = await MurAllBlockList.new({ from: owner });
        this.contract = await MurAllMarketplace.new(this.murAllBlockList.address, { from: owner });
        this.paintToken = await PaintToken.new({ from: owner });
        this.murAllNFT = await MurAllNFT.new({ from: owner });
        // await this.murAllBlockList.transferOwnership(this.contract.address, { from: owner });
    });

    describe('Deployment', async () => {
        it('deploys successfully', async () => {
            const address = this.contract.address;

            assert.notEqual(address, '');
            assert.notEqual(address, 0x0);
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });

        it('has block list contract', async () => {
            const murAllBlockListContract = await this.contract.murAllBlockList();

            assert.notEqual(murAllBlockListContract, '');
            assert.notEqual(murAllBlockListContract, 0x0);
            assert.notEqual(murAllBlockListContract, null);
            assert.notEqual(murAllBlockListContract, undefined);
        });
    });

    describe('Listing', async () => {
        it('lists successfully once approved', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            const receipt = await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            await expectEvent(receipt, 'ItemListed', {
                tokenId: web3.utils.toBN(tokenId),
                contractAddress: this.murAllNFT.address,
                price: web3.utils.toBN(priceInEth),
                saleId: web3.utils.soliditySha3(tokenId, this.murAllNFT.address),
                marketplaceFee: web3.utils.toBN(370368),
            });

            assert.isTrue(
                await this.contract.itemIsForSale(web3.utils.soliditySha3(tokenId, this.murAllNFT.address), {
                    from: owner,
                }),
                'item is should be on sale'
            );
            assert.isTrue(
                await this.contract.itemIsForSale(tokenId, this.murAllNFT.address, { from: owner }),
                'item is should be on sale'
            );
            assert.equal(await this.contract.totalSaleItems(), 1);
            assert.equal(await this.murAllNFT.ownerOf(tokenId), this.contract.address);

            const saleItems = await this.contract.getItemsForSaleBySellerAddress(user);
            assert.equal(saleItems.length, 1);
            assert.equal(saleItems[0], web3.utils.soliditySha3(tokenId, this.murAllNFT.address));

            const saleItemsByContract = await this.contract.getItemsForSaleByContractAddress(this.murAllNFT.address);
            assert.equal(saleItemsByContract.length, 1);
            assert.equal(saleItemsByContract[0], web3.utils.soliditySha3(tokenId, this.murAllNFT.address));
        });

        it('prevents listing items already on sale', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            await expectRevert(
                this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                    from: user,
                }),
                'Item is already on sale'
            );
        });

        it('prevents listing items from non-ERC721 contracts', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await expectRevert(
                this.contract.listErc721ForSale(tokenId, this.paintToken.address, priceInEth, {
                    from: user,
                }),
                'Contract is not ERC721'
            );
        });

        it('prevents blocked items from being listed', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await this.murAllBlockList.addTokenToBlockList(tokenId, this.murAllNFT.address, { from: owner });

            await expectRevert(
                this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                    from: user,
                }),
                'The token is blocked'
            );
        });

        it('prevents items from blocked contracts being listed', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await this.murAllBlockList.addContractToBlockList(this.murAllNFT.address, { from: owner });

            await expectRevert(
                this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                    from: user,
                }),
                'The contract is blocked'
            );
        });
    });

    describe('Changing price', async () => {
        it('changes successfully to new price from sale item owner', async () => {
            const tokenId = 0;
            const oldPriceInEth = 12345678;
            const newPriceInEth = 45678910;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, oldPriceInEth, {
                from: user,
            });

            const receipt = await this.contract.changeListingPrice(
                web3.utils.soliditySha3(tokenId, this.murAllNFT.address),
                newPriceInEth,
                {
                    from: user,
                }
            );

            await expectEvent(receipt, 'ItemPriceUpdated', {
                saleId: web3.utils.soliditySha3(tokenId, this.murAllNFT.address),
                oldPrice: web3.utils.toBN(oldPriceInEth),
                newPrice: web3.utils.toBN(newPriceInEth),
                marketplaceFee: web3.utils.toBN(1370367),
            });
        });

        it('prevents changes from non sale item owner', async () => {
            const tokenId = 0;
            const oldPriceInEth = 12345678;
            const newPriceInEth = 45678910;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);
            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, oldPriceInEth, {
                from: user,
            });

            await expectRevert(
                this.contract.changeListingPrice(
                    web3.utils.soliditySha3(tokenId, this.murAllNFT.address),
                    newPriceInEth,
                    {
                        from: owner,
                    }
                ),
                'You do not own the listing'
            );
        });
    });

    describe('Cancellation', async () => {
        it('withdraw sale listing successful for sale item owner', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            const receipt = await this.contract.withdrawSaleListing(saleItemId, {
                from: user,
            });

            await expectEvent(receipt, 'ItemUnlisted', {
                tokenId: web3.utils.toBN(tokenId),
                contractAddress: this.murAllNFT.address,
                saleId: web3.utils.soliditySha3(tokenId, this.murAllNFT.address),
            });

            assert.equal(await this.murAllNFT.ownerOf(tokenId), user);
            assert.equal(await this.contract.totalSaleItems(), 0);
            const saleItems = await this.contract.getItemsForSaleBySellerAddress(user);
            assert.equal(saleItems.length, 0);
            assert.equal(await this.contract.totalSaleItemsForContractAddress(this.murAllNFT.address), 0);
        });

        it('withdraw sale listing reverts if not sale item owner', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await expectRevert(
                this.contract.withdrawSaleListing(saleItemId, {
                    from: owner,
                }),
                'You do not own the listing'
            );

            assert.equal(await this.murAllNFT.ownerOf(tokenId), this.contract.address);
            assert.equal(await this.contract.totalSaleItems(), 1);
        });

        it('withdraw sale listing reverts if sale item id does not exist', async () => {
            const tokenId = 0;
            const tokenIdWrong = 3;
            const priceInEth = 12345678;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenIdWrong, this.murAllNFT.address);

            await expectRevert(
                this.contract.withdrawSaleListing(saleItemId, {
                    from: user,
                }),
                'Sale id does not match any listing'
            );

            assert.equal(await this.murAllNFT.ownerOf(tokenId), this.contract.address);
            assert.equal(await this.contract.totalSaleItems(), 1);
        });
    });

    describe('Seller account management', async () => {
        it('withdrawSellerBalance transfers seller balance to seller address', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await this.contract.purchaseSaleItem(saleItemId, {
                from: owner,
                value: web3.utils.toBN(priceInEth).add(web3.utils.toBN(fee)),
            });

            const oldBalance = await web3.eth.getBalance(user);

            const receipt = await this.contract.withdrawSellerBalance({
                from: user,
            });

            const totalGasUsed = await obtainTotalGasUsedForTransaction(receipt);
            const expectedWithdrawBalance = web3.utils
                .toBN(oldBalance)
                .add(web3.utils.toBN(priceInEth))
                .sub(totalGasUsed);

            const newBalance = web3.utils.toBN(await web3.eth.getBalance(user));

            assert.isTrue(newBalance.eq(expectedWithdrawBalance));
        });

        it('withdrawSellerBalance reverts if not seller', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await this.contract.purchaseSaleItem(saleItemId, {
                from: owner,
                value: web3.utils.toBN(priceInEth).add(web3.utils.toBN(fee)),
            });

            await expectRevert(
                this.contract.withdrawSellerBalance({
                    from: owner,
                }),
                'Address is not seller'
            );
        });
    });

    describe('Purchasing', async () => {
        it('transfers ownership when paid in full', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            const receipt = await this.contract.purchaseSaleItem(saleItemId, {
                from: owner,
                value: web3.utils.toBN(priceInEth).add(web3.utils.toBN(fee)),
            });

            await expectEvent(receipt, 'ItemSold', {
                saleId: saleItemId,
                price: web3.utils.toBN(priceInEth),
                marketplaceFee: web3.utils.toBN(fee),
                oldOwner: user,
                newOwner: owner,
            });

            assert.equal(await this.murAllNFT.ownerOf(tokenId), owner);
        });

        it('removes item from list of sale items', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await this.contract.purchaseSaleItem(saleItemId, {
                from: owner,
                value: web3.utils.toBN(priceInEth).add(web3.utils.toBN(fee)),
            });

            assert.equal(await this.contract.totalSaleItemsForSellerAddress(user), 0);
            assert.equal(await this.contract.totalSaleItemsForContractAddress(this.murAllNFT.address), 0);
        });

        it('updates balances correctly', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await this.contract.purchaseSaleItem(saleItemId, {
                from: owner,
                value: web3.utils.toBN(priceInEth).add(web3.utils.toBN(fee)),
            });

            assert.equal(await web3.eth.getBalance(this.contract.address), priceInEth + fee);

            const contractBalance = await this.contract.getSellerBalance(user);
            assert.isTrue(contractBalance.eq(web3.utils.toBN(priceInEth)));

            const saleItems = await this.contract.getItemsForSaleBySellerAddress(user);
            assert.equal(saleItems.length, 0);
        });

        it('assigns buyer role to buyer', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await this.contract.purchaseSaleItem(saleItemId, {
                from: owner,
                value: web3.utils.toBN(priceInEth).add(web3.utils.toBN(fee)),
            });

            assert.isTrue(
                await this.contract.isBuyer(owner, {
                    from: user,
                })
            );
        });

        it('does not allow purchase when not paid in full', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await expectRevert(
                this.contract.purchaseSaleItem(saleItemId, {
                    from: owner,
                    value: web3.utils.toBN(priceInEth),
                }),
                'Not enough ETH provided'
            );
        });

        it('does not allow purchase of items that are not listed', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await expectRevert(
                this.contract.purchaseSaleItem(saleItemId, {
                    from: owner,
                    value: web3.utils.toBN(priceInEth),
                }),
                'Sale id does not match any listing'
            );
        });

        it('does not allow purchase of blocked items', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            await this.murAllBlockList.addTokenToBlockList(tokenId, this.murAllNFT.address, { from: owner });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await expectRevert(
                this.contract.purchaseSaleItem(saleItemId, {
                    from: owner,
                    value: web3.utils.toBN(priceInEth),
                }),
                'The token or contract is blocked'
            );
        });

        it('does not allow purchase of items from blocked contracts', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;

            await mintTestToken(user);
            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            await this.murAllBlockList.addContractToBlockList(this.murAllNFT.address, { from: owner });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            await expectRevert(
                this.contract.purchaseSaleItem(saleItemId, {
                    from: owner,
                    value: web3.utils.toBN(priceInEth),
                }),
                'The token or contract is blocked'
            );
        });
    });

    describe('Reading data', async () => {
        it('returns ids of items for sale by seller address', async () => {
            const tokenId = 0;
            const tokenId2 = 1;
            const tokenId3 = 2;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);
            await mintTestToken(user);
            await mintTestToken(owner);

            await approveTransfer(user, this.contract.address);
            await approveTransfer(owner, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });
            await this.contract.listErc721ForSale(tokenId2, this.murAllNFT.address, priceInEth, {
                from: user,
            });
            await this.contract.listErc721ForSale(tokenId3, this.murAllNFT.address, priceInEth, {
                from: owner,
            });

            const actualData = await this.contract.getItemsForSaleBySellerAddress(user);

            assert.equal(actualData.length, 2);
            assert.equal(actualData[0], web3.utils.soliditySha3(tokenId, this.murAllNFT.address));
            assert.equal(actualData[1], web3.utils.soliditySha3(tokenId2, this.murAllNFT.address));
        });

        it('returns ids of items for sale by contract address', async () => {
            const tokenId = 0;
            const tokenId2 = 1;
            const tokenId3 = 2;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);
            await mintTestToken(user);
            await mintTestToken(owner);

            await approveTransfer(user, this.contract.address);
            await approveTransfer(owner, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });
            await this.contract.listErc721ForSale(tokenId2, this.murAllNFT.address, priceInEth, {
                from: user,
            });
            await this.contract.listErc721ForSale(tokenId3, this.murAllNFT.address, priceInEth, {
                from: owner,
            });

            const actualData = await this.contract.getItemsForSaleByContractAddress(this.murAllNFT.address);

            assert.equal(actualData.length, 3);
            assert.equal(actualData[0], web3.utils.soliditySha3(tokenId, this.murAllNFT.address));
            assert.equal(actualData[1], web3.utils.soliditySha3(tokenId2, this.murAllNFT.address));
            assert.equal(actualData[2], web3.utils.soliditySha3(tokenId3, this.murAllNFT.address));
        });

        it('returns ids of all items for sale', async () => {
            const tokenId = 0;
            const tokenId2 = 1;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);
            await mintTestToken(owner);

            await approveTransfer(user, this.contract.address);
            await approveTransfer(owner, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });
            await this.contract.listErc721ForSale(tokenId2, this.murAllNFT.address, priceInEth, {
                from: owner,
            });

            const actualData = await this.contract.getAllSaleItemIds();

            assert.equal(actualData.length, 2);
            assert.equal(actualData[0], web3.utils.soliditySha3(tokenId, this.murAllNFT.address));
            assert.equal(actualData[1], web3.utils.soliditySha3(tokenId2, this.murAllNFT.address));
        });

        it('returns item details for sale item by id', async () => {
            const tokenId = 0;
            const priceInEth = 12345678;
            const fee = 370368;

            await mintTestToken(user);

            await approveTransfer(user, this.contract.address);

            await this.contract.listErc721ForSale(tokenId, this.murAllNFT.address, priceInEth, {
                from: user,
            });

            const saleItemId = web3.utils.soliditySha3(tokenId, this.murAllNFT.address);

            const data = await this.contract.getSaleItem(saleItemId);

            assert.isTrue(data.tokenId.eq(web3.utils.toBN(tokenId)));
            assert.isTrue(data.price.eq(web3.utils.toBN(priceInEth)));
            assert.isTrue(data.marketplaceFee.eq(web3.utils.toBN(fee)));
            assert.equal(data.owner, user);
            assert.equal(data.contractAddress, this.murAllNFT.address);
        });
    });
});
