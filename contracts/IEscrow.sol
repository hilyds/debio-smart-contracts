//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IEscrow {
  function payOrder(
    bytes32 orderId,
    bytes32 serviceId,
    string memory customerSubstrateAddress,
    string memory sellerSubstrateAddress,
    address customerAddress,
    address sellerAddress,
    string memory dnaSampleTrackingId,
    uint testingPrice,
    uint qcPrice
  ) external;
}
