import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="layout-wrapper">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}