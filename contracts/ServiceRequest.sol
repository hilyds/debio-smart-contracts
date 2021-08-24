//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IEscrow.sol";

contract ServiceRequest {
  enum RequestStatus { OPEN, CLAIMED }

  struct Request {
    address requesterAddress;
    address labAddress;
    string country;
    string city;
    string serviceCategory;
    uint stakingAmount;
    RequestStatus status;
    bytes32 hash;
    bool exists;
  }

  IERC20 public _token;
  address public _daoGenics;
  IEscrow public _escrowContract;
  address public _escrowAdmin;

  constructor(address ERC20Address, address daoGenics, address escrowContract, address escrowAdmin) {
    _token = IERC20(ERC20Address);
    _daoGenics = daoGenics;
    _escrowContract = IEscrow(escrowContract);
    _escrowAdmin = escrowAdmin;
  }

  /**
  * validLabServices
  * 
  * This is used to validate whether or not a lab can claim a request
  * DAOGenics will validate lab's service and insert it to this mapping
  * 
  * labID: ethAddress => serviceCategory: string => serviceID: hash
  */
  mapping(address => mapping(string => bytes32)) public validLabServices;

  // total requests count
  uint requestCount;
  // All of the requests
  bytes32[] allRequests;

  // Hash -> Request
  mapping(bytes32 => Request) public requestByHash;
  // Country -> RequestHash[]
  mapping(bytes32 => bytes32[]) public requestsByCountry;
  // Country,City -> RequestHash[]
  mapping(bytes32 => bytes32[]) public requestsByCountryCity;
  // Requester Address -> RequestHash[]
  mapping(address => bytes32[]) public requestsByRequesterAddress;
  // Lab Address -> RequestHash[] - Claimed Requests Hashes
  mapping(address => bytes32[]) public requestsByLabAddress;

  event ServiceRequestCreated(Request request);
  event LabServiceValidated(address labAddress, string serviceCategory, bytes32 serviceId);
  event RequestClaimed(address labAddress, bytes32 requestHash);
  event RequestProcessed(
    bytes32 requestHash,
    bytes32 orderId,
    bytes32 serviceId,
    string customerSubstrateAddress,
    string sellerSubstrateAddress,
    address customerAddress,
    address sellerAddress,
    string dnaSampleTrackingId,
    uint testingPrice,
    uint qcPrice
  );

  function hashRequest(
    address requesterAddress,
    string memory country,
    string memory city,
    string memory serviceCategory,
    uint stakingAmount,
    uint index
  ) internal pure returns (bytes32 hash){
    return keccak256(abi.encodePacked(
      requesterAddress,
      country,
      city,
      serviceCategory,
      stakingAmount,
      index
    ));
  }

  function createRequest(
    string memory country,
    string memory city,
    string memory serviceCategory,
    uint stakingAmount
  ) external {

    require(stakingAmount != 0, "Staking amount cannot be 0");
    // Transfer erc20 token from sender to this contract
    require(_token.transferFrom(msg.sender, address(this), stakingAmount), "Token staking failed");
    
    bytes32 requestHash = hashRequest(
      msg.sender,
      country,
      city,
      serviceCategory,
      stakingAmount,
      requestCount + 1
    );

    Request memory request = Request(
      msg.sender,
      address(0), // Default Lab Address is null
      country,
      city,
      serviceCategory,
      stakingAmount,
      RequestStatus.OPEN,
      requestHash,
      true
    );

    allRequests.push(requestHash);

    requestByHash[requestHash] = request;

    bytes32 countryKey = keccak256(abi.encodePacked(country));
    requestsByCountry[countryKey].push(requestHash);

    bytes32 countryCityKey = keccak256(abi.encodePacked(country, city));
    requestsByCountryCity[countryCityKey].push(requestHash);

    requestsByRequesterAddress[msg.sender].push(requestHash);

    requestCount++;

    emit ServiceRequestCreated(request);
  }

  function getRequestCount() external view returns (uint) {
    return requestCount;
  }

  function getAllRequests() external view returns (bytes32[] memory) {
    return allRequests;
  }

  function getRequestByHash(bytes32 hash) external view returns (Request memory) {
    return requestByHash[hash];
  }

  function getRequestsByCountry(string memory country) external view returns (bytes32[] memory) {
    bytes32 countryKey = keccak256(abi.encodePacked(country));
    return requestsByCountry[countryKey];
  }

  function getRequestsByCountryCity(string memory country, string memory city) external view returns (bytes32[] memory) {
    bytes32 countryCityKey = keccak256(abi.encodePacked(country, city));
    return requestsByCountryCity[countryCityKey];
  }

  function getRequestsByRequesterAddress() external view returns (bytes32[] memory) {
    return requestsByRequesterAddress[msg.sender];
  }

  function getRequestsByLabAddress() external view returns (bytes32[] memory) {
    return requestsByLabAddress[msg.sender];
  }

  function validateLabService(address labId, string memory serviceCategory, bytes32 serviceId) external {
    require(msg.sender == _daoGenics, "Only DAOGenics allowed");
    validLabServices[labId][serviceCategory] = serviceId;
    emit LabServiceValidated(labId, serviceCategory, serviceId);
  }

  function claimRequest(bytes32 requestHash) external {
    require(requestByHash[requestHash].exists == true, "Request does not exist");

    Request memory request = requestByHash[requestHash];

    // Claimer should have their service validated by DAOGenics
    require(validLabServices[msg.sender][request.serviceCategory] != bytes32(0), "Lab's service has not been validated by DAOGenics");
    require(request.status != RequestStatus.CLAIMED, "Request has already been claimed");

    requestByHash[requestHash].status = RequestStatus.CLAIMED;
    requestByHash[requestHash].labAddress = msg.sender;

    emit RequestClaimed(msg.sender, requestHash);
  }

  function processRequest(
    bytes32 requestHash,
    bytes32 orderId,
    bytes32 serviceId,
    string memory customerSubstrateAddress,
    string memory sellerSubstrateAddress,
    address customerAddress,
    address sellerAddress,
    string memory dnaSampleTrackingId,
    uint testingPrice,
    uint qcPrice
  ) external {
    // Only escrow admin account should be able to call this function
    require(msg.sender == _escrowAdmin, "Only escrow admin is authorized to process request");
    require(requestByHash[requestHash].exists == true, "Request does not exist");

    Request memory request = requestByHash[requestHash];

    _token.approve(address(_escrowContract), request.stakingAmount);

    _escrowContract.payOrder(
      orderId,
      serviceId,
      customerSubstrateAddress,
      sellerSubstrateAddress,
      customerAddress,
      sellerAddress,
      dnaSampleTrackingId,
      testingPrice,
      qcPrice
    );

    emit RequestProcessed(
      requestHash,
      orderId,
      serviceId,
      customerSubstrateAddress,
      sellerSubstrateAddress,
      customerAddress,
      sellerAddress,
      dnaSampleTrackingId,
      testingPrice,
      qcPrice
    );
  }
}
