This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Languages

The homepage supports Korean (`ko`), Japanese (`ja`), Vietnamese (`vi`), and
English (`en`). Their dictionaries are maintained in `locales/ko.json`,
`locales/ja.json`, `locales/vi.json`, and `locales/en.json`; keep the same keys
and structure in all four files.

The initial language follows a valid `locale` cookie, then the server-side
`x-vercel-ip-country` request header. `VN` selects Vietnamese, `JP` Japanese,
`KR` Korean, and every other non-empty country code English. A missing or
empty country code defaults to Vietnamese. The language switcher saves manual
selections in the `locale` cookie for one year.

In development, the server logs the received country header, saved locale
cookie, detected locale, and final locale passed to the client provider as
`[locale-detection]`. These logs are disabled outside development.

### Test country detection locally

Vercel supplies `x-vercel-ip-country` to production requests. A VPN location
does not make this header available on localhost, so send the header directly
to the development server to simulate it:

```powershell
function Test-CountryLocale($country) {
  $headers = @{}
  if ($null -ne $country) {
    $headers["x-vercel-ip-country"] = $country
  }
  $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000" -Headers $headers
  [regex]::Match($response.Content, '<html[^>]*\blang="([^"]+)"').Groups[1].Value
}

Test-CountryLocale VN # vi
Test-CountryLocale JP # ja
Test-CountryLocale KR # ko
Test-CountryLocale US # en
Test-CountryLocale SG # en
Test-CountryLocale CN # en
Test-CountryLocale $null # vi (missing header)
```

For cookie priority, for example `ko` overriding a Vietnam header:

```powershell
$html = & curl.exe -s -H "x-vercel-ip-country: VN" -H "Cookie: locale=ko" "http://localhost:3000"
[regex]::Match(($html -join "`n"), '<html[^>]*\blang="([^"]+)"').Groups[1].Value # ko
```

In a browser, clear the `locale` cookie to test automatic detection. Local
header simulation does not alter production detection; deployed requests use
the country header supplied by Vercel.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
