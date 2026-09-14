# Security policy

Security fixes are applied to the current default branch unless a release line is explicitly documented as supported.

Please do not open a public issue containing exploit instructions, credentials, private data, or details that would make an unresolved vulnerability easier to abuse. Use GitHub private vulnerability reporting when available; otherwise contact the repository owner privately through an established GitHub channel.

Include the affected version or commit, impact, prerequisites, and minimal safe reproduction steps. Do not access data that is not yours, degrade services, or test systems without authorization.

For `white-label-model`, application-supplied state may be untrusted. The optional Model validator is a caller-supplied function that receives the complete proposed state before construction or an explicit mutation is accepted; returning `false` rejects that state. Use it when runtime data crosses a trust boundary, such as API, storage, or user-supplied data. TypeScript types do not validate runtime values, and direct nested writes through `get()` do not run the whole-state validator.