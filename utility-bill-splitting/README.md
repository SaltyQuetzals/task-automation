# Bill Automation

Automated utility bill splitting and payment request system. Extracts line items from PDF bills using AI, splits costs 50/50, creates YNAB transactions, and sends Venmo requests.

## Features

- 📄 **PDF Processing** - Extract first page of utility bills
- 🤖 **AI Extraction** - Use Google Gemini to extract itemized line items
- 💰 **Cost Splitting** - Automatically split bills 50/50 with precise rounding
- 📝 **YNAB Integration** - Create categorized transactions with subtransactions
- 💳 **Venmo Requests** - Send payment requests for the roommate's share
- 🏜️ **Dry Run Mode** - Test without sending actual Venmo requests

## Architecture

```
src/
├── config/          # Configuration & environment variables
├── types/           # TypeScript schemas & interfaces
├── services/        # External API clients (PDF, Gemini, YNAB, Venmo)
├── lib/             # Business logic (cost splitting, formatting)
├── errors/          # Custom error hierarchy
├── workflows/       # Main orchestration workflow
└── index.ts         # Application entry point
```

## Installation

```bash
bun install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required environment variables:
- `GOOGLE_API_KEY` - Google Gemini API key
- `YNAB_API_KEY` - YNAB API key
- `YNAB_BUDGET_ID` - UUID of your YNAB budget
- `YNAB_ACCOUNT_ID` - UUID of your YNAB account
- `YNAB_CATEGORY_*` - Category IDs for each utility type
- `YNAB_CATEGORY_REIMBURSEMENT` - Category for roommate reimbursements
- `PDF_FILE_PATH` - Path to the utility bill PDF
- `DRY_RUN` - Set to `false` to enable Venmo requests (default: `true`)

For Venmo requests (when `DRY_RUN=false`):
- `VENMO_ACCESS_TOKEN` - Venmo API access token
- `VENMO_RECIPIENT_USER_ID` - Venmo user ID of roommate

## Usage

### Dry Run (Test Mode)
```bash
bun src/index.ts
```

### Production (Send Venmo)
```bash
DRY_RUN=false bun src/index.ts
```

## Testing

Run the full test suite:
```bash
bun test
```

Test coverage includes:
- 20 service integration tests
- 15 business logic unit tests
- 14 error handling tests
- 5 workflow integration tests

## Project Structure

### Services
- **PdfService** - Extracts first page from PDF, encodes as base64
- **GeminiService** - Uses Google Gemini AI to extract line items
- **YnabService** - Creates YNAB transactions with subtransactions
- **VenmoService** - Sends payment requests to Venmo

### Business Logic
- **splitCosts()** - Splits line items 50/50 with category mapping
- **formatters** - Date and currency formatting utilities

### Error Handling
- Custom error hierarchy with context and cause chains
- Validation errors for configuration
- Service-specific errors for API failures

## Workflow

1. **Load & Validate Config** - Check all required environment variables
2. **Read PDF** - Load utility bill PDF from disk
3. **Extract PDF** - Get first page and encode as base64
4. **AI Extraction** - Use Gemini to extract itemized breakdown
5. **Split Costs** - Calculate 50/50 split with category mapping
6. **YNAB Transaction** - Create transaction with subtransactions
7. **Venmo Request** - Send payment request (or mock in dry-run)
8. **Success** - Log transaction and request IDs

## Dependency Injection

All services use constructor dependency injection for testability:
- Easy to mock for unit tests
- Decoupled from external APIs
- Flexible configuration

## Type Safety

- Full TypeScript strict mode
- Zod schemas for runtime validation
- No type assertions (only validated data)
- Typed error hierarchy

## Development

### Run with hot reload
```bash
bun --hot src/index.ts
```

### Run tests in watch mode
```bash
bun test --watch
```

### Type check
```bash
bunx tsc --noEmit
```

## Future Enhancements

- [ ] Support multiple bills/formats
- [ ] Database persistence for transaction history
- [ ] Web UI for configuration and monitoring
- [ ] Retry logic for failed API calls
- [ ] Email notifications
- [ ] Support for other payment platforms (Stripe, etc.)
