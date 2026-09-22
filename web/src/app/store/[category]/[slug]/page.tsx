import ProductDetailPage from '../../produtos/[slug]/page';

interface CategoryProductPageProps {
  params: Promise<{ category: string; slug: string }>;
}

export default function CategoryProductPage({ params }: CategoryProductPageProps) {
  return <ProductDetailPage params={params} />;
}
