# SiG GANTT Scheduler (Public)

ガントチャートでタスク管理する独立アプリ。ST APPS から切り離した公開用コピー。

- `/`　　　… 編集可能URL（タスク追加・編集・削除・ドラッグ・設定変更が可能）
- `/view` … 閲覧専用URL（すべての変更操作を非表示・無効化）

どちらも同じ Firebase Firestore データを見ています。`/view` は UI 上の制限のみで、
Firestore のセキュリティルール等でアクセスを制限しているわけではない点に注意してください。

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

> データは既存の GANTT（ST APPS 版）から独立しています。
> 専用コレクション `gantt_public_tasks` / `gantt_public_daily_todos` /
> `gantt_public_config` を使用するため、片方で編集してももう片方には影響しません。
> （Firebase プロジェクト自体は `ringi-1b31a` を共用していますが、
> コレクションが別なのでデータは完全に分離されています。）
