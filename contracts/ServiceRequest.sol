//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ServiceRequest {
  enum RequestStatus { OPEN, IN_PROGRESS, FULFILLED }

  struct Request {
    string requesterSubstrateAddress;
    string labSubstrateAddress;
    string country;
    string city;
    string serviceCategory;
    uint stakingAmount;
    RequestStatus status;
    bytes32 hash;
  }

  IERC20 public _token;

  constructor(address ERC20Address) {
    _token = IERC20(ERC20Address);
  }

  // total requests count
  uint requestCount;
  // All of the requests
  Request[] allRequests;

  // Hash -> Request
  mapping(bytes32 => Request) public requestByHash;
  // Country -> Request[]
  mapping(bytes32 => Request[]) public requestsByCountry;
  // Country,City -> Request[]
  mapping(bytes32 => Request[]) public requestsByCountryCity;
  // Substrate Address -> Request[]
  mapping(bytes32 => Request[]) public requestsBySubstrateAddress;

  event ServiceRequestCreated(Request request);

  function hashRequest(
    string memory requesterSubstrateAddress,
    string memory labSubstrateAddress,
    string memory country,
    string memory city,
    string memory serviceCategory,
    uint stakingAmount,
    uint index
  ) internal pure returns (bytes32 hash){
    return keccak256(abi.encodePacked(
      requesterSubstrateAddress,
      labSubstrateAddress,
      country,
      city,
      serviceCategory,
      stakingAmount,
      index
    ));
  }

  function createRequest(
    string memory requesterSubstrateAddress,
    string memory labSubstrateAddress,
    string memory country,
    string memory city,
    string memory serviceCategory,
    uint stakingAmount
  ) external {

    require(stakingAmount != 0, "Staking amount cannot be 0");
    // Transfer erc20 token from sender to this contract
    require(_token.transferFrom(msg.sender, address(this), stakingAmount), "Token staking failed");
    
    bytes32 requestHash = hashRequest(
      requesterSubstrateAddress,
      labSubstrateAddress,
      country,
      city,
      serviceCategory,
      stakingAmount,
      requestCount
    );

    Request memory request = Request(
      requesterSubstrateAddress,
      labSubstrateAddress,
      country,
      city,
      serviceCategory,
      stakingAmount,
      RequestStatus.OPEN,
      requestHash
    );

    allRequests.push(request);

    requestByHash[requestHash] = request;

    bytes32 countryKey = keccak256(abi.encodePacked(country));
    requestsByCountry[countryKey].push(request);

    bytes32 countryCityKey = keccak256(abi.encodePacked(country, city));
    requestsByCountryCity[countryCityKey].push(request);

    requestCount++;

    emit ServiceRequestCreated(request);
  }

  function getRequestCount() external view returns (uint) {
    return requestCount;
  }

  function getAllRequests() external view returns (Request[] memory) {
    return allRequests;
  }

  function getRequestByHash(bytes32 hash) external view returns (Request memory) {
    return requestByHash[hash];
  }

  function getRequestsByCountry(string memory country) external view returns (Request[] memory) {
    bytes32 countryKey = keccak256(abi.encodePacked(country));
    return requestsByCountry[countryKey];
  }

  function getRequestsByCountryCity(string memory country, string memory city) external view returns (Request[] memory) {
    bytes32 countryCityKey = keccak256(abi.encodePacked(country, city));
    return requestsByCountryCity[countryCityKey];
  }

  function getRequestsByRequesterSubstrateAddress(string memory requesterSubstrateAddress) external view returns (Request[] memory) {
    bytes32 requesterSubstrateAddressKey = keccak256(abi.encodePacked(requesterSubstrateAddress));
    return requestsBySubstrateAddress[requesterSubstrateAddressKey];
  }

  function fulfillRequest(bytes32 hash) external {
    requestByHash[hash].status = RequestStatus.FULFILLED;
  }
}
