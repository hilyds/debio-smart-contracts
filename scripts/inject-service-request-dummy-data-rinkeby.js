/**
 * Currently this is for localhost testing only
 * The addresses below are always the same when deployed to localhost hardhat network
 * */
const ERC20_TOKEN_ADDRESS = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea'
const ESCROW_CONTRACT_ADDRESS = '0x3d10E496aDb26B9b8527690E577F6c934995a9A9'
const SERVICE_REQUEST_CONTRACT_ADDRESS = '0x8673AA355b8a6a56330F911CA99c0353ABdfe111'

const hre = require('hardhat')
const serviceRequestContractABI = require('../artifacts/contracts/ServiceRequest.sol/ServiceRequest.json').abi
const erc20ABI = require('../artifacts/contracts/DebioToken.sol/DebioToken.json').abi

const SERVICE_CATEGORIES = [
  "Bioinformatics Data Analyst Support", 
  "Genetic Counseling", 
  "Single Nucleotida Polymorphism (SNP) Microarray", 
  "Targeted Gene Panel Sequencing", 
  "Whole-Exome Sequencing", 
  "Whole-Genome Sequencing", 
  "Other"
]

async function transferErc20ToAccounts(erc20) {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0]
  const erc20WithSigner = erc20.connect(deployer)
  // Transfer Some ERC20 to accounts
  for (let acc of accounts) {
    const balance = await erc20.balanceOf(acc.address);
    if (balance.toString() != "0") {
      console.log(`${acc.address} ERC20 balance => ${balance.toString()}`)
      continue
    }
    let transferTx = await erc20WithSigner.transfer(acc.address, "5000000000000000000");
    await transferTx.wait();
    console.log(`${acc.address} ERC20 balance => ${balance.toString()}`)
  }
}

async function createRequestsWithDummyData(erc20, serviceRequestContract, dummyData) {
  /**
   * Create requests with accounts 
   * */
  const accounts = await hre.ethers.getSigners();
  let accIdx = 0
  for (let data of dummyData) {
    const { country, city, serviceCategory, stakingAmount } = data

    const signer = accounts[accIdx]
    const erc20WithSigner = erc20.connect(signer)
    const serviceRequestContractWithSigner = serviceRequestContract.connect(signer)

    // Approve ERC20
    const approveTx = await erc20WithSigner.approve(
      serviceRequestContract.address,
      stakingAmount
    );
    await approveTx.wait();

    // Send createRequest Transaction
    const requestAddedTx = await serviceRequestContractWithSigner.createRequest(
      data.country,
      city,
      serviceCategory,
      stakingAmount
    );
    // wait until transaction is mined
    await requestAddedTx.wait();

    accIdx++
    if (accIdx == accounts.length) {
      accIdx = 0
    }
  }
}

function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

async function main() {
  // Random generate dummyData
  const dummyData = []
  const charCollection = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for(let i = 0; i < 12; i++){
    const country = randomString(8, charCollection)
    const city = randomString(10, charCollection)
    dummyData.push({
      country: country,
      city: city,
      serviceCategory: SERVICE_CATEGORIES[0],
      stakingAmount: hre.ethers.utils.parseUnits('20.0')
    })
  }

  const provider = new ethers.providers.JsonRpcProvider(process.env.RINKEBY_RPC_URL);
  const erc20 = new hre.ethers.Contract(
    ERC20_TOKEN_ADDRESS,
    erc20ABI,
    provider,
  )
  const serviceRequestContract = new hre.ethers.Contract(
    SERVICE_REQUEST_CONTRACT_ADDRESS,
    serviceRequestContractABI,
    provider,
  )

  await transferErc20ToAccounts(erc20)
  await createRequestsWithDummyData(erc20, serviceRequestContract, dummyData)
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
