// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.6;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {IAccessRestriction} from "./../../access/IAccessRestriction.sol";
import {ILRT} from "./../erc20/ILRT.sol";
import {ILandRocker} from "./../../landrocker/ILandRocker.sol";
import {ILRTVesting} from "./../../vesting/ILRTVesting.sol";
import {ILandRockerERC1155} from "./ILandRockerERC1155.sol";
import {ILandRockerERC1155Factory} from "./ILandRockerERC1155Factory.sol";

/**
 * @title LandRockerERC1155Factory
 * @dev A contract for creating and managing LandRockerERC1155 clones.
 * This contract implements the ILandRockerERC1155Factory interface.
 */
contract LandRockerERC1155Factory is ILandRockerERC1155Factory {
    using Counters for Counters.Counter;

    // Access control reference
    IAccessRestriction public accessRestriction;
    // LandRockerERC1155 reference
    ILandRockerERC1155 public landrocker1155;

    // The address of the implementation contract used for cloning.
    address public override implementationAddress;

    Counters.Counter private _cloneId;

    mapping(uint256 => address) public override landRockerERC1155Clones;
    mapping(address => address) public override landRockerERC1155Creators;
    mapping(bytes32 => bool) public override isUsedCollection;

    /**
     * @dev Modifier to ensure only an admin can call the function.
     */
    modifier onlyAdmin() {
        accessRestriction.ifAdmin(msg.sender);
        _;
    }

    /**
     * @dev Modifier to check if an address is valid.
     * @param _address The address to check.
     */
    modifier validAddress(address _address) {
        require(
            _address != address(0),
            "LandRockerERC1155Factory::Not valid address"
        );
        _;
    }

    /**
     * @dev Constructor to initialize the factory with the address of the access restriction contract.
     * @param _accessRestriction The address of the access restriction contract.
     */
    constructor(address _accessRestriction) {
        accessRestriction = IAccessRestriction(_accessRestriction);
    }

    /**
     * @dev Sets the address of the implementation contract used for cloning.
     * @param _implementationAddress The address of the implementation contract.
     */
    function setImplementationAddress(
        address _implementationAddress
    ) external override onlyAdmin validAddress(_implementationAddress) {
        implementationAddress = _implementationAddress;
        emit UpdateImplementationAddress(_implementationAddress);
    }

    /**
     * @dev Creates a new LandRockerERC1155 clone with the provided parameters.
     * @param _name The name of the collection.
     * @param _symbol The symbol of the collection.
     * @param _receiver The address of the royalty recipient.
     * @param _feeNumerator The numerator of the royalty fee.
     * @param _baseURI The base URI for token metadata.
     */
    function createLandRockerERC1155(
        string memory _name,
        string memory _symbol,
        address _receiver,
        uint96 _feeNumerator,
        string memory _baseURI
    ) external override onlyAdmin {
        require(
            isUsedCollection[keccak256(abi.encodePacked(_name))] == false,
            "LandRockerERC1155Factory::Duplicate collection name"
        );

        require(
            implementationAddress != address(0),
            "LandRockerERC1155Factory::Implementation address has not been set"
        );

        // Clone a new LandRockerERC1155 contract from the provided implementation.
        landrocker1155 = ILandRockerERC1155(
            Clones.clone(implementationAddress)
        );

        // Initialize the cloned contract with the provided parameters.
        landrocker1155.erc1155Init(
            _name,
            _symbol,
            _receiver,
            _feeNumerator,
            _baseURI,
            address(accessRestriction)
        );

        // Record the creator of this clone.
        landRockerERC1155Creators[address(landrocker1155)] = msg.sender;
        // Store the address of the cloned contract and mark the collection name as used.
        landRockerERC1155Clones[_cloneId.current()] = (address(landrocker1155));

        isUsedCollection[keccak256(abi.encodePacked(_name))] = true;
        _cloneId.increment();

        emit LandRockerERC1155Created(
            address(landrocker1155),
            _name,
            _symbol,
            _baseURI
        );
    }
}
