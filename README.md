# Kalgo — site + interactive demo

Marketing site and a self-contained, interactive product demo for **Kalgo** — trading analytics that turn the trade report your broker already gives you into a fast, visual picture of your trading: every trade on the price chart, the metrics that matter, and an equity curve you can scrub across.

**Live:** _(add your Vercel URL here)_

## What's here
- `index.html` — landing page (original design + copy).
- `demo.html` + `app.js` — interactive demo: candlestick price chart with per-trade entry/exit markers, a live performance panel (net P&L, win rate, profit factor, expectancy, max drawdown, avg win/loss), and a scrubber that rewinds the account and rebuilds the equity curve and stats trade by trade.
- `styles.css` — shared styling.

All demo data is **synthetic** and generated deterministically in the browser — no real account data. The same views run on a real MT4/MT5 export in the full product.

## Run locally
```
python3 -m http.server 5178
# open http://localhost:5178
```

## Tech
Vanilla HTML/CSS/JS. Charting by [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) (Apache-2.0), loaded from CDN.

Built by Keihan Infantes.
