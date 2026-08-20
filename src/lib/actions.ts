// Expected failures (validation, permission) come back as values so the form
// can show them inline. Only genuine bugs throw — those hit error.tsx.
//
// Never wrap an action body in try/catch: redirect() signals success by
// throwing a NEXT_REDIRECT control-flow error that must propagate.
export type FormState = { error?: string };

export const NO_ERROR: FormState = {};
