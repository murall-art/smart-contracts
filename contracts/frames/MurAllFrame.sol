// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
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
    Ownable,
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
    bool internal publicMintingEnabled = false;
    bool internal presaleMintingEnabled = false;

    uint256 constant NUM_LEGENDARIES_MINTABLE = 10;
    uint256 constant NUM_PRESALE_MINTABLE = 100;
    uint256 constant MAX_SUPPLY = 2100;

    uint256[] internal initialFrameTraits;

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

    /**
     * @dev @notice Base URI for MURALL NFT's off-chain images
     */
    string private mediaUriBase;

    /**
     * @dev @notice Base URI to view MURALL NFT's on the MurAll website
     */
    string private viewUriBase;

    /** @dev check supports erc721 or erc1155 using eip165
     * @param tokenContractAddress Contract address to check if is ERC721 or ERC1155
     */
    modifier onlySupportedNfts(address tokenContractAddress) {
        require(
            tokenContractAddress.supportsInterface(_INTERFACE_ID_ERC721) ||
                tokenContractAddress.supportsInterface(_INTERFACE_ID_ERC1155),
            "Contract is not ERC721 or ERC1155"
        );
        _;
    }

    /** @dev Checks if token exists
     * @param _tokenId The token id to check if exists
     */
    modifier onlyExistingTokens(uint256 _tokenId) {
        require(_exists(_tokenId), "Invalid Token ID");
        _;
    }

    /** @dev Checks if token owner is sender
     * @param _tokenId The token id to check
     */
    modifier onlyTokenOwner(uint256 _tokenId) {
        require(ownerOf(_tokenId) == msg.sender, "Invalid Token ID");
        _;
    }

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
        require(publicMintingEnabled, "Public minting not enabled");

        return mintPrivate();
    }

    function mintPresale(
        uint256 index,
        address account,
        bytes32[] calldata merkleProof
    ) external payable nonReentrant returns (uint256) {
        require(presaleMintingEnabled, "Presale minting not enabled");
        require(totalSupply() <= NUM_PRESALE_MINTABLE, "Maximum number of presale NFT's reached");
        require(msg.sender == account, "Account is not the presale account");
        require(!presaleManager.hasClaimed(index), "Address already minted.");

        // Verify the merkle proof.
        presaleManager.verifyAndSetClaimed(index, account, uint256(1), merkleProof);
        return mintPrivate();
    }

    function mintLegendary(uint256 traitHash) public nonReentrant onlyAdmin returns (uint256) {
        require(totalSupply() <= NUM_LEGENDARIES_MINTABLE, "Maximum number of initial NFT's reached");
        initialFrameTraits.push(traitHash);

        return mintPrivate();
    }

    function mintPrivate() private nonReentrant onlyAdmin returns (uint256) {
        require(totalSupply() <= MAX_SUPPLY, "Maximum number of frames minted");

        uint256 _id = totalSupply();

        _mint(msg.sender, _id);

        emit FrameMinted(_id, msg.sender);
        return _id;
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

    /**
     * @notice Set the base URI for the image of each MURALL NFT.
     * Only invokable by admin role.
     * @param _mediaUriBase base for the mediaURI shown in metadata for each MURALL NFT
     */
    function setMediaUriBase(string calldata _mediaUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        mediaUriBase = _mediaUriBase;
    }

    /**
     * @notice Set the base URI for the viewing the MURALL NFT on the MurAll website.
     * Only invokable by admin role.
     * @param _viewUriBase base URI for viewing an MURALL NFT on the MurAll website
     */
    function setViewUriBase(string calldata _viewUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        viewUriBase = _viewUriBase;
    }

    /**
     * @notice Get view URI for a given MURALL NFT's Token ID.
     * @param _tokenId the Token ID of a previously minted MURALL NFT
     * @return uri the off-chain URI to view the Avastar on the MurAll website
     */
    function viewURI(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(viewUriBase, _tokenId.toString()));
    }

    /**
     * @notice Get media URI for a given MURALL NFT's Token ID.
     * @param _tokenId the Token ID of a previously minted MURALL NFT's
     * @return uri the off-chain URI to the MURALL NFT's image
     */
    function mediaURI(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(mediaUriBase, _tokenId.toString()));
    }

    function rescueTokens(address tokenAddress) public onlyAdmin {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        require(IERC20(tokenAddress).transfer(msg.sender, balance), "MurAllFrame: Transfer failed.");
    }

    function setPublicMintingEnabled(bool enabled) public onlyAdmin {
        publicMintingEnabled = enabled;
    }

    function setPresaleMintingEnabled(bool enabled) public onlyAdmin {
        presaleMintingEnabled = enabled;
    }

    function setPresaleMintingMerkleRoot(bytes32 merkleRoot) public onlyAdmin {
        presaleManager = new MerkleTokenClaimDataManager(merkleRoot);
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
        (uint256 targetFrameTokenId, address owner, address contractAddress) = abi.decode(
            data,
            (uint256, address, address)
        );
        require(_exists(targetFrameTokenId), "Invalid Token ID");
        require(owner == msg.sender, "Invalid owner");
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
        (uint256 targetFrameTokenId, address owner, address contractAddress) = abi.decode(
            data,
            (uint256, address, address)
        );

        require(!hasContentsInFrame(targetFrameTokenId), "Frame already contains an NFT"); // Also checks token exists
        require(owner == msg.sender, "Invalid owner");
        require(ownerOf(targetFrameTokenId) == msg.sender, "Invalid owner");
        require(
            contractAddress.supportsInterface(_INTERFACE_ID_ERC1155) &&
                IERC1155(contractAddress).balanceOf(address(this), tokenId) == amount,
            "Incorrect data"
        );
        FrameContents memory newFrameContents = FrameContents(contractAddress, tokenId, amount);
        frameContents[targetFrameTokenId] = newFrameContents;

        emit FrameContentsUpdated(targetFrameTokenId, contractAddress, tokenId, 1);
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

    function setFrameContents(
        uint256 _tokenId,
        address contentContractAddress,
        uint256 contentTokenId,
        uint256 contentAmount
    ) public onlyTokenOwner(_tokenId) onlySupportedNfts(contentContractAddress) {
        require(!hasContentsInFrame(_tokenId), "Frame already contains an NFT"); // Also checks token exists
        // use contract address to get contract instance as ERC721 instance
        if (contentContractAddress.supportsInterface(_INTERFACE_ID_ERC721)) {
            // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
            IERC721(contentContractAddress).safeTransferFrom(
                msg.sender,
                address(this),
                contentTokenId,
                abi.encode(_tokenId, msg.sender, contentContractAddress)
            );
        } else {
            // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
            IERC1155(contentContractAddress).safeTransferFrom(
                msg.sender,
                address(this),
                contentTokenId,
                contentAmount,
                abi.encode(_tokenId, msg.sender, contentContractAddress)
            );
        }
    }

    function removeFrameContents(uint256 _tokenId) public onlyTokenOwner(_tokenId) {
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

    function hasContentsInFrame(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (bool) {
        // if seller profile does not exist, create one
        return frameContents[_tokenId].contractAddress != address(0);
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

    /**
     * @notice Set the Royalty Governer for creating `tokenURI` for each Montage NFT.
     * Only invokable by admin role.
     * @param _royaltyGovAddr the address of the Royalty Governer contract
     */
    function setRoyaltyGovernor(IRoyaltyGovernor _royaltyGovAddr) external onlyAdmin {
        royaltyGovernorContract = _royaltyGovAddr;
        emit RoyaltyGovernorContractChanged(address(_royaltyGovAddr));
    }

    function getTraits(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (uint256 traits) {
        if (_tokenId < NUM_LEGENDARIES_MINTABLE) {
            return initialFrameTraits[_tokenId];
        } else {
            require(traitSeed != 0, "Trait seed not set yet");
            return generateTraits(traitSeed, _tokenId);
        }
    }

    function generateTraits(uint256 randomValue, uint256 tokenId) private pure returns (uint256 traits) {
        return uint256(keccak256(abi.encode(randomValue, tokenId)));
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
}
