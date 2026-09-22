import { redirect } from 'next/navigation';
import { CATEGORY_NAMES_BY_SLUG } from '@/lib/products';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const catSlug = (category || '').toLowerCase();
  const formalName = CATEGORY_NAMES_BY_SLUG[catSlug];
  if (formalName) {
    redirect(`/colecao?categoria=${encodeURIComponent(formalName)}`);
  }
  redirect('/colecao');
}
