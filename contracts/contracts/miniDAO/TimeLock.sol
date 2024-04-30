// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title TimeLock Contract
/// @notice This contract represents a timelock controller.
contract TimeLock is TimelockController {
    /// @notice Constructs the TimeLock contract with specified parameters.
    /// @param _minDelay The minimum delay for a proposal to be executed (in timestamp).
    /// @param _proposers An array of addresses that can propose actions.
    /// @param _executors An array of addresses that can execute actions.
    /// @param _admin The admin address.
    constructor(
        uint256 _minDelay,
        address[] memory _proposers,
        address[] memory _executors,
        address _admin
    ) TimelockController(_minDelay, _proposers, _executors, _admin) {}
}
