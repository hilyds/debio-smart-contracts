//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LabRequest {
  struct Request {
    string substrateAddress;
    string country;
    string city;
    string testCategory;
    uint stakingAmount;
  }

  IERC20 public _token;

  constructor(address ERC20Address) public {
    _token = IERC20(ERC20Address);
  }

  // All of the requests
  Request[] allRequests;

  // Country -> Request[]
  mapping(bytes32 => Request[]) public requestsByCountry;
  // Country,City -> Request[]
  mapping(bytes32 => Request[]) public requestsByCountryCity;
  // Substrate Address -> Request[]
  mapping(bytes32 => Request[]) public requestsBySubstrateAddress;

  event LabRequestCreated(Request request);

  function createRequest(
    string memory substrateAddress,
    string memory country,
    string memory city,
    string memory testCategory,
    uint stakingAmount
  ) external {

    require(stakingAmount != 0, "Staking amount cannot be 0");
    // Transfer erc20 token from sender to this contract
    require(_token.transferFrom(msg.sender, address(this), stakingAmount), "Token staking failed");
    
    Request memory request = Request(substrateAddress, country, city, testCategory, stakingAmount);

    allRequests.push(request);

    bytes32 countryKey = keccak256(abi.encodePacked(country));
    requestsByCountry[countryKey].push(request);

    bytes32 countryCityKey = keccak256(abi.encodePacked(country, city));
    requestsByCountryCity[countryCityKey].push(request);

    emit LabRequestCreated(request);
  }

  function getAllRequests() public view returns (Request[] memory) {
    return allRequests;
  }

  function getRequestsByCountry(string memory country) external view returns (Request[] memory) {
    bytes32 countryKey = keccak256(abi.encodePacked(country));
    return requestsByCountry[countryKey];
  }

  function getRequestsByCountryCity(string memory country, string memory city) external view returns (Request[] memory) {
    bytes32 countryCityKey = keccak256(abi.encodePacked(country, city));
    return requestsByCountryCity[countryCityKey];
  }

  function getRequestsBySubstrateAddress(string memory substrateAddress) external view returns (Request[] memory) {
    bytes32 substrateAddressKey = keccak256(abi.encodePacked(substrateAddress));
    return requestsBySubstrateAddress[substrateAddressKey];
  }
}
