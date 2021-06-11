// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

interface IMontage {
    function setTokenUriBase(string calldata _tokenUriBase) external;

    function setMediaUriBase(string calldata _tokenUriBase) external;

    function setViewUriBase(string calldata _tokenUriBase) external;

    function viewURI(uint256 _tokenId) external view returns (string memory uri);

    function mediaURI(uint256 _tokenId) external view returns (string memory uri);

    function getMontageInformation(uint256 _id)
        external
        view
        returns (
            address creator,
            string memory name,
            string memory description,
            bool canBeUnpacked,
            uint256[] memory tokenIds
        );

    function getTokenIds(uint256 _id) external view returns (uint256[] memory tokenIds);

    function getCreator(uint256 _id) external view returns (address creator);

    function getName(uint256 _id) external view returns (string memory name);

    function getDescription(uint256 _id) external view returns (string memory description);

    function canBeUnpacked(uint256 _id) external view returns (bool);

    function viewURIsInMontage(uint256 _id) external view returns (string memory metadata);

    function createMontage(
        string memory _name,
        string memory _description,
        bool _canBeUnpacked,
        uint256[] memory _tokenIds
    ) external;

    function setUnlockableContentUri(
        uint256 id,
        string memory unlockableContentUri,
        string memory unlockableDescription
    ) external;

    function hasUnlockableContentUri(uint256 _id) external view returns (bool);

    function getUnlockableContentUri(uint256 _id) external view returns (string memory unlockableContentUri);

    function getUnlockableDescription(uint256 _id) external view returns (string memory unlockableDescription);

    function unpackMontage(uint256 _id) external;
}
