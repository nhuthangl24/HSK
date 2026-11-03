import { redirect } from 'next/navigation';

export default function TermsPage() {
  redirect('/faq?tab=terms');
}
