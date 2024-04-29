// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "./utils/Owned.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract TokenDAO is ERC20, Owned, ERC20Permit, ERC20Votes {
    constructor(
        address _timelock,
        string memory _name,
        string memory _symbol,
        address[] memory to,
        uint256[] memory amount
    ) ERC20(_name, _symbol) Owned(_timelock) ERC20Permit(_name) {
        _mintBatch(to, amount);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function mintBatch(
        address[] memory to,
        uint256[] memory amount
    ) public onlyOwner {
        _mintBatch(to, amount);
    }

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
