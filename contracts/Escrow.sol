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
    string orderId;
    string serviceId;
    string customerSubstrateAddress;
    string sellerSubstrateAddress;
    string dnaSampleTrackingId;
    uint testingPrice;
    uint qcPrice;
    address customerAddress;
    address sellerAddress;
    OrderStatus status;
    bytes32 hash;
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
  Order[] allOrders;

  // Hash -> Order
  mapping(bytes32 => Order) public orderByHash;
  // OrderId -> Order
  mapping(bytes32 => Order) public orderByOrderId;
  // Customer Substrate Address -> Order[]
  mapping(bytes32 => Order[]) public ordersByCustomerSubstrateAddress;
  // Seller Substrate Address -> Order[]
  mapping(bytes32 => Order[]) public ordersBySellerSubstrateAddress;

  event OrderPaid(Order order);

  event OrderRefunded(Order order);

  event OrderFulfilled(Order order);

  function hashOrder(
    string memory orderId,
    string memory serviceId,
    string memory customerSubstrateAddress,
    string memory sellerSubstrateAddress,
    string memory dnaSampleTrackingId,
    uint testingPrice,
    uint qcPrice
  ) internal pure returns (bytes32 hash){
    return keccak256(abi.encodePacked(
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        dnaSampleTrackingId,
        testingPrice,
        qcPrice
    ));
  }

  function refundOrder(bytes32 hash) external {
    // TODO:
    // QC amount transferred to seller should be reduced by gas price
    // Testing price amount transferred to buyer should be reduced by gas price

    require(msg.sender == _escrowAdmin, "Only Escrow Admin allowed to do refund");
    // Transfer QC price to lab
    require(_token.transfer(orderByHash[hash].sellerAddress, orderByHash[hash].qcPrice), "QC Payment to lab failed");
    // Refund customer
    require(_token.transfer(orderByHash[hash].customerAddress, orderByHash[hash].testingPrice), "Refund to customer failed");
    
    // If all is done, status is refunded
    orderByHash[hash].status = OrderStatus.REFUNDED;

    emit OrderRefunded(orderByHash[hash]);
  }

  function fulfillOrder(bytes32 hash) external {
    // TODO:
    // Total price amount transferred to seller should be reduced by gas price

    require(msg.sender == _escrowAdmin, "Only Escrow Admin allowed to do order fulfillment");
    // Transfer testing and QC price to lab
    uint totalPrice = orderByHash[hash].testingPrice + orderByHash[hash].qcPrice;
    require(_token.transfer(orderByHash[hash].sellerAddress, totalPrice), "Payment to lab failed");
    
    // If all is done, status is fulfilled
    orderByHash[hash].status = OrderStatus.FULFILLED;

    emit OrderFulfilled(orderByHash[hash]);
  }

  function payOrder(
    string memory orderId,
    string memory serviceId,
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
    
    bytes32 orderHash = hashOrder(
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        dnaSampleTrackingId,
        testingPrice,
        qcPrice
    );
    
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
      OrderStatus.PAID,
      orderHash
    );

    allOrders.push(order);

    orderByHash[orderHash] = order;
    
    bytes32 orderIdKey = keccak256(abi.encodePacked(orderId));
    orderByOrderId[orderIdKey] = order;

    bytes32 customerSubstrateAddressKey = keccak256(abi.encodePacked(customerSubstrateAddress));
    ordersByCustomerSubstrateAddress[customerSubstrateAddressKey].push(order);

    bytes32 sellerSubstrateAddressKey = keccak256(abi.encodePacked(sellerSubstrateAddress));
    ordersBySellerSubstrateAddress[sellerSubstrateAddressKey].push(order);

    orderCount++;

    emit OrderPaid(order);
  }

  function getOrderCount() external view returns (uint) {
    return orderCount;
  }

  function getAllOrders() external view returns (Order[] memory) {
    return allOrders;
  }

  function getOrderByHash(bytes32 hash) external view returns (Order memory) {
    return orderByHash[hash];
  }

  function getOrderByOrderId(string memory orderId) external view returns (Order memory) {
    bytes32 orderIdKey = keccak256(abi.encodePacked(orderId));
    return orderByOrderId[orderIdKey];
  }

  function getOrdersByCustomerSubstrateAddress(string memory customerSubstrateAddress) external view returns (Order[] memory) {
    bytes32 customerSubstrateAddressKey = keccak256(abi.encodePacked(customerSubstrateAddress));
    return ordersByCustomerSubstrateAddress[customerSubstrateAddressKey];
  }

  function getOrdersBySellerSubstrateAddress(string memory sellerSubstrateAddress) external view returns (Order[] memory) {
    bytes32 sellerSubstrateAddressKey = keccak256(abi.encodePacked(sellerSubstrateAddress));
    return ordersBySellerSubstrateAddress[sellerSubstrateAddressKey];
  }
}
