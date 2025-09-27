import { redirect } from 'next/navigation';

export default function HomePage() {
  // 簡単な実装：直接ログインページにリダイレクト
  redirect('/auth/login');
}
