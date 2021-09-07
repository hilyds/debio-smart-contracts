const hre = require('hardhat')
const escrowABI = require("../artifacts/contracts/Escrow.sol/Escrow.json").abi
const erc20ABI = require('../artifacts/contracts/DebioToken.sol/DebioToken.json').abi
const inquirer = require('inquirer')
/**
 * Currently this is for localhost testing only
 * The addresses below are always the same when deployed to localhost hardhat network
 * */
const ERC20_TOKEN_ADDRESS = '0x5fbdb2315678afecb367f032d93f642f64180aa3'
const ESCROW_CONTRACT_ADDRESS = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512'
const SERVICE_REQUEST_CONTRACT_ADDRESS = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0'

/**
 * payOrder parameters
    orderId
    serviceId,
    customerSubstrateAddress,
    sellerSubstrateAddress,
    customerEthAddress,
    sellerEthAddress,
    dnaSampleTrackingId,
    testingPrice,
    qcPrice,
    payAmount
 * */

function promptQuestions() {
  const questions = [
    { name: "orderId", type: "input", message: "Input OrderId" },
    { name: "serviceId", type: "input", message: "Input ServiceId" },
    { name: "customerSubstrateAddress", type: "input", message: "Input Customer Substrate Address" },
    { name: "sellerSubstrateAddress", type: "input", message: "Input Seller Substrate Address" },
    { name: "customerEthAddress", type: "input", message: "Input Customer Ethereum Address" },
    { name: "sellerEthAddress", type: "input", message: "Input Seller Ethereum Address" },
    { name: "dnaSampleTrackingId", type: "input", message: "Input DnaSampleTrackingId" },
    { name: "testingPrice", type: "input", message: "Input Testing Price" },
    { name: "qcPrice", type: "input", message: "Input QC Price" },
    { name: "payAmount", type: "input", message: "Input Payment Amount" },
  ]
  return inquirer.prompt(questions)
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider();
  const escrow = new hre.ethers.Contract(
    ESCROW_CONTRACT_ADDRESS,
    escrowABI,
    provider,
  )
  const erc20 = new hre.ethers.Contract(
    ERC20_TOKEN_ADDRESS,
    erc20ABI,
    provider,
  )

  const accounts = await hre.ethers.getSigners();
  const signer = accounts[0]

  const escrowWithSigner = escrow.connect(signer)
  const erc20WithSigner = erc20.connect(signer)

  let {
    orderId,
    serviceId,
    customerSubstrateAddress,
    sellerSubstrateAddress,
    customerEthAddress,
    sellerEthAddress,
    dnaSampleTrackingId,
    testingPrice,
    qcPrice,
    payAmount
  } = await promptQuestions()

  testingPrice = ethers.utils.parseUnits(testingPrice+".0")
  qcPrice = ethers.utils.parseUnits(qcPrice+".0")
  payAmount = ethers.utils.parseUnits(payAmount+".0")

  const approveTx = await erc20WithSigner.approve(escrow.address, payAmount);
  await approveTx.wait();

  const orderPaidTx = await escrowWithSigner.payOrder(
    orderId,
    serviceId,
    customerSubstrateAddress,
    sellerSubstrateAddress,
    customerEthAddress,
    sellerEthAddress,
    dnaSampleTrackingId,
    testingPrice,
    qcPrice,
    payAmount
  )
  // wait until transaction is mined
  const txHash = await orderPaidTx.wait();

  console.log("Order Paid!")
  console.log(txHash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  })
