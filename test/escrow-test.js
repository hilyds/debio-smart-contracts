const { expect } = require('chai')
require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

describe('Escrow', function () {
  let contract;
  let erc20;
  // Request Parameters

  const orderId = "0xed19fb816f3d4a3d4f46e0445bd68a666647bc5fd77c60c937b170a398c49e51";
  const serviceId = "0xe88f0531fea1654b6a24197ec1025fd7217bb8b19d619bd488105504ec244df8";
  const customerSubstrateAddress = "5EBs6czjmUy31iawezsude3vudFVfi9gMv6kAHjNeBzzGgvH";
  const sellerSubstrateAddress = "5ESGhRuAhECXu96Pz9L8pwEEd1AeVhStXX67TWE1zHRuvJNU";
  const dnaSampleTrackingId = "Y9JCOABLP16GKHQ14RY9J";

  const testingPrice = 10
  const qcPrice = 3

  let customerAccount;
  let sellerAccount;
  let escrowAccount;
  let iDontHaveTokens;


  before(async function () {
    /**
     * Deploy ERC20 token
     * */
    const ERC20Contract = await ethers.getContractFactory("DebioToken");
    erc20 = await ERC20Contract.deploy();
    await erc20.deployed()

    /**
     * Get test accounts
     * */
    const accounts = await hre.ethers.getSigners();
    deployer = accounts[0]
    customerAccount = accounts[1];
    sellerAccount = accounts[2];
    iDontHaveTokens = accounts[3];
    escrowAccount = new ethers.Wallet(process.env.ESCROW_WALLET_PRIVATE_KEY, hre.ethers.provider);

    /**
     * Transfer some ERC20s to customerAccount
     * */
    const transferTx = await erc20.transfer(customerAccount.address, "90000000000000000000");
    await transferTx.wait();

    /**
     * Transfer some ERC20s to sellerAccount
     * */
    const transferTx2 = await erc20.transfer(sellerAccount.address, "90000000000000000000");
    await transferTx2.wait();

    /**
     * Transfer some ETH to escrowAccount
     * */
    const transferTx3 = await deployer.sendTransaction({
      to: escrowAccount.address,
      value: ethers.utils.parseEther("1.0")
    });
    await transferTx3.wait();
    /**
     * Transfer some ERC20s to escrowAccount
     * */
    const transferTx4 = await erc20.transfer(escrowAccount.address, "90000000000000000000");
    await transferTx4.wait();

    /**
     * Deploy Escrow Contract
     *
     * - Add ERC20 address to constructor
     * - Add escrow admin wallet address to constructor
     * */
    const EscrowContract = await ethers.getContractFactory("Escrow");
    contract = await EscrowContract.deploy(erc20.address, process.env.ESCROW_WALLET_ADDRESS);
    await contract.deployed();

    /** 
     * Seed request data
     * */
    const erc20WithSigner = erc20.connect(customerAccount);
    const contractWithSigner = contract.connect(customerAccount);

    const approveTx = await erc20WithSigner.approve(contract.address, "90000000000000000000");
    await approveTx.wait();

    const orderPaidTx = await contractWithSigner.payOrder(
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        customerAccount.address,
        sellerAccount.address,
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
      const tx = await contractWithSigner.payOrder(
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        customerAccount.address,
        sellerAccount.address,
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
    expect(req.customerAddress).to.equal(customerAccount.address);
    expect(req.sellerAddress).to.equal(sellerAccount.address);
    expect(req.dnaSampleTrackingId).to.equal(dnaSampleTrackingId);
    expect(req.testingPrice.toString()).to.equal(testingPrice.toString());
    expect(req.qcPrice.toString()).to.equal(qcPrice.toString());
  })

  it("Should return orders by customer substrate address", async function () {
    const orderIds = await contract.getOrdersByCustomerSubstrateAddress(customerSubstrateAddress);    
    expect(orderIds[0]).to.equal(orderId)
  })

  it("Should return orders by seller substrate address", async function () {
    const orderIds = await contract.getOrdersBySellerSubstrateAddress(sellerSubstrateAddress);    
    expect(orderIds[0]).to.equal(orderId)
  })

  it("Should emit OrderPaid event, when order is paid", async function () {
    // Request Parameters
    // Different orderId, the rest of parameters are the same
    // TODO: Add validation for orderId to prevent duplicate orderIds
    const orderId = "0xd698d9107cd8d68b8fb7d2a81159b95bcb5ed0a337f661ede21f335d60fef63e";

    const contractWithSigner = contract.connect(customerAccount);
    const orderAddedTx = await contractWithSigner.payOrder(
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        customerAccount.address,
        sellerAccount.address,
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
    expect(req.customerAddress).to.equal(customerAccount.address);
    expect(req.sellerAddress).to.equal(sellerAccount.address);
    expect(req.dnaSampleTrackingId).to.equal(dnaSampleTrackingId);
    expect(req.testingPrice.toString()).to.equal(testingPrice.toString());
    expect(req.qcPrice.toString()).to.equal(qcPrice.toString());

    const orderCount = await contract.getOrderCount();
    expect(orderCount).to.equal(2);
  })

  it("Should return all orders", async function () {
    const orders = await contract.getAllOrders();
    expect(orders.length).to.equal(2);

    const orderId = orders[0]
    expect(orderId).to.equal(orderId)
  })

  it("Only Escrow account can fulfill a order (Updates order status to fulfilled)", async function () {
    /**
     * enum RequestStatus { PAID, FULFILLED, REFUNDED }
     */
    const orderIds = await contract.getAllOrders();
    const orderId = orderIds[0];

    let order = await contract.getOrderByOrderId(orderId)
    expect(order.status).to.equal(0);


    // Should not be able to fulfillOrder with sellerAccount
    let errMsg;
    try {
      const contractWithSigner = contract.connect(sellerAccount);
      const fulfillTx = await contractWithSigner.fulfillOrder(order.orderId);
      await fulfillTx.wait();
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg).to.equal("VM Exception while processing transaction: reverted with reason string 'Only Escrow Admin allowed to do order fulfillment'");

    const sellerBalanceBefore = await erc20.balanceOf(sellerAccount.address)

    // Should be able to fulfillOrder with escrowAccount
    const contractWithSigner = contract.connect(escrowAccount);
    const fulfillTx = await contractWithSigner.fulfillOrder(order.orderId);
    await fulfillTx.wait();

    order = await contract.getOrderByOrderId(order.orderId);
    expect(order.status).to.equal(1);

    // Test if qc price and test price is transferred to lab
    const sellerBalanceAfter = await erc20.balanceOf(sellerAccount.address)
    expect(sellerBalanceAfter.toString())
      .to
      .equal(sellerBalanceBefore.add(testingPrice + qcPrice).toString())
  })

  it("Only Escrow account can refund a order (Updates order status to refunded)", async function () {
    /**
     * enum RequestStatus { PAID, FULFILLED, REFUNDED }
     */
    const orderIds = await contract.getAllOrders();
    const orderId = orderIds[1];

    let order = await contract.getOrderByOrderId(orderId)
    expect(order.status).to.equal(0);

    // Should not be able to refund using sellerAccount
    let errMsg;
    try {
      const contractWithSigner = contract.connect(sellerAccount);
      const fulfillTx = await contractWithSigner.refundOrder(order.orderId);
      await fulfillTx.wait();
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg).to.equal("VM Exception while processing transaction: reverted with reason string 'Only Escrow Admin allowed to do refund'");

    const customerBalanceBefore = await erc20.balanceOf(customerAccount.address)
    const sellerBalanceBefore = await erc20.balanceOf(sellerAccount.address)

    // Should be able to refundOrder with escrowAccount
    const contractWithSigner = contract.connect(escrowAccount);
    const fulfillTx = await contractWithSigner.refundOrder(order.orderId);
    await fulfillTx.wait();

    order = await contract.getOrderByOrderId(order.orderId);
    expect(order.status).to.equal(2);

    // Test if testing price is refunded to customer
    const customerBalanceAfter = await erc20.balanceOf(customerAccount.address)
    expect(customerBalanceAfter.toString()).to.equal(customerBalanceBefore.add(testingPrice).toString())
    // Test if qc price is transferred to lab
    const sellerBalanceAfter = await erc20.balanceOf(sellerAccount.address)
    expect(sellerBalanceAfter.toString()).to.equal(sellerBalanceBefore.add(qcPrice).toString())
  })
})
