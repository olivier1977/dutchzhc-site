import { default as Safe } from '@safe-global/protocol-kit';

const CFO_PRIVATE_KEY = process.env.CFO_PRIVATE_KEY;
if (!CFO_PRIVATE_KEY) throw new Error('CFO_PRIVATE_KEY env var is required -- key was compromised, rotate before use');
const SAFE_ADDRESS = '0xF6d959FdC7f51CFa76b67aC4c7e31325F8763B33';
const BASE_RPC = 'https://mainnet.base.org';

async function verifySafe() {
  console.log('Verifying Safe at:', SAFE_ADDRESS);

  const protocolKit = await Safe.init({
    provider: BASE_RPC,
    signer: CFO_PRIVATE_KEY,
    safeAddress: SAFE_ADDRESS,
  });

  const owners = await protocolKit.getOwners();
  const threshold = await protocolKit.getThreshold();
  const chainId = await protocolKit.getChainId();
  const safeAddress = await protocolKit.getAddress();
  const isDeployed = await protocolKit.isSafeDeployed();
  const balance = await protocolKit.getBalance();

  console.log('Safe address:', safeAddress);
  console.log('Deployed:', isDeployed);
  console.log('Chain ID:', chainId.toString());
  console.log('Owners:', owners);
  console.log('Threshold:', threshold);
  console.log('Balance (wei):', balance.toString());
}

verifySafe().catch(console.error);
