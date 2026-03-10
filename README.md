# auto-scripts

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.10. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Behavior

```mermaid
flowchart LR
    A[Obtain utility bill] --> B{Due date passed?}
    B -- No --> C[Create YNAB transaction with unique key]
    C --> D((Done))
    B -- Yes --> E[Compute split transaction amounts]
    E -- splits --> F{YNAB transaction exists?}
    F -- No --> G[Create YNAB transaction with unique key]
    G -- transaction_id --> H[Update YNAB transaction with splits]
    F -- transaction_id, splits --> H
    H --> I[Dispatch Venmo for reimbursement\namt]
    I --> J((Done))
```
