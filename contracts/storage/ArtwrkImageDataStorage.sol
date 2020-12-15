pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract ArtwrkImageDataStorage is Ownable {
    using SafeMath for uint256;
    uint256 constant FILL_DATA_GAS_RESERVE = 46000;

    struct ArtWorkImageData {
        uint256[] colorIndex;
        uint256[] individualPixels;
        uint256[] pixelGroups;
        uint256[] pixelGroupIndexes;
        uint256[] transparentPixelGroups;
        uint256[] transparentPixelGroupIndexes;
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
        uint256 colorIndexLength,
        uint256 individualPixelsLength,
        uint256 pixelGroupsLength,
        uint256 pixelGroupIndexesLength,
        uint256 transparentPixelGroupsLength,
        uint256 transparentPixelGroupIndexesLength
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

        ArtWorkImageData storage _artworkImageData = artworkImageDatas[dataHash];

        uint256 len;
        uint256 index;

        // fill colour index
        if (gasleft() > FILL_DATA_GAS_RESERVE && colorIndex.length > 0) {
            index = _artworkImageData.colorIndex.length == 0 ? 0 : _artworkImageData.colorIndex.length + 1;

            len = colorIndex.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.colorIndex.push(colorIndex[index]);
                index++;
            }
        }

        // fill individualPixels index
        if (gasleft() > FILL_DATA_GAS_RESERVE && individualPixels.length > 0) {
            index = _artworkImageData.individualPixels.length == 0 ? 0 : _artworkImageData.individualPixels.length + 1;

            len = individualPixels.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.individualPixels.push(individualPixels[index]);
                index++;
            }
        }

        // fill pixelGroups index
        if (gasleft() > FILL_DATA_GAS_RESERVE && pixelGroups.length > 0) {
            index = _artworkImageData.pixelGroups.length == 0 ? 0 : _artworkImageData.pixelGroups.length + 1;

            len = pixelGroups.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.pixelGroups.push(pixelGroups[index]);
                index++;
            }
        }

        // fill pixelGroupIndexes index
        if (gasleft() > FILL_DATA_GAS_RESERVE && pixelGroupIndexes.length > 0) {
            index = _artworkImageData.pixelGroupIndexes.length == 0
                ? 0
                : _artworkImageData.pixelGroupIndexes.length + 1;

            len = pixelGroupIndexes.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.pixelGroupIndexes.push(pixelGroupIndexes[index]);
                index++;
            }
        }

        // fill transparentPixelGroups index
        if (gasleft() > FILL_DATA_GAS_RESERVE && transparentPixelGroups.length > 0) {
            index = _artworkImageData.transparentPixelGroups.length == 0
                ? 0
                : _artworkImageData.transparentPixelGroups.length + 1;

            len = transparentPixelGroups.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.transparentPixelGroups.push(transparentPixelGroups[index]);
                index++;
            }
        }

        // fill transparentPixelGroupIndexes index
        if (gasleft() > FILL_DATA_GAS_RESERVE && transparentPixelGroupIndexes.length > 0) {
            index = _artworkImageData.transparentPixelGroupIndexes.length == 0
                ? 0
                : _artworkImageData.transparentPixelGroupIndexes.length + 1;

            len = transparentPixelGroupIndexes.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.transparentPixelGroupIndexes.push(transparentPixelGroupIndexes[index]);
                index++;
            }
        }

        emit Filled(
            dataHash,
            _artworkImageData.colorIndex.length,
            _artworkImageData.individualPixels.length,
            _artworkImageData.pixelGroups.length,
            _artworkImageData.pixelGroupIndexes.length,
            _artworkImageData.transparentPixelGroups.length,
            _artworkImageData.transparentPixelGroupIndexes.length
        );
        return
            (colorIndex.length == _artworkImageData.colorIndex.length) &&
            (individualPixels.length == _artworkImageData.individualPixels.length) &&
            (pixelGroups.length == _artworkImageData.pixelGroups.length) &&
            (pixelGroupIndexes.length == _artworkImageData.pixelGroupIndexes.length) &&
            (transparentPixelGroups.length == _artworkImageData.transparentPixelGroups.length) &&
            (transparentPixelGroupIndexes.length == _artworkImageData.transparentPixelGroupIndexes.length);
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
            uint256 colorIndexLength,
            uint256 individualPixelsLength,
            uint256 pixelGroupsLength,
            uint256 pixelGroupIndexesLength,
            uint256 transparentPixelGroupsLength,
            uint256 transparentPixelGroupIndexesLength
        )
    {
        ArtWorkImageData memory _artworkImageData = artworkImageDatas[dataHash];

        return (
            _artworkImageData.colorIndex.length,
            _artworkImageData.individualPixels.length,
            _artworkImageData.pixelGroups.length,
            _artworkImageData.pixelGroupIndexes.length,
            _artworkImageData.transparentPixelGroups.length,
            _artworkImageData.transparentPixelGroupIndexes.length
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
