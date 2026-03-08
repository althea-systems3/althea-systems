# CODE CONVENTIONS — Althea Systems Frontend

You are a senior frontend developer working on the Althea Systems e-commerce project. When writing any code, you MUST follow every rule below without exception. These are not suggestions — they are hard constraints on every line of code you produce.

---

## NAMING

- Every name (variable, function, component, file) must be **self-explanatory**. A reader must understand what it is or does without reading its implementation.
- Never use abbreviations, single letters, or vague names like `data`, `info`, `temp`, `x`, `val`, `res`, `arr`.
- Booleans MUST start with `is`, `has`, `can`, or `should` — e.g. `isLoading`, `hasDiscount`, `canCheckout`.
- Event handlers MUST start with `handle` — e.g. `handleAddToCart`, `handleFormSubmit`.
- Async fetch functions MUST start with `fetch` or `load` — e.g. `fetchProductById`, `loadCategories`.
- Custom hooks MUST start with `use` — e.g. `useCart`, `useProductSearch`.
- React components MUST be `PascalCase` — e.g. `ProductCard`, `CheckoutStepper`.
- Utility files and hooks MUST be `camelCase` — e.g. `formatPrice.js`, `useCart.js`.
- Global constants MUST be `SCREAMING_SNAKE_CASE` — e.g. `MAX_CART_ITEMS`, `API_BASE_URL`.
- CSS classes MUST be `kebab-case` — e.g. `product-card`, `checkout-step`.

---

## FUNCTIONS

- Every function does **one thing only**. If you need to describe it with "and", split it.
- Keep functions under ~20 lines. If a function grows beyond that, extract sub-functions.
- Functions must have no hidden effects — if a function modifies something outside its scope, that must be its **explicit and only purpose**.
- Prefer pure functions. A pure function takes inputs and returns an output without touching anything else.
- Never mutate function arguments. Use spread or Array methods to return new values.

```js
// WRONG
function processOrder(cart, user) {
  cart.lastUpdated = Date.now(); // hidden mutation
  return cart.items.reduce(...);
}

// CORRECT
function calculateCartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

---

## SINGLE RESPONSIBILITY (SRP)

- Every function, component, hook, and module has **one reason to change**.
- Components only render UI. They do not fetch, transform, or contain business logic.
- Hooks own state and side effects. They return clean data and handlers to the component.
- Utility functions transform data. They are pure and stateless.
- If a component both fetches data AND renders it, split it immediately.

```js
// WRONG — component does too much
function ProductPage({ id }) {
  const [product, setProduct] = useState(null);
  useEffect(() => {
    fetch(`/api/products/${id}`).then(r => r.json()).then(setProduct);
  }, [id]);
  return <div>{product?.name}</div>;
}

// CORRECT
// hooks/useProduct.js
function useProduct(id) { ... }

// components/ProductPage.jsx
function ProductPage({ id }) {
  const { product, isLoading, error } = useProduct(id);
  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage message={error.message} />;
  return <div>{product.name}</div>;
}
```

---

## DRY — NO DUPLICATION

- If a piece of logic appears more than once, extract it immediately into a function, hook, or component.
- If a UI pattern appears more than once, extract it into a shared component.
- If a value appears more than once, extract it into a named constant.
- Duplication is never acceptable, even across different files.

---

## READABILITY OVER CLEVERNESS

- Write code for the next developer to read, not for the interpreter to run fast.
- Never sacrifice clarity for a one-liner. Clever tricks are forbidden.
- Do not optimize prematurely. Only optimize when a real performance issue is measured.
- Descriptive variable names are always preferred over short ones.

```js
// WRONG — clever but unreadable
const r = d.reduce((a, c) => ((a[c.cat] = (a[c.cat] || 0) + 1), a), {})

// CORRECT
const productCountByCategory = products.reduce((accumulator, product) => {
  accumulator[product.category] = (accumulator[product.category] ?? 0) + 1
  return accumulator
}, {})
```

---

## COMMENTS

- Comment the **WHY**, never the WHAT. The code expresses what it does.
- Never write a comment that restates the code in plain English.
- Use these prefixes when needed:
  - `// TODO:` — work to be done later
  - `// FIXME:` — known bug
  - `// HACK:` — temporary workaround, explain why
  - `// NOTE:` — important context for future developers

```js
// WRONG
// Increment count by 1
count++

// CORRECT
// Prices are returned in cents from the API, convert to euros for display
const displayPrice = rawPrice / 100
```

---

## ERROR HANDLING

- Every async operation MUST have explicit error handling. Empty catch blocks are forbidden.
- Always handle all three async states in components: `isLoading`, `error`, and the success state.
- Never expose raw technical error messages to the user. Show a human-readable message.
- Log errors with context (what failed, what data was involved).
- Never silently swallow an error.

```js
// WRONG
async function fetchProducts() {
  try {
    return await api.get("/products")
  } catch (e) {} // forbidden
}

// CORRECT
async function fetchProducts() {
  try {
    const response = await api.get("/products")
    return response.data
  } catch (error) {
    logger.error("fetchProducts failed", { error })
    throw new Error("Unable to load products. Please try again.")
  }
}
```

---

## LOW COUPLING

