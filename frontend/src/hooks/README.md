# Custom React Hooks

This directory will contain custom hooks for the frontend application.

## Planned Hooks

| Hook | Description |
|:---|:---|
| `useAuth.ts` | Authentication state and token management |
| `useApi.ts` | Generic API request hook with loading/error states |
| `useParcels.ts` | Parcel data fetching and caching |
| `useTransactions.ts` | Transaction data fetching and caching |

> **Note**: The current application manages state directly in `App.tsx`. These hooks will be extracted as the project evolves.
