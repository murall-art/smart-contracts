// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IFrameImageStorage} from "./IFrameImageStorage.sol";
import {IERC2981} from "../royalties/IERC2981.sol";
import {IRoyaltyGovernor} from "../royalties/IRoyaltyGovernor.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import {MerkleTokenClaimDataManager} from "../distribution/MerkleTokenClaimDataManager.sol";

/**
 * MurAll Frame contract
 */
contract MurAllFrame is
    ERC721,
    AccessControl,
    ReentrancyGuard,
    IERC2981,
    VRFConsumerBase,
    IERC721Receiver,
    ERC1155Receiver
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    using Strings for uint256;
    using ERC165Checker for address;
    /*
     *     bytes4(keccak256('balanceOf(address)')) == 0x70a08231
     *     bytes4(keccak256('ownerOf(uint256)')) == 0x6352211e
     *     bytes4(keccak256('approve(address,uint256)')) == 0x095ea7b3
     *     bytes4(keccak256('getApproved(uint256)')) == 0x081812fc
     *     bytes4(keccak256('setApprovalForAll(address,bool)')) == 0xa22cb465
     *     bytes4(keccak256('isApprovedForAll(address,address)')) == 0xe985e9c5
     *     bytes4(keccak256('transferFrom(address,address,uint256)')) == 0x23b872dd
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256)')) == 0x42842e0e
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256,bytes)')) == 0xb88d4fde
     *
     *     => 0x70a08231 ^ 0x6352211e ^ 0x095ea7b3 ^ 0x081812fc ^
     *        0xa22cb465 ^ 0xe985e9c ^ 0x23b872dd ^ 0x42842e0e ^ 0xb88d4fde == 0x80ac58cd
     */
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    /*
     *     bytes4(keccak256('balanceOf(address,uint256)')) == 0x00fdd58e
     *     bytes4(keccak256('balanceOfBatch(address[],uint256[])')) == 0x4e1273f4
     *     bytes4(keccak256('setApprovalForAll(address,bool)')) == 0xa22cb465
     *     bytes4(keccak256('isApprovedForAll(address,address)')) == 0xe985e9c5
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256,uint256,bytes)')) == 0xf242432a
     *     bytes4(keccak256('safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)')) == 0x2eb2c2d6
     *
     *     => 0x00fdd58e ^ 0x4e1273f4 ^ 0xa22cb465 ^
     *        0xe985e9c5 ^ 0xf242432a ^ 0x2eb2c2d6 == 0xd9b67a26
     */
    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;

    IFrameImageStorage public traitImageStorage;
    IRoyaltyGovernor public royaltyGovernorContract;
    MerkleTokenClaimDataManager public presaleManager;

    uint256 public constant MINT_MODE_DEVELOPMENT = 0;
    uint256 public constant MINT_MODE_PUBLIC = 2;
    uint256 public constant MINT_MODE_PRESALE = 1;
    uint256 public mintMode = MINT_MODE_DEVELOPMENT;

    uint256 public constant NUM_INITIAL_MINTABLE = 200;
    uint256 public constant NUM_PRESALE_MINTABLE = 700;
    uint256 public constant MINT_PRICE_PRESALE = 0.15 ether;
    uint256 public constant MINT_PRICE_PUBLIC = 0.25 ether;
    uint256 public constant MAX_SUPPLY = 2100;

    mapping(uint256 => uint256) private customFrameTraits;

    struct FrameContents {
        address contractAddress;
        uint256 tokenId;
        uint256 amount;
    }

    mapping(uint256 => FrameContents) private frameContents;

    // for chainlink vrf
    bytes32 internal keyHash;
    uint256 internal fee;
    uint256 public traitSeed;

    event RandomnessRequested(bytes32 requestId);
    event TraitSeedSet(uint256 seed);

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    event FrameMinted(uint256 indexed id, address indexed owner);
    event FrameContentsUpdated(
        uint256 indexed id,
        address indexed contentsContract,
        uint256 contentsId,
        uint256 amount
    );
    event FrameContentsRemoved(uint256 indexed id);
    event RoyaltyGovernorContractChanged(address indexed royaltyGovernor);
    event FrameTraitImageStorageContractChanged(address indexed traitImageStorage);
    event PresaleMerkleRootSet(bytes32 merkleRoot);

    constructor(
        address[] memory admins,
        address _vrfCoordinator,
        address _linkTokenAddr,
        bytes32 _keyHash,
        uint256 _fee
    ) public ERC721("MurAll Frame", "FRAME") VRFConsumerBase(_vrfCoordinator, _linkTokenAddr) {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }

        keyHash = _keyHash;
        fee = _fee;
    }

    function mint() external payable nonReentrant returns (uint256) {
        require(mintMode == MINT_MODE_PUBLIC, "Public minting not enabled");
        require(msg.value >= MINT_PRICE_PUBLIC, "Insufficient funds");
        require(totalSupply() <= MAX_SUPPLY, "Maximum number of frames minted");

        // mint a new frame
        uint256 _id = totalSupply();
        _mint(msg.sender, _id);
        emit FrameMinted(_id, msg.sender);

        return _id;
    }

    function mintPresale(
        uint256 index,
        address account,
        bytes32[] calldata merkleProof
    ) external payable nonReentrant returns (uint256) {
        require(mintMode == MINT_MODE_PRESALE, "Presale minting not enabled");
        require(msg.value >= MINT_PRICE_PRESALE, "Insufficient funds");
        require(totalSupply() <= NUM_PRESALE_MINTABLE, "Maximum number of presale NFT's reached");
        require(msg.sender == account, "Account is not the presale account");
        require(address(presaleManager) != address(0), "Merkle root not set");
        require(!presaleManager.hasClaimed(index), "Address already minted");
        require(totalSupply() <= MAX_SUPPLY, "Maximum number of frames minted");

        // Verify the merkle proof.
        presaleManager.verifyAndSetClaimed(index, account, uint256(1), merkleProof);

        // mint a new frame
        uint256 _id = totalSupply();
        _mint(msg.sender, _id);
        emit FrameMinted(_id, msg.sender);

        return _id;
    }

    function mintCustomInitial(uint256[] memory traitHash) public nonReentrant onlyAdmin {
        require(totalSupply() <= NUM_INITIAL_MINTABLE, "Maximum number of initial NFT's reached");

        for (uint256 i = 0; i < traitHash.length; ++i) {
            require(traitHash[i] != 0, "Invalid trait hash");
            require(totalSupply() <= MAX_SUPPLY, "Maximum number of frames minted");

            // mint a new frame
            uint256 _id = totalSupply();
            _mint(msg.sender, _id);

            customFrameTraits[_id] = traitHash[i];

            emit FrameMinted(_id, msg.sender);
        }
    }

    function mintInitial(uint256 amountToMint) public nonReentrant onlyAdmin returns (uint256) {
        require(totalSupply() <= NUM_INITIAL_MINTABLE, "Maximum number of initial NFT's reached");

        for (uint256 i = 0; i < amountToMint; ++i) {
            require(totalSupply() <= MAX_SUPPLY, "Maximum number of frames minted");
            // mint a new frame
            uint256 _id = totalSupply();
            _mint(msg.sender, _id);
            emit FrameMinted(_id, msg.sender);
        }
    }

    /**
     * @notice Set the base URI for creating `tokenURI` for each MURALL NFT.
     * Only invokable by admin role.
     * @param _tokenUriBase base for the ERC721 tokenURI
     */
    function setTokenUriBase(string calldata _tokenUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        _setBaseURI(_tokenUriBase);
    }

    function rescueTokens(address tokenAddress) public onlyAdmin {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        require(IERC20(tokenAddress).transfer(msg.sender, balance), "MurAllFrame: Transfer failed.");
    }

    function setMintingMode(uint256 mode) public onlyAdmin {
        require(mode == MINT_MODE_PRESALE || mode == MINT_MODE_PUBLIC || mode == MINT_MODE_DEVELOPMENT, "Invalid mode");
        mintMode = mode;
    }

    function setPresaleMintingMerkleRoot(bytes32 merkleRoot) public onlyAdmin {
        require(address(presaleManager) == address(0), "Merkle root already set");
        presaleManager = new MerkleTokenClaimDataManager(merkleRoot);
        emit PresaleMerkleRootSet(merkleRoot);
    }

    /**
     * @notice Set the frame trait image storage contract.
     * Only invokable by admin role.
     * @param storageAddress the address of the frame trait image storage contract
     */
    function setFrameTraitImageStorage(IFrameImageStorage storageAddress) public onlyAdmin {
        traitImageStorage = IFrameImageStorage(storageAddress);
        emit FrameTraitImageStorageContractChanged(address(storageAddress));
    }

    function withdrawFunds(address payable _to) public onlyAdmin {
        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "Failed to transfer the funds, aborting.");
    }

    /**
     * @notice Set the Royalty Governer for creating `tokenURI` for each Montage NFT.
     * Only invokable by admin role.
     * @param _royaltyGovAddr the address of the Royalty Governer contract
     */
    function setRoyaltyGovernor(IRoyaltyGovernor _royaltyGovAddr) external onlyAdmin {
        royaltyGovernorContract = _royaltyGovAddr;
        emit RoyaltyGovernorContractChanged(address(_royaltyGovAddr));
    }

    function getTraits(uint256 _tokenId) public view returns (uint256 traits) {
        require(_exists(_tokenId), "Invalid Token ID");
        if (customFrameTraits[_tokenId] != 0) {
            return customFrameTraits[_tokenId];
        } else {
            require(traitSeed != 0, "Trait seed not set yet");
            return uint256(keccak256(abi.encode(traitSeed, _tokenId)));
        }
    }

    function setFrameContents(
        uint256 _tokenId,
        address contentContractAddress,
        uint256 contentTokenId,
        uint256 contentAmount
    ) public {
        require(ownerOf(_tokenId) == msg.sender, "Not token owner");
        require(!hasContentsInFrame(_tokenId), "Frame already contains an NFT"); // Also checks token exists
        // use contract address to get contract instance as ERC721 instance
        if (contentContractAddress.supportsInterface(_INTERFACE_ID_ERC721)) {
            // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
            IERC721(contentContractAddress).safeTransferFrom(
                msg.sender,
                address(this),
                contentTokenId,
                abi.encode(_tokenId, contentContractAddress)
            );
        } else if (contentContractAddress.supportsInterface(_INTERFACE_ID_ERC1155)) {
            // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
            IERC1155(contentContractAddress).safeTransferFrom(
                msg.sender,
                address(this),
                contentTokenId,
                contentAmount,
                abi.encode(_tokenId, contentContractAddress)
            );
        } else {
            revert();
        }
    }

    function removeFrameContents(uint256 _tokenId) public {
        require(ownerOf(_tokenId) == msg.sender, "Not token owner");
        require(hasContentsInFrame(_tokenId), "Frame does not contain an NFT"); // Also checks token exists
        FrameContents memory _frameContents = frameContents[_tokenId];
        if (_frameContents.contractAddress.supportsInterface(_INTERFACE_ID_ERC721)) {
            // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
            IERC721(_frameContents.contractAddress).safeTransferFrom(address(this), msg.sender, _frameContents.tokenId);
        } else {
            // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
            IERC1155(_frameContents.contractAddress).safeTransferFrom(
                address(this),
                msg.sender,
                _frameContents.tokenId,
                _frameContents.amount,
                ""
            );
        }

        delete frameContents[_tokenId];
        emit FrameContentsRemoved(_tokenId);
    }

    function hasContentsInFrame(uint256 _tokenId) public view returns (bool) {
        require(_exists(_tokenId), "Invalid Token ID");
        return frameContents[_tokenId].contractAddress != address(0);
    }

    /**
     * @dev See {IERC721Receiver-onERC721Received}.
     *
     * Always returns `IERC721Receiver.onERC721Received.selector`.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public virtual override returns (bytes4) {
        require(from == msg.sender, "Invalid sender");
        require(data.length != 0, "Invalid data - must contain target frame token id");
        (uint256 targetFrameTokenId, address contractAddress) = abi.decode(data, (uint256, address));
        require(_exists(targetFrameTokenId), "Invalid Token ID");
        require(ownerOf(targetFrameTokenId) == msg.sender, "Invalid owner");
        require(!hasContentsInFrame(targetFrameTokenId), "Frame already contains an NFT");
        require(
            contractAddress.supportsInterface(_INTERFACE_ID_ERC721) &&
                IERC721(contractAddress).ownerOf(tokenId) == address(this),
            "Incorrect data"
        );
        FrameContents memory newFrameContents = FrameContents(contractAddress, tokenId, 1);
        frameContents[targetFrameTokenId] = newFrameContents;

        emit FrameContentsUpdated(targetFrameTokenId, contractAddress, tokenId, 1);
        return this.onERC721Received.selector;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public virtual override returns (bytes4) {
        require(from == msg.sender, "Invalid sender");
        require(data.length != 0, "Data must contain target frame id, owner and contract address");
        (uint256 targetFrameTokenId, address contractAddress) = abi.decode(data, (uint256, address));

        require(!hasContentsInFrame(targetFrameTokenId), "Frame already contains an NFT"); // Also checks token exists
        require(ownerOf(targetFrameTokenId) == msg.sender, "Invalid owner");
        require(
            contractAddress.supportsInterface(_INTERFACE_ID_ERC1155) &&
                IERC1155(contractAddress).balanceOf(address(this), tokenId) == amount,
            "Incorrect data"
        );
        FrameContents memory newFrameContents = FrameContents(contractAddress, tokenId, amount);
        frameContents[targetFrameTokenId] = newFrameContents;

        emit FrameContentsUpdated(targetFrameTokenId, contractAddress, tokenId, amount);
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override returns (bytes4) {
        revert();
    }

    /** Chainlink VRF ****************************/
    function requestTraitSeed() public onlyAdmin nonReentrant {
        require(traitSeed == 0, "Trait seed already requested");
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        bytes32 requestId = requestRandomness(keyHash, fee);

        emit RandomnessRequested(requestId);
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        require(traitSeed == 0, "Trait seed already requested");
        traitSeed = randomness;
        emit TraitSeedSet(randomness);
    }

    /** END Chainlink VRF ****************************/

    function royaltyInfo(
        uint256 _tokenId,
        uint256 _value,
        bytes calldata _data
    )
        external
        override
        returns (
            address _receiver,
            uint256 _royaltyAmount,
            bytes memory _royaltyPaymentData
        )
    {
        return royaltyGovernorContract.royaltyInfo(_tokenId, _value, _data);
    }

    fallback() external payable {}

    receive() external payable {}
}
