# Othello VS CPU

Next.js、React、TypeScript で作成したブラウザ版オセロゲームです。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 構成

- `app/page.tsx`: 画面とゲーム操作
- `app/api/cpu-move/route.ts`: CPU の手を返すバックエンド API
- `lib/othello.ts`: オセロのルール、合法手判定、CPU 評価ロジック
