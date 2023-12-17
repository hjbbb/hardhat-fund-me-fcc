// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

contract FunWithStorage {
    uint256 favoriteNumber; // Store at slot 0
    bool someBool; // Store at slot 1
    uint256[] myArray; /* Array Length Store at slot 2,
    but the objects will be keccak256(2), since 2 is the storage slot of the array */
    mapping(uint256 => bool) myMap; /* An empty slot is held at slot 3
    and the elements will be stored at keccak256(h(k) . p)

    p: The storage slot (aka, 3)
    k: The key in hex
    h: some function based on the type. For uint256, it just pads the hex */
    uint256 constant NOT_IN_STORAGE = 123;
    uint256 immutable i_not_in_storage;

    constructor() {
        favoriteNumber = 25;
        someBool = true;
        myArray.push(222);
        myMap[0] = true;
        i_not_in_storage = 123;
    }

    function doStuff() public {
        uint256 newVar = favoriteNumber + 1;
        bool otherVal = someBool;
    }
}
