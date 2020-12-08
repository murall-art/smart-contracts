pragma solidity ^0.6.0;

import {PaintToken} from "./PaintToken.sol";
import {MurAllNFT} from "./MurAllNFT.sol";
import {DataValidator} from "./validator/DataValidator.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MurAll is ReentrancyGuard, AccessControl {
    using SafeMath for uint256;
    // Create a new role identifier for the minter role
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 constant PRICE_PER_PIXEL = 500000000000000000;

    PaintToken public paintToken;
    MurAllNFT public murAllNFT;
    DataValidator public dataValidator;

    mapping(address => bool) public artists;
    uint256 public totalArtists;

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    constructor(
        PaintToken _tokenAddr,
        MurAllNFT _murAllNFTAddr,
        DataValidator _validatorAddr,
        address[] memory admins
    ) public {
        paintToken = _tokenAddr;
        murAllNFT = _murAllNFTAddr;
        dataValidator = _validatorAddr;
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
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

    //Declare an Event for when a new validator is set
    event NewDataValidatorSet(address dataValidator);

    /**
     * @param colorIndex                - Color index defining the 256 colors the pixels reference at display time (RGB565 format, 2 bytes per color)
     * @param individualPixels          - Individual pixel references to the color index (1 byte) twinned with respective group position (2 bytes) and place within the group (1 byte) - 8 pixels per uint256
     * @param pixelGroups               - RGB pixels in groups of 32 (1 pixel reference every 1 byte)
     * @param pixelGroupIndexes         - Group indexes matching the groups (1 index for every 2 bytes, 16 indexes per 32 byte entry)
     * @param metadata                  - Array of 2 metadata items in order: name (32 byte string converted to uint256), other metadata (formatted byte array consiting of number, seriesId, and alpha channel flag which takes the first colour as alpha)
     */
    function setPixels(
        uint256[] memory colorIndex,
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[2] memory metadata
    ) public nonReentrant {
        require(colorIndex.length <= 16, "colour index too large"); // max 256 colors in groups of 16 (16 groups of 16 colors = 256 colors)

        uint256 pixelCount = dataValidator.validateSinglePixelData(individualPixels);
        pixelCount = pixelCount.add(dataValidator.validatePixelGroupData(pixelGroups, pixelGroupIndexes, metadata));
        require(pixelCount > 0, "No pixels to draw");

        paintToken.burnFrom(msg.sender, PRICE_PER_PIXEL.mul(pixelCount));

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

    /**
     * @notice Set the DataValidator for validating the MurAll drawings.
     * Only invokable by admin role.
     * @param _dataValidator address of the DataValidator
     */
    function setDataValidator(DataValidator _dataValidator) external onlyAdmin {
        dataValidator = _dataValidator;
        emit NewDataValidatorSet(address(dataValidator));
    }
}
