// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./utils/Owned.sol";
import "./utils/ERC721TokenReceiver.sol";
import "./utils/ERC1155TokenReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Treasury Contract
/// @notice This contract serves as a treasury to manage and distribute native tokens and ERC20 tokens.
/// @dev This contract allows the owner to release native tokens and ERC20 tokens to specified recipients.
/// It inherits functionality from Owned, ERC721TokenReceiver, and ERC1155TokenReceiver contracts.
contract Treasury is Owned, ERC721TokenReceiver, ERC1155TokenReceiver {
    /// @notice Constructs the Treasury contract with a specified timelock contract address.
    /// @param _timelock The address of the timelock contract.
    constructor(address _timelock) payable Owned(_timelock) {}

    /// @notice Releases native tokens to a specified recipient.
    /// @param to The address to which native tokens will be transferred.
    /// @param amount The amount of native tokens to release.
    function releaseNativeToken(address to, uint256 amount) public onlyOwner {
        require(address(this).balance >= amount, "insufficient funds");
        payable(to).transfer(amount);
    }

    /// @notice Releases ERC20 tokens to a specified recipient.
    /// @param to The address to which ERC20 tokens will be transferred.
    /// @param amount The amount of ERC20 tokens to release.
    /// @param token The address of the ERC20 token contract.
    function releaseERC20Token(
        address to,
        uint256 amount,
        address token
    ) public onlyOwner {
        IERC20 tokenDAO = IERC20(token);
        require(
            tokenDAO.balanceOf(address(this)) >= amount,
            "insufficient funds"
        );
        require(tokenDAO.transfer(to, amount), "Transfer failed");
    }

    /// @dev Fallback function to receive native tokens.
    receive() external payable {}
}
