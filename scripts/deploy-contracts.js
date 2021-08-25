const hre = require('hardhat');
const { open } = require('fs/promises');
const path = require('path');
require('dotenv').config();

async function main() {
  const networkName = hre.network.name;
  const networkUrl = hre.network.config.url;
  console.log('Deploying to network', networkName, networkUrl);

  const DAITokenAddress = process.env[`${networkName.toUpperCase()}_NETWORK_DAI_TOKEN_ADDRESS`];

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
  console.log('Deployed Escrow Contract address', escrowContract.address);
  console.log('Deployed ServiceRequest Contract address', serviceRequestContract.address);

  // Save the address of deployed contract at the particular network
  let filename = `escrow-${networkName}-network`;
  let fh = await open(path.join('deployed-addresses', filename), 'w');
  await fh.writeFile(String(escrowContract.address))
  await fh.close();

  filename = `service-request-${networkName}-network`;
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

