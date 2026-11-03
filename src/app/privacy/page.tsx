import { redirect } from 'next/navigation';

export default function PrivacyPage() {
  redirect('/faq?tab=privacy');
}
