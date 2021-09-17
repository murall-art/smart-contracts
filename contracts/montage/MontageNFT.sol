// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {IMontage} from "./IMontage.sol";
import {IERC2981} from "../royalties/IERC2981.sol";
import {IRoyaltyGovernor} from "../royalties/IRoyaltyGovernor.sol";
import {MontageDataStorage} from "../storage/MontageDataStorage.sol";

/**
 * Wrapper/Bundler for NFTs
 */
contract MontageNFT is IMontage, ERC721, AccessControl, IERC2981 {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    ///@dev bytes4(keccak256("royaltyInfo(uint256,uint256,bytes)")) == 0xc155531d
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0xc155531d;
    uint256 public constant BUNDLE_LIMIT = 50;
    using Strings for uint256;

    string public constant INVALID_TOKEN_ID = "Invalid Token ID";

    mapping(uint256 => bool) public withdrawnTokens;

    IERC721Metadata public erc721Contract;
    IRoyaltyGovernor public royaltyGovernorContract;
    MontageDataStorage public montageDataStorage;

    event RoyaltyGovernorContractChanged(address indexed royaltyGovernor);
    event MontageCreated(address indexed creator, uint256 indexed tokenId, uint256[] tokenIds);
    event MontageUnlockableUpdated(uint256 indexed tokenId);
    event MontageUnpacked(uint256 indexed tokenId);

    /**
     * @dev @notice Base URI for Montage NFT's off-chain images
     */
    string private mediaUriBase;

    /**
     * @dev @notice Base URI to view Montage NFT
     */
    string private viewUriBase;

    /** @dev Checks if token exists
     * @param _tokenId The token id to check if exists
     */
    modifier onlyExistingTokens(uint256 _tokenId) {
        require(_exists(_tokenId), INVALID_TOKEN_ID);
        _;
    }

    /** @dev Checks if sender is token owner
     * @param _tokenId The token id to check ownership
     */
    modifier onlyTokenOwner(uint256 _tokenId) {
        require(ownerOf(_tokenId) == msg.sender, "Address not token owner");
        _;
    }

    /** @dev Checks if sender is token creator
     * @param _tokenId The token id to check creation
     */
    modifier onlyTokenCreator(uint256 _tokenId) {
        require(montageDataStorage.getCreator(_tokenId) == msg.sender, "Address not token creator");
        _;
    }

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        IERC721Metadata _NFTAddr,
        MontageDataStorage _montageDataStorageAddr,
        address[] memory admins
    ) public ERC721(name, symbol) {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
        erc721Contract = _NFTAddr;
        montageDataStorage = _montageDataStorageAddr;

        _registerInterface(_INTERFACE_ID_ERC2981);
    }

    /**
     * @notice Set the Royalty Governer for creating `tokenURI` for each Montage NFT.
     * Only invokable by admin role.
     * @param _royaltyGovAddr base for the ERC721 tokenURI
     */
    function setRoyaltyGovernor(IRoyaltyGovernor _royaltyGovAddr) external onlyAdmin {
        royaltyGovernorContract = _royaltyGovAddr;
        emit RoyaltyGovernorContractChanged(address(_royaltyGovAddr));
    }

    /**
     * @notice Set the base URI for creating `tokenURI` for each Montage NFT.
     * Only invokable by admin role.
     * @param _tokenUriBase base for the ERC721 tokenURI
     */
    function setTokenUriBase(string calldata _tokenUriBase) external override onlyAdmin {
        // Set the base for metadata tokenURI
        _setBaseURI(_tokenUriBase);
    }

    /**
     * @notice Set the base URI for the image of each Montage NFT.
     * Only invokable by admin role.
     * @param _mediaUriBase base for the mediaURI shown in metadata for each Montage NFT
     */
    function setMediaUriBase(string calldata _mediaUriBase) external override onlyAdmin {
        // Set the base for metadata tokenURI
        mediaUriBase = _mediaUriBase;
    }

    /**
     * @notice Set the base URI for the viewing the Montage NFT
     * Only invokable by admin role.
     * @param _viewUriBase base URI for viewing a Montage NFT
     */
    function setViewUriBase(string calldata _viewUriBase) external override onlyAdmin {
        // Set the base for metadata tokenURI
        viewUriBase = _viewUriBase;
    }

    /**
     * @notice Get view URI for a given Montage NFT's Token ID.
     * @param _tokenId the Token ID of a previously minted Montage NFT
     * @return uri the off-chain URI to view the data
     */
    function viewURI(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(viewUriBase, _tokenId.toString()));
    }

    /**
     * @notice Get media URI for a given Montage NFT's Token ID.
     * @param _tokenId the Token ID of a previously minted Montage NFT's
     * @return uri the off-chain URI to the Montage NFT's image
     */
    function mediaURI(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(mediaUriBase, _tokenId.toString()));
    }

    /**
     * @notice Get the full contents of the montage (i.e. name and tokeids) for a given token ID.
     * @param _tokenId the id of a previously minted montage
     */
    function getMontageInformation(uint256 _tokenId)
        public
        override
        view
        onlyExistingTokens(_tokenId)
        returns (
            address creator,
            string memory name,
            string memory description,
            bool canBeUnpacked,
            uint256[] memory tokenIds
        )
    {
        return montageDataStorage.getMontageInformation(_tokenId);
    }

    /**
     * @notice Get the contents of the montage for a given token ID.
     * @param _tokenId the id of a previously minted montage
     * @return tokenIds the list of token ids in the montage
     */
    function getTokenIds(uint256 _tokenId)
        public
        override
        view
        onlyExistingTokens(_tokenId)
        returns (uint256[] memory tokenIds)
    {
        return montageDataStorage.getTokenIds(_tokenId);
    }

    /**
     * @notice Get the creator of the montage for a given token ID.
     * @param _tokenId the id of a previously minted montage
     * @return creator the address of the creator of the montage
     */
    function getCreator(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (address creator) {
        return montageDataStorage.getCreator(_tokenId);
    }

    /**
     * @notice Get the name of the montage for a given token ID.
     * @param _tokenId the id of a previously minted montage
     * @return name the name of the montage
     */
    function getName(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (string memory name) {
        return montageDataStorage.getName(_tokenId);
    }

    /**
     * @notice Get the description of the montage for a given token ID.
     * @param _tokenId the id of a previously minted montage
     * @return description the description of the montage
     */
    function getDescription(uint256 _tokenId)
        public
        override
        view
        onlyExistingTokens(_tokenId)
        returns (string memory description)
    {
        return montageDataStorage.getDescription(_tokenId);
    }

    /**
     * @notice Whether a montage for a given token ID can be unpacked.
     * @param _tokenId the id of a previously minted montage
     * @return true if the montage can be unpacked
     */
    function canBeUnpacked(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (bool) {
        return montageDataStorage.canBeUnpacked(_tokenId);
    }

    /**
     * @notice Get all view URIs for all nfts inside a given montage.
     * @param _tokenId the id of a previously minted Montage NFT
     * @return metadata the off-chain URIs to view the token metadata of each token in json format
     */
    function viewURIsInMontage(uint256 _tokenId)
        public
        override
        view
        onlyExistingTokens(_tokenId)
        returns (string memory metadata)
    {
        uint256[] memory tokenIds = getTokenIds(_tokenId);
        uint256 len = tokenIds.length;

        // start JSON object
        metadata = strConcat("{\n", '  "uris": [\n');

        // transfer ownership of nfts to this contract
        for (uint256 i = 0; i < len; i++) {
            // Media URI
            metadata = strConcat(metadata, '"');
            metadata = strConcat(metadata, erc721Contract.tokenURI(tokenIds[i]));
            metadata = strConcat(metadata, '"');
            if (i < len - 1) {
                metadata = strConcat(metadata, ", ");
            }
        }
        //close array
        metadata = strConcat(metadata, "\n  ]");

        // Finish JSON object
        metadata = strConcat(metadata, "\n}");
    }

    /*
     * creates a montage of the given token ids
     */
    function createMontage(
        string memory _name,
        string memory _description,
        bool _canBeUnpacked,
        uint256[] memory _tokenIds
    ) external override {
        uint256 len = _tokenIds.length;
        require(len <= BUNDLE_LIMIT && len > 0, "montage size exceeds limit");
        // transfer ownership of nfts to this contract
        for (uint256 i = 0; i < len; i++) {
            // if the sender is not the owner of the tokens it will cause a revert
            erc721Contract.transferFrom(msg.sender, address(this), _tokenIds[i]);
        }

        uint256 _id = montageDataStorage.createMontage(msg.sender, _name, _description, _canBeUnpacked, _tokenIds);

        _mint(msg.sender, _id);
        emit MontageCreated(msg.sender, _id, _tokenIds);
    }

    function setUnlockableContentUri(
        uint256 _tokenId,
        string memory unlockableContentUri,
        string memory unlockableDescription
    ) public override onlyTokenOwner(_tokenId) onlyTokenCreator(_tokenId) {
        montageDataStorage.setUnlockableContentUri(_tokenId, unlockableContentUri, unlockableDescription);

        emit MontageUnlockableUpdated(_tokenId);
    }

    function hasUnlockableContentUri(uint256 _tokenId) external override view returns (bool) {
        return montageDataStorage.hasUnlockableContentUri(_tokenId);
    }

    function getUnlockableContentUri(uint256 _tokenId)
        public
        override
        view
        onlyTokenOwner(_tokenId)
        returns (string memory unlockableContentUri)
    {
        return montageDataStorage.getUnlockableContentUri(_tokenId);
    }

    function getUnlockableDescription(uint256 _tokenId)
        public
        override
        view
        returns (string memory unlockableDescription)
    {
        return montageDataStorage.getUnlockableDescription(_tokenId);
    }

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

    /*
     * unpacks the montage, transferring ownership of the individual nfts inside the montage to the montage owner before burning the montage nft
     */
    function unpackMontage(uint256 _tokenId) external override onlyTokenOwner(_tokenId) {
        require(canBeUnpacked(_tokenId), "unpackMontage: cannot unpack this montage");
        uint256[] memory tokenIds = getTokenIds(_tokenId);

        uint256 len = tokenIds.length;
        // transfer ownership of nfts from this contract to the sender address
        for (uint256 i = 0; i < len; i++) {
            erc721Contract.transferFrom(address(this), msg.sender, tokenIds[i]);
        }

        _burn(_tokenId);
        emit MontageUnpacked(_tokenId);
    }

    function exists(uint256 _tokenId) external view returns (bool) {
        return _exists(_tokenId);
    }

    /**
     * @notice Concatenate two strings
     * @param _a the first string
     * @param _b the second string
     * @return result the concatenation of `_a` and `_b`
     */
    function strConcat(string memory _a, string memory _b) internal pure returns (string memory result) {
        result = string(abi.encodePacked(bytes(_a), bytes(_b)));
    }
}
