# Image fonts

Static instances for `next/og`, which reads neither variable fonts nor WOFF2:

| File                          | Family          | Weight | Axis                              |
| ----------------------------- | --------------- | ------ | --------------------------------- |
| `BodoniModa-Medium.ttf`       | Bodoni Moda     | 500    | `opsz` 24, the wordmark's setting |
| `InstrumentSans-Regular.ttf`  | Instrument Sans | 400    |                                   |
| `InstrumentSans-SemiBold.ttf` | Instrument Sans | 600    |                                   |

Both families are under the SIL Open Font License 1.1 (`OFL-*.txt`). Committed, so the build never
depends on Google being reachable.

Fetched on 2026-10-07 from the Google Fonts CSS API. Without a browser user agent it serves static
TTF instances for the axis values asked for:

```bash
curl -s "https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@24,500&family=Instrument+Sans:wght@400;600" \
  | grep -o 'https://[^)]*\.ttf'
```

Download each URL to the file named above (the Bodoni Moda URL first, then Instrument Sans 400 and
600). Licenses: `https://raw.githubusercontent.com/google/fonts/main/ofl/<bodonimoda|instrumentsans>/OFL.txt`.
