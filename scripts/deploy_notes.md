# Deploy Notes

## Recommended path

1. Run local GenLayer:

```bash
npm install -g genlayer
genlayer init
genlayer up
```

2. Deploy contract:

```bash
genlayer deploy --contract contracts/procureminds_ai_pro.py
```

3. Copy contract address into `frontend/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_contract_address
NEXT_PUBLIC_GENLAYER_CHAIN=localnet
NEXT_PUBLIC_GENLAYER_RPC_URL=http://localhost:4000/api
```

4. Run frontend:

```bash
cd frontend
npm install
npm run dev
```

## Studio checklist

- Confirm the contract address is copied into Vercel and local env files.
- Confirm transaction status is accepted/finalized.
- Check execution result; finalized does not always mean contract logic succeeded.
- Run `get_total_rfqs`, `get_rfq`, and `get_supplier` to verify state.
