// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "./utils/Owned.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/// @title TokenDAO Contract
/// @notice Token implementation with owner-managed voting and permissions capabilities
/// @dev The contract inherits ERC20, Owned, ERC20Permit, and ERC20Votes to provide standard token functionality and voting controls
contract TokenDAO is ERC20, Owned, ERC20Permit, ERC20Votes {
    /// @notice Contract initialization indicator, true if the contract has already been initialized
    /// @dev Notes that the tokens have been distributed
    bool isInit;

    /// @notice Constructs the TokenDAO contract with specified parameters.
    /// @param _timelock The address of the timelock contract.
    /// @param _name The name of the token.
    /// @param _symbol The symbol of the token.
    constructor(
        address _timelock,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) Owned(_timelock) ERC20Permit(_name) {}

    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    /// @notice Performs batch token allocation to specified addresses
    /// @dev The function should be called only once, the second call will cause an error.
    /// @param to Array of addresses to which tokens will be credited
    /// @param amount Array of token amounts that will be credited to the corresponding addresses
    function tokenDistribution(
        address[] memory to,
        uint256[] memory amount
    ) external {
        require(!isInit, "A function can be called only once");
        isInit = true;
        _mintBatch(to, amount);
    }

    /// @notice Mints tokens and assigns them to a specified recipient.
    /// @param to The address to which tokens will be minted.
    /// @param amount The amount of tokens to mint.
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /// @notice Mints tokens in batch and assigns them to specified recipients.
    /// @param to An array of addresses to which tokens will be minted.
    /// @param amount An array of amounts of tokens to mint corresponding to each address in 'to'.
    function mintBatch(
        address[] memory to,
        uint256[] memory amount
    ) public onlyOwner {
        _mintBatch(to, amount);
    }

    /// @dev Internal function to mint tokens in batch.
    function _mintBatch(address[] memory to, uint256[] memory amount) internal {
        require(to.length == amount.length, "Lengths don't match");
        uint256 len = to.length;
        for (uint i = 0; i < len; ++i) {
            _mint(to[i], amount[i]);
        }
    }

    // The following functions are overrides required by Solidity.
    /// @notice Updates balances on transfers and is called by auxiliary functions
    /// @dev Calls the `_update` function from the ERC20 and ERC20Votes base contracts
    /// to handle changes to votes and balances. This function is for internal use only.
    /// @param from Address of token sender
    /// @param to Address of token recipient
    /// @param value Number of tokens to be transferred
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    /// @notice Returns the number of used nonces for a particular owner (for the permissions mechanism)
    /// @dev Overrides the `nonces` function from the ERC20Permit and Nonces contracts to get the current owner nonce
    /// @param _owner Address of the owner for which to get the nonce
    /// @return nonce Number of nonces used by the owner
    function nonces(
        address _owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(_owner);
    }
}
