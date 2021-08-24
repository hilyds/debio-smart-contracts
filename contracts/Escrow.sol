//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Escrow {
  enum OrderStatus { PAID, FULFILLED, REFUNDED }

  struct Price{
    string component;
    uint value;
  }

  struct Order {
    bytes32 orderId;
    bytes32 serviceId;
    string customerSubstrateAddress;
    string sellerSubstrateAddress;
    string dnaSampleTrackingId;
    uint testingPrice;
    uint qcPrice;
    address customerAddress;
    address sellerAddress;
    OrderStatus status;
  }

  IERC20 public _token;
  address public _escrowAdmin;

  constructor(address ERC20Address, address escrowAdmin) {
    _token = IERC20(ERC20Address);
    _escrowAdmin = escrowAdmin;
  }

  // total orders count
  uint orderCount;
  // All of the orders
  bytes32[] allOrders;

  // OrderId -> Order
  mapping(bytes32 => Order) public orderByOrderId;
  // Customer Substrate Address -> Order[]
  mapping(bytes32 => bytes32[]) public ordersByCustomerSubstrateAddress;
  // Seller Substrate Address -> Order[]
  mapping(bytes32 => bytes32[]) public ordersBySellerSubstrateAddress;

  event OrderPaid(Order order);

  event OrderRefunded(Order order);

  event OrderFulfilled(Order order);

  function refundOrder(bytes32 orderId) external {
    // TODO:
    // QC amount transferred to seller should be reduced by gas price
    // Testing price amount transferred to buyer should be reduced by gas price

    require(msg.sender == _escrowAdmin, "Only Escrow Admin allowed to do refund");
    // Transfer QC price to lab
    require(_token.transfer(orderByOrderId[orderId].sellerAddress, orderByOrderId[orderId].qcPrice), "QC Payment to lab failed");
    // Refund customer
    require(_token.transfer(orderByOrderId[orderId].customerAddress, orderByOrderId[orderId].testingPrice), "Refund to customer failed");
    
    // If all is done, status is refunded
    orderByOrderId[orderId].status = OrderStatus.REFUNDED;

    emit OrderRefunded(orderByOrderId[orderId]);
  }

  function fulfillOrder(bytes32 orderId) external {
    // TODO:
    // Total price amount transferred to seller should be reduced by gas price

    require(msg.sender == _escrowAdmin, "Only Escrow Admin allowed to do order fulfillment");
    // Transfer testing and QC price to lab
    uint totalPrice = orderByOrderId[orderId].testingPrice + orderByOrderId[orderId].qcPrice;
    require(_token.transfer(orderByOrderId[orderId].sellerAddress, totalPrice), "Payment to lab failed");
    
    // If all is done, status is fulfilled
    orderByOrderId[orderId].status = OrderStatus.FULFILLED;

    emit OrderFulfilled(orderByOrderId[orderId]);
  }

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
  ) external {

    require(testingPrice != 0, "Testing Price cannot be 0");
    require(qcPrice != 0, "QC Price cannot be 0");

    // Transfer erc20 token from sender to this contract
    uint totalPrice = testingPrice + qcPrice;
    require(_token.transferFrom(msg.sender, address(this), totalPrice), "Transfer to escrow failed");
    
    Order memory order = Order(
      orderId,
      serviceId,
      customerSubstrateAddress,
      sellerSubstrateAddress,
      dnaSampleTrackingId,
      testingPrice,
      qcPrice,
      customerAddress,
      sellerAddress,
      OrderStatus.PAID
    );

    allOrders.push(orderId);

    orderByOrderId[orderId] = order;

    bytes32 customerSubstrateAddressKey = keccak256(abi.encodePacked(customerSubstrateAddress));
    ordersByCustomerSubstrateAddress[customerSubstrateAddressKey].push(orderId);

    bytes32 sellerSubstrateAddressKey = keccak256(abi.encodePacked(sellerSubstrateAddress));
    ordersBySellerSubstrateAddress[sellerSubstrateAddressKey].push(orderId);

    orderCount++;

    emit OrderPaid(order);
  }

  function getOrderCount() external view returns (uint) {
    return orderCount;
  }

  function getAllOrders() external view returns (bytes32[] memory) {
    return allOrders;
  }

  function getOrderByOrderId(bytes32 orderId) external view returns (Order memory) {
    return orderByOrderId[orderId];
  }

  function getOrdersByCustomerSubstrateAddress(string memory customerSubstrateAddress) external view returns (bytes32[] memory) {
    bytes32 customerSubstrateAddressKey = keccak256(abi.encodePacked(customerSubstrateAddress));
    return ordersByCustomerSubstrateAddress[customerSubstrateAddressKey];
  }

  function getOrdersBySellerSubstrateAddress(string memory sellerSubstrateAddress) external view returns (bytes32[] memory) {
    bytes32 sellerSubstrateAddressKey = keccak256(abi.encodePacked(sellerSubstrateAddress));
    return ordersBySellerSubstrateAddress[sellerSubstrateAddressKey];
  }
}
