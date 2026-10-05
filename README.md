# REVERSI

Next.js、React、TypeScript で作成したブラウザ版オセロゲームです。

タイトル、ゲーム、リザルトを持つゲームループで遊べます。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 終了方法

開発サーバーを起動しているターミナルで `Ctrl + C` を押してください。

## 確認コマンド

```bash
npm run lint
npm run typecheck
npm run build
```

## 遊べるモード

- CPU対戦: プレイヤーが黒、CPUが白
- CPU難易度: EASY / NORMAL / HARD
- 2人対戦: 同じブラウザで黒と白を交互に操作
- 特殊オセロ: 将来拡張用の項目のみ

## 構成

- `app/page.tsx`: Scene とゲーム全体の状態管理
- `components/TitleScene.tsx`: タイトル画面
- `components/GameScene.tsx`: ゲーム画面
- `components/ResultScene.tsx`: リザルト画面
- `app/api/cpu-move/route.ts`: CPU の手を返すバックエンド API
- `lib/othello.ts`: オセロのルール、合法手判定、CPU 評価ロジック
- `lib/gameTypes.ts`: Scene、ゲームモード、リザルト型
