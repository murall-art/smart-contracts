// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MontageDataStorage is Ownable {
    using SafeMath for uint256;
    string public constant INVALID_TOKEN_ID = "Invalid Token ID";

    struct MontageData {
        address creator;
        string name;
        string description;
        bool canBeUnpacked;
        uint256[] tokenIds;
        string unlockableContentUri;
        string unlockableDescription;
    }
    MontageData[] montageDatas;

    /** @dev Checks if token exists
     * @param _tokenId The token id to check if exists
     */
    modifier onlyExistingTokens(uint256 _tokenId) {
        require(_tokenId < montageDatas.length, INVALID_TOKEN_ID);
        _;
    }

    /*
     * creates a montage of the given token ids
     */
    function createMontage(
        address creator,
        string memory _name,
        string memory _description,
        bool _canBeUnpacked,
        uint256[] memory _tokenIds
    ) external onlyOwner returns (uint256) {
        // create the montage object
        MontageData memory _montage = MontageData(creator, _name, _description, _canBeUnpacked, _tokenIds, "", "");

        // push the montage to the array
        montageDatas.push(_montage);
        uint256 _id = montageDatas.length - 1;
        return _id;
    }

    /**
     * @notice Get the full contents of the montage (i.e. name and tokeids) for a given token ID.
     * @param tokenId the id of a previously minted montage
     */
    function getMontageInformation(uint256 tokenId)
        public
        view
        onlyExistingTokens(tokenId)
        returns (
            address creator,
            string memory name,
            string memory description,
            bool canBeUnpacked,
            uint256[] memory tokenIds
        )
    {
        MontageData memory _montage = montageDatas[tokenId];
        tokenIds = _montage.tokenIds;
        name = _montage.name;
        description = _montage.description;
        canBeUnpacked = _montage.canBeUnpacked;
        creator = _montage.creator;
    }

    /**
     * @notice Get the contents of the montage for a given token ID.
     * @param tokenId the id of a previously minted montage
     * @return tokenIds the list of token ids in the montage
     */
    function getTokenIds(uint256 tokenId) public view onlyExistingTokens(tokenId) returns (uint256[] memory tokenIds) {
        MontageData memory _montage = montageDatas[tokenId];
        tokenIds = _montage.tokenIds;
    }

    /**
     * @notice Get the name of the montage for a given token ID.
     * @param tokenId the id of a previously minted montage
     * @return name the name of the montage
     */
    function getName(uint256 tokenId) public view onlyExistingTokens(tokenId) returns (string memory name) {
        MontageData memory _montage = montageDatas[tokenId];

        name = _montage.name;
    }

    /**
     * @notice Get the description of the montage for a given token ID.
     * @param tokenId the id of a previously minted montage
     * @return description the description of the montage
     */
    function getDescription(uint256 tokenId)
        public
        view
        onlyExistingTokens(tokenId)
        returns (string memory description)
    {
        MontageData memory _montage = montageDatas[tokenId];

        description = _montage.description;
    }

    /**
     * @notice Get the creator address of the montage for a given token ID.
     * @param tokenId the id of a previously minted montage
     * @return creator the address of the creator of the montage
     */
    function getCreator(uint256 tokenId) public view onlyExistingTokens(tokenId) returns (address creator) {
        MontageData memory _montage = montageDatas[tokenId];

        creator = _montage.creator;
    }

    /**
     * @notice Whether a montage for a given token ID can be unpacked.
     * @param tokenId the id of a previously minted montage
     * @return true if the montage can be unpacked
     */
    function canBeUnpacked(uint256 tokenId) public view onlyExistingTokens(tokenId) returns (bool) {
        MontageData memory _montage = montageDatas[tokenId];

        return _montage.canBeUnpacked;
    }

    function setUnlockableContentUri(
        uint256 tokenId,
        string memory unlockableContentUri,
        string memory unlockableDescription
    ) public onlyOwner onlyExistingTokens(tokenId) {
        MontageData storage _montage = montageDatas[tokenId];

        _montage.unlockableContentUri = unlockableContentUri;
        _montage.unlockableDescription = unlockableDescription;
    }

    function hasUnlockableContentUri(uint256 tokenId) external view onlyExistingTokens(tokenId) returns (bool) {
        MontageData memory _montage = montageDatas[tokenId];
        bytes memory uriBytes = bytes(_montage.unlockableContentUri);
        return uriBytes.length != 0;
    }

    function getUnlockableContentUri(uint256 tokenId)
        public
        view
        onlyOwner
        onlyExistingTokens(tokenId)
        returns (string memory unlockableContentUri)
    {
        MontageData memory _montage = montageDatas[tokenId];

        return _montage.unlockableContentUri;
    }

    function getUnlockableDescription(uint256 tokenId)
        external
        view
        onlyExistingTokens(tokenId)
        returns (string memory unlockableDescription)
    {
        MontageData memory _montage = montageDatas[tokenId];

        return _montage.unlockableDescription;
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
