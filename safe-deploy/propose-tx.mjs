import { default as Safe } from '@safe-global/protocol-kit';
import { default as SafeApiKit } from '@safe-global/api-kit';

const CFO_PRIVATE_KEY = process.env.CFO_PRIVATE_KEY;
const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
const BASE_RPC = 'https://mainnet.base.org';
const BASE_CHAIN_ID = 8453n;

const RECIPIENT = '0x2019E83B4A1066F8727479ce533b3978DaA3600A';
const AMOUNT_ETH = '0.002';
const AMOUNT_WEI = (BigInt(Math.round(parseFloat(AMOUNT_ETH) * 1e18))).toString();

process.on('unhandledRejection', (r) => { console.error('Unhandled:', r); });

async function proposeTx() {
  console.log('CFO_PRIVATE_KEY set:', !!CFO_PRIVATE_KEY);
  console.log('SAFE_ADDRESS:', SAFE_ADDRESS);
  console.log('Initializing Protocol Kit...');

  const protocolKit = await Safe.init({
    provider: BASE_RPC,
    signer: CFO_PRIVATE_KEY,
    safeAddress: SAFE_ADDRESS,
  });

  console.log('Creating Safe transaction...');
  const safeTransaction = await protocolKit.createTransaction({
    transactions: [
      {
        to: RECIPIENT,
        value: AMOUNT_WEI,
        data: '0x',
      },
    ],
  });

  console.log('Signing transaction...');
  const signedSafeTransaction = await protocolKit.signTransaction(safeTransaction);

  console.log('Initializing API Kit...');
  const apiKit = new SafeApiKit({ chainId: BASE_CHAIN_ID, txServiceUrl: 'https://safe-transaction-base.safe.global/api' });

  const safeTxHash = await protocolKit.getTransactionHash(signedSafeTransaction);
  console.log('Safe TX Hash:', safeTxHash);

  const senderAddress = (await protocolKit.getSafeProvider().getSignerAddress()) || '';
  const senderSignature = signedSafeTransaction.getSignature(senderAddress.toLowerCase());
  if (!senderSignature) throw new Error('Signature not found for sender');

  console.log('Proposing transaction to Safe Transaction Service...');
  await apiKit.proposeTransaction({
    safeAddress: SAFE_ADDRESS,
    safeTransactionData: signedSafeTransaction.data,
    safeTxHash,
    senderAddress,
    senderSignature: senderSignature.data,
  });

  console.log('Transaction proposed successfully!');
  console.log(JSON.stringify({ safeTxHash, recipient: RECIPIENT, amountEth: AMOUNT_ETH }));
}

proposeTx().catch((err) => {
  console.error('Error full:', err);
  process.exit(1);
});
