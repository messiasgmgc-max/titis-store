import StoreLayout from './store/layout';
import StoreHomePage from './store/page';

export default function RootHomePage() {
  return (
    <StoreLayout>
      <StoreHomePage />
    </StoreLayout>
  );
}
