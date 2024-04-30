// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "./utils/Owned.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/// @title TokenDAO Contract
contract TokenDAO is ERC20, Owned, ERC20Permit, ERC20Votes {
    /// @notice Constructs the TokenDAO contract with specified parameters.
    /// @param _timelock The address of the timelock contract.
    /// @param _name The name of the token.
    /// @param _symbol The symbol of the token.
    /// @param _to The address to which the initial supply of tokens will be minted.
    /// @param _amount The initial supply of tokens.
    constructor(
        address _timelock,
        string memory _name,
        string memory _symbol,
        address _to,
        uint256 _amount
    ) ERC20(_name, _symbol) Owned(_timelock) ERC20Permit(_name) {
        _mint(_to, _amount);
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

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(
        address _owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(_owner);
    }
}
