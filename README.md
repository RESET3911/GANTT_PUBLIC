# Gantt Scheduler (Public)

ガントチャートでタスク管理する独立アプリ。ST APPS から切り離した公開用コピー。
URL を知っている人は全員、同じガントを閲覧・編集できます（Firebase Firestore 共有）。

## 技術スタック
- Next.js 14 (App Router) / React 18 / TypeScript
- Tailwind CSS
- Firebase Firestore（コレクション `gantt_tasks` を共有）
- Google カレンダー連携（任意）

## ローカル起動
```bash
npm install
npm run dev
# http://localhost:3000
```

## ビルド
```bash
npm run build
npm run start
```

## 環境変数（任意）
Google カレンダー連携を使う場合のみ `.env.local` に設定:
```
NEXT_PUBLIC_GCAL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```
（`.env.local.example` を参照）

## デプロイ
Vercel に新規プロジェクトとしてインポートし、このリポジトリを指定するだけ。
Firebase 設定は `lib/firebase.ts` にハードコード済みのためそのまま動作します。

> 注意: 既存の GANTT（ST APPS 版）と同じ Firestore を共有しているため、
> 片方で編集すると両方に反映されます。見る人ごとに分けたい場合は
> `lib/firebase.ts` の Firebase プロジェクトか `lib/storage.ts` の
> コレクション名 `gantt_tasks` を変更してください。
