# Qubic Account Monitor & QXMR Refund System

A Next.js application that monitors your Qubic account in real-time and automatically sends QXMR tokens as refunds when you receive Qubic tokens.

## Features

1. **Real-Time Account Monitoring**: Continuously monitors your Qubic account for incoming transfers
2. **Automatic QXMR Refunds**: Automatically sends 1 QXMR token per 100 qubic received
3. **Transaction Tracking**: Prevents duplicate refunds by tracking processed transactions
4. **User-Friendly UI**: Clean interface showing account balance, monitoring status, and refund history

## Getting Started

### Prerequisites

- Node.js installed
- A Qubic account with:
  - Your account ID (public key)
  - Your 55-character seed phrase (keep this secure!)
  - Sufficient QXMR tokens for refunds
  - The QXMR asset ID

### Installation

1. Install dependencies:
```bash
npm install
```

2. Update configuration in `app/page.tsx`:
   - Set `ACCOUNT_ID` to your Qubic account public key
   - Set `SEED` to your 55-character seed phrase (⚠️ Keep this secure!)
   - Set `QXMR_ASSET_ID` to the QXMR asset ID (26-character base32 string)

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### How to Get QXMR Asset ID

The QXMR asset ID is a 26-character base32 string. You can find it by:
- Checking your owned assets using the Qubic RPC API
- Using a Qubic explorer or wallet that shows asset details
- The asset ID format is typically a base32-encoded string

### Usage

1. **Start Monitoring**: Click the "Start Monitoring" button to begin real-time monitoring
2. **Monitor Status**: The UI shows whether monitoring is active (green) or inactive (gray)
3. **View Refunds**: All refunds sent are displayed in the "Refund History" section
4. **Stop Monitoring**: Click "Stop Monitoring" to pause the service

### How It Works

1. The system polls your account balance every 10 seconds
2. When new incoming Qubic transfers are detected:
   - The system calculates the QXMR amount: 1 QXMR per 100 qubic
   - Sends the calculated QXMR tokens back to the sender
   - Records the transaction in the refund history
3. Processed transactions are tracked to prevent duplicate refunds

### Important Notes

- ⚠️ **Security**: Never expose your seed phrase in production or commit it to version control
- Make sure you have sufficient QXMR tokens in your account for refunds
- The system sends QXMR in smallest units (1 QXMR = 1,000,000,000 smallest units)
- Transactions use a 30-tick offset for safety
- The monitoring interval is set to 10 seconds by default (configurable)

### Configuration

You can adjust the following in `app/page.tsx`:
- `RPC_URL`: Qubic RPC endpoint (default: 'https://rpc.qubic.org')
- `ACCOUNT_ID`: Your account public key
- `SEED`: Your 55-character seed phrase
- `QXMR_ASSET_ID`: QXMR asset ID
- `pollInterval`: Monitoring interval in milliseconds (default: 10000)
- `qubicPerQxmr`: Exchange rate (default: 100)

## Project Structure

- `app/page.tsx`: Main UI component with monitoring controls
- `lib/monitorAccount.ts`: Account monitoring service
- `lib/getAccInfo.ts`: Qubic API functions (balance, transfers, sending tokens/assets)
- `app/type/interface.ts`: TypeScript interfaces

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Qubic Documentation](https://qubic.org)
