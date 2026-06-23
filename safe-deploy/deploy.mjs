import { default as Safe, predictSafeAddress, SafeProvider } from '@safe-global/protocol-kit';

// ---------------------------------------------------------------------------
// CLI argument parser: --key value  (flags without next value are ignored)
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--') && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[argv[i].slice(2)] = argv[++i];
    }
  }
  return args;
}

const cliArgs = parseArgs(process.argv);

// ---------------------------------------------------------------------------
// Network definitions
// ---------------------------------------------------------------------------
const NETWORKS = {
  'base': {
    rpc: 'https://mainnet.base.org',
    chainId: 8453n,
    viemChain: {
      id: 8453,
      name: 'base',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
    },
  },
  'base-sepolia': {
    rpc: 'https://sepolia.base.org',
    chainId: 84532n,
    viemChain: {
      id: 84532,
      name: 'base-sepolia',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
    },
  },
};

// ---------------------------------------------------------------------------
// Resolve config: CLI args > env vars > error
// ---------------------------------------------------------------------------
const networkKey = cliArgs.network || process.env.SAFE_NETWORK || 'base';
const network = NETWORKS[networkKey];
if (!network) {
  throw new Error(
    `Unknown network "${networkKey}". Valid options: ${Object.keys(NETWORKS).join(', ')}`
  );
}

const signersRaw = cliArgs.signers || process.env.SAFE_SIGNERS;
if (!signersRaw) {
  throw new Error(
    'Signer addresses are required.\n' +
    '  CLI:  --signers 0xAaa...,0xBbb...,0xCcc...\n' +
    '  Env:  SAFE_SIGNERS=0xAaa...,0xBbb...,0xCcc...'
  );
}
const owners = signersRaw.split(',').map(s => s.trim()).filter(Boolean);
if (owners.length < 1) throw new Error('At least one signer address is required.');

const thresholdRaw = cliArgs.threshold || process.env.SAFE_THRESHOLD;
if (!thresholdRaw) {
  throw new Error(
    'Threshold is required.\n' +
    '  CLI:  --threshold 2\n' +
    '  Env:  SAFE_THRESHOLD=2'
  );
}
const threshold = parseInt(thresholdRaw, 10);
if (isNaN(threshold) || threshold < 1 || threshold > owners.length) {
  throw new Error(
    `Threshold must be between 1 and ${owners.length} (the number of signers). Got: ${thresholdRaw}`
  );
}

// DEPLOYER_PRIVATE_KEY is the EOA that pays gas for the factory call.
// It does NOT need to be a Safe signer — any funded wallet works.
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.CFO_PRIVATE_KEY;
if (!DEPLOYER_PRIVATE_KEY) {
  throw new Error(
    'Deployer private key is required. Set DEPLOYER_PRIVATE_KEY (or legacy CFO_PRIVATE_KEY) env var.\n' +
    'This key pays deployment gas but does NOT need to be one of the Safe signers.'
  );
}

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------
async function deploySafe() {
  console.log(`\nDeploying Safe on ${networkKey}...`);
  console.log(`  Owners (${owners.length}): ${owners.join(', ')}`);
  console.log(`  Threshold: ${threshold}-of-${owners.length}`);
  console.log(`  RPC: ${network.rpc}\n`);

  const safeAccountConfig = { owners, threshold };

  const safeProvider = new SafeProvider({
    provider: network.rpc,
    signer: DEPLOYER_PRIVATE_KEY,
  });

  const predictedAddress = await predictSafeAddress({
    safeProvider,
    chainId: network.chainId,
    safeAccountConfig,
    safeDeploymentConfig: {},
  });
  console.log('Predicted Safe address:', predictedAddress);

  const protocolKit = await Safe.init({
    provider: network.rpc,
    signer: DEPLOYER_PRIVATE_KEY,
    predictedSafe: {
      safeAccountConfig,
      safeDeploymentConfig: {},
    },
  });

  const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

  const provider = protocolKit.getSafeProvider();
  const signer = await provider.getExternalSigner();

  const txHash = await signer.sendTransaction({
    to: deploymentTx.to,
    value: BigInt(deploymentTx.value),
    data: deploymentTx.data,
    chain: network.viemChain,
  });

  console.log('\nDeployment transaction submitted:', txHash);
  console.log('Safe address:', predictedAddress);
  console.log(`\nVerify on-chain: https://${networkKey === 'base' ? '' : 'sepolia.'}basescan.org/address/${predictedAddress}`);

  return { network: networkKey, safeAddress: predictedAddress, txHash };
}

deploySafe().catch(console.error);
