import { Routes, Route } from 'react-router';
import { useLenis } from '@/hooks/useLenis';
import Home from '@/pages/Home';

export default function App() {
  useLenis();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
