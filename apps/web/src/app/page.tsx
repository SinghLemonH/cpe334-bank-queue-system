import { redirect } from 'next/navigation';

/** `/` goes to the login page (F-01 contract 5.3); login forwards signed-in users by role. */
export default function HomePage() {
  redirect('/login');
}
