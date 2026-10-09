# Leruchi Context IR v1

Context IR is an engine-neutral, authorization-neutral declaration of the context an agent or application needs.

It describes:
- purpose;
- allowed context sources;
- bounded item/byte budgets;
- freshness requirements;
- optional output preferences.

It does **not** carry tenant identity, access tokens, authorization decisions, physical engine names, credentials, or arbitrary execution instructions.

Authorization, tenant isolation, source validation, planning and secure execution remain server-side responsibilities.
