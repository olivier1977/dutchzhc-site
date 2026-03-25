import { default as Safe, predictSafeAddress, SafeProvider } from '@safe-global/protocol-kit';

// Configuration
const CFO_PRIVATE_KEY = '***REDACTED_CFO_PRIVATE_KEY***';
const CFO_ADDRESS = '0xa89BcB445d4FEA3473Aec4B75B12B99b8f696f60';
const BOARD_MEMBER_1 = '0x2019E83B4A1066F8727479ce533b3978DaA3600A';
const BOARD_MEMBER_2 = '0x2C5B4F57AD00a88774956439D6B8BCF1e4DE560E';
const BASE_RPC = 'https://mainnet.base.org';
const BASE_CHAIN_ID = 8453n;

async function deploySafe() {
  console.log('Initializing Safe on Base...');

  const safeAccountConfig = {
    owners: [CFO_ADDRESS, BOARD_MEMBER_1, BOARD_MEMBER_2],
    threshold: 2,
  };

  const safeProvider = new SafeProvider({
    provider: BASE_RPC,
    signer: CFO_PRIVATE_KEY,
  });

  // First predict the address
  const predictedAddress = await predictSafeAddress({
    safeProvider,
    chainId: BASE_CHAIN_ID,
    safeAccountConfig,
    safeDeploymentConfig: {},
  });
  console.log('Predicted Safe address:', predictedAddress);

  // Init with predicted safe (not yet deployed)
  const protocolKit = await Safe.init({
    provider: BASE_RPC,
    signer: CFO_PRIVATE_KEY,
    predictedSafe: {
      safeAccountConfig,
      safeDeploymentConfig: {},
    },
  });

  console.log('Deploying Safe 2-of-3 multisig...');
  console.log('Owners:', safeAccountConfig.owners);
  console.log('Threshold:', safeAccountConfig.threshold);

  const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

  const provider = protocolKit.getSafeProvider();
  const signer = await provider.getExternalSigner();

  console.log('Signer type:', typeof signer, signer?.constructor?.name);
  console.log('Signer keys:', signer ? Object.getOwnPropertyNames(Object.getPrototypeOf(signer)) : 'null');

  const txHash = await signer.sendTransaction({
    to: deploymentTx.to,
    value: BigInt(deploymentTx.value),
    data: deploymentTx.data,
    chain: { id: 8453, name: 'base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [BASE_RPC] } } },
  });

  console.log('Transaction result:', txHash);
  console.log('Transaction result type:', typeof txHash);

  return { predictedAddress, txHash };
}

deploySafe().catch(console.error);
