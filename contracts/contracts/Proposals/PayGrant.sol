// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Owned.sol";

contract PayGrant is Owned {
    address public payee;
    bool public isReleased;

    constructor(address _payee, address _timelock) payable Owned(_timelock) {
        payee = _payee;
        isReleased = false;
    }

    function releaseFunds() public onlyOwner {
        isReleased = true;
        payable(payee).transfer(address(this).balance);
    }

    receive() external payable {}
}
