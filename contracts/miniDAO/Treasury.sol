// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./utils/Owned.sol";
import "./utils/ERC721TokenReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Treasury Contract
/// @notice This contract serves as a treasury to manage and distribute native tokens and ERC20 tokens.
/// @dev This contract allows the owner to release native tokens and ERC20 tokens to specified recipients.
/// It inherits functionality from Owned, ERC721TokenReceiver, and ERC1155TokenReceiver contracts.
contract Treasury is Owned, ERC721TokenReceiver {
    /// @notice Constructs the Treasury contract with a specified timelock contract address.
    /// @param _timelock The address of the timelock contract.
    constructor(address _timelock) payable Owned(_timelock) {}

    /// @notice Sends a specified amount of the native blockchain currency to a given address
    /// @dev Ensures there are sufficient funds in the contract before attempting to send.
    /// @param to The recipient's address to which the native currency will be sent
    /// @param amount The amount of native currency to be sent
    function releaseNativeToken(address to, uint256 amount) public onlyOwner {
        // Verify the contract has enough native currency to complete the transfer
        require(address(this).balance >= amount, "insufficient funds");

        // Transfer the specified amount of native currency to the recipient
        payable(to).transfer(amount);
    }

    /// @notice Transfers a specified amount of ERC20 tokens to a given address
    /// @dev This function requires that the contract holds enough tokens before attempting transfer.
    /// @param to The recipient's address to which the tokens will be transferred
    /// @param amount The amount of ERC20 tokens to be transferred
    /// @param token The address of the ERC20 token contract
    function releaseERC20Token(
        address to,
        uint256 amount,
        address token
    ) public onlyOwner {
        IERC20 ERC20Token = IERC20(token);

        // Checks the contract's token balance to ensure it has enough tokens to transfer
        require(
            ERC20Token.balanceOf(address(this)) >= amount,
            "insufficient funds"
        );

        // Attempts to transfer the tokens and requires that the transfer is successful
        require(ERC20Token.transfer(to, amount), "Transfer failed");
    }

    /// @notice Transfers an ERC721 token from the contract to a specified address
    /// @dev Requires that the contract is the owner of the token and that it possesses at least one token.
    /// @param to The recipient address of the ERC721 token
    /// @param id The token ID of the ERC721 token to transfer
    /// @param token The address of the ERC721 token contract
    function releaseERC721Token(
        address to,
        uint256 id,
        address token
    ) public onlyOwner {
        IERC721 ERC721Token = IERC721(token);

        // Ensure the contract has at least one token to transfer
        require(ERC721Token.balanceOf(address(this)) > 0, "insufficient funds");

        // Ensure the contract is the current owner of the token id
        require(
            ERC721Token.ownerOf(id) == address(this),
            "We don't own the id"
        );

        // Execute the safe transfer of the token to the specified address
        ERC721Token.safeTransferFrom(address(this), to, id, "0x00");
        //ERC721Token.transferFrom(address(this), to, id);
    }

    /// @dev Fallback function to receive native tokens.
    receive() external payable {}
}
