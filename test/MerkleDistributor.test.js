const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
const timeMachine = require('ganache-time-traveler');

const PaintToken = artifacts.require('./PaintToken.sol');
const MerkleDistributor = artifacts.require('./distribution/MerkleDistributor.sol');

const MERKLE_ROOT = '0xba29e8379d37df7225c311ba90176eb9d2e6de1f79e9b5ff115cf93cef63f818';
const ONE_YEAR_IN_SECONDS = 31536000;

const TOKEN_MULTIPLIER = web3.utils.toBN(1000000000000000000);

contract('MerkleDistributor', ([owner, user]) => {
    let snapshotId;
    const transferTokensToMerkleContract = async (requiredTokens) => {
        await this.paintToken.transfer(this.contract.address, requiredTokens, { from: user });
    };

    const convertToTokenAmount = (amount) => {
        return TOKEN_MULTIPLIER.mul(web3.utils.toBN(amount));
    };

    beforeEach(async () => {
        this.paintToken = await PaintToken.new({ from: user });
        this.contract = await MerkleDistributor.new(this.paintToken.address, MERKLE_ROOT, {
            from: owner,
        });
        let snapshot = await timeMachine.takeSnapshot();
        snapshotId = snapshot['result'];
    });

    afterEach(async () => {
        await timeMachine.revertToSnapshot(snapshotId);
    });

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = this.contract.address;

            assert.notEqual(address, '');
            assert.notEqual(address, 0x0);
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });

        it('has token contract', async () => {
            const paintTokenContract = await this.contract.token();

            assert.notEqual(paintTokenContract, '');
            assert.notEqual(paintTokenContract, 0x0);
            assert.notEqual(paintTokenContract, null);
            assert.notEqual(paintTokenContract, undefined);
        });

        it('has merkle root', async () => {
            const merkleRoot = await this.contract.merkleRoot();

            assert.equal(merkleRoot, MERKLE_ROOT);
        });
    });

    // NOTE: Claim process has been tested in the original repo of the merkle distributor

    describe('claim', async () => {
        it('fails if proof is incorrect', async () => {
            const claimAddress = '0x0000000006c573206b2393E04d7166bF2079d7b8';
            const index = 2;

            const proof = [
                '0x56dcaa62ba8cb504e8d59356874affc6dab1f83e6286dddad655892b29b9c45b',
                '0x895500a7abf75388ee2bfd040fecbd7d052b286bcc164e0af8c35bcada8df5c3',
                '0xcdb36792bbc5bb484fbbafa40d6b3a6773ecd1f6176d2a1372f49b4a3ca25c5d',
                '0xc38bce7f3431fe797b6f6207c9d251fd3749a4e4792805cbf8033d0ccc6c63d0',
                '0x3b60d056bace460daf6ddb75955ddf5849b820f9faa217b702ce3b19aaa6d14a',
                '0xa61a6b5162742e0c87a9b9980a6c84a184d7becc31386e2aade19b413791c4bd',
                '0xfffb4040b2aefd9012516d4e05255fc3fc8011e302c357a99589150ede2ef5e2',
                '0xffe59a22bf3f014ac09ce6a78d458456e53ca155abcf2184559005e1a2c97140',
                '0x5ab5582165c4615308006a1fd6384384097a1405a15d5b32bcde3336b231f458',
                '0x6e7795257558fd4a268d06f26762208b7b3ce48ce3f01fd81df1ce21fff1b59b',
                '0x82ad05f8373987266d30a00c0d682f555191a59a98da12709aaeb52e1fdc93bc',
                '0xb11d7e3c61d8626a489946ca4c6befcadfca905d91001d6d1f1eada1b984df33',
                '0xde4d5cacec224ba230792076775f10d6a10501fe09ffbd18c07bf0bada00d531',
                '0x862a8a3a1103c0fe3a628bd4b167dbbb06ceac8a26327b87c2869cad08bb39b7',
                '0x661aa2870937dd457ab370807afc9c65e553989f0caf1c4d57f9074cf05c82e8',
                '0x54cf0e5d9b918a01797cb785e3f45ca3bc461808367df44c556db8c8b8f9846c',
            ];
            const tokenAmount = 193865;
            const expectedTokenAmount = convertToTokenAmount(tokenAmount);

            await transferTokensToMerkleContract(expectedTokenAmount);

            await expectRevert(
                this.contract.claim(index, claimAddress, expectedTokenAmount, proof, {
                    from: owner,
                }),
                'MerkleDistributor: Invalid proof.'
            );
        });

        it('allows when proof and amount is correct', async () => {
            const claimAddress = '0x0000000006c573206b2393E04d7166bF2079d7b8';
            const index = 2;

            const proof = [
                '0x46dcaa62ba8cb504e8d59356874affc6dab1f83e6286dddad655892b29b9c45b',
                '0x895500a7abf75388ee2bfd040fecbd7d052b286bcc164e0af8c35bcada8df5c3',
                '0xcdb36792bbc5bb484fbbafa40d6b3a6773ecd1f6176d2a1372f49b4a3ca25c5d',
                '0xc38bce7f3431fe797b6f6207c9d251fd3749a4e4792805cbf8033d0ccc6c63d0',
                '0x3b60d056bace460daf6ddb75955ddf5849b820f9faa217b702ce3b19aaa6d14a',
                '0xa61a6b5162742e0c87a9b9980a6c84a184d7becc31386e2aade19b413791c4bd',
                '0xfffb4040b2aefd9012516d4e05255fc3fc8011e302c357a99589150ede2ef5e2',
                '0xffe59a22bf3f014ac09ce6a78d458456e53ca155abcf2184559005e1a2c97140',
                '0x5ab5582165c4615308006a1fd6384384097a1405a15d5b32bcde3336b231f458',
                '0x6e7795257558fd4a268d06f26762208b7b3ce48ce3f01fd81df1ce21fff1b59b',
                '0x82ad05f8373987266d30a00c0d682f555191a59a98da12709aaeb52e1fdc93bc',
                '0xb11d7e3c61d8626a489946ca4c6befcadfca905d91001d6d1f1eada1b984df33',
                '0xde4d5cacec224ba230792076775f10d6a10501fe09ffbd18c07bf0bada00d531',
                '0x862a8a3a1103c0fe3a628bd4b167dbbb06ceac8a26327b87c2869cad08bb39b7',
                '0x661aa2870937dd457ab370807afc9c65e553989f0caf1c4d57f9074cf05c82e8',
                '0x54cf0e5d9b918a01797cb785e3f45ca3bc461808367df44c556db8c8b8f9846c',
            ];
            const tokenAmount = 193865;
            const expectedTokenAmount = convertToTokenAmount(tokenAmount);

            await transferTokensToMerkleContract(expectedTokenAmount);

            const receipt = await this.contract.claim(index, claimAddress, expectedTokenAmount, proof, {
                from: owner,
            });
            const balance = await this.paintToken.balanceOf(claimAddress);
            const distributorBalance = await this.paintToken.balanceOf(this.contract.address);
            assert.isTrue(balance.eq(expectedTokenAmount));
            assert.isTrue(distributorBalance.eq(web3.utils.toBN(0)));
        });

        it('fails if already claimed', async () => {
            const claimAddress = '0x0000000006c573206b2393E04d7166bF2079d7b8';
            const index = 2;

            const proof = [
                '0x46dcaa62ba8cb504e8d59356874affc6dab1f83e6286dddad655892b29b9c45b',
                '0x895500a7abf75388ee2bfd040fecbd7d052b286bcc164e0af8c35bcada8df5c3',
                '0xcdb36792bbc5bb484fbbafa40d6b3a6773ecd1f6176d2a1372f49b4a3ca25c5d',
                '0xc38bce7f3431fe797b6f6207c9d251fd3749a4e4792805cbf8033d0ccc6c63d0',
                '0x3b60d056bace460daf6ddb75955ddf5849b820f9faa217b702ce3b19aaa6d14a',
                '0xa61a6b5162742e0c87a9b9980a6c84a184d7becc31386e2aade19b413791c4bd',
                '0xfffb4040b2aefd9012516d4e05255fc3fc8011e302c357a99589150ede2ef5e2',
                '0xffe59a22bf3f014ac09ce6a78d458456e53ca155abcf2184559005e1a2c97140',
                '0x5ab5582165c4615308006a1fd6384384097a1405a15d5b32bcde3336b231f458',
                '0x6e7795257558fd4a268d06f26762208b7b3ce48ce3f01fd81df1ce21fff1b59b',
                '0x82ad05f8373987266d30a00c0d682f555191a59a98da12709aaeb52e1fdc93bc',
                '0xb11d7e3c61d8626a489946ca4c6befcadfca905d91001d6d1f1eada1b984df33',
                '0xde4d5cacec224ba230792076775f10d6a10501fe09ffbd18c07bf0bada00d531',
                '0x862a8a3a1103c0fe3a628bd4b167dbbb06ceac8a26327b87c2869cad08bb39b7',
                '0x661aa2870937dd457ab370807afc9c65e553989f0caf1c4d57f9074cf05c82e8',
                '0x54cf0e5d9b918a01797cb785e3f45ca3bc461808367df44c556db8c8b8f9846c',
            ];
            const tokenAmount = 193865;
            const expectedTokenAmount = convertToTokenAmount(tokenAmount);

            await transferTokensToMerkleContract(expectedTokenAmount);

            await this.contract.claim(index, claimAddress, expectedTokenAmount, proof, {
                from: owner,
            });
            await expectRevert(
                this.contract.claim(index, claimAddress, expectedTokenAmount, proof, {
                    from: owner,
                }),
                'MerkleDistributor: Drop already claimed.'
            );
        });
    });

    describe('transferRemainingToOwner', async () => {
        it('fails if the caller is not contract owner', async () => {
            await transferTokensToMerkleContract(1234);

            await expectRevert(
                this.contract.transferRemainingToOwner({
                    from: user,
                }),
                'Ownable: caller is not the owner'
            );
        });
        it('fails if the amount of time passed is less than 1 year', async () => {
            await transferTokensToMerkleContract(1234);

            await expectRevert(
                this.contract.transferRemainingToOwner({
                    from: owner,
                }),
                'Function is timelocked'
            );

            await timeMachine.advanceTimeAndBlock(ONE_YEAR_IN_SECONDS - 1);

            await expectRevert(
                this.contract.transferRemainingToOwner({
                    from: owner,
                }),
                'Function is timelocked'
            );
        });

        it('allows transfer 1 year', async () => {
            const tokenAmount = 1234;
            await transferTokensToMerkleContract(tokenAmount);

            await timeMachine.advanceTimeAndBlock(ONE_YEAR_IN_SECONDS);

            await this.contract.transferRemainingToOwner({
                from: owner,
            });
            const balance = await this.paintToken.balanceOf(owner);

            assert.isTrue(web3.utils.toBN(balance).eq(web3.utils.toBN(tokenAmount)));
        });
    });

    describe('remainingClaimTime', async () => {
        it('returns correct value for remaining time to claim', async () => {
            var remainingTime = await this.contract.remainingClaimTime();

            assert.isTrue(web3.utils.toBN(remainingTime).eq(web3.utils.toBN(ONE_YEAR_IN_SECONDS)));

            await timeMachine.advanceTimeAndBlock(ONE_YEAR_IN_SECONDS - 1);

            remainingTime = await this.contract.remainingClaimTime();

            assert.isTrue(web3.utils.toBN(remainingTime).eq(web3.utils.toBN(1)));
        });
    });
});
