const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))

const SaleItemManager = artifacts.require('./SaleItemManager.sol')

contract('SaleItemManager', ([owner, user]) => {
    beforeEach(async () => {
        this.contract = await SaleItemManager.new({ from: owner })
    })

    describe('Deployment', async () => {
        it('deploys successfully', async () => {
            const address = this.contract.address

            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })
    })

    describe('Creation', async () => {
        it('inserts sale item successfully if does not exist', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            const receipt = await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            await expectEvent(receipt, 'SaleItemInserted', {
                tokenId: web3.utils.toBN(tokenId),
                contractAddress: owner,
                tokenOwner: user,
                price: web3.utils.toBN(priceInEth),
                saleId: web3.utils.soliditySha3(tokenId, owner),
                marketplaceFee: web3.utils.toBN(marketplaceFee)
            })

            assert.isTrue(
                await this.contract.itemIsForSale(web3.utils.soliditySha3(tokenId, owner), {
                    from: owner
                }),
                'item is should be on sale'
            )
            assert.isTrue(
                await this.contract.itemIsForSale(tokenId, owner, { from: owner }),
                'item is should be on sale'
            )
            assert.equal(await this.contract.getSaleItemCount(), 1)
        })

        it('inserts sale item successfully into sale item list by contract address', async () => {
            const tokenId = 0
            const tokenId2 = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            await this.contract.insertSaleItem(tokenId2, user, priceInEth, user, marketplaceFee, {
                from: owner
            })

            assert.equal(await this.contract.getSaleItemCountForContractAddress(owner), 1)
            assert.equal(
                await this.contract.getSaleItemIdAtIndexForContractAddress(owner, 0),
                web3.utils.soliditySha3(tokenId, owner)
            )
        })

        it('prevents inserting items that already exist', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            await expectRevert(
                this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                    from: owner
                }),
                'Item is already on sale'
            )
        })
        it('prevents inserting items from address that is not contract owner', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await expectRevert(
                this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                    from: user
                }),
                'Ownable: caller is not the owner'
            )
        })
    })

    describe('Updating', async () => {
        it('changes successfully to new price from sale item owner', async () => {
            const tokenId = 0
            const oldPriceInEth = 12345678
            const newPriceInEth = 45678910
            const oldFeeInEth = 787965
            const newFeeInEth = 852369

            await this.contract.insertSaleItem(tokenId, owner, oldPriceInEth, user, oldFeeInEth, {
                from: owner
            })

            const receipt = await this.contract.updateSaleItemPrice(
                web3.utils.soliditySha3(tokenId, owner),
                newPriceInEth,
                newFeeInEth,
                {
                    from: owner
                }
            )

            await expectEvent(receipt, 'SaleItemPriceUpdated', {
                saleId: web3.utils.soliditySha3(tokenId, owner),
                oldPrice: web3.utils.toBN(oldPriceInEth),
                newPrice: web3.utils.toBN(newPriceInEth),
                marketplaceFee: web3.utils.toBN(newFeeInEth)
            })
        })

        it('reverts if sale item does not exist', async () => {
            const tokenId = 0
            const tokenId2 = 1
            const oldPriceInEth = 12345678
            const newPriceInEth = 45678910
            const oldFeeInEth = 787965
            const newFeeInEth = 852369

            await this.contract.insertSaleItem(tokenId, owner, oldPriceInEth, user, oldFeeInEth, {
                from: owner
            })

            await expectRevert(
                this.contract.updateSaleItemPrice(
                    web3.utils.soliditySha3(tokenId2, owner),
                    newPriceInEth,
                    newFeeInEth,
                    {
                        from: owner
                    }
                ),
                'Sale id does not match any listing'
            )
        })

        it('prevents changes from non contract owner', async () => {
            const tokenId = 0
            const oldPriceInEth = 12345678
            const newPriceInEth = 45678910
            const oldFeeInEth = 787965
            const newFeeInEth = 852369

            await this.contract.insertSaleItem(tokenId, owner, oldPriceInEth, user, oldFeeInEth, {
                from: owner
            })

            await expectRevert(
                this.contract.updateSaleItemPrice(web3.utils.soliditySha3(tokenId, owner), newPriceInEth, newFeeInEth, {
                    from: user
                }),
                'Ownable: caller is not the owner'
            )
        })
    })

    describe('Reading', async () => {
        it('get sale item returns correct sale item details', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            const data = await this.contract.getSaleItem(web3.utils.soliditySha3(tokenId, owner))

            assert.isTrue(data.tokenId.eq(web3.utils.toBN(tokenId)))
            assert.isTrue(data.price.eq(web3.utils.toBN(priceInEth)))
            assert.isTrue(data.marketplaceFee.eq(web3.utils.toBN(marketplaceFee)))
            assert.equal(data.owner, user)
            assert.equal(data.contractAddress, owner)
        })

        it('get sale item reverts if id does not exist', async () => {
            const tokenId = 0
            const tokenId2 = 4
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })
            await expectRevert(
                this.contract.getSaleItem(web3.utils.soliditySha3(tokenId2, owner)),
                'Sale id does not match any listing'
            )
        })

        it('get sale item id at index returns correct id', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            const idAtIndex = await this.contract.getSaleItemIdAtIndex(0)

            assert.equal(idAtIndex, web3.utils.soliditySha3(tokenId, owner))
        })

        it('get sale item id index returns list of all ids', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            const tokenId2 = 1
            const priceInEth2 = 678
            const marketplaceFee2 = 321

            await this.contract.insertSaleItem(tokenId2, owner, priceInEth2, user, marketplaceFee2, {
                from: owner
            })

            const ids = await this.contract.getAllSaleItemIds()

            assert.equal(ids.length, 2)
            assert.equal(ids[0], web3.utils.soliditySha3(tokenId, owner))
            assert.equal(ids[1], web3.utils.soliditySha3(tokenId2, owner))
        })

        it('get sale item count returns correct size', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            const tokenId2 = 3
            const priceInEth2 = 5678
            const marketplaceFee2 = 87321

            await this.contract.insertSaleItem(tokenId2, owner, priceInEth2, user, marketplaceFee2, {
                from: owner
            })

            const count = await this.contract.getSaleItemCount()

            assert.isTrue(count.eq(web3.utils.toBN(2)))
        })

        it('get sale item contract address returns correct sale item details', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            const contractAddress = await this.contract.getSaleItemContractAddress(
                web3.utils.soliditySha3(tokenId, owner)
            )

            assert.equal(contractAddress, owner)
        })

        it('getSaleItemContractAddress reverts if id is not existing sale item', async () => {
            const tokenId = 4
            const tokenId2 = 3
            const priceInEth = 1234
            const marketplaceFee = 8765

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            await expectRevert(
                this.contract.getSaleItemContractAddress(web3.utils.soliditySha3(tokenId2, owner)),
                'Sale id does not match any listing'
            )
        })

        it('get sale item price returns correct sale item details', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            const saleItemPrice = await this.contract.getSaleItemPrice(web3.utils.soliditySha3(tokenId, owner))

            assert.isTrue(saleItemPrice.eq(web3.utils.toBN(priceInEth)))
        })

        it('get sale item price reverts if id is not existing sale item', async () => {
            const tokenId = 4
            const tokenId2 = 3
            const priceInEth = 1234
            const marketplaceFee = 8765

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            await expectRevert(
                this.contract.getSaleItemPrice(web3.utils.soliditySha3(tokenId2, owner)),
                'Sale id does not match any listing'
            )
        })

        it('get sale item owner returns correct sale item details', async () => {
            const tokenId = 0
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            const tokenOwner = await this.contract.getSaleItemOwner(web3.utils.soliditySha3(tokenId, owner))

            assert.equal(tokenOwner, user)
        })

        it('get sale item owner reverts if id is not existing sale item', async () => {
            const tokenId = 4
            const tokenId2 = 3
            const priceInEth = 1234
            const marketplaceFee = 8765

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            await expectRevert(
                this.contract.getSaleItemOwner(web3.utils.soliditySha3(tokenId2, owner)),
                'Sale id does not match any listing'
            )
        })

        it('get sale item count by contract address returns correct size', async () => {
            const tokenId = 0
            const tokenId2 = 1
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            await this.contract.insertSaleItem(tokenId2, user, priceInEth, user, marketplaceFee, {
                from: owner
            })

            assert.equal(await this.contract.getSaleItemCountForContractAddress(owner), 1)
        })

        it('get sale item at index for contract address returns correct id', async () => {
            const tokenId = 0
            const tokenId2 = 1
            const priceInEth = 12345678
            const marketplaceFee = 87654321

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            await this.contract.insertSaleItem(tokenId2, user, priceInEth, user, marketplaceFee, {
                from: owner
            })

            assert.equal(
                await this.contract.getSaleItemIdAtIndexForContractAddress(owner, 0),
                web3.utils.soliditySha3(tokenId, owner)
            )
        })
    })

    describe('Deletion', async () => {
        it('deletes existing sale item successfully', async () => {
            const tokenId = 4
            const priceInEth = 1234
            const marketplaceFee = 8765

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })
            const tokenId2 = 3
            const priceInEth2 = 5678
            const marketplaceFee2 = 87321

            await this.contract.insertSaleItem(tokenId2, owner, priceInEth2, user, marketplaceFee2, {
                from: owner
            })

            assert.equal(await this.contract.getSaleItemCount(), 2)
            assert.equal(await this.contract.getSaleItemCountForContractAddress(owner), 2)

            await this.contract.deleteSaleItem(web3.utils.soliditySha3(tokenId, owner), {
                from: owner
            })

            assert.equal(await this.contract.getSaleItemCount(), 1)
            assert.equal(await this.contract.getSaleItemCountForContractAddress(owner), 1)

            await expectRevert(
                this.contract.getSaleItem(web3.utils.soliditySha3(tokenId, owner)),
                'Sale id does not match any listing'
            )
            const data = await this.contract.getSaleItem(web3.utils.soliditySha3(tokenId2, owner))

            assert.isTrue(data.tokenId.eq(web3.utils.toBN(tokenId2)))
            assert.isTrue(data.price.eq(web3.utils.toBN(priceInEth2)))
            assert.isTrue(data.marketplaceFee.eq(web3.utils.toBN(marketplaceFee2)))
            assert.equal(data.owner, user)
            assert.equal(data.contractAddress, owner)

            assert.equal(await this.contract.getSaleItemIdAtIndex(0), web3.utils.soliditySha3(tokenId2, owner))
            assert.equal(
                await this.contract.getSaleItemIdAtIndexForContractAddress(owner, 0),
                web3.utils.soliditySha3(tokenId2, owner)
            )
        })

        it('reverts if id is not existing sale item', async () => {
            const tokenId = 4
            const tokenId2 = 3
            const priceInEth = 1234
            const marketplaceFee = 8765

            await this.contract.insertSaleItem(tokenId, owner, priceInEth, user, marketplaceFee, {
                from: owner
            })

            await expectRevert(
                this.contract.deleteSaleItem(web3.utils.soliditySha3(tokenId2, owner)),
                'Sale id does not match any listing'
            )
        })
    })
})
