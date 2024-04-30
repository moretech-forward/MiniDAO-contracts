// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title Owned Contract
/// @notice This contract defines ownership functionality.
abstract contract Owned {
    /// @notice The address of the owner.
    address public owner;

    /// @notice Modifier to restrict access to only the owner.
    modifier onlyOwner() virtual {
        require(msg.sender == owner, "UNAUTHORIZED");
        _;
    }

    /// @notice Constructs the Owned contract with a specified owner.
    /// @param _owner The address to set as the owner.
    constructor(address _owner) {
        owner = _owner;
    }
}
