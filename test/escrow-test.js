const { expect } = require('chai')
require("@nomiclabs/hardhat-waffle");

describe('Escrow', function () {
  let contract;
  // Request Parameters
  const orderId = "4KTmcB6iDV9HElHq2s1Q";
  const serviceId = "xLNpoyWsY63Z8SYQeBHf";
  const customerSubstrateAddress = "700fJuhXgfwi9WjBovRy";
  const sellerSubstrateAddress = "Lg9Z3Ncbn5VNnxuJEVxX";
  const dnaSampleTrackingId = "3CQguUxa2pOodID3Ni62";
  const testingPrice = 10
  const qcPrice = 3

  let customerAddress;
  let sellerAddress;
  let iDontHaveTokens;

  before(async function () {
    /**
     * Deploy ERC20 token
     * */
    const ERC20Contract = await ethers.getContractFactory("DebioToken");
    const erc20 = await ERC20Contract.deploy();
    await erc20.deployed()

    /**
     * Get test accounts
     * */
    const accounts = await hre.ethers.getSigners();
    // accounts[0] is the deployer
    customerAddress = accounts[1];
    sellerAddress = accounts[2];
    iDontHaveTokens = accounts[3];

    /**
     * Transfer some ERC20s to customerAddress
     * */
    const transferTx = await erc20.transfer(customerAddress.address, "90000000000000000000");
    await transferTx.wait();

    /**
     * Transfer some ERC20s to sellerAddress
     * */
    const transferTx2 = await erc20.transfer(sellerAddress.address, "90000000000000000000");
    await transferTx2.wait();

    /**
     * Deploy Escrow Contract
     * */
    const EscrowtContract = await ethers.getContractFactory("Escrow");
    contract = await EscrowtContract.deploy(erc20.address);
    await contract.deployed();

    /** 
     * Seed request data
     * */
    const erc20WithSigner = erc20.connect(customerAddress);
    const contractWithSigner = contract.connect(customerAddress);

    const approveTx = await erc20WithSigner.approve(contract.address, "90000000000000000000");
    await approveTx.wait();

    const orderPaidTx = await contractWithSigner.orderPaid(
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        customerAddress.address,
        sellerAddress.address,
        dnaSampleTrackingId,
        testingPrice,
        qcPrice
    )
    // wait until transaction is mined
    await orderPaidTx.wait();
  });

  it("Should fail if sender does not have enough ERC20 token balance", async function () {
    let errMsg;
    try {
      const contractWithSigner = contract.connect(iDontHaveTokens)
      const tx = await contractWithSigner.orderPaid(
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        customerAddress.address,
        sellerAddress.address,
        dnaSampleTrackingId,
        testingPrice,
        qcPrice
      )
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg).to.equal("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
  })

  it("Should return order by order Id", async function () {
    const req = await contract.getOrderByOrderId(orderId);
    
    expect(req.orderId).to.equal(orderId);
    expect(req.serviceId).to.equal(serviceId);
    expect(req.customerSubstrateAddress).to.equal(customerSubstrateAddress);
    expect(req.sellerSubstrateAddress).to.equal(sellerSubstrateAddress);
    expect(req.customerAddress).to.equal(customerAddress.address);
    expect(req.sellerAddress).to.equal(sellerAddress.address);
    expect(req.dnaSampleTrackingId).to.equal(dnaSampleTrackingId);
    expect(req.testingPrice.toString()).to.equal(testingPrice.toString());
    expect(req.qcPrice.toString()).to.equal(qcPrice.toString());
  })

  it("Should return orders by customer substrate address", async function () {
    const orders = await contract.getOrdersByCustomerSubstrateAddress(customerSubstrateAddress);    
    
    for (let req of orders) {
        expect(req.orderId).to.equal(orderId);
        expect(req.serviceId).to.equal(serviceId);
        expect(req.customerSubstrateAddress).to.equal(customerSubstrateAddress);
        expect(req.sellerSubstrateAddress).to.equal(sellerSubstrateAddress);
        expect(req.customerAddress).to.equal(customerAddress.address);
        expect(req.sellerAddress).to.equal(sellerAddress.address);
        expect(req.dnaSampleTrackingId).to.equal(dnaSampleTrackingId);
        expect(req.testingPrice.toString()).to.equal(testingPrice.toString());
        expect(req.qcPrice.toString()).to.equal(qcPrice.toString());
    }
  })

  it("Should return orders by seller substrate address", async function () {
    const orders = await contract.getOrdersBySellerSubstrateAddress(sellerSubstrateAddress);    
    for (let req of orders) {
        expect(req.orderId).to.equal(orderId);
        expect(req.serviceId).to.equal(serviceId);
        expect(req.customerSubstrateAddress).to.equal(customerSubstrateAddress);
        expect(req.sellerSubstrateAddress).to.equal(sellerSubstrateAddress);
        expect(req.customerAddress).to.equal(customerAddress.address);
        expect(req.sellerAddress).to.equal(sellerAddress.address);
        expect(req.dnaSampleTrackingId).to.equal(dnaSampleTrackingId);
        expect(req.testingPrice.toString()).to.equal(testingPrice.toString());
        expect(req.qcPrice.toString()).to.equal(qcPrice.toString());
    }
  })

  it("Should emit OrderPaid event, when order is paid", async function () {
    // Request Parameters
    const orderId = "700fJuhXgfwi9WjBovRy";
    const serviceId = "Lg9Z3Ncbn5VNnxuJEVxX";
    const customerSubstrateAddress = "4KTmcB6iDV9HElHq2s1Q";
    const sellerSubstrateAddress = "3CQguUxa2pOodID3Ni62";
    const dnaSampleTrackingId = "xLNpoyWsY63Z8SYQeBHf";
    const testingPrice = 10
    const qcPrice = 3

    const contractWithSigner = contract.connect(customerAddress);
    const orderAddedTx = await contractWithSigner.orderPaid(
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        customerAddress.address,
        sellerAddress.address,
        dnaSampleTrackingId,
        testingPrice,
        qcPrice
    )
    // wait until transaction is mined
    const receipt = await orderAddedTx.wait();
    // Get event from receipt
    const events = receipt.events.filter((x) => x.event == "OrderPaid");
    expect(events.length > 0).to.equal(true);
    // Get the request data from the event
    const req = events[0].args[0]

    expect(req.orderId).to.equal(orderId);
    expect(req.serviceId).to.equal(serviceId);
    expect(req.customerSubstrateAddress).to.equal(customerSubstrateAddress);
    expect(req.sellerSubstrateAddress).to.equal(sellerSubstrateAddress);
    expect(req.customerAddress).to.equal(customerAddress.address);
    expect(req.sellerAddress).to.equal(sellerAddress.address);
    expect(req.dnaSampleTrackingId).to.equal(dnaSampleTrackingId);
    expect(req.testingPrice.toString()).to.equal(testingPrice.toString());
    expect(req.qcPrice.toString()).to.equal(qcPrice.toString());

    const orderCount = await contract.getOrderCount();
    expect(orderCount).to.equal(2);
  })

  it("Should return all orders", async function () {
    const orders = await contract.getAllOrders();
    expect(orders.length).to.equal(2);
    const order = orders[0]
    
    expect(order.orderId).to.equal(orderId);
    expect(order.serviceId).to.equal(serviceId);
    expect(order.customerSubstrateAddress).to.equal(customerSubstrateAddress);
    expect(order.sellerSubstrateAddress).to.equal(sellerSubstrateAddress);
    expect(order.customerAddress).to.equal(customerAddress.address);
    expect(order.sellerAddress).to.equal(sellerAddress.address);
    expect(order.dnaSampleTrackingId).to.equal(dnaSampleTrackingId);
    expect(order.testingPrice.toString()).to.equal(testingPrice.toString());
    expect(order.qcPrice.toString()).to.equal(qcPrice.toString());
  })

  it("Should return order by order hash", async function () {
    const orders = await contract.getAllOrders();
    const order = orders[0]
    const orderByHash = await contract.getOrderByHash(order.hash)

    expect(order.orderId).to.equal(orderByHash.orderId);
    expect(order.serviceId).to.equal(orderByHash.serviceId);
    expect(order.customerSubstrateAddress).to.equal(orderByHash.customerSubstrateAddress);
    expect(order.sellerSubstrateAddress).to.equal(orderByHash.sellerSubstrateAddress);
    expect(order.customerAddress).to.equal(orderByHash.customerAddress);
    expect(order.sellerAddress).to.equal(orderByHash.sellerAddress);
    expect(order.dnaSampleTrackingId).to.equal(orderByHash.dnaSampleTrackingId);
    expect(order.testingPrice.toString()).to.equal(orderByHash.testingPrice.toString());
    expect(order.qcPrice.toString()).to.equal(orderByHash.qcPrice.toString());
  })

  it("Lab can fulfill a order (Updates order status to fulfilled)", async function () {
    /**
     * enum RequestStatus { PAID, FULFILLED, REFUNDED }
     */
    const orders = await contract.getAllOrders();
    let order = orders[0];
    expect(order.status).to.equal(0);

    const contractWithSigner = contract.connect(sellerAddress);
    const fulfillTx = await contractWithSigner.fulfillOrder(order.hash);
    await fulfillTx.wait();

    order = await contract.getOrderByHash(order.hash);
    expect(order.status).to.equal(1);
  })

  it("Lab can refund a order (Updates order status to refunded)", async function () {
    /**
     * enum RequestStatus { PAID, FULFILLED, REFUNDED }
     */
    const orders = await contract.getAllOrders();
    let order = orders[0];
    expect(order.status).to.equal(0);

    const contractWithSigner = contract.connect(sellerAddress);
    const fulfillTx = await contractWithSigner.refundOrder(order.hash);
    await fulfillTx.wait();

    order = await contract.getOrderByHash(order.hash);
    expect(order.status).to.equal(2);
  })
})
