pragma solidity ^0.6.0;

import {PaintToken} from "./PaintToken.sol";
import {MurAllNFT} from "./MurAllNFT.sol";
import {DataValidator} from "./validator/DataValidator.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MurAll is ReentrancyGuard {
    uint256 constant NUM_OF_GROUPS = 64800; // 2073600 pixels / 32 pixels per group
    uint256 constant MAX_PIXEL_RES = 2073600;
    uint256 constant NUMBER_PER_GROUP = 32;
    uint256 constant NUMBER_PER_INDEX_GROUP = 16;

    uint256 constant PRICE_PER_PIXEL = 500000000000000000;

    PaintToken public paintToken;
    MurAllNFT public murAllNFT;
    DataValidator public dataValidator;

    mapping(address => bool) public artists;
    uint256 public totalArtists;

    constructor(
        PaintToken _tokenAddr,
        MurAllNFT _murAllNFTAddr,
        DataValidator _validatorAddr
    ) public {
        paintToken = _tokenAddr;
        murAllNFT = _murAllNFTAddr;
        dataValidator = _validatorAddr;
    }

    //Declare an Event for when canvas is written to
    event Painted(
        address indexed artist,
        uint256 indexed tokenId,
        uint256[] colorIndex,
        uint256[] pixelData,
        uint256[] pixelGroups,
        uint256[] pixelGroupIndexes,
        uint256[2] metadata
    );

    /**
     * @param colorIndex           - color index defining the 256 colors the pixels reference at display time (RGB565 format, 2 bytes per color)
     * @param individualPixels     - individual pixel references to the color index (1 bytes) twinned with their respective positions (3 bytes) - 8 pixels per uint256
     * @param pixelGroups          - RGB pixels in groups of 32 (1 pixel reference every 1 byte)
     * @param pixelGroupIndexes    - Group indexes matching the groups (1 index for every 2 bytes, 16 indexes per 32 byte entry)
     * @param metadata             - an array of 2 metadata items in order: name (32 byte string converted to uint256), other metadata (formatted byte array consiting of number, seriesId, alpha channel and alpha channel flag)
     */
    function setPixels(
        uint256[] memory colorIndex,
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[2] memory metadata
    ) public nonReentrant {
        require(colorIndex.length <= 16, "colour index too large"); // max 256 colors in groups of 16 (16 groups of 16 colors = 256 colors)

        uint256 pixelCount = dataValidator.validate(individualPixels, pixelGroups, pixelGroupIndexes);

        paintToken.burnFrom(msg.sender, PRICE_PER_PIXEL * pixelCount);

        uint256 tokenId = murAllNFT.mint(
            msg.sender,
            colorIndex,
            individualPixels,
            pixelGroups,
            pixelGroupIndexes,
            metadata
        );

        // add address to available list of artists
        if (!isArtist(msg.sender)) {
            artists[msg.sender] = true;
            totalArtists++;
        }

        emit Painted(msg.sender, tokenId, colorIndex, individualPixels, pixelGroups, pixelGroupIndexes, metadata);
    }

    function isArtist(address userAddress) public view returns (bool) {
        return artists[userAddress];
    }

    function getCostPerPixel() public pure returns (uint256 costInWei) {
        return PRICE_PER_PIXEL;
    }
}
