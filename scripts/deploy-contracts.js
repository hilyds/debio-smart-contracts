const hre = require('hardhat');
const { open } = require('fs/promises');
const path = require('path');
require('dotenv').config();

async function main() {
  const networkName = hre.network.name;
  const networkUrl = hre.network.config.url;
  console.log('Deploying to network', networkName, networkUrl);

  let DAITokenAddress = process.env[`${networkName.toUpperCase()}_NETWORK_DAI_TOKEN_ADDRESS`];
  
  // If deploying to localhost, (for dev/testing purposes) need to deploy own ERC20
  if (networkName == 'localhost') {
    const ERC20Contract = await hre.ethers.getContractFactory("DebioToken");
    erc20 = await ERC20Contract.deploy();
    await erc20.deployed()
    DAITokenAddress = erc20.address
  }

  const EscrowContract = await hre.ethers.getContractFactory("Escrow");
  const escrowContract = await EscrowContract.deploy(DAITokenAddress, process.env.ESCROW_WALLET_ADDRESS)
  await escrowContract.deployed();

  const ServiceRequestContract = await hre.ethers.getContractFactory("ServiceRequest");
  const serviceRequestContract = await ServiceRequestContract.deploy(
    DAITokenAddress,
    process.env.DAOGENICS_WALLET_ADDRESS,
    escrowContract.address,
    process.env.ESCROW_WALLET_ADDRESS,
  );
  await serviceRequestContract.deployed();

  console.log('Contracts deployed!');
  if (networkName == 'localhost') {
    console.log('Deployed ERC20 contract address', erc20.address)
  }
  console.log('Deployed Escrow Contract address', escrowContract.address);
  console.log('Deployed ServiceRequest Contract address', serviceRequestContract.address);

  // Save the address of deployed contract at the particular network
  let filename = `${networkName}-escrow`;
  let fh = await open(path.join('deployed-addresses', filename), 'w');
  await fh.writeFile(String(escrowContract.address))
  await fh.close();

  filename = `${networkName}-service-request`;
  fh = await open(path.join('deployed-addresses', filename), 'w');
  await fh.writeFile(String(serviceRequestContract.address))
  await fh.close();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

