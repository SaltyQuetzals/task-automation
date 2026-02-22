# Gas Bill Splitting - Architecture Guide

## Overview

This module automates the process of splitting gas bills between roommates by:
1. Finding the most recent gas bill transaction in YNAB
2. Splitting the cost 50/50 between two parties
3. Updating YNAB with the split categories
4. Sending a Venmo payment request for the roommate's share

## Architecture

### Type System

The codebase uses **branded types** for type safety. These are compile-time only and prevent accidental mixing of different amount units or incorrect IDs.

```
src/types/domain.ts
├── Branded Amount Types
│   ├── Milliunits (amount in 1/1000th of a dollar)
│   └── Dollars (amount in dollars)
├── Branded ID Types
│   ├── BudgetId (YNAB budget ID)
│   ├── CategoryId (YNAB category ID)
│   ├── TransactionId (YNAB transaction ID)
│   └── VenmoUserId (Venmo user ID)
└── Domain Models
    ├── GasTransaction (a transaction to process)
    ├── GasBillSplit (result of splitting)
    └── ProcessingResult (final result)
```

### Configuration & Constants

**`src/config/constants.ts`**
- Central place for all magic strings and values
- All typed with `as const` for type safety
- Examples:
  - Gas service payee pattern
  - Transaction processing marker
  - Category memo labels

**`src/config/env.ts`**
- Loads environment variables
- Validates configuration with Zod schemas
- Converts raw strings to typed IDs
- Throws early if validation fails

### Services

**`src/services/ynab.service.ts`**
- Handles all YNAB API interactions
- Methods:
  - `findMostRecentGasTransaction()`: Finds unprocessed gas bills
  - `updateTransactionWithSplits()`: Splits transaction into categories
  - `markAsProcessed()`: Marks transaction as handled

**`src/services/cost-splitter.ts`**
- Pure business logic (no side effects)
- Single method: `calculateSplit()`
- Handles milliunits arithmetic to avoid floating point errors

### Workflow

**`src/workflows/gas-bill.workflow.ts`**
- Orchestrates the entire process
- Coordinates between services
- Handles step sequencing and error propagation

Flow:
```
1. Load config
2. Initialize services
3. Create workflow
4. Execute:
   - Find transaction
   - Validate not processed
   - Calculate split
   - Update YNAB
   - Send Venmo request
   - Mark as processed
5. Return result or null
```

### Error Handling

**`src/errors/base.ts`**
- `GasBillError`: Base class with step context
- `TransactionLookupError`: Finding transaction failed
- `YnabOperationError`: YNAB API call failed
- `VenmoOperationError`: Venmo API call failed

All errors capture:
- Human-readable message
- Step that failed
- Original cause (for debugging)

### Logging

**`src/lib/logger.ts`**
- Consistent prefix: `[GAS BILL]`
- Methods: `info()`, `warn()`, `error()`, `success()`
- No formatting - keep it simple

## How to Extend

### Adding a New Bill Type

1. Create new domain types in `src/types/domain.ts`:
   ```typescript
   export interface ElectricBillSplit {
     baseCost: Milliunits;
     energyCharge: Milliunits;
     taxAmount: Milliunits;
   }
   ```

2. Add constants to `src/config/constants.ts`:
   ```typescript
   export const ELECTRIC_AUTOMATION = {
     PAYEE_PATTERN: "electric company name",
     PROCESSED_MARKER: "Automatically split",
   } as const;
   ```

3. Create service: `src/services/electric.service.ts`
   ```typescript
   export class ElectricService {
     async findMostRecentBill(budgetId: BudgetId) { ... }
     async updateWithSplits(...) { ... }
   }
   ```

4. Create workflow: `src/workflows/electric.workflow.ts`
   ```typescript
   export class ElectricWorkflow {
     async execute(config: AppConfig): Promise<ProcessingResult | null> { ... }
   }
   ```

5. Create entry point or add to main orchestrator

### Adding New Validation

All IDs are validated through branded type creation functions. To add new validation:

```typescript
// In src/types/domain.ts
type MyNewId = string & { readonly __brand: "myNewId" };

export function asMyNewId(id: string): MyNewId {
  if (/* validation failed */) {
    throw new Error("Invalid MyNewId format");
  }
  return id as MyNewId;
}

// In src/config/env.ts, use it:
const myNewId = asMyNewId(process.env.MY_NEW_ID!);
```

### Changing the Split Logic

1. Locate `src/services/cost-splitter.ts`
2. Modify `CostSplitterService.calculateSplit()`
3. Be careful with milliunits arithmetic - use `Math.round()` and integer operations
4. Add test case if applicable

### Adding a New Step to the Workflow

1. Create a method in the appropriate service
2. Call it from `src/workflows/gas-bill.workflow.ts`
3. Add logging with step number
4. Wrap in try-catch and throw appropriate error type

Example:
```typescript
// In workflow
try {
  logger.info("Step 4: Adding new operation...");
  await this.service.newOperation(...);
  logger.info("New operation completed");
} catch (error) {
  throw new NewOperationError(..., error);
}
```

## Testing

Currently, there are no unit tests, but the architecture supports easy testing:

```typescript
// Example test
const mockYnabService = {
  findMostRecentGasTransaction: vi.fn().mockResolvedValue(testTransaction),
};
const workflow = new GasBillWorkflow(mockConfig);
workflow.ynabService = mockYnabService; // Easy to inject
const result = await workflow.execute(mockConfig);
expect(result).toEqual(expectedResult);
```

## Configuration

Environment variables (see `.env.example`):
- `YNAB_API_KEY`: YNAB API authentication
- `YNAB_BUDGET_ID`: UUID of YNAB budget
- `YNAB_GAS_CATEGORY_ID`: Category ID for gas charges
- `YNAB_REIMBURSEMENT_CATEGORY_ID`: Category ID for reimbursements
- `VENMO_ACCESS_TOKEN`: Venmo API authentication
- `VENMO_RECIPIENT_USER_ID`: Venmo user to request payment from
- `DRY_RUN`: Set to "false" to actually process (default: true)

## Performance Considerations

- **API Calls**: Makes 3 API calls to YNAB (list payees, get transactions, update transaction)
- **Execution Time**: Typically 1-2 seconds (mostly waiting on API)
- **Memory**: Minimal - loads all transactions in memory but YNAB should return reasonable amounts
- **Scheduling**: Designed to run on a schedule (e.g., daily via cron)

## Common Issues

### "No payee matching 'gas service' found"
- Payee name changed in YNAB
- Check `GAS_AUTOMATION.PAYEE_PATTERN` in `src/config/constants.ts`
- Update to match actual payee name (case-insensitive)

### "No unprocessed transactions found"
- All transactions already marked with `PROCESSED_MARKER`
- Either manually delete the marker from a transaction in YNAB, or
- Manually create a new transaction for the next period

### "Failed to create YNAB transaction"
- Check category IDs are correct
- Verify account exists in YNAB
- Check API key has required permissions

### "Failed to send Venmo request"
- Check Venmo token is still valid
- Verify recipient user ID is correct
- Check network connectivity

## Future Improvements

See `REFACTORING_SUMMARY.md` for list of identified improvements not yet implemented.