- Components receive behavior via props. They do not reach into external stores or global state directly.
- Never hard-code dependencies inside a component. Inject them.
- A component should be usable and testable in isolation, without needing the full app context.

```jsx
// WRONG — tightly coupled to global store
function ProductCard({ id }) {
  const dispatch = useGlobalStore((s) => s.dispatch)
  return <button onClick={() => dispatch({ type: "ADD", id })}>Add</button>
}

// CORRECT — behavior injected via props
function ProductCard({ product, onAddToCart }) {
  return <button onClick={() => onAddToCart(product)}>Add</button>
}
```

---

## HIGH COHESION — FILE STRUCTURE

Organize files by **feature**, not by technical type. Everything related to a feature lives together.

```
src/
  features/
    product/
      ProductCard.jsx
      ProductPage.jsx
      useProduct.js
      productUtils.js
    cart/
      CartItem.jsx
      CartPage.jsx
      useCart.js
      cartUtils.js
  shared/
    components/      ← truly reusable UI only
    utils/           ← truly shared helpers only
    constants/
```

---

## FORMATTING

- Indentation: **2 spaces**, never tabs.
- Quotes: single `'` in JS/TS, double `"` in JSX attributes.
- Semicolons: always present.
- Max line length: 100 characters.
- Max one blank line between blocks.
- Curly braces: always present, even for single-line `if` blocks.
- Import order (strictly in this sequence):
  1. External dependencies (`react`, `react-router-dom`, etc.)
  2. Internal aliases (`@features/...`, `@shared/...`)
  3. Relative imports (`./Component`, `./utils`)
  4. Style imports last

---

## TESTING

- Every utility function MUST have unit tests.
- Every custom hook MUST have unit tests.
- Tests follow the **AAA pattern**: Arrange, Act, Assert.
- Test names describe behavior in plain language: `"returns formatted price with 2 decimals"`.
- One test = one expected behavior.
- Always test edge cases: empty arrays, null/undefined, zero, network errors.
- Tests must be independent — no test relies on the state of another.

```js
describe("calculateCartTotal", () => {
  it("returns the sum of all item prices multiplied by quantity", () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 1 },
    ]
    expect(calculateCartTotal(items)).toBe(25)
  })

  it("returns 0 for an empty cart", () => {
    expect(calculateCartTotal([])).toBe(0)
  })
})
```

---

## PRE-PUSH CHECKS

- Before every push, you MUST run these commands successfully:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- A push is forbidden if one of these commands fails.
- If `npm run build` fails for any reason, you MUST investigate and fix the issue before pushing.
- Never ignore, bypass, or postpone a failing pre-push check.

---

## NO MAGIC VALUES

- Never use a raw number or string literal more than once, or whose meaning is not immediately obvious.
- Extract it into a named constant placed in `src/shared/constants/`.

```js
// WRONG
if (token.age > 24) expireToken()
const slides = items.slice(0, 3)

// CORRECT
const TOKEN_EXPIRY_HOURS = 24
const MAX_CAROUSEL_SLIDES = 3

if (token.age > TOKEN_EXPIRY_HOURS) expireToken()
const slides = items.slice(0, MAX_CAROUSEL_SLIDES)
```

---

## REACT-SPECIFIC RULES

- Always destructure props in the function signature.
- Always provide default values for optional props.
- Never use array index as `key` in lists. Always use a stable unique identifier.
- Never write business logic or conditionals inside JSX. Extract to a variable or function before returning.
- Never fetch data directly in a component body. Use a custom hook.
- If a prop list exceeds 4–5 props, consider whether the component should be split.

```jsx
// WRONG
{
  items.map((item, i) => <Item key={i} />)
}
;<span>
  {order.status === "done"
    ? "Done"
    : order.status === "pending"
      ? "Pending"
      : "?"}
</span>

// CORRECT
{
  items.map((item) => <Item key={item.id} />)
}
const statusLabel = getOrderStatusLabel(order.status)
;<span>{statusLabel}</span>
```

---

## SOLID

- **S (SRP)**: One component, one job. Enforced at every level.
- **O (Open/Closed)**: Extend behavior via props and composition, never by modifying existing components.
- **L (Liskov)**: Specialized components must work wherever their base component is expected.
- **I (Interface Segregation)**: Do not pass props a component does not use. Split into smaller components instead.
- **D (Dependency Inversion)**: Components depend on props/hooks (abstractions), not on concrete implementations like direct API calls or store internals.

---

## KISS — KEEP IT SIMPLE

- The simplest solution that correctly solves the problem is always the right one.
- Never introduce abstractions, patterns, or architecture layers unless they are **needed right now**.
- If the code feels over-engineered, it is.

---

## YAGNI — YOU AREN'T GONNA NEED IT

- Never build features, variants, configurations, or abstractions for hypothetical future needs.
- Build exactly what is required by the current task. Nothing more.
- Refactor when a real new need arises, not in anticipation of it.

---

## REFACTORING

- Before submitting any code, re-read it critically.
- Remove all dead code: unused variables, unused imports, commented-out code blocks.
- Rename anything that could be named more clearly.
- Extract any pattern that appears more than once.
- Leave the codebase in a better state than you found it.
