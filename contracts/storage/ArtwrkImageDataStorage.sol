pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract ArtwrkImageDataStorage is Ownable {
    using SafeMath for uint256;
    uint256 constant FILL_DATA_GAS_RESERVE = 50000;

    struct ArtWorkImageData {
        uint256[] colorIndex;
        uint256[] individualPixels;
        uint256[] pixelGroups;
        uint256[] pixelGroupIndexes;
        uint256[] transparentPixelGroups;
        uint256[] transparentPixelGroupIndexes;
        uint24 colorIndexCompleteToIndex;
        uint24 individualPixelsCompleteToIndex;
        uint24 pixelGroupsCompleteToIndex;
        uint24 pixelGroupIndexesCompleteToIndex;
        uint24 transparentPixelGroupsCompleteToIndex;
        uint24 transparentPixelGroupIndexesCompleteToIndex;
        uint24 exists;
    }
    mapping(bytes32 => ArtWorkImageData) private artworkImageDatas;

    /** @dev Checks if artwork is filled
     * @param dataHash The hash to check if filled with artwork data
     */
    modifier onlyFilledArtwork(bytes32 dataHash) {
        require(isArtworkFilled(dataHash), "Artwork is not filled");
        _;
    }

    event Filled(
        bytes32 dataHash,
        uint24 colorIndexCompleteToIndex,
        uint24 individualPixelsCompleteToIndex,
        uint24 pixelGroupsCompleteToIndex,
        uint24 pixelGroupIndexesCompleteToIndex,
        uint24 transparentPixelGroupsCompleteToIndex,
        uint24 transparentPixelGroupIndexesCompleteToIndex
    );

    function fillData(
        uint256[] memory colorIndex,
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[] memory transparentPixelGroups,
        uint256[] memory transparentPixelGroupIndexes
    ) public onlyOwner returns (bool) {
        bytes32 dataHash = keccak256(
            abi.encodePacked(
                colorIndex,
                individualPixels,
                pixelGroups,
                pixelGroupIndexes,
                transparentPixelGroups,
                transparentPixelGroupIndexes
            )
        );
        require(!isArtworkFilled(dataHash), "Artwork is already filled");
        if (artworkImageDatas[dataHash].exists == 0) {
            artworkImageDatas[dataHash] = ArtWorkImageData(
                new uint256[](colorIndex.length),
                new uint256[](individualPixels.length),
                new uint256[](pixelGroups.length),
                new uint256[](pixelGroupIndexes.length),
                new uint256[](transparentPixelGroups.length),
                new uint256[](transparentPixelGroupIndexes.length),
                0,
                0,
                0,
                0,
                0,
                0,
                1
            );
        }
        ArtWorkImageData storage _artworkImageData = artworkImageDatas[dataHash];

        uint256 len;
        uint24 index;
        uint24 lastIndex;

        // fill colour index
        if (gasleft() > FILL_DATA_GAS_RESERVE && colorIndex.length > 0) {
            index = _artworkImageData.colorIndexCompleteToIndex == 0
                ? 0
                : _artworkImageData.colorIndexCompleteToIndex + 1;

            len = colorIndex.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.colorIndex[index] = colorIndex[index];
                lastIndex = index;
                index++;
            }
            _artworkImageData.colorIndexCompleteToIndex = lastIndex;
        }

        // fill individualPixels index
        if (gasleft() > FILL_DATA_GAS_RESERVE && individualPixels.length > 0) {
            index = _artworkImageData.individualPixelsCompleteToIndex == 0
                ? 0
                : _artworkImageData.individualPixelsCompleteToIndex + 1;

            len = individualPixels.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.individualPixels[index] = individualPixels[index];
                lastIndex = index;
                index++;
            }
            _artworkImageData.individualPixelsCompleteToIndex = lastIndex;
        }

        // fill pixelGroups index
        if (gasleft() > FILL_DATA_GAS_RESERVE && pixelGroups.length > 0) {
            index = _artworkImageData.pixelGroupsCompleteToIndex == 0
                ? 0
                : _artworkImageData.pixelGroupsCompleteToIndex + 1;

            len = pixelGroups.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.pixelGroups[index] = pixelGroups[index];
                lastIndex = index;
                index++;
            }
            _artworkImageData.pixelGroupsCompleteToIndex = lastIndex;
        }

        // fill pixelGroupIndexes index
        if (gasleft() > FILL_DATA_GAS_RESERVE && pixelGroupIndexes.length > 0) {
            index = _artworkImageData.pixelGroupIndexesCompleteToIndex == 0
                ? 0
                : _artworkImageData.pixelGroupIndexesCompleteToIndex + 1;

            len = pixelGroupIndexes.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.pixelGroupIndexes[index] = pixelGroupIndexes[index];
                lastIndex = index;
                index++;
            }
            _artworkImageData.pixelGroupIndexesCompleteToIndex = lastIndex;
        }

        // fill transparentPixelGroups index
        if (gasleft() > FILL_DATA_GAS_RESERVE && transparentPixelGroups.length > 0) {
            index = _artworkImageData.transparentPixelGroupsCompleteToIndex == 0
                ? 0
                : _artworkImageData.transparentPixelGroupsCompleteToIndex + 1;

            len = transparentPixelGroups.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.transparentPixelGroups[index] = transparentPixelGroups[index];
                lastIndex = index;
                index++;
            }
            _artworkImageData.transparentPixelGroupsCompleteToIndex = lastIndex;
        }

        // fill transparentPixelGroupIndexes index
        if (gasleft() > FILL_DATA_GAS_RESERVE && transparentPixelGroupIndexes.length > 0) {
            index = _artworkImageData.transparentPixelGroupIndexesCompleteToIndex == 0
                ? 0
                : _artworkImageData.transparentPixelGroupIndexesCompleteToIndex + 1;

            len = transparentPixelGroupIndexes.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.transparentPixelGroupIndexes[index] = transparentPixelGroupIndexes[index];
                lastIndex = index;
                index++;
            }
            _artworkImageData.transparentPixelGroupIndexesCompleteToIndex = lastIndex;
        }
        emit Filled(
            dataHash,
            _artworkImageData.colorIndexCompleteToIndex,
            _artworkImageData.individualPixelsCompleteToIndex,
            _artworkImageData.pixelGroupsCompleteToIndex,
            _artworkImageData.pixelGroupIndexesCompleteToIndex,
            _artworkImageData.transparentPixelGroupsCompleteToIndex,
            _artworkImageData.transparentPixelGroupIndexesCompleteToIndex
        );
        return
            (colorIndex.length == 0 || _artworkImageData.colorIndexCompleteToIndex == colorIndex.length.sub(1)) &&
            (individualPixels.length == 0 ||
                _artworkImageData.individualPixelsCompleteToIndex == individualPixels.length.sub(1)) &&
            (pixelGroups.length == 0 || _artworkImageData.pixelGroupsCompleteToIndex == pixelGroups.length.sub(1)) &&
            (pixelGroupIndexes.length == 0 ||
                _artworkImageData.pixelGroupIndexesCompleteToIndex == pixelGroupIndexes.length.sub(1)) &&
            (transparentPixelGroups.length == 0 ||
                _artworkImageData.transparentPixelGroupsCompleteToIndex == transparentPixelGroups.length.sub(1)) &&
            (transparentPixelGroupIndexes.length == 0 ||
                _artworkImageData.transparentPixelGroupIndexesCompleteToIndex ==
                transparentPixelGroupIndexes.length.sub(1));
    }

    function isArtworkFilled(bytes32 dataHash) public view returns (bool) {
        ArtWorkImageData memory _artworkImageData = artworkImageDatas[dataHash];
        return
            dataHash ==
            keccak256(
                abi.encodePacked(
                    _artworkImageData.colorIndex,
                    _artworkImageData.individualPixels,
                    _artworkImageData.pixelGroups,
                    _artworkImageData.pixelGroupIndexes,
                    _artworkImageData.transparentPixelGroups,
                    _artworkImageData.transparentPixelGroupIndexes
                )
            );
    }

    function getArtworkFillCompletionStatus(bytes32 dataHash)
        public
        view
        returns (
            uint24 colorIndexCompleteToIndex,
            uint24 individualPixelsCompleteToIndex,
            uint24 pixelGroupsCompleteToIndex,
            uint24 pixelGroupIndexesCompleteToIndex,
            uint24 transparentPixelGroupsCompleteToIndex,
            uint24 transparentPixelGroupIndexesCompleteToIndex
        )
    {
        ArtWorkImageData memory _artworkImageData = artworkImageDatas[dataHash];

        return (
            _artworkImageData.colorIndexCompleteToIndex,
            _artworkImageData.individualPixelsCompleteToIndex,
            _artworkImageData.pixelGroupsCompleteToIndex,
            _artworkImageData.pixelGroupIndexesCompleteToIndex,
            _artworkImageData.transparentPixelGroupsCompleteToIndex,
            _artworkImageData.transparentPixelGroupIndexesCompleteToIndex
        );
    }

    function getArtworkForDataHash(bytes32 dataHash)
        public
        view
        onlyFilledArtwork(dataHash)
        returns (
            uint256[] memory colorIndex,
            uint256[] memory individualPixels,
            uint256[] memory pixelGroups,
            uint256[] memory pixelGroupIndexes,
            uint256[] memory transparentPixelGroups,
            uint256[] memory transparentPixelGroupIndexes
        )
    {
        ArtWorkImageData memory _artworkImageData = artworkImageDatas[dataHash];
        return (
            _artworkImageData.colorIndex,
            _artworkImageData.individualPixels,
            _artworkImageData.pixelGroups,
            _artworkImageData.pixelGroupIndexes,
            _artworkImageData.transparentPixelGroups,
            _artworkImageData.transparentPixelGroupIndexes
        );
    }

    function getColorIndexForDataHash(bytes32 dataHash)
        public
        view
        onlyFilledArtwork(dataHash)
        returns (uint256[] memory colorIndex)
    {
        return artworkImageDatas[dataHash].colorIndex;
    }
}
