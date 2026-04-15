# Post-Deploy Verification Checklist

Use this after AWS deployment is live.

## Access

- frontend URL opens successfully
- backend health URL responds
- both are HTTPS

## Auth

- login succeeds with the shared account
- logout clears the session correctly
- expired/invalid token is handled safely
- more than 5 concurrent logins are blocked

## Dashboard

- dashboard loads production data
- trend charts render
- pipeline chart renders
- top customer / inventory / contribution charts render

## Products

- list loads
- detail panel loads
- create product works
- edit product works
- delete product works
- chatbot answers from DB data

## Sales

- list loads
- quotations view works
- stage transitions work
- create/edit/delete work
- detail modal works

## Purchases

- list loads
- quotations / unpaid / paid / completion views work
- stage transitions work
- create/edit/delete work
- detail modal works

## Manufacturing

- batches load
- work order queue scrolls
- add/edit/delete works
- completion action works
- export log works

## History

- records load
- queue scroll works
- filters work
- CSV export works
- PDF print flow works

## Live Sync

- update a record in one tab
- confirm other open tabs update via SSE

## Demo Data

- products are populated
- sales are populated
- purchases are populated
- manufacturing is populated
- history is populated
- customers and suppliers are populated

## Performance

- backend health stays stable
- dashboard is acceptably fast in production
- major pages open without visible runtime errors

## Browser Coverage

- Chrome
- Firefox
- Edge

## Signoff

Deployment is ready for demo only when:
- all core modules load
- no blocking errors appear
- login works
- chatbot works
- SSE works
- exports work
