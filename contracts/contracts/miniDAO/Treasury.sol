// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./utils/Owned.sol";
import "./utils/ERC721TokenReceiver.sol";
import "./utils/ERC1155TokenReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury is Owned, ERC721TokenReceiver, ERC1155TokenReceiver {
    constructor(address _timelock) payable Owned(_timelock) {}

    function releaseNativeToken(address to, uint256 amount) public onlyOwner {
        require(address(this).balance >= amount, "insufficient funds");
        payable(to).transfer(amount);
    }

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

    receive() external payable {}
}
