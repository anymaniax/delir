`Delir` generates a _Route Manifest_ for you. It allows you to refer to a
page by _name_ instead of _location_:

## Install

```bash
  npm install -g delir
```

## How to use

```bash
  delir ./your-output-file
```

```bash
  delir ./your-output-file --workspace ./your-next-app-folder
```

## Example

```tsx
// Assume you have a page at app/pages/products/[productId].tsx
export default function ProductsPage() { ...

// You can then use Routes...
import { Link } from "next"
import { Routes } from "../path-to-manifest-file"

// ...to refer to it by name...
<Link href={Routes.ProductsPage({ productId: 123 })} />

// ...instead of looking up the location!
<Link href={`/products/${123}`} />
```

The _Route Manifest_ has some advantages:

- improved expressiveness
- simplifies moving pages to new locations

## Query Parameters {#query-parameters}

Query parameters can be specified together with route parameters.

```tsx
// instead of ...
<Link href={`/products/${pid}?offerCode=capybara`} />

// ... you can do:
<Link href={Routes.Product({ pid, offerCode: "capybara" })} />
```

Simple cli which is an extract of the [routes manifest](https://blitzjs.com/docs/route-manifest) feature from [blitz](https://blitzjs.com/). Thanks for the super framework ❤️


## Route matching

```tsx
// Assume you have a page at app/pages/products/[productId].tsx
export default function ProductsPage() { ... }

import { useRouter } from 'next/router';
// You can then use Routes...
import { Routes } from "../path-to-manifest-file";

// in your server api
Routes.ProductsPage.isActive(someobject.path)

// generically without next router
Routes.ProductsPage.isActive(window.location.pathname)

// with asPath from useRouter
const { asPath } = useRouter();
Routes.ProductsPage.isActive(asPath);
```
