// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

abstract contract Owned {
    address public owner;

    modifier onlyOwner() virtual {
        require(msg.sender == owner, "UNAUTHORIZED");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }
}
