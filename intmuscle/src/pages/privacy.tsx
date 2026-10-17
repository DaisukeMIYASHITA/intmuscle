import Head from "next/head";

export default function PrivacyPage() {
  return <main style={{ maxWidth: 760, margin: "40px auto", padding: 24, lineHeight: 1.8 }}>
    <Head><title>Privacy | IntMuscle</title></Head>
    <h1>Privacy / プライバシー</h1>
    <p>IntMuscle のWeb版のアクセス解析について説明します。</p>
    <h2>アクセス解析</h2>
    <p>Google Analytics 4の専用設定がある場合、画面の「アクセス解析」で許可した後にだけ、
      Cookie、ブラウザー・端末に関する情報、閲覧ページと利用時間をGoogleへ送信し、サービス改善に使用します。
      閲覧ページは固定のルートテンプレートに置き換え、URLのクエリ・ハッシュ・動的IDを除きます。
      名前、メールアドレス、ウォレットアドレス、認証コード、フォームの入力内容は解析イベントへ添付しません。</p>
    <h2>選択の変更</h2>
    <p>許可しなくてもアプリを利用できます。「アクセス解析の設定」からいつでも変更できます。
      拒否すると以降の解析を停止します。既に送信したデータや保存済みCookieの削除を意味するものではありません。
      選択はブラウザー内に保存します。広告向けの同意は有効にしません。</p>
    <p>Googleによるデータの取り扱いは <a href="https://policies.google.com/technologies/partner-sites">Googleの説明</a> と
      <a href="https://policies.google.com/privacy">プライバシーポリシー</a> を参照してください。</p>
    <p>このページはWebアクセス解析の説明です。アカウント認証や他の外部連携は、その機能の案内と各提供元の説明を確認してください。</p>
    <p><a href="/">アプリに戻る</a></p>
  </main>;
}
